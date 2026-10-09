import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'

// GET /api/admin/rental-inquiries/:id — Detail inkl. Positionen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige ID.' })
  }
  const inquiry: any = await queryOne(
    `SELECT id, number, status, first_name AS firstName, last_name AS lastName, company,
            email, phone, street, zip, city, country,
            start_date AS startDate, end_date AS endDate, duration_months AS durationMonths,
            delivery_option AS deliveryOption, delivery_notes AS deliveryNotes,
            monthly_total AS monthlyTotal, notes,
            created_at AS createdAt
     FROM rental_inquiries WHERE id = :id`, { id }
  )
  if (!inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Mietanfrage nicht gefunden.' })
  }
  const items = await query(
    `SELECT id, item_id AS itemId, title, quantity, duration_months AS durationMonths,
            monthly_price AS monthlyPrice
     FROM rental_inquiry_items WHERE inquiry_id = :id ORDER BY id`, { id }
  )
  return { inquiry, items }
})
