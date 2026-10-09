import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { buildOfferPdf } from '../../../../utils/offer-pdf'
import { fmtDate } from '../../../../utils/invoice-pdf'
import { sendMail } from '../../../../utils/mailer'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/admin/offers/:id/send — Angebot als PDF an den Kunden mailen.
// Body: { to?: string } — falls leer, wird die Mailadresse des Kontakts verwendet.
// Setzt den Status auf "gesendet", sobald die Mail tatsaechlich rausging.
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

  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position',
    { id }
  )
  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const pdf = await buildOfferPdf(offer, items, logoPng)

  const lang = offer.lang === 'en' ? 'en' : 'de'
  const t = (de: string, en: string) => (lang === 'en' ? en : de)
  const dateStr = fmtDate(offer.doc_date, lang)
  const validStr = fmtDate(offer.valid_until, lang)
  const subject = `${t('Angebot', 'Offer')} ${offer.number}${offer.subject ? ` – ${offer.subject}` : ''} – WOHNFEE Home Staging`

  const text =
    `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n` +
    t(
      `anbei erhalten Sie unser Angebot ${offer.number} vom ${dateStr}${validStr ? ` (gültig bis ${validStr})` : ''}.`,
      `please find attached our offer ${offer.number} dated ${dateStr}${validStr ? ` (valid until ${validStr})` : ''}.`
    ) +
    `\n\n` +
    t(
      'Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.',
      'If you have any questions, please do not hesitate to contact us.'
    ) +
    `\n\n` +
    t('Mit freundlichen Grüßen', 'Kind regards') + `\nMarvin Eder\nWOHNFEE Home Staging\nEder & Steiner GmbH`

  const html =
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p>` +
    `<p>${t(
      `anbei erhalten Sie unser Angebot <strong>${escapeHtml(offer.number)}</strong> vom ${dateStr}${validStr ? ` (gültig bis ${validStr})` : ''}.`,
      `please find attached our offer <strong>${escapeHtml(offer.number)}</strong> dated ${dateStr}${validStr ? ` (valid until ${validStr})` : ''}.`
    )}</p>` +
    `<p>${t('Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.', 'If you have any questions, please do not hesitate to contact us.')}</p>` +
    `<p>${t('Mit freundlichen Grüßen', 'Kind regards')}<br><strong>Marvin Eder</strong><br>WOHNFEE Home Staging<br>Eder &amp; Steiner GmbH</p>`

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
  return { ok: true, sent, statusUpdated, sendError }
})

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
