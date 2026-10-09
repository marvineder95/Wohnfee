// Einmal-Import der ASOL-Exporte (asol_export/*.json) in die WOHNFEE-Datenbank
// Aufruf: node scripts/import-asol.mjs
// Bereinigt: Lagernamen vereinheitlicht, Preise Komma→Punkt, Adressen geparst.

import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = (name) => JSON.parse(readFileSync(join(root, '..', 'asol_export', name), 'utf8'))

const pool = mysql.createPool({
  host: process.env.NUXT_DB_HOST || '127.0.0.1',
  port: Number(process.env.NUXT_DB_PORT || 3307),
  user: process.env.NUXT_DB_USER || 'wohnfee',
  password: process.env.NUXT_DB_PASSWORD || 'wohnfee-dev',
  database: process.env.NUXT_DB_NAME || 'wohnfee',
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: true,
  charset: 'utf8mb4_unicode_ci'
})

const s = (v) => (v === null || v === undefined) ? '' : String(v).trim()

// ---- Lager-Namen normalisieren ----
function normWarehouse(raw) {
  const t = s(raw).toLowerCase()
  if (!t) return null
  if (t.includes('graz')) return 'Graz'
  if (t.includes('wolfgang') || t.includes('wr. neustadt') || t.includes('wr.neustadt')) return 'Wr. Neustadt'
  if (t.includes('showroom')) return 'Showroom'
  if (t.includes('frachtmeister')) return 'Frachtmeister'
  if (t.includes('lager 1')) return 'Lager 1'
  if (t.includes('lager')) return 'Lager'
  return s(raw)
}

// ---- Preis: "1.234,56" / "123,45" / "123.45" -> Zahl ----
function parsePrice(raw) {
  let t = s(raw)
  if (!t) return null
  t = t.replace(/[€\s]/g, '')
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

// ---- "Febe" / "3/20" / "2021" -> Jahr ----
function parseYear(raw) {
  const t = s(raw)
  let m = t.match(/(19|20)\d{2}/)
  if (m) return Number(m[0])
  m = t.match(/\b(\d{1,2})\/(\d{2})\b/)
  if (m) return 2000 + Number(m[2])
  return null
}

// ---- Adress-Freitext: "Name\r\nStraße 1\r\n1080 Wien" -> Straße/PLZ/Ort ----
function parseAddress(raw) {
  const lines = s(raw).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let street = null, zip = null, city = null
  for (const line of lines) {
    const m = line.match(/^(A-?)?\s*(\d{4,5})\s+(.+)$/)
    if (m && !zip) { zip = m[2]; city = m[3].trim(); continue }
    if (!street && !/^\d{4,5}$/.test(line)) street = line
  }
  return { street, zip, city }
}

async function main() {
  const q = async (sql, params) => { const [r] = await pool.query(sql, params); return r }
  // Für SELECT: Zeilen liefern (q gibt [rows, fields] zurück)
  const rows = async (sql, params) => (await pool.query(sql, params))[0]

  console.log('--- 1/4 Kontakte ---')
  const adressaten = load('inaktiveadressaten.json')
  let contactCount = 0
  for (const a of adressaten) {
    const asolId = Number(a.id)
    if (!asolId) continue
    const { street, zip, city } = parseAddress(a.primaer_adresse)
    await q(
      `INSERT INTO contacts (asol_id, type, name1, name2, street, zip, city, country, source)
       VALUES (:asolId, :type, :name1, :name2, :street, :zip, :city, :country, 'asol-import')
       ON DUPLICATE KEY UPDATE
         type = VALUES(type), name1 = VALUES(name1), name2 = VALUES(name2),
         street = VALUES(street), zip = VALUES(zip), city = VALUES(city)`,
      {
        asolId,
        type: s(a.adressattyp) === 'F' ? 'firma' : 'person',
        name1: s(a.name1) || null,
        name2: s(a.name2) || null,
        street, zip, city,
        country: s(a.primaer_land_code) || null
      }
    )
    const tags = s(a.kategorien).split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length) {
      const [{ id }] = await q('SELECT id FROM contacts WHERE asol_id = :asolId', { asolId })
      for (const tag of tags) {
        await q('INSERT IGNORE INTO contact_tags (contact_id, tag) VALUES (:id, :tag)', { id, tag })
      }
    }
    contactCount++
  }
  console.log(`${contactCount} Kontakte importiert`)

  console.log('--- 2/4 Standorte ---')
  const standorte = load('standorte.json')
  const contactIdByAsol = new Map()
  for (const r of await rows('SELECT id, asol_id FROM contacts WHERE asol_id IS NOT NULL')) {
    contactIdByAsol.set(Number(r.asol_id), r.id)
  }
  let locCount = 0
  for (const st of standorte) {
    const asolId = Number(st.id)
    if (!asolId) continue
    const { street, zip, city } = parseAddress(st.adresse)
    const contactId = st['adressat.id'] ? contactIdByAsol.get(Number(st['adressat.id'])) ?? null : null
    await q(
      `INSERT INTO locations (asol_id, contact_id, name, address, zip, city, type)
       VALUES (:asolId, :contactId, :name, :street, :zip, :city, :type)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), contact_id = VALUES(contact_id),
         address = VALUES(address), zip = VALUES(zip), city = VALUES(city), type = VALUES(type)`,
      { asolId, contactId, name: s(st.name) || '—', street, zip, city, type: s(st.typ) || null }
    )
    locCount++
  }
  console.log(`${locCount} Standorte importiert`)

  console.log('--- 3/4 Inventar ---')
  const lists = [
    ['ladenhueter.json', 'lager'],
    ['verkaufteobjekte.json', 'verkauft'],
    ['inaktiveobjekte.json', 'ausser_dienst']
  ]
  let itemCount = 0
  for (const [file, status] of lists) {
    const rows = load(file)
    let n = 0
    for (const it of rows) {
      const asolId = Number(it.id)
      const title = s(it.bezeichnung)
      if (!asolId || !title) continue
      const lager = s(it.lager)
      const standortName = s(it['primaerbeziehung.standort.name'])
      // Lager kann im lager-Feld ODER im Standortnamen stehen ("LAGER 1" etc.)
      const wh = normWarehouse(lager) || normWarehouse(standortName)
      // Standortname, der kein Lager ist → Kundeneinsatzort (vermietet)
      const itemStatus = status === 'lager' && !wh && standortName ? 'vermietet' : status
      const gekauft = s(it.gekauft)
      await q(
        `INSERT INTO inventory_items
           (asol_id, title, description, supplier, artnr, ean, quantity,
            original_price, rent_price_1m, rent_price_3m, status,
            warehouse, customer_location, purchased_at, purchased_year, source)
         VALUES
           (:asolId, :title, :desc, :supplier, :artnr, :ean, :qty,
            :orig, :r1, :r3, :status,
            :wh, :cloc, :purch, :pyear, 'asol-import')
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        {
          asolId, title,
          desc: s(it.beschreibung) || null,
          supplier: s(it.anbieter) || null,
          artnr: s(it.artnr) || null,
          ean: s(it.ean) || null,
          qty: Number(it.menge) > 0 ? Number(it.menge) : 1,
          orig: parsePrice(it.originalpreis),
          r1: parsePrice(it.mietpreis_1monat),
          r3: parsePrice(it.mietpreis3_monate),
          status: itemStatus,
          wh,
          cloc: itemStatus === 'vermietet' ? standortName : null,
          purch: gekauft || null,
          pyear: parseYear(gekauft)
        }
      )
      const tags = s(it.kategorien).split(',').map(t => t.trim()).filter(Boolean)
      if (tags.length) {
        const [{ id }] = await q('SELECT id FROM inventory_items WHERE asol_id = :asolId', { asolId })
        for (const tag of tags) {
          await q('INSERT IGNORE INTO item_tags (item_id, tag) VALUES (:id, :tag)', { id, tag })
        }
      }
      n++
    }
    console.log(`${file}: ${n} importiert`)
    itemCount += n
  }
  console.log(`Gesamt ${itemCount} Inventarobjekte`)

  console.log('--- 4/4 Statistik ---')
  const c1 = await rows(`SELECT COUNT(*) n FROM contacts`)
  const c2 = await rows(`SELECT COUNT(*) n FROM locations`)
  const c3 = await rows(`SELECT COUNT(*) n FROM inventory_items`)
  const c4 = await rows(`SELECT status, COUNT(*) n FROM inventory_items GROUP BY status`)
  console.log('Kontakte:', c1[0].n, '| Standorte:', c2[0].n, '| Inventar:', c3[0].n)
  console.log('Status:', c4.map(r => `${r.status}=${r.n}`).join(', '))
  await pool.end()
}

main().catch((e) => { console.error('IMPORT FEHLGESCHLAGEN:', e.message); process.exit(1) })
