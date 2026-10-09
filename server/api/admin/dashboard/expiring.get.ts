import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/dashboard/expiring — die 3 Projekte, die als Nächstes auslaufen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const projects = await query(
    `SELECT p.id, p.category, p.customer, p.title,
            p.deadline_date AS deadlineDate, p.deadline_text AS deadlineText,
            COUNT(pi.id) AS itemCount
     FROM projects p
     LEFT JOIN project_items pi ON pi.project_id = p.id
     WHERE p.deadline_date IS NOT NULL
     GROUP BY p.id, p.category, p.customer, p.title, p.deadline_date, p.deadline_text
     HAVING itemCount > 0
     ORDER BY p.deadline_date ASC
     LIMIT 3`
  )
  return {
    projects: projects.map((r: any) => ({
      id: r.id,
      category: r.category,
      customer: r.customer,
      title: r.title,
      deadlineDate: r.deadlineDate,
      deadlineText: r.deadlineText,
      itemCount: Number(r.itemCount)
    }))
  }
})
