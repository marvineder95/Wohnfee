import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// DELETE /api/admin/packages/:id – Paket löschen (die Möbel selbst bleiben im Inventar)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await query('DELETE FROM rental_package_items WHERE package_id = :id', { id })
  await query('DELETE FROM rental_packages WHERE id = :id', { id })
  return { ok: true }
})
