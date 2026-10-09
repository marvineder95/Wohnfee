import { todayVienna } from '../../../utils/site'
import { requireAdmin } from '../../../utils/admin-auth'
import { getDb, queryOne } from '../../../utils/db'
import { parseItems, invClean, invMoney, invDate, nextOfferNumber } from '../../../utils/invoices'
import { setSetting } from '../../../utils/settings'

// POST /api/admin/offers — neues Angebot anlegen (inkl. Positionen)
// Die Angebotsnummer wird serverseitig vergeben: <JJ><lfd ab 1000>WF, z. B. 261000WF
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const customerName = invClean(body?.customer_name, 190)
  const docDate = invDate(body?.doc_date) || todayVienna()
  if (!customerName) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Kundennamen angeben.' })
  const items = parseItems(body)
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Bitte mindestens eine Position angeben.' })

  // Angebotsdatum bestimmt das Jahr der Nummer (Jahreswechsel -> wieder bei 1000)
  const { year2, max } = await nextOfferNumber(docDate)
  const contactId = Number(body?.contact_id) > 0 ? Number(body.contact_id) : null
  const vatFree = body?.vat_free ? 1 : 0
  const vatRate = vatFree ? 0 : Math.min(100, invMoney(body?.vat_rate ?? 20) || 20)

  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    // Nummer innerhalb der Transaktion vergeben und bei Kollision hochzaehlen
    let number = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      number = `AG${String(year2).padStart(2, '0')}${max + 1 + attempt}WF`
      const clash = await queryOne('SELECT id FROM offers WHERE number = :number', { number })
      if (!clash) break
    }
    const [res]: any = await conn.query(
      `INSERT INTO offers
         (number, contact_id, customer_name, customer_street, customer_zip, customer_city,
          customer_country, customer_uid, doc_date, valid_until, subject,
          lang, vat_rate, vat_free, vat_note, note, status)
       VALUES
         (:number, :contactId, :customerName, :street, :zip, :city,
          :country, :cuid, :docDate, :validUntil, :subject,
          :lang, :vatRate, :vatFree, :vatNote, :note, :status)`,
      {
        number, contactId, customerName,
        street: invClean(body?.customer_street), zip: invClean(body?.customer_zip, 16),
        city: invClean(body?.customer_city, 128), country: invClean(body?.customer_country, 8),
        cuid: invClean(body?.customer_uid, 32),
        docDate, validUntil: invDate(body?.valid_until),
        subject: invClean(body?.subject),
        lang: body?.lang === 'en' ? 'en' : 'de',
        vatRate, vatFree,
        vatNote: invClean(body?.vat_note, 190),
        note: invClean(body?.note, 5000),
        status: ['entwurf', 'gesendet', 'angenommen', 'abgelehnt'].includes(body?.status) ? body.status : 'entwurf'
      }
    )
    const offerId = res.insertId
    for (const it of items) {
      await conn.query(
        `INSERT INTO offer_items (offer_id, position, description, quantity, unit, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [offerId, it.position, it.description, it.quantity, it.unit, it.unit_price]
      )
    }
    // In der Kundentabelle (Dokumente) auftauchen lassen
    if (contactId) {
      const netto = items.reduce((s: number, it: any) => s + it.quantity * it.unit_price, 0)
      const brutto = Math.round(netto * (1 + vatRate / 100) * 100) / 100
      await conn.query(
        `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
         VALUES (?, 'angebot', ?, NULL, ?, ?, NULL, ?, 'dashboard')`,
        [contactId, number, docDate, vatFree ? netto : brutto,
         `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`]
      )
    }
    await conn.commit()
    // Optional: geaenderter Text wird als neuer Standard fuer kuenftige Angebote gespeichert
    if (body?.save_default_note && body?.note !== undefined && body?.note !== null) {
      await setSetting(`offer_default_note_${body?.lang === 'en' ? 'en' : 'de'}`, String(body.note).slice(0, 5000))
    }
    return { ok: true, id: offerId }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
