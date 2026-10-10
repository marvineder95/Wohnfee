import { offerByToken, publicOfferView } from '../../../utils/offer-public'

// GET /api/offer/:token — Angebot für die Kundenseite /angebot/:token
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  const offer = await offerByToken(getRouterParam(event, 'token'))
  return publicOfferView(offer)
})
