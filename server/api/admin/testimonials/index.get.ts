import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { mapTestimonial } from '../../../utils/testimonials'

// GET /api/admin/testimonials – alle Kundenstimmen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { items: (await query<any>('SELECT * FROM testimonials ORDER BY sort_order, id')).map(mapTestimonial) }
})
