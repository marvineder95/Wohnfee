import nodemailer from 'nodemailer'
import { wrapMail, hasMailLayout, mailButton, mailSignature } from './mail-layout'

// SMTP via Env konfigurierbar:
//   NUXT_SMTP_HOST, NUXT_SMTP_PORT (default 465), NUXT_SMTP_USER, NUXT_SMTP_PASSWORD,
//   NUXT_SMTP_SECURE (default true bei 465), NUXT_MAIL_FROM (default noreply@wohnfee.at)
// Ist kein SMTP konfiguriert, wird die Mail nur geloggt (Dev-Modus).
export function mailerConfigured(): boolean {
  const config = useRuntimeConfig()
  return !!(config.smtpHost && config.smtpUser && config.smtpPassword)
}

export async function sendMail(to: string, subject: string, text: string, html: string, attachments?: Array<{ filename: string; content: Buffer }>, headers?: Record<string, string>) {
  const config = useRuntimeConfig()
  if (!mailerConfigured()) {
    console.log(`[mailer] SMTP nicht vollständig konfiguriert (Host/User/Password nötig) — Mail NICHT versendet an ${to}: "${subject}"`)
    return false
  }
  const port = Number(config.smtpPort || 465)
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port,
    secure: config.smtpSecure !== undefined ? !!config.smtpSecure : port === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined
  })
  await transporter.sendMail({
    from: config.mailFrom || 'noreply@wohnfee.at',
    to,
    subject,
    text,
    // jede Mail bekommt das WOHNFEE-Layout (Logo, Fuß mit Firmendaten), sofern sie es nicht schon hat
    html: hasMailLayout(html) ? html : wrapMail(html),
    attachments,
    headers
  })
  return true
}

export function inviteMail({ to, displayName, inviterName, inviteUrl }: {
  to: string
  displayName: string
  inviterName: string
  inviteUrl: string
}) {
  const subject = 'Einladung zum WOHNFEE Dashboard'
  const text =
    `Hallo ${displayName},\n\n` +
    `${inviterName} hat dich zum WOHNFEE Dashboard eingeladen.\n\n` +
    `Rufe folgenden Link auf, um deinen Benutzernamen und dein Passwort zu vergeben:\n` +
    `${inviteUrl}\n\n` +
    `Der Link ist 48 Stunden gültig.\n\n` +
    `Liebe Grüße\nWOHNFEE Home Staging`
  const html =
    `<p>Hallo ${escapeHtml(displayName)},</p>` +
    `<p><strong>${escapeHtml(inviterName)}</strong> hat dich zum WOHNFEE Dashboard eingeladen.</p>` +
    mailButton(inviteUrl, 'Benutzerkonto einrichten') +
    `<p style="font-size:12px;color:#8a857a">Falls der Button nicht funktioniert, diesen Link im Browser öffnen:<br>${inviteUrl}</p>` +
    `<p>Der Link ist 48 Stunden gültig.</p>` +
    mailSignature('de', 'Liebe Grüße')
  return { subject, text, html }
}

export function resetMail({ to, displayName, inviterName, resetUrl }: {
  to: string
  displayName: string
  inviterName: string
  resetUrl: string
}) {
  const subject = 'Passwort zurücksetzen - WOHNFEE Dashboard'
  const text =
    `Hallo ${displayName},\n\n` +
    `${inviterName} hat ein Zurücksetzen deines Passworts für das WOHNFEE Dashboard angefordert.\n\n` +
    `Setze dein Passwort über folgenden Link neu:\n` +
    `${resetUrl}\n\n` +
    `Der Link ist 2 Stunden gültig. Falls du dein Passwort nicht zurücksetzen möchtest, ignoriere diese E-Mail.\n\n` +
    `Liebe Grüße\nWOHNFEE Home Staging`
  const html =
    `<p>Hallo ${escapeHtml(displayName)},</p>` +
    `<p><strong>${escapeHtml(inviterName)}</strong> hat ein Zurücksetzen deines Passworts für das WOHNFEE Dashboard angefordert.</p>` +
    mailButton(resetUrl, 'Neues Passwort vergeben') +
    `<p style="font-size:12px;color:#8a857a">Falls der Button nicht funktioniert, diesen Link im Browser öffnen:<br>${resetUrl}</p>` +
    `<p>Der Link ist 2 Stunden gültig. Falls du dein Passwort nicht zurücksetzen möchtest, ignoriere diese E-Mail.</p>` +
    mailSignature('de', 'Liebe Grüße')
  return { subject, text, html }
}

export function selfResetMail({ to, displayName, resetUrl }: {
  to: string
  displayName: string
  resetUrl: string
}) {
  const subject = 'Passwort zurücksetzen - WOHNFEE Dashboard'
  const text =
    `Hallo ${displayName},\n\n` +
    `für dein Konto am WOHNFEE Dashboard wurde ein Zurücksetzen des Passworts angefordert.\n\n` +
    `Setze dein Passwort über folgenden Link neu:\n` +
    `${resetUrl}\n\n` +
    `Der Link ist 2 Stunden gültig. Falls du das nicht warst, ignoriere diese E-Mail — dein Passwort bleibt unverändert.\n\n` +
    `Liebe Grüße\nWOHNFEE Home Staging`
  const html =
    `<p>Hallo ${escapeHtml(displayName)},</p>` +
    `<p>für dein Konto am WOHNFEE Dashboard wurde ein Zurücksetzen des Passworts angefordert.</p>` +
    mailButton(resetUrl, 'Neues Passwort vergeben') +
    `<p style="font-size:12px;color:#8a857a">Falls der Button nicht funktioniert, diesen Link im Browser öffnen:<br>${resetUrl}</p>` +
    `<p>Der Link ist 2 Stunden gültig. Falls du das nicht warst, ignoriere diese E-Mail — dein Passwort bleibt unverändert.</p>` +
    mailSignature('de', 'Liebe Grüße')
  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Newsletter-Versand an Abonnenten: subject + Freitext, eingepackt in das
// Wohnfee-Mail-Layout (dunkelgrüner Kopf mit Wortmarke, cremefarbener Grund,
// Footer mit Firmendaten + Abmeldehinweis).
export function newsletterMail(data: { subject: string; bodyText: string; lang: 'de' | 'en'; unsubscribeUrl: string }) {
  const esc = escapeHtml
  const isEn = data.lang === 'en'
  // Absätze aus dem Freitext bilden (Leerzeilen als Trenner)
  const paragraphs = data.bodyText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
  const bodyHtml = paragraphs
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

  const text =
    `${data.bodyText}\n\n—\n` +
    (isEn
      ? `WOHNFEE – Eder & Steiner GmbH\nObersdorferstraße 5, 2201 Seyring\noffice@wohnfee.at | +43 676 9202236 | wohnfee.at\n\nUnsubscribe: ${data.unsubscribeUrl}`
      : `WOHNFEE – Eder & Steiner GmbH\nObersdorferstraße 5, 2201 Seyring\noffice@wohnfee.at | +43 676 9202236 | wohnfee.at\n\nVom Newsletter abmelden: ${data.unsubscribeUrl}`)

  const html = wrapMail(
    `<h1>${esc(data.subject)}</h1>` + bodyHtml,
    {
      lang: data.lang,
      preheader: paragraphs[0]?.slice(0, 120),
      footerNote: isEn
        ? `You receive this e-mail because you subscribed to the WOHNFEE newsletter. <a href="${esc(data.unsubscribeUrl)}" style="color:#8a857a">Unsubscribe</a>`
        : `Du erhältst diese E-Mail, weil du dich beim WOHNFEE-Newsletter angemeldet hast. <a href="${esc(data.unsubscribeUrl)}" style="color:#8a857a">Vom Newsletter abmelden</a>`
    }
  )

  return { subject: data.subject, text, html }
}

// Benachrichtigung an office@wohnfee.at bei neuer Mietanfrage aus dem Furniture-Leasing-Shop
export function rentalInquiryMail(data: {
  number: string
  name: string
  email: string
  phone: string | null
  address: string
  period: string
  deliveryOption: string
  deliveryNotes: string | null
  notes: string | null
  items: Array<{ title: string; quantity: number; durationMonths: number; monthlyPrice: number | null }>
  monthlyTotal: number
}) {
  const esc = escapeHtml
  const itemsText = data.items
    .map(i => `  - ${i.quantity}× ${i.title} (${i.durationMonths} Mon., ${i.monthlyPrice !== null ? i.monthlyPrice.toFixed(2).replace('.', ',') + ' €/Mon.' : 'Preis auf Anfrage'})`)
    .join('\n')
  const itemsHtml = data.items
    .map(i => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.quantity}×</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(i.title)}</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee">${i.durationMonths} Mon.</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${i.monthlyPrice !== null ? i.monthlyPrice.toFixed(2).replace('.', ',') + '&nbsp;€/Mon.' : 'auf Anfrage'}</td></tr>`)
    .join('')
  const total = data.monthlyTotal.toFixed(2).replace('.', ',')
  const subject = `Neue Mietanfrage ${data.number} — ${data.name}`
  const text =
    `Neue Mietanfrage über den Furniture-Leasing-Shop:\n\n` +
    `Anfragenummer: ${data.number}\n` +
    `Name: ${data.name}\nE-Mail: ${data.email}\n` +
    (data.phone ? `Telefon: ${data.phone}\n` : '') +
    `Adresse: ${data.address}\n` +
    `Mietzeitraum: ${data.period}\n` +
    `Abwicklung: ${data.deliveryOption}\n` +
    (data.deliveryNotes ? `Lieferhinweise: ${data.deliveryNotes}\n` : '') +
    `\nPositionen:\n${itemsText}\n\nMonatliche Gesamtsumme: ${total} €\n` +
    (data.notes ? `\nAnmerkungen: ${data.notes}\n` : '') +
    `\nDie Anfrage liegt im WOHNFEE Dashboard unter „Mietanfragen“ zur Bearbeitung bereit.`
  const html =
    `<h2>Neue Mietanfrage ${esc(data.number)}</h2>` +
    `<table style="border-collapse:collapse;margin-bottom:14px">` +
    `<tr><td style="padding:3px 12px 3px 0;color:#777">Name</td><td><strong>${esc(data.name)}</strong></td></tr>` +
    `<tr><td style="padding:3px 12px 3px 0;color:#777">E-Mail</td><td><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></td></tr>` +
    (data.phone ? `<tr><td style="padding:3px 12px 3px 0;color:#777">Telefon</td><td>${esc(data.phone)}</td></tr>` : '') +
    `<tr><td style="padding:3px 12px 3px 0;color:#777">Adresse</td><td>${esc(data.address)}</td></tr>` +
    `<tr><td style="padding:3px 12px 3px 0;color:#777">Mietzeitraum</td><td>${esc(data.period)}</td></tr>` +
    `<tr><td style="padding:3px 12px 3px 0;color:#777">Abwicklung</td><td>${esc(data.deliveryOption)}</td></tr>` +
    (data.deliveryNotes ? `<tr><td style="padding:3px 12px 3px 0;color:#777">Lieferhinweise</td><td>${esc(data.deliveryNotes)}</td></tr>` : '') +
    `</table>` +
    `<table style="border-collapse:collapse;width:100%;margin-bottom:10px"><thead>` +
    `<tr style="background:#f6f3ec"><th style="text-align:left;padding:6px 10px">Menge</th><th style="text-align:left;padding:6px 10px">Position</th><th style="text-align:left;padding:6px 10px">Dauer</th><th style="text-align:right;padding:6px 10px">Preis</th></tr>` +
    `</thead><tbody>${itemsHtml}</tbody></table>` +
    `<p style="font-size:1.05em"><strong>Monatliche Gesamtsumme: ${total}&nbsp;€</strong> (zzgl. Liefer-/Abholgebühr)</p>` +
    (data.notes ? `<p><strong>Anmerkungen:</strong><br>${esc(data.notes)}</p>` : '') +
    `<p style="color:#777;font-size:.9em">Die Anfrage liegt im WOHNFEE Dashboard unter „Mietanfragen“ zur Bearbeitung bereit.</p>`
  return { subject, text, html }
}

// Double-Opt-in: Bestätigungsmail nach der Anmeldung im Footer
export function newsletterConfirmMail(data: { confirmUrl: string; lang: 'de' | 'en' }) {
  const en = data.lang === 'en'
  const subject = en ? 'Please confirm your WOHNFEE newsletter subscription' : 'Bitte bestätige deine Anmeldung zum WOHNFEE-Newsletter'
  const text = en
    ? `Hello,\n\nplease confirm that you would like to receive the WOHNFEE newsletter:\n${data.confirmUrl}\n\nIf you did not sign up, simply ignore this e-mail – you will not receive any further messages.\n\nWOHNFEE – Eder & Steiner GmbH`
    : `Hallo,\n\nbitte bestätige, dass du den WOHNFEE-Newsletter erhalten möchtest:\n${data.confirmUrl}\n\nFalls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach – du bekommst dann keine weiteren Nachrichten.\n\nWOHNFEE – Eder & Steiner GmbH`
  const html =
    `<h1>${en ? 'Almost there!' : 'Fast geschafft!'}</h1>` +
    `<p>${en ? 'Please confirm that you would like to receive the WOHNFEE newsletter:' : 'Bitte bestätige, dass du den WOHNFEE-Newsletter erhalten möchtest:'}</p>` +
    mailButton(data.confirmUrl, en ? 'Confirm subscription' : 'Anmeldung bestätigen') +
    `<p style="font-size:13px;color:#8a857a">${en ? 'If you did not sign up, simply ignore this e-mail.' : 'Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.'}</p>`
  return { subject, text, html }
}
