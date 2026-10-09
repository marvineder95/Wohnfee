import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { sendMail, newsletterMail, mailerConfigured } from '../../../utils/mailer'
import { publicOrigin } from '../../../utils/site'

// POST /api/admin/newsletter/send — Newsletter an alle aktiven Abonnenten.
// Body: { subject: string, body: string }
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event)
  const subject = String(body?.subject || '').trim()
  const bodyText = String(body?.body || '').trim()

  if (!subject || subject.length > 190) {
    throw createError({ statusCode: 400, statusMessage: 'Betreff fehlt oder ist zu lang' })
  }
  if (!bodyText || bodyText.length > 20000) {
    throw createError({ statusCode: 400, statusMessage: 'Text fehlt oder ist zu lang' })
  }

  const recipients = await query<any>(
    `SELECT email, lang, unsub_token FROM newsletter_subscribers WHERE status = 'aktiv' ORDER BY id`
  )
  if (!recipients.length) {
    throw createError({ statusCode: 400, statusMessage: 'Keine aktiven Abonnenten vorhanden' })
  }

  let sent = 0
  const failed: string[] = []
  const configured = mailerConfigured()

  // SMTP konfiguriert: echte Zustellung. Nicht konfiguriert (Dev):
  // Versand simulieren, damit der Ablauf getestet werden kann.
  if (configured) {
    for (const r of recipients) {
      try {
        // persönlicher Abmeldelink + One-Click-Abmeldung im Mailprogramm (RFC 8058)
        const unsubscribeUrl = `${publicOrigin(event)}/newsletter/abmelden?t=${r.unsub_token}`
        const mail = newsletterMail({ subject, bodyText, lang: r.lang === 'en' ? 'en' : 'de', unsubscribeUrl })
        await sendMail(r.email, mail.subject, mail.text, mail.html, undefined, {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        })
        sent++
      } catch (e) {
        console.error(`[newsletter] Versand an ${r.email} fehlgeschlagen`, e)
        failed.push(r.email)
      }
    }
  } else {
    sent = recipients.length
    console.log(`[newsletter] SMTP nicht konfiguriert – Versand an ${recipients.length} Empfänger simuliert: "${subject}"`)
  }

  await query(
    `INSERT INTO newsletter_sends (subject, body_text, recipient_count, sent_by)
     VALUES (:subject, :bodyText, :count, :sentBy)`,
    { subject, bodyText, count: sent, sentBy: user.displayName || user.username }
  )

  return { ok: true, sent, failed, simulated: !configured }
})
