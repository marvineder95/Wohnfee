import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// DELETE /api/admin/inventory/:id — Objekt endgültig löschen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Objekt-ID' })
  }
  const existing = await queryOne('SELECT id FROM inventory_items WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Objekt nicht gefunden' })
  await query('DELETE FROM inventory_items WHERE id = :id', { id })
  return { ok: true }
})
