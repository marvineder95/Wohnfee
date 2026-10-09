import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// GET /api/admin/offers/:id — Detail inkl. Positionen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Angebots-ID' })
  }
  const offer = await queryOne('SELECT * FROM offers WHERE id = :id', { id })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  const items = await query(
    `SELECT id, position, description, quantity, unit, unit_price
     FROM offer_items WHERE offer_id = :id ORDER BY position`,
    { id }
  )
  let invoice: any = null
  if (offer.invoice_id) {
    invoice = await queryOne('SELECT id, number, status, doc_date FROM invoices WHERE id = :iid', { iid: offer.invoice_id })
  }
  return { offer, items, invoice }
})
