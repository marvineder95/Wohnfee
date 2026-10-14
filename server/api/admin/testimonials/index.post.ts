import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { testimonialFields } from '../../../utils/testimonials'

// POST /api/admin/testimonials – neue Kundenstimme
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const f = testimonialFields(await readBody(event))
  if (!f.quote || !f.name) throw createError({ statusCode: 400, statusMessage: 'Bitte Zitat und Namen angeben.' })
  const res: any = await query(
    `INSERT INTO testimonials (quote, quote_en, name, role, audience, rating, visible, sort_order, note)
     VALUES (:quote, :quote_en, :name, :role, :audience, :rating, :visible, :sort_order, :note)`, f)
  return { ok: true, id: res.insertId }
})
