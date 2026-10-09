import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/inventory/assignments?item_id= — wo ist ein Möbel aktuell im Einsatz?
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const qs = getQuery(event)
  const itemId = Number(qs.item_id)
  const where = Number.isInteger(itemId) && itemId > 0 ? 'WHERE pi.item_id = :itemId' : ''
  const params: any = Number.isInteger(itemId) && itemId > 0 ? { itemId } : {}
  const rows = await query(
    `SELECT pi.id AS assignment_id, pi.item_id, pi.quantity, pi.return_date, pi.note, pi.assigned_at,
            i.title, i.warehouse,
            p.id AS project_id, p.title AS project_title, p.category AS project_category,
            p.customer, p.deadline_date, p.deadline_text
     FROM project_items pi
     JOIN inventory_items i ON i.id = pi.item_id
     JOIN projects p ON p.id = pi.project_id
     ${where}
     ORDER BY pi.return_date IS NULL, pi.return_date ASC, pi.assigned_at DESC
     LIMIT 500`,
    params
  )
  return { assignments: rows }
})
