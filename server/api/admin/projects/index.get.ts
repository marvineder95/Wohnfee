import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/projects?category=&q=&upcoming=1
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const qs = getQuery(event)
  const category = String(qs.category || '')
  const q = String(qs.q || '').trim()
  const upcoming = String(qs.upcoming || '') === '1'

  const where: string[] = []
  const params: any = {}
  if (['staging', 'leasing', 'showroom'].includes(category)) {
    where.push('category = :category')
    params.category = category
  }
  if (q) {
    where.push(`(customer LIKE :q OR title LIKE :q OR status_info LIKE :q OR next_step LIKE :q OR note LIKE :q)`)
    params.q = `%${q}%`
  }
  if (upcoming) {
    // Deadline in den nächsten 60 Tagen oder überfällig
    where.push(`deadline_date IS NOT NULL AND deadline_date <= CURDATE() + INTERVAL 60 DAY`)
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const projects = await query(
    `SELECT id, category, section, customer, title, art, team, status_info AS statusInfo,
            deadline_text AS deadlineText, deadline_date AS deadlineDate, note,
            next_step AS nextStep, who, date_info AS dateInfo, sort_order AS sortOrder
     FROM projects ${whereSql}
     ORDER BY category, sort_order`,
    params
  )
  const counts = await query(
    `SELECT category, COUNT(*) AS n FROM projects GROUP BY category`
  )
  return {
    projects,
    counts: Object.fromEntries(counts.map((r: any) => [r.category, Number(r.n)]))
  }
})
