import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// GET /api/admin/invoices/:id — Rechnung inkl. Positionen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rechnungs-ID' })
  }
  const invoice = await queryOne('SELECT * FROM invoices WHERE id = :id', { id })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  const items = await query(
    'SELECT id, position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = :id ORDER BY position',
    { id }
  )
  return { invoice, items }
})
