// Einmal-Import der Projektliste (asol_export/projects.json)
// Aufruf: node scripts/import-projects.mjs
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const projects = JSON.parse(readFileSync(join(root, '..', 'asol_export', 'projects.json'), 'utf8'))

const pool = mysql.createPool({
  host: process.env.NUXT_DB_HOST || '127.0.0.1',
  port: Number(process.env.NUXT_DB_PORT || 3307),
  user: process.env.NUXT_DB_USER || 'wohnfee',
  password: process.env.NUXT_DB_PASSWORD || 'wohnfee-dev',
  database: process.env.NUXT_DB_NAME || 'wohnfee',
  namedPlaceholders: true,
  charset: 'utf8mb4_unicode_ci'
})

const s = (v, max = 190) => (v === null || v === undefined) ? null : String(v).trim().slice(0, max) || null

async function main() {
  const [existing] = await pool.query(`SELECT COUNT(*) n FROM projects WHERE source = 'excel-import'`)
  if (Number(existing[0].n) > 0) {
    console.log(`Bereits ${existing[0].n} importierte Projekte vorhanden — vorher loeschen.`)
    process.exit(1)
  }
  let n = 0
  for (const p of projects) {
    await pool.query(
      `INSERT INTO projects
         (category, section, customer, title, art, team, status_info, deadline_text, deadline_date,
          note, next_step, who, date_info, sort_order, source)
       VALUES
         (:category, :section, :customer, :title, :art, :team, :status_info, :deadline_text, :deadline_date,
          :note, :next_step, :who, :date_info, :sort_order, 'excel-import')`,
      {
        category: p.category, section: s(p.section, 64), customer: s(p.customer),
        title: s(p.title), art: s(p.art, 16), team: s(p.team, 16),
        status_info: s(p.status_info, 5000), deadline_text: s(p.deadline_text, 64),
        deadline_date: p.deadline_date || null,
        note: s(p.note), next_step: s(p.next_step), who: s(p.who, 64),
        date_info: s(p.date_info, 64), sort_order: Number(p.sort_order) || 0
      }
    )
    n++
  }
  console.log(`${n} Projekte importiert`)
  await pool.end()
}
main().catch((e) => { console.error('IMPORT FEHLGESCHLAGEN:', e.message); process.exit(1) })
