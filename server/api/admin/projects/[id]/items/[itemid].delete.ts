import { requireAdmin } from '../../../../../utils/admin-auth'
import { query } from '../../../../../utils/db'
import { syncItemStatus } from '../../../../../utils/inventory-sync'

// DELETE /api/admin/projects/:id/items/:itemid — Möbelzuweisung entfernen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemid'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(itemId) || itemId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige ID' })
  }
  await query('DELETE FROM project_items WHERE project_id = :id AND item_id = :itemId', { id, itemId })
  await syncItemStatus(itemId)
  return { ok: true }
})
