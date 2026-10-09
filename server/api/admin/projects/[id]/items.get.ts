import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// GET /api/admin/projects/:id/items — zugewiesene Möbel des Projekts
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Projekt-ID' })
  }
  const project = await queryOne('SELECT id FROM projects WHERE id = :id', { id })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })

  const items = await query(
    `SELECT pi.id AS assignment_id, pi.item_id, pi.quantity, pi.return_date, pi.note,
            pi.assigned_at, i.title, i.status, i.warehouse, i.category AS itemCategory,
            i.rent_price_1m, i.rent_price_3m
     FROM project_items pi
     JOIN inventory_items i ON i.id = pi.item_id
     WHERE pi.project_id = :id
     ORDER BY i.title`,
    { id }
  )
  return { items }
})
