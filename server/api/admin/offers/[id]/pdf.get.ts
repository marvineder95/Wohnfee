import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { buildOfferPdf } from '../../../../utils/offer-pdf'

// GET /api/admin/offers/:id/pdf — Angebot als PDF (WOHNFEE-Design)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Angebots-ID' })
  }
  const offer: any = await queryOne('SELECT * FROM offers WHERE id = :id', { id })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position',
    { id }
  )
  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const pdf = await buildOfferPdf(offer, items, logoPng)

  const fname = encodeURIComponent(`${offer.number.replace(/\//g, '-')}.pdf`).replace(/['()]/g, '')
  // ?inline=1 → für die Vorschau im Popup (Browser zeigt das PDF an), sonst Download
  const inline = getQuery(event).inline === '1'
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${fname}`)
  return pdf
})
