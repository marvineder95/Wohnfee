import { getDb, query, queryOne } from './db'
import { nextInvoiceNumber } from './invoices'
import { todayVienna } from './site'

// Wiederkehrende Mietrechnungen (Furniture Leasing):
// Eine bestehende Rechnung dient als Vorlage; zu jedem Fälligkeitstermin (next_date)
// entsteht ein neuer RECHNUNGSENTWURF mit eigener Nummer und Leistungszeitraum.
// Versendet wird weiterhin manuell (prüfen → senden).

const MONTHS_DE = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 'YYYY-MM-DD' + n Monate (Tag wird auf Monatsende begrenzt, z. B. 31.01. → 28.02.) */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + n, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, last))
  return target.toISOString().slice(0, 10)
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function createFromTemplate(rec: any, periodStart: string): Promise<{ id: number; number: string }> {
  const src: any = await queryOne('SELECT * FROM invoices WHERE id = :id', { id: rec.source_invoice_id })
  if (!src) throw new Error('Vorlage-Rechnung nicht gefunden')
  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = :id ORDER BY position',
    { id: src.id }
  )
  const docDate = todayVienna()
  const periodEnd = addDays(addMonths(periodStart, 1), -1)
  const [y, m] = periodStart.split('-').map(Number)
  const monthLabel = `${(src.lang === 'en' ? MONTHS_EN : MONTHS_DE)[m - 1]} ${y}`
  const baseSubject = String(rec.title || src.subject || (src.lang === 'en' ? 'Furniture rental' : 'Möbelmiete'))
  const subject = `${baseSubject} – ${monthLabel}`.slice(0, 190)

  const { year2, max } = await nextInvoiceNumber(docDate)
  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    let number = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      number = `${String(year2).padStart(2, '0')}${max + 1 + attempt}WF`
      const clash = await queryOne('SELECT id FROM invoices WHERE number = :number', { number })
      if (!clash) break
    }
    const [res]: any = await conn.query(
      `INSERT INTO invoices
         (number, contact_id, customer_name, customer_street, customer_zip, customer_city,
          customer_country, customer_uid, doc_date, service_from, service_to, subject,
          intro, lang, vat_rate, vat_free, vat_note, note, status, recurring_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'entwurf', ?)`,
      [number, src.contact_id, src.customer_name, src.customer_street, src.customer_zip, src.customer_city,
       src.customer_country, src.customer_uid, docDate, periodStart, periodEnd, subject,
       src.intro, src.lang, src.vat_rate, src.vat_free, src.vat_note, src.note, rec.id]
    )
    const invoiceId = res.insertId
    for (const it of items) {
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, position, description, quantity, unit, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
        [invoiceId, it.position, it.description, it.quantity, it.unit, it.unit_price]
      )
    }
    if (src.contact_id) {
      const netto = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0)
      const total = src.vat_free ? netto : Math.round(netto * (1 + Number(src.vat_rate) / 100) * 100) / 100
      await conn.query(
        `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
         VALUES (?, 'rechnung', ?, NULL, ?, ?, ?, ?, 'dashboard')`,
        [src.contact_id, number, docDate, total, periodEnd, `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`]
      )
    }
    await conn.commit()
    return { id: invoiceId, number }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

let running = false

/** Erzeugt alle fälligen Rechnungsentwürfe (holt verpasste Monate nach, max. 12 je Abo). */
export async function generateDueRecurring(): Promise<number> {
  if (running) return 0
  running = true
  let created = 0
  try {
    const today = todayVienna()
    const due: any[] = await query(
      `SELECT * FROM recurring_invoices
       WHERE active = 1 AND next_date <= :today AND (end_date IS NULL OR next_date <= end_date)`,
      { today }
    )
    for (const rec of due) {
      let next = String(rec.next_date).slice(0, 10)
      for (let i = 0; i < 12 && next <= today && (!rec.end_date || next <= String(rec.end_date).slice(0, 10)); i++) {
        const inv = await createFromTemplate(rec, next)
        next = addMonths(next, 1)
        created++
        await query(
          `UPDATE recurring_invoices SET next_date = :next, created_count = created_count + 1, last_invoice_id = :inv,
             active = IF(end_date IS NOT NULL AND :next > end_date, 0, active)
           WHERE id = :id`,
          { next, inv: inv.id, id: rec.id }
        )
        console.log(`[recurring] Rechnungsentwurf ${inv.number} aus Abo #${rec.id} erstellt`)
      }
    }
  } catch (e: any) {
    console.error('[recurring] Erzeugen fehlgeschlagen:', e?.message || e)
  } finally {
    running = false
  }
  return created
}
