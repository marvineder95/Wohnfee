import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { buildInvoicePdf, fmtDate } from '../../../../utils/invoice-pdf'
import { sendMail, mailerConfigured } from '../../../../utils/mailer'
import { REMINDER_LEVELS, REMINDER_GRACE_DAYS, dueDate } from '../../../../utils/dunning'
import { addDays } from '../../../../utils/recurring'
import { todayVienna } from '../../../../utils/site'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/admin/invoices/:id/reminder — nächste Mahnstufe per E-Mail (mit Rechnungs-PDF).
// Body: { to?: string, markOnly?: boolean } — markOnly vermerkt eine z. B. telefonisch
// oder per Post erfolgte Erinnerung, ohne eine Mail zu senden.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const invoice: any = await queryOne('SELECT * FROM invoices WHERE id = :id', { id })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  if (invoice.status !== 'gesendet' || invoice.storno_of) {
    throw createError({ statusCode: 409, statusMessage: 'Erinnerungen gibt es nur für versendete, offene Rechnungen.' })
  }
  const level = Number(invoice.reminder_level || 0)
  if (level >= REMINDER_LEVELS.length) {
    throw createError({ statusCode: 409, statusMessage: 'Die letzte Mahnstufe ist bereits erreicht.' })
  }
  const label = REMINDER_LEVELS[level]
  const body = await readBody(event).catch(() => ({}))
  const today = todayVienna()

  let sent = false
  if (!body?.markOnly) {
    if (!mailerConfigured()) {
      throw createError({ statusCode: 503, statusMessage: 'Der E-Mail-Versand ist noch nicht eingerichtet (SMTP). Du kannst die Erinnerung stattdessen nur vermerken.' })
    }
    let to = String(body?.to || '').trim()
    if (!to && invoice.contact_id) {
      const c: any = await queryOne('SELECT email FROM contacts WHERE id = :cid', { cid: invoice.contact_id })
      to = String(c?.email || '').trim()
    }
    if (!to || !EMAIL_RE.test(to)) throw createError({ statusCode: 400, statusMessage: 'Bitte eine gültige E-Mail-Adresse angeben.' })

    const items: any[] = await query(
      'SELECT position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = :id ORDER BY position', { id }
    )
    const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
    const pdf = await buildInvoicePdf(invoice, items, logoPng, null)
    const netto = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0)
    const brutto = invoice.vat_free ? netto : Math.round(netto * (1 + Number(invoice.vat_rate) / 100) * 100) / 100
    const lang = invoice.lang === 'en' ? 'en' : 'de'
    const t = (de: string, en: string) => (lang === 'en' ? en : de)
    const amount = brutto.toLocaleString(lang === 'en' ? 'en-IE' : 'de-AT', { style: 'currency', currency: 'EUR' })
    const newDue = fmtDate(addDays(today, REMINDER_GRACE_DAYS), lang)
    const signer = user.displayName || 'WOHNFEE'
    const subject = `${t(label.de, label.en)}: ${t('Rechnung', 'Invoice')} ${invoice.number} – WOHNFEE Home Staging`
    const lines = [
      t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam') + ',',
      level === 0
        ? t(
          `sicher ist es Ihrer Aufmerksamkeit entgangen: Unsere Rechnung ${invoice.number} vom ${fmtDate(invoice.doc_date, lang)} über ${amount} ist seit dem ${fmtDate(dueDate(invoice), lang)} fällig.`,
          `perhaps it has escaped your attention: our invoice ${invoice.number} dated ${fmtDate(invoice.doc_date, lang)} for ${amount} was due on ${fmtDate(dueDate(invoice), lang)}.`)
        : t(
          `trotz unserer Erinnerung ist die Rechnung ${invoice.number} vom ${fmtDate(invoice.doc_date, lang)} über ${amount} noch offen.`,
          `despite our reminder, invoice ${invoice.number} dated ${fmtDate(invoice.doc_date, lang)} for ${amount} is still outstanding.`),
      t(`Wir bitten Sie, den Betrag bis ${newDue} zu überweisen. Die Rechnung finden Sie nochmals im Anhang.`,
        `Please transfer the amount by ${newDue}. You will find the invoice attached again.`),
      t('Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie es bitte als gegenstandslos.',
        'If your payment has crossed with this message, please disregard it.'),
      t('Mit freundlichen Grüßen', 'Kind regards') + `\n${signer}\nWOHNFEE Home Staging\nEder & Steiner GmbH`
    ]
    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
    sent = await sendMail(to, subject, lines.join('\n\n'), lines.map(l => `<p>${esc(l).replace(/\n/g, '<br>')}</p>`).join(''), [
      { filename: `Rechnung-${invoice.number}.pdf`, content: pdf }
    ])
  }
  await query('UPDATE invoices SET reminder_level = reminder_level + 1, last_reminder_at = :today WHERE id = :id', { today, id })
  return { ok: true, sent, level: level + 1, label: label.de }
})
