import { queryOne } from '../../utils/db'
import { newsletterPage } from '../../utils/newsletter-page'

// GET /newsletter/abmelden?t= — Abmeldeseite mit Bestätigungsknopf.
// Abgemeldet wird erst per POST: E-Mail-Virenscanner rufen Links automatisch auf.
export default defineEventHandler(async (event) => {
  const t = String(getQuery(event).t || '')
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  const sub: any = /^[a-f0-9]{32}$/.test(t)
    ? await queryOne('SELECT lang, status FROM newsletter_subscribers WHERE unsub_token = :t', { t })
    : null
  if (!sub) return newsletterPage({ lang: 'de', title: 'Link ungültig', text: 'Dieser Abmeldelink ist ungültig. Schreib uns gerne an office@wohnfee.at, wir tragen dich sofort aus.' })
  const en = sub.lang === 'en'
  if (sub.status === 'abgemeldet') {
    return newsletterPage({ lang: en ? 'en' : 'de', title: en ? 'Already unsubscribed' : 'Bereits abgemeldet', text: en ? 'You will not receive any further newsletters.' : 'Du bekommst keine Newsletter mehr von uns.' })
  }
  return newsletterPage({
    lang: en ? 'en' : 'de',
    title: en ? 'Unsubscribe from the newsletter?' : 'Vom Newsletter abmelden?',
    text: en ? 'Click the button to stop receiving the WOHNFEE newsletter.' : 'Mit einem Klick auf den Button erhältst du den WOHNFEE-Newsletter nicht mehr.',
    form: { action: `/newsletter/abmelden?t=${t}`, button: en ? 'Unsubscribe' : 'Abmelden' }
  })
})
