import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { testimonialFields } from '../../../utils/testimonials'

// PUT /api/admin/testimonials/:id
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const f = testimonialFields(await readBody(event))
  if (!f.quote || !f.name) throw createError({ statusCode: 400, statusMessage: 'Bitte Zitat und Namen angeben.' })
  await query(
    `UPDATE testimonials SET quote = :quote, quote_en = :quote_en, name = :name, role = :role, audience = :audience,
       rating = :rating, visible = :visible, sort_order = :sort_order, note = :note WHERE id = :id`,
    { ...f, id: Number(getRouterParam(event, 'id')) })
  return { ok: true }
})
