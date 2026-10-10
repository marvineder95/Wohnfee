import { offerByToken, publicOfferView } from '../../../utils/offer-public'
import { acceptOffer, declineOffer } from '../../../utils/reservations'
import { notifyDecision } from '../../../utils/reservation-job'
import { clientIp, assertNotLimited, countAttempt } from '../../../utils/rate-limit'
import { publicOrigin } from '../../../utils/site'

// POST /api/offer/:token/respond — { action: 'accept', name, confirm: true } | { action: 'decline', reason? }
export default defineEventHandler(async (event) => {
  const key = `offer-respond:${clientIp(event)}`
  assertNotLimited(key, 20, 60 * 60 * 1000)
  countAttempt(key, 60 * 60 * 1000)
  const offer = await offerByToken(getRouterParam(event, 'token'))
  const body = await readBody(event).catch(() => ({}))
  const en = offer.lang === 'en'

  if (['angenommen', 'abgelehnt'].includes(offer.status)) {
    throw createError({ statusCode: 409, statusMessage: en ? 'You have already replied to this offer.' : 'Sie haben auf dieses Angebot bereits geantwortet.' })
  }

  if (body?.action === 'accept') {
    const name = String(body?.name || '').trim().slice(0, 190)
    if (name.length < 2) throw createError({ statusCode: 400, statusMessage: en ? 'Please enter your name.' : 'Bitte geben Sie Ihren Namen an.' })
    if (body?.confirm !== true) throw createError({ statusCode: 400, statusMessage: en ? 'Please confirm the acceptance.' : 'Bitte bestätigen Sie die Annahme.' })
    await acceptOffer(offer.id, { by: 'kunde', name })
    notifyDecision(offer.id, true, { name }, publicOrigin(event)).catch(() => {})
  } else if (body?.action === 'decline') {
    const reason = String(body?.reason || '').trim().slice(0, 2000) || null
    await declineOffer(offer.id, { by: 'kunde', reason })
    notifyDecision(offer.id, false, { reason }, publicOrigin(event)).catch(() => {})
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Unbekannte Aktion.' })
  }
  return publicOfferView(await offerByToken(getRouterParam(event, 'token')))
})
