// Import der geparsten Nextcloud-Dokumente (asol_export/documents.json)
// Aufruf: node scripts/import-documents.mjs
// - legt fehlende Kundenkontakte automatisch an (Tag 'automatisch', Quelle 'dokument')
// - verknüpft Dokumente mit Kontakten; Doppelimport wird verweigert

import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const docs = JSON.parse(readFileSync(join(root, '..', 'asol_export', 'documents.json'), 'utf8'))

const pool = mysql.createPool({
  host: process.env.NUXT_DB_HOST || '127.0.0.1',
  port: Number(process.env.NUXT_DB_PORT || 3307),
  user: process.env.NUXT_DB_USER || 'wohnfee',
  password: process.env.NUXT_DB_PASSWORD || 'wohnfee-dev',
  database: process.env.NUXT_DB_NAME || 'wohnfee',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4_unicode_ci'
})

const norm = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, ' ').trim()

const s = (v) => (v === null || v === undefined) ? null : String(v).trim() || null

async function main() {
  const [existing] = await pool.query('SELECT COUNT(*) AS n FROM documents')
  if (Number(existing[0].n) > 0) {
    console.log(`ABBRUCH: documents enthält bereits ${existing[0].n} Einträge – Doppelimport verweigert.`)
    process.exit(1)
  }

  // Bestehende Kontakte für Namens-Dedup laden
  const [contacts] = await pool.query('SELECT id, name1, name2 FROM contacts')
  const byNorm = new Map()
  for (const c of contacts) {
    const key = norm(`${c.name1 || ''} ${c.name2 || ''}`)
    if (key && !byNorm.has(key)) byNorm.set(key, c.id)
  }

  // Auto-Kontakte sammeln (dedup nach normalisiertem Namen)
  const autoMap = new Map() // normName -> {id?, fields}
  for (const d of docs) {
    if (d.contact_id || !d.auto_contact) continue
    const key = norm(d.auto_contact.name)
    if (!key) continue
    if (!autoMap.has(key)) autoMap.set(key, { fields: d.auto_contact, contactId: byNorm.get(key) || null })
  }

  let created = 0, reused = 0
  for (const [key, entry] of autoMap) {
    if (entry.contactId) { reused++; continue }
    const f = entry.fields
    const isFirma = f.type === 'firma'
    const name1 = isFirma ? null : (f.name.split(' ')[0] || null)
    const name2 = isFirma ? f.name : (f.name.split(' ').slice(1).join(' ') || f.name)
    const [r] = await pool.query(
      `INSERT INTO contacts (type, name1, name2, street, zip, city, source)
       VALUES (?, ?, ?, ?, ?, ?, 'dokument')`,
      [f.type, name1, name2, f.street || null, f.zip || null, f.city || null]
    )
    entry.contactId = r.insertId
    await pool.query('INSERT IGNORE INTO contact_tags (contact_id, tag) VALUES (?, ?)', [r.insertId, 'automatisch'])
    created++
  }

  // Dokumente einfügen
  let inserted = 0, failed = 0
  for (const d of docs) {
    let contactId = d.contact_id || null
    if (!contactId && d.auto_contact) {
      contactId = autoMap.get(norm(d.auto_contact.name))?.contactId || null
    }
    try {
      await pool.query(
        `INSERT INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nextcloud')`,
        [contactId, d.kind, s(d.number)?.slice(0, 64), s(d.customer_raw)?.slice(0, 190),
         d.doc_date, d.total, d.return_date, d.path.slice(0, 255)]
      )
      inserted++
    } catch (e) {
      failed++
      if (failed <= 5) console.log('Fehler bei', d.path, e.message)
    }
  }

  console.log(`Fertig: ${inserted} Dokumente importiert (${failed} fehlgeschlagen)`)
  console.log(`Auto-Kontakte: ${created} neu angelegt, ${reused} mit Bestand abgeglichen`)
  const [withContact] = await pool.query('SELECT COUNT(*) AS n FROM documents WHERE contact_id IS NOT NULL')
  console.log(`Dokumente mit Kontaktverknüpfung: ${withContact[0].n} / ${inserted}`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
