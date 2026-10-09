import { todayVienna } from '../../../utils/site'
import { requireAdmin } from '../../../utils/admin-auth'
import { getDb, query, queryOne } from '../../../utils/db'
import { parseItems, invClean, invMoney, invDate, nextInvoiceNumber } from '../../../utils/invoices'
import { setSetting } from '../../../utils/settings'

// POST /api/admin/invoices — neue Rechnung anlegen (inkl. Positionen)
// Die Rechnungsnummer wird serverseitig vergeben: <JJ><lfd ab 1000>WF, z. B. 261000WF
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const customerName = invClean(body?.customer_name, 190)
  const docDate = invDate(body?.doc_date) || todayVienna()
  if (!customerName) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Kundennamen angeben.' })
  const items = parseItems(body)
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Bitte mindestens eine Position angeben.' })

  // Rechnungsdatum bestimmt das Jahr der Nummer (Jahreswechsel -> wieder bei 1000)
  const { year2, max } = await nextInvoiceNumber(docDate)
  const contactId = Number(body?.contact_id) > 0 ? Number(body.contact_id) : null
  const vatFree = body?.vat_free ? 1 : 0
  const vatRate = vatFree ? 0 : Math.min(100, invMoney(body?.vat_rate ?? 20) || 20)

  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    // Nummer innerhalb der Transaktion vergeben und bei Kollision hochzaehlen
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
          intro, lang, vat_rate, vat_free, vat_note, note, status)
       VALUES
         (:number, :contactId, :customerName, :street, :zip, :city,
          :country, :cuid, :docDate, :sfrom, :sto, :subject,
          :intro, :lang, :vatRate, :vatFree, :vatNote, :note, :status)`,
      {
        number, contactId, customerName,
        street: invClean(body?.customer_street), zip: invClean(body?.customer_zip, 16),
        city: invClean(body?.customer_city, 128), country: invClean(body?.customer_country, 8),
        cuid: invClean(body?.customer_uid, 32),
        docDate, sfrom: invDate(body?.service_from), sto: invDate(body?.service_to),
        subject: invClean(body?.subject),
        intro: invClean(body?.intro, 5000),
        lang: body?.lang === 'en' ? 'en' : 'de',
        vatRate, vatFree,
        vatNote: invClean(body?.vat_note, 190),
        note: invClean(body?.note, 5000),
        status: ['entwurf', 'gesendet', 'bezahlt'].includes(body?.status) ? body.status : 'entwurf'
      }
    )
    const invoiceId = res.insertId
    for (const it of items) {
      await conn.query(
        `INSERT INTO invoice_items (invoice_id, position, description, quantity, unit, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, it.position, it.description, it.quantity, it.unit, it.unit_price]
      )
    }
    // In der Kundentabelle (Dokumente) auftauchen lassen
    if (contactId) {
      const netto = items.reduce((s: number, it: any) => s + it.quantity * it.unit_price, 0)
      const brutto = Math.round(netto * (1 + vatRate / 100) * 100) / 100
      await conn.query(
        `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
         VALUES (?, 'rechnung', ?, NULL, ?, ?, ?, ?, 'dashboard')`,
        [contactId, number, docDate, vatFree ? netto : brutto, invDate(body?.service_to),
         `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`]
      )
    }
    await conn.commit()
    // Optional: geaenderter Text wird als neuer Standard fuer kuenftige Rechnungen gespeichert
    if (body?.save_default_note && body?.note !== undefined && body?.note !== null) {
      await setSetting(`invoice_default_note_${body?.lang === 'en' ? 'en' : 'de'}`, String(body.note).slice(0, 5000))
    }
    if (body?.save_default_intro && body?.intro !== undefined && body?.intro !== null) {
      await setSetting(`invoice_default_intro_${body?.lang === 'en' ? 'en' : 'de'}`, String(body.intro).slice(0, 5000))
    }
    return { ok: true, id: invoiceId }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
