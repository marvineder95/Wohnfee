import { query, queryOne } from '../../utils/db'
import { newsletterPage } from '../../utils/newsletter-page'

// POST /newsletter/abmelden?t= — Abmeldung ausführen (Formular oder RFC 8058 One-Click
// über den List-Unsubscribe-Header des Mailprogramms)
export default defineEventHandler(async (event) => {
  const t = String(getQuery(event).t || '')
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  const sub: any = /^[a-f0-9]{32}$/.test(t)
    ? await queryOne('SELECT id, lang FROM newsletter_subscribers WHERE unsub_token = :t', { t })
    : null
  if (!sub) return newsletterPage({ lang: 'de', title: 'Link ungültig', text: 'Dieser Abmeldelink ist ungültig.' })
  await query("UPDATE newsletter_subscribers SET status = 'abgemeldet' WHERE id = :id", { id: sub.id })
  const en = sub.lang === 'en'
  return newsletterPage({
    lang: en ? 'en' : 'de',
    title: en ? 'You have been unsubscribed' : 'Du bist abgemeldet',
    text: en ? 'You will not receive any further newsletters. Sorry to see you go!' : 'Du erhältst keine Newsletter mehr. Schade, dass du gehst!'
  })
})
