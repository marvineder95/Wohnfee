import { requireAdmin } from '../../../../utils/admin-auth'
import { getDb, queryOne } from '../../../../utils/db'
import { parseItems, invClean, invMoney, invDate } from '../../../../utils/invoices'
import { setSetting } from '../../../../utils/settings'

// PUT /api/admin/offers/:id — Angebot aktualisieren (Positionen werden ersetzt)
// Nicht mehr aenderbar, sobald daraus eine Rechnung erzeugt wurde.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Angebots-ID' })
  }
  const offer = await queryOne('SELECT id, number, invoice_id FROM offers WHERE id = :id', { id })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  if ((offer as any).invoice_id) {
    throw createError({ statusCode: 409, statusMessage: 'Aus diesem Angebot wurde bereits eine Rechnung erstellt — das Angebot ist nicht mehr änderbar.' })
  }

  const body = await readBody(event)
  // Die Angebotsnummer ist unveraenderbar: Nummernschema 261000WF, vergeben bei Erstellung
  const number = (offer as any).number
  const customerName = invClean(body?.customer_name, 190)
  if (!customerName) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Kundennamen angeben.' })
  const items = parseItems(body)
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Bitte mindestens eine Position angeben.' })

  const contactId = Number(body?.contact_id) > 0 ? Number(body.contact_id) : null
  const vatFree = body?.vat_free ? 1 : 0
  const vatRate = vatFree ? 0 : Math.min(100, invMoney(body?.vat_rate ?? 20) || 20)

  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      `UPDATE offers SET
         number = :number, contact_id = :contactId, customer_name = :customerName,
         customer_street = :street, customer_zip = :zip, customer_city = :city,
         customer_country = :country, customer_uid = :cuid,
         doc_date = :docDate, valid_until = :validUntil, subject = :subject,
         lang = :lang, vat_rate = :vatRate, vat_free = :vatFree, vat_note = :vatNote,
         note = :note, status = :status
       WHERE id = :id`,
      {
        id, number, contactId, customerName,
        street: invClean(body?.customer_street), zip: invClean(body?.customer_zip, 16),
        city: invClean(body?.customer_city, 128), country: invClean(body?.customer_country, 8),
        cuid: invClean(body?.customer_uid, 32),
        docDate: invDate(body?.doc_date) || new Date().toISOString().slice(0, 10),
        validUntil: invDate(body?.valid_until),
        subject: invClean(body?.subject),
        lang: body?.lang === 'en' ? 'en' : 'de',
        vatRate, vatFree,
        vatNote: invClean(body?.vat_note, 190),
        note: invClean(body?.note, 5000),
        status: ['entwurf', 'gesendet', 'angenommen', 'abgelehnt'].includes(body?.status) ? body.status : 'entwurf'
      }
    )
    await conn.query('DELETE FROM offer_items WHERE offer_id = ?', [id])
    for (const it of items) {
      await conn.query(
        `INSERT INTO offer_items (offer_id, position, description, quantity, unit, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, it.position, it.description, it.quantity, it.unit, it.unit_price]
      )
    }
    await conn.commit()
    // Optional: geaenderter Text wird als neuer Standard fuer kuenftige Angebote gespeichert
    if (body?.save_default_note && body?.note !== undefined && body?.note !== null) {
      await setSetting(`offer_default_note_${body?.lang === 'en' ? 'en' : 'de'}`, String(body.note).slice(0, 5000))
    }
    return { ok: true }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
