import { todayVienna } from '../../../../utils/site'
import { requireAdmin } from '../../../../utils/admin-auth'
import { getDb, queryOne } from '../../../../utils/db'
import { parseItems, invClean, invMoney, invDate } from '../../../../utils/invoices'
import { setSetting } from '../../../../utils/settings'

// PUT /api/admin/invoices/:id — Rechnung aktualisieren (Positionen werden ersetzt)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rechnungs-ID' })
  }
  const invoice = await queryOne('SELECT id, number, status FROM invoices WHERE id = :id', { id })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })

  const body = await readBody(event)

  // Ausgestellte Rechnungen (nicht mehr Entwurf) sind inhaltlich gesperrt – sie
  // dürfen nach UGB/BAO nicht nachträglich verändert werden. Erlaubt ist nur der
  // Statuswechsel gesendet ↔ bezahlt; Korrekturen laufen über „Stornieren".
  const current = (invoice as any).status as string
  if (current !== 'entwurf') {
    if (current === 'storniert') {
      throw createError({ statusCode: 409, statusMessage: 'Stornierte Rechnungen können nicht mehr geändert werden.' })
    }
    const next = ['gesendet', 'bezahlt'].includes(body?.status) ? body.status : current
    if (next !== current) {
      await queryOne('UPDATE invoices SET status = :next WHERE id = :id', { next, id })
    }
    return { ok: true, locked: true }
  }
  // Die Rechnungsnummer ist unveraenderbar: Nummernschema 261000WF, vergeben bei Erstellung
  const number = (invoice as any).number
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
      `UPDATE invoices SET
         number = :number, contact_id = :contactId, customer_name = :customerName,
         customer_street = :street, customer_zip = :zip, customer_city = :city,
         customer_country = :country, customer_uid = :cuid,
         doc_date = :docDate, service_from = :sfrom, service_to = :sto, subject = :subject,
         intro = :intro, lang = :lang, vat_rate = :vatRate, vat_free = :vatFree, vat_note = :vatNote,
         note = :note, status = :status
       WHERE id = :id`,
      {
        id, number, contactId, customerName,
        street: invClean(body?.customer_street), zip: invClean(body?.customer_zip, 16),
        city: invClean(body?.customer_city, 128), country: invClean(body?.customer_country, 8),
        cuid: invClean(body?.customer_uid, 32),
        docDate: invDate(body?.doc_date) || todayVienna(),
        sfrom: invDate(body?.service_from), sto: invDate(body?.service_to),
        subject: invClean(body?.subject),
        intro: invClean(body?.intro, 5000),
        lang: body?.lang === 'en' ? 'en' : 'de',
        vatRate, vatFree,
        vatNote: invClean(body?.vat_note, 190),
        note: invClean(body?.note, 5000),
        status: ['entwurf', 'gesendet', 'bezahlt'].includes(body?.status) ? body.status : 'entwurf'
      }
    )
    await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id])
    for (const it of items) {
      await conn.query(
        `INSERT INTO invoice_items (invoice_id, position, description, quantity, unit, unit_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, it.position, it.description, it.quantity, it.unit, it.unit_price]
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
    return { ok: true }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
