import { createHash, randomBytes } from 'node:crypto'
import { query, queryOne } from '../utils/db'
import { sendMail, newsletterConfirmMail, mailerConfigured } from '../utils/mailer'
import { publicOrigin } from '../utils/site'
import { clientIp, assertNotLimited, countAttempt } from '../utils/rate-limit'

// POST /api/newsletter — Anmeldung aus dem Footer-Formular (Double-Opt-in).
// Body: { email: string, consent: boolean, lang?: 'de'|'en' }
// Neue Adressen sind „ausstehend", bis der Link in der Bestätigungsmail geklickt wurde.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const consent = !!body?.consent
  const lang = body?.lang === 'en' ? 'en' : 'de'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !consent) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse oder Einwilligung fehlt' })
  }
  const limitKey = `newsletter:${clientIp(event)}`
  assertNotLimited(limitKey, 5, 60 * 60 * 1000)
  countAttempt(limitKey, 60 * 60 * 1000)

  const ip = clientIp(event)
  const ipHash = ip ? createHash('sha256').update(ip + '|newsletter').digest('hex') : null

  const existing: any = await queryOne('SELECT id, status FROM newsletter_subscribers WHERE email = :email', { email })
  // Bereits bestätigt: nichts tun (gleiche Antwort, damit niemand Adressen abfragen kann)
  if (existing?.status === 'aktiv') return { ok: true, pending: true }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  await query(
    `INSERT INTO newsletter_subscribers (email, lang, status, ip_hash, confirm_token_hash, unsub_token)
     VALUES (:email, :lang, 'ausstehend', :ipHash, :tokenHash, :unsub)
     ON DUPLICATE KEY UPDATE status = 'ausstehend', lang = VALUES(lang), ip_hash = VALUES(ip_hash),
       confirm_token_hash = VALUES(confirm_token_hash), unsub_token = COALESCE(unsub_token, VALUES(unsub_token))`,
    { email, lang, ipHash, tokenHash, unsub: randomBytes(16).toString('hex') }
  )

  const confirmUrl = `${publicOrigin(event)}/newsletter/bestaetigen?token=${token}`
  if (!mailerConfigured()) console.log(`[newsletter] SMTP fehlt – Bestätigungslink für ${email}: ${confirmUrl}`)
  const mail = newsletterConfirmMail({ confirmUrl, lang })
  try {
    await sendMail(email, mail.subject, mail.text, mail.html)
  } catch (e: any) {
    console.error('[newsletter] Bestätigungsmail fehlgeschlagen:', e?.message || e)
  }
  return { ok: true, pending: true }
})
