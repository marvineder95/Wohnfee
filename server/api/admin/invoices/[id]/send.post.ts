import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { buildInvoicePdf } from '../../../../utils/invoice-pdf'
import { fmtDate, fmtAmount } from '../../../../utils/invoice-pdf'
import { mailFacts, mailSignature } from '../../../../utils/mail-layout'
import { dueDate } from '../../../../utils/dunning'
import { sendMail } from '../../../../utils/mailer'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/admin/invoices/:id/send — Rechnung als PDF an den Kunden mailen.
// Body: { to?: string } — falls leer, wird die Mailadresse des Kontakts verwendet.
// Setzt den Status auf "gesendet", sobald die Mail tatsaechlich rausging.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rechnungs-ID' })
  }
  const invoice: any = await queryOne('SELECT * FROM invoices WHERE id = :id', { id })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  if (invoice.status === 'storniert') {
    throw createError({ statusCode: 409, statusMessage: 'Stornierte Rechnungen können nicht versendet werden.' })
  }

  const body = await readBody(event).catch(() => ({}))
  let to = String(body?.to || '').trim()
  if (!to && invoice.contact_id) {
    const contact: any = await queryOne('SELECT email FROM contacts WHERE id = :cid', { cid: invoice.contact_id })
    to = String(contact?.email || '').trim()
  }
  if (!to) throw createError({ statusCode: 400, statusMessage: 'Keine E-Mail-Adresse — bitte im Senden-Dialog eine Adresse eintragen.' })
  if (!EMAIL_RE.test(to)) throw createError({ statusCode: 400, statusMessage: 'Die E-Mail-Adresse sieht ungültig aus.' })

  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = :id ORDER BY position',
    { id }
  )
  let stornoInfo = null
  if (invoice.storno_of) {
    stornoInfo = await queryOne('SELECT number, doc_date FROM invoices WHERE id = :oid', { oid: invoice.storno_of })
  }
  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const pdf = await buildInvoicePdf(invoice, items, logoPng, stornoInfo)

  const lang = invoice.lang === 'en' ? 'en' : 'de'
  const t = (de: string, en: string) => (lang === 'en' ? en : de)
  const dateStr = fmtDate(invoice.doc_date, lang)
  const isStorno = !!invoice.storno_of
  const subject = `${isStorno ? t('Stornorechnung', 'Cancellation invoice') : t('Rechnung', 'Invoice')} ${invoice.number}${invoice.subject ? ` – ${invoice.subject}` : ''} – WOHNFEE Home Staging`

  const text =
    `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n` +
    t(
      `anbei erhalten Sie ${isStorno ? 'die Stornorechnung' : 'die Rechnung'} ${invoice.number} vom ${dateStr}.`,
      `please find attached the ${isStorno ? 'cancellation invoice' : 'invoice'} ${invoice.number} dated ${dateStr}.`
    ) +
    (isStorno
      ? t('\n\nDiese Rechnung hebt eine frühere Abrechnung auf.', '\n\nThis invoice cancels a previous billing.')
      : '') +
    `\n\n` +
    t(
      'Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.',
      'If you have any questions, please do not hesitate to contact us.'
    ) +
    `\n\n` +
    t('Mit freundlichen Grüßen', 'Kind regards') + `\nMarvin Eder\nWOHNFEE Home Staging\nEder & Steiner GmbH`

  // Betrag wie im PDF: Netto + USt (außer steuerfrei)
  const netto = Math.round(items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unit_price), 0) * 100) / 100
  const vat = invoice.vat_free ? 0 : Math.round(netto * (Number(invoice.vat_rate) || 20) / 100 * 100) / 100
  const facts: Array<[string, string]> = [
    [isStorno ? t('Stornorechnung', 'Cancellation invoice') : t('Rechnungsnummer', 'Invoice number'), escapeHtml(invoice.number)],
    [t('Rechnungsdatum', 'Invoice date'), escapeHtml(dateStr)]
  ]
  if (!isStorno) facts.push([t('Zahlbar bis', 'Due date'), escapeHtml(fmtDate(dueDate(invoice), lang))])
  facts.push([t('Betrag', 'Amount') + (invoice.vat_free ? '' : t(' inkl. USt.', ' incl. VAT')), escapeHtml(fmtAmount(netto + vat, lang))])

  const html =
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p>` +
    `<p>${t(
      `anbei erhalten Sie ${isStorno ? 'die Stornorechnung' : 'unsere Rechnung'} als PDF.`,
      `please find attached our ${isStorno ? 'cancellation invoice' : 'invoice'} as a PDF.`
    )}${isStorno ? t(' Diese Rechnung hebt eine frühere Abrechnung auf.', ' This invoice cancels a previous billing.') : ''}</p>` +
    mailFacts(facts, { highlightLast: true }) +
    `<p>${t('Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.', 'If you have any questions, please do not hesitate to contact us.')}</p>` +
    `<p>${t('Vielen Dank für Ihr Vertrauen!', 'Thank you for your trust!')}</p>` +
    mailSignature(lang)

  let sent = false
  let sendError = ''
  try {
    sent = await sendMail(to, subject, text, html, [
      { filename: `${isStorno ? 'Storno' : 'Rechnung'}-${invoice.number}.pdf`, content: pdf }
    ])
  } catch (e: any) {
    sendError = String(e?.message || e)
  }

  let statusUpdated = false
  if (sent && invoice.status === 'entwurf') {
    await query("UPDATE invoices SET status = 'gesendet' WHERE id = :id", { id })
    statusUpdated = true
  }
  return { ok: true, sent, statusUpdated, sendError }
})

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
