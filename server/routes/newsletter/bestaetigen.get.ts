import { createHash } from 'node:crypto'
import { query, queryOne } from '../../utils/db'
import { newsletterPage } from '../../utils/newsletter-page'

// GET /newsletter/bestaetigen?token= — Double-Opt-in-Link aus der Bestätigungsmail
export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token || '')
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  const sub: any = /^[a-f0-9]{64}$/.test(token)
    ? await queryOne('SELECT id, lang, status FROM newsletter_subscribers WHERE confirm_token_hash = :h',
      { h: createHash('sha256').update(token).digest('hex') })
    : null
  if (!sub) {
    return newsletterPage({ lang: 'de', title: 'Link ungültig', text: 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet. Melde dich bei Bedarf einfach erneut im Footer der Website an.' })
  }
  await query(
    "UPDATE newsletter_subscribers SET status = 'aktiv', confirmed_at = NOW(), confirm_token_hash = NULL WHERE id = :id",
    { id: sub.id }
  )
  const en = sub.lang === 'en'
  return newsletterPage({
    lang: en ? 'en' : 'de',
    title: en ? 'Subscription confirmed' : 'Anmeldung bestätigt',
    text: en ? 'Thank you! You will now receive the WOHNFEE newsletter. You can unsubscribe at any time via the link in every e-mail.'
      : 'Danke! Du erhältst ab jetzt den WOHNFEE-Newsletter. Abmelden kannst du dich jederzeit über den Link in jeder E-Mail.'
  })
})
