import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}
function dateOrNull(v: any): string | null {
  const s = String(v ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

// POST /api/admin/projects/:id/items — Möbel dem Projekt zuweisen
// Body: { item_id, quantity?, return_date?, note? }
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Projekt-ID' })
  }
  const body = await readBody(event)
  const itemId = Number(body?.item_id)
  if (!Number.isInteger(itemId) || itemId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte ein Inventarobjekt wählen.' })
  }
  const project = await queryOne('SELECT id FROM projects WHERE id = :id', { id })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  const item = await queryOne('SELECT id, quantity FROM inventory_items WHERE id = :itemId', { itemId })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Inventarobjekt nicht gefunden' })

  const qty = Math.max(1, Math.min(Number(body?.quantity) || 1, Number(item.quantity) || 1))
  await query(
    `INSERT INTO project_items (project_id, item_id, quantity, return_date, note)
     VALUES (:id, :itemId, :qty, :ret, :note)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), return_date = VALUES(return_date), note = VALUES(note)`,
    { id, itemId, qty, ret: dateOrNull(body?.return_date), note: clean(body?.note) }
  )
  return { ok: true }
})
