import { todayVienna } from '../../../../utils/site'
import { requireAdmin } from '../../../../utils/admin-auth'
import { getDb, queryOne } from '../../../../utils/db'
import { nextInvoiceNumber } from '../../../../utils/invoices'

// POST /api/admin/invoices/:id/storno — Rechnung per Knopfdruck stornieren.
// Erstellt automatisch ein Storno-Dokument (Gutschrift) mit:
//  - eigener fortlaufender Nummer aus demselben Nummernkreis (<JJ><ab 1000>WF)
//  - negative Positionen (Gutschrift ueber den vollen Rechnungsbetrag)
//  - zwingendem Verweis auf Originalrechnung (Nr. + Datum) — Voraussetzung nach § 11 UStG
// Die Originalrechnung bleibt erhalten und wird auf „storniert" gesetzt
// (Rechnungen duerfen buchhalterisch nicht geloescht werden).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rechnungs-ID' })
  }
  const orig: any = await queryOne('SELECT * FROM invoices WHERE id = :id', { id })
  if (!orig) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  if (orig.storno_of) throw createError({ statusCode: 400, statusMessage: 'Ein Storno kann nicht erneut storniert werden.' })
  const existing = await queryOne('SELECT id FROM invoices WHERE storno_of = :id LIMIT 1', { id })
  if (existing || orig.status === 'storniert') {
    throw createError({ statusCode: 400, statusMessage: 'Diese Rechnung wurde bereits storniert.' })
  }
  const items: any[] = await queryOne(
    'SELECT COUNT(*) AS n FROM invoice_items WHERE invoice_id = :id',
    { id }
  ) as any
  if (!items || Number(items.n) === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Rechnung ohne Positionen kann nicht storniert werden.' })
  }

  const today = todayVienna()
  const { year2, max } = await nextInvoiceNumber(today)

  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    let number = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      number = `${String(year2).padStart(2, '0')}${max + 1 + attempt}WF`
      const clash: any = await queryOne('SELECT id FROM invoices WHERE number = :number', { number })
      if (!clash) break
    }
    const origDate = orig.doc_date instanceof Date
      ? orig.doc_date.toISOString().slice(0, 10)
      : String(orig.doc_date).slice(0, 10)
    const fmtD = (s: string) => s.split('-').reverse().join('.')
    const lang = orig.lang === 'en' ? 'en' : 'de'
    const subject = lang === 'en'
      ? `Cancellation of invoice ${orig.number}`
      : `Storno zur Rechnung ${orig.number}`
    const note = lang === 'en'
      ? `This credit note cancels invoice no. ${orig.number} dated ${fmtD(origDate)} in full.`
      : `Dieses Storno bezieht sich auf die Rechnung Nr. ${orig.number} vom ${fmtD(origDate)} und macht diese vollständig rückgängig.`

    const [res]: any = await conn.query(
      `INSERT INTO invoices
         (number, contact_id, customer_name, customer_street, customer_zip, customer_city,
          customer_country, customer_uid, doc_date, service_from, service_to, subject,
          lang, vat_rate, vat_free, vat_note, note, status, storno_of)
       VALUES
         (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'gesendet', ?)`,
      [
        number, orig.contact_id, orig.customer_name, orig.customer_street, orig.customer_zip,
        orig.customer_city, orig.customer_country, orig.customer_uid, today,
        subject, lang, orig.vat_rate, orig.vat_free, orig.vat_note, note, id
      ]
    )
    const stornoId = res.insertId
    const [origRows]: any = await conn.query(
      'SELECT position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = ? ORDER BY position',
      [id]
    )
    let total = 0
    for (const it of origRows as any[]) {
      const price = -Math.abs(Number(it.unit_price))
      total += Number(it.quantity) * price
      await conn.query(
        `INSERT INTO invoice_items (invoice_id, position, description, quantity, unit, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stornoId, it.position, it.description, it.quantity, it.unit, price]
      )
    }
    const brutto = orig.vat_free
      ? total
      : Math.round(total * (1 + Number(orig.vat_rate || 20) / 100) * 100) / 100
    await conn.query('UPDATE invoices SET status = \'storniert\' WHERE id = ?', [id])
    if (orig.contact_id) {
      await conn.query(
        `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
         VALUES (?, 'storno', ?, NULL, ?, ?, NULL, ?, 'dashboard')`,
        [orig.contact_id, number, today, brutto, `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`]
      )
    }
    await conn.commit()
    return { ok: true, id: stornoId, number }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
