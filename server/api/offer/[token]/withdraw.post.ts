import { offerByToken, publicOfferView } from '../../../utils/offer-public'
import { withdrawOffer } from '../../../utils/reservations'
import { notifyWithdrawal } from '../../../utils/reservation-job'
import { clientIp, assertNotLimited, countAttempt } from '../../../utils/rate-limit'
import { publicOrigin } from '../../../utils/site'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/offer/:token/withdraw — Online-Widerruf (§ 13a FAGG): { name, email, confirm: true }
export default defineEventHandler(async (event) => {
  const key = `offer-withdraw:${clientIp(event)}`
  assertNotLimited(key, 10, 60 * 60 * 1000)
  countAttempt(key, 60 * 60 * 1000)
  const offer = await offerByToken(getRouterParam(event, 'token'))
  const en = offer.lang === 'en'
  const body = await readBody(event).catch(() => ({}))
  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim()
  if (name.length < 2) throw createError({ statusCode: 400, statusMessage: en ? 'Please enter your name.' : 'Bitte geben Sie Ihren Namen an.' })
  if (!EMAIL_RE.test(email)) throw createError({ statusCode: 400, statusMessage: en ? 'Please enter a valid e-mail address for the confirmation.' : 'Bitte eine gültige E-Mail-Adresse für die Bestätigung angeben.' })
  if (body?.confirm !== true) throw createError({ statusCode: 400, statusMessage: 'Bitte bestätigen.' })
  const res = await withdrawOffer(offer.id, { name, email })
  // Eingangsbestätigung (Inhalt, Datum, Uhrzeit) an den Kunden + Info ans Team
  await notifyWithdrawal(offer.id, { name, email, delivered: res.delivered }, publicOrigin(event)).catch((e: any) =>
    console.error('[widerruf] Benachrichtigung fehlgeschlagen:', e?.message || e))
  return publicOfferView(await offerByToken(getRouterParam(event, 'token')))
})
