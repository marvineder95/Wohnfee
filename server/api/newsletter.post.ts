import { createHash } from 'node:crypto'
import { query } from '../utils/db'

// POST /api/newsletter — Anmeldung aus dem Footer-Formular speichern.
// Body: { email: string, consent: boolean, lang?: 'de'|'en' }
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const consent = !!body?.consent
  const lang = body?.lang === 'en' ? 'en' : 'de'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !consent) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse oder Einwilligung fehlt' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || ''
  const ipHash = ip ? createHash('sha256').update(ip + '|newsletter').digest('hex') : null

  // Idempotent: bestehende Adresse wird reaktiviert statt Fehler zu werfen
  await query(
    `INSERT INTO newsletter_subscribers (email, lang, status, ip_hash)
     VALUES (:email, :lang, 'aktiv', :ipHash)
     ON DUPLICATE KEY UPDATE status = 'aktiv', lang = VALUES(lang)`,
    { email, lang, ipHash }
  )

  return { ok: true }
})
