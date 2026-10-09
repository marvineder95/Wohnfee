import { requireAdmin } from '../../../utils/admin-auth'
import { queryOne } from '../../../utils/db'

// GET /api/admin/inventory/next-id — nächste freie Objekt-ID:
// oberhalb des höchsten Werts aus internen IDs und alten ASOL-IDs, mit Puffer ab 32000
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const row: any = await queryOne(
    `SELECT GREATEST(COALESCE(MAX(id), 0), COALESCE(MAX(asol_id), 0), 31999) + 1 AS nextId
     FROM inventory_items`
  )
  return { nextId: Number(row?.nextId) || 32000 }
})
