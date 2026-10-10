import { createHash } from 'node:crypto'
import site from '../../data/site.json'
import { query, queryOne } from '../utils/db'
import { sendMail } from '../utils/mailer'

// Öffentlicher Endpunkt für das Kontaktformular auf /kontakt.html
// - validiert Eingaben
// - Honeypot gegen Bots
// - einfaches Rate-Limit: max. 1 Anfrage pro Minute pro IP
// - speichert die Anfrage + schickt eine Benachrichtigung an office@wohnfee.at
const SUBJECTS: Record<string, string> = {
  allgemein: 'Allgemeine Anfrage',
  staging: 'Home Staging',
  redesign: 'Redesign',
  leasing: 'Furniture Leasing',
  presse: 'Presse / Kooperation',
  sonstiges: 'Sonstiges'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim()
  const phone = String(body?.phone || '').trim()
  const subjectKey = String(body?.subject || 'allgemein')
  const message = String(body?.message || '').trim()
  // Honeypot: normale Besucher füllen das Feld (per CSS versteckt) nie aus
  const website = String(body?.website || '')

  if (website) return { ok: true } // Bot — still erschlagen, aber Eintrag verwerfen

  // Fehlermeldungen in der Sprache des Formulars
  const en = body?.lang === 'en'
  const msg = (de: string, enText: string) => (en ? enText : de)

  if (!name || name.length > 128) {
    throw createError({ statusCode: 400, statusMessage: msg('Bitte geben Sie Ihren Namen an.', 'Please enter your name.') })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 190) {
    throw createError({ statusCode: 400, statusMessage: msg('Bitte geben Sie eine gültige E-Mail-Adresse an.', 'Please enter a valid e-mail address.') })
  }
  if (phone.length > 64) {
    throw createError({ statusCode: 400, statusMessage: msg('Telefonnummer ist zu lang.', 'The phone number is too long.') })
  }
  if (!message || message.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: msg('Bitte geben Sie eine Nachricht ein (max. 5000 Zeichen).', 'Please enter a message (max. 5000 characters).') })
  }
  if (!body?.privacy) {
    throw createError({ statusCode: 400, statusMessage: msg('Bitte bestätigen Sie die Datenschutzerklärung.', 'Please confirm the privacy policy.') })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unbekannt'
  const ipHash = createHash('sha256').update(`wf-contact:${ip}`).digest('hex')

  // Rate-Limit: letzte Anfrage von derselben IP vor < 60 Sekunden?
  const recent = await queryOne(
    `SELECT id FROM contact_inquiries
     WHERE ip_hash = :ip AND created_at > NOW() - INTERVAL 1 MINUTE
     LIMIT 1`,
    { ip: ipHash }
  ).catch(() => null)
  if (recent) {
    throw createError({ statusCode: 429, statusMessage: msg('Bitte warten Sie einen Moment, bevor Sie erneut senden.', 'Please wait a moment before sending again.') })
  }

  const subject = SUBJECTS[subjectKey] || SUBJECTS.allgemein
  const result: any = await query(
    `INSERT INTO contact_inquiries (name, email, phone, subject, message, ip_hash)
     VALUES (:name, :email, :phone, :subject, :message, :ip)`,
    { name, email, phone: phone || null, subject, message, ip: ipHash }
  )

  const inquiryId = result.insertId
  const detailUrl = `${site.baseUrl}/admin/anfragen`

  // Benachrichtigung ans Büro (ohne SMTP-Konfiguration nur geloggt)
  try {
    const esc = (s: string) => s.replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
    await sendMail(
      'office@wohnfee.at',
      `Neue Kontaktanfrage #${inquiryId}: ${subject}`,
      `Neue Anfrage über das Kontaktformular (wohnfee.at)\n\n` +
      `Name: ${name}\nE-Mail: ${email}\nTelefon: ${phone || '–'}\nBetreff: ${subject}\n\n` +
      `Nachricht:\n${message}\n\n— Im Dashboard öffnen: ${detailUrl}`,
      `<p>Neue Anfrage über das Kontaktformular (wohnfee.at)</p>` +
      `<p><strong>Name:</strong> ${esc(name)}<br>` +
      `<strong>E-Mail:</strong> ${esc(email)}<br>` +
      `<strong>Telefon:</strong> ${esc(phone || '–')}<br>` +
      `<strong>Betreff:</strong> ${esc(subject)}</p>` +
      `<p><strong>Nachricht:</strong><br>${esc(message).replace(/\n/g, '<br>')}</p>` +
      `<p><a href="${detailUrl}" style="display:inline-block;background:#317046;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Im Dashboard öffnen</a></p>`
    )
  } catch (e: any) {
    console.error('[contact] Benachrichtigungsmail fehlgeschlagen:', e?.message || e)
  }

  // Push an das Team (PWA)
  import('../utils/push').then(({ notifyTeam }) => notifyTeam({
    title: 'Neue Kontaktanfrage',
    body: `${name}${subject ? ' · ' + subject : ''}`,
    url: '/admin/anfragen',
    tag: `contact-${inquiryId}`
  })).catch(() => {})

  return { ok: true, id: inquiryId }
})
