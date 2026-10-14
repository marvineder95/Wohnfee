import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// DELETE /api/admin/partners/:id
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await query('DELETE FROM partners WHERE id = :id', { id: Number(getRouterParam(event, 'id')) })
  return { ok: true }
})
