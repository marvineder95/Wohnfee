import { query } from '../../../utils/db'
import { buildOfferPdf } from '../../../utils/offer-pdf'
import { offerByToken } from '../../../utils/offer-public'

// GET /api/offer/:token/pdf — Angebots-PDF für den Kunden
export default defineEventHandler(async (event) => {
  const offer = await offerByToken(getRouterParam(event, 'token'))
  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position', { id: offer.id })
  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const pdf = await buildOfferPdf(offer, items, logoPng)
  const fname = encodeURIComponent(`Angebot-${String(offer.number).replace(/\//g, '-')}.pdf`)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `${getQuery(event).download ? 'attachment' : 'inline'}; filename*=UTF-8''${fname}`)
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  return pdf
})
