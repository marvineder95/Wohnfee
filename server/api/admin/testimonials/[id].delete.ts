import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// DELETE /api/admin/testimonials/:id
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await query('DELETE FROM testimonials WHERE id = :id', { id: Number(getRouterParam(event, 'id')) })
  return { ok: true }
})
