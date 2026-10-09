import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { syncItemStatus } from '../../../../utils/inventory-sync'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Projekt-ID' })
  }
  const existing = await queryOne('SELECT id, customer FROM projects WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  // Möbel des Projekts merken – nach dem Löschen (Zuweisungen fallen per CASCADE weg)
  // wandern sie wieder ins Lager
  const items: any[] = await query('SELECT item_id FROM project_items WHERE project_id = :id', { id })
  await query('DELETE FROM projects WHERE id = :id', { id })
  for (const it of items) await syncItemStatus(it.item_id)
  return { ok: true, releasedItems: items.length }
})
