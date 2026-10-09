import { todayVienna } from '../../../../utils/site'
import { requireAdmin } from '../../../../utils/admin-auth'
import { getDb, query, queryOne } from '../../../../utils/db'
import { nextInvoiceNumber } from '../../../../utils/invoices'

// POST /api/admin/offers/:id/invoice — erzeugt aus dem Angebot eine Rechnung.
// Kopiert Kunde, Positionen, Steuerlogik und Bemerkung; vergibt eine neue
// Rechnungsnummer (Nummernschema der Rechnungen), verknuepft beide Dokumente
// und setzt das Angebot auf "angenommen".
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Angebots-ID' })
  }
  const offer: any = await queryOne('SELECT * FROM offers WHERE id = :id', { id })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  if (offer.invoice_id) {
    const existing = await queryOne('SELECT id, number FROM invoices WHERE id = :iid', { iid: offer.invoice_id })
    throw createError({
      statusCode: 409,
      statusMessage: `Aus diesem Angebot wurde bereits die Rechnung ${existing?.number || ''} erstellt.`
    })
  }
  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position',
    { id }
  )
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Das Angebot enthält keine Positionen.' })

  const docDate = todayVienna()
  const { year2, max } = await nextInvoiceNumber(docDate)
  const netto = items.reduce((s: number, it: any) => s + Number(it.quantity) * Number(it.unit_price), 0)
  const vatRate = offer.vat_free ? 0 : Number(offer.vat_rate) || 20
  const brutto = Math.round(netto * (1 + vatRate / 100) * 100) / 100

  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    // Rechnungsnummer vergeben (eigenes Schema/Kreis der Rechnungen)
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
          lang, vat_rate, vat_free, vat_note, note, status, offer_id)
       VALUES
         (:number, :contactId, :customerName, :street, :zip, :city,
          :country, :cuid, :docDate, NULL, NULL, :subject,
          :lang, :vatRate, :vatFree, :vatNote, :note, :status, :offerId)`,
      {
        number,
        contactId: offer.contact_id,
        customerName: offer.customer_name,
        street: offer.customer_street, zip: offer.customer_zip, city: offer.customer_city,
        country: offer.customer_country, cuid: offer.customer_uid,
        docDate, subject: offer.subject,
        lang: offer.lang === 'en' ? 'en' : 'de',
        vatRate, vatFree: offer.vat_free ? 1 : 0, vatNote: offer.vat_note,
        note: offer.note, status: 'entwurf', offerId: id
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
    // Angebot als angenommen markieren und verknuepfen
    await conn.query("UPDATE offers SET status = 'angenommen', invoice_id = ? WHERE id = ?", [invoiceId, id])
    // Kundendokumente: Rechnung als eigenen Eintrag
    if (offer.contact_id) {
      await conn.query(
        `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
         VALUES (?, 'rechnung', ?, NULL, ?, ?, NULL, ?, 'dashboard')`,
        [offer.contact_id, number, docDate, offer.vat_free ? netto : brutto,
         `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`]
      )
    }
    await conn.commit()
    return { ok: true, invoiceId, invoiceNumber: number }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
