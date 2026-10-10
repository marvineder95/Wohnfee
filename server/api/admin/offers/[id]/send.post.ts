import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { buildOfferPdf } from '../../../../utils/offer-pdf'
import { fmtDate } from '../../../../utils/invoice-pdf'
import { sendMail } from '../../../../utils/mailer'
import { publicOrigin } from '../../../../utils/site'
import { prepareOfferSend, ensureOfferToken, inquiryForOffer } from '../../../../utils/reservations'
import { offerMail } from '../../../../utils/offer-mails'
import { offerUrl } from '../../../../utils/reservation-job'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/admin/offers/:id/send — Angebot als PDF an den Kunden mailen.
// Body: { to?: string } — falls leer, wird die Mailadresse des Kontakts verwendet.
// Setzt den Status auf "gesendet", sobald die Mail tatsaechlich rausging.
// Die Mail enthält den Link zur Online-Annahme (/angebot/<token>).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Angebots-ID' })
  }
  const offer: any = await queryOne('SELECT * FROM offers WHERE id = :id', { id })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })

  const body = await readBody(event).catch(() => ({}))
  let to = String(body?.to || '').trim()
  if (!to && offer.contact_id) {
    const contact: any = await queryOne('SELECT email FROM contacts WHERE id = :cid', { cid: offer.contact_id })
    to = String(contact?.email || '').trim()
  }
  if (!to) throw createError({ statusCode: 400, statusMessage: 'Keine E-Mail-Adresse — bitte im Senden-Dialog eine Adresse eintragen.' })
  if (!EMAIL_RE.test(to)) throw createError({ statusCode: 400, statusMessage: 'Die E-Mail-Adresse sieht ungültig aus.' })

  // Mietangebot: 3 Tage gültig ab Versand, Möbel bis dahin reserviert
  const validUntil = await prepareOfferSend(id)
  if (validUntil) offer.valid_until = validUntil
  const url = offerUrl(publicOrigin(event), await ensureOfferToken(id))
  const rental = !!(await inquiryForOffer(id))

  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position',
    { id }
  )
  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const pdf = await buildOfferPdf(offer, items, logoPng)

  const lang = offer.lang === 'en' ? 'en' : 'de'
  const { subject, text, html } = offerMail({
    number: offer.number, subject: offer.subject, lang, url, rental,
    dateStr: fmtDate(offer.doc_date, lang), validStr: fmtDate(offer.valid_until, lang)
  })

  let sent = false
  let sendError = ''
  try {
    sent = await sendMail(to, subject, text, html, [
      { filename: `Angebot-${offer.number}.pdf`, content: pdf }
    ])
  } catch (e: any) {
    sendError = String(e?.message || e)
  }

  let statusUpdated = false
  if (sent && offer.status === 'entwurf') {
    await query("UPDATE offers SET status = 'gesendet' WHERE id = :id", { id })
    statusUpdated = true
  }
  // Antwort auch ohne SMTP sinnvoll halten: sent=false signalisiert "nicht versendet"
  return { ok: true, sent, statusUpdated, sendError, url, validUntil: offer.valid_until }
})
