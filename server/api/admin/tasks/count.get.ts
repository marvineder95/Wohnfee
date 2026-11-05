import { requireAdmin } from '../../../utils/admin-auth'
import { queryOne } from '../../../utils/db'
import { visibleSql } from '../../../utils/tasks'

// GET /api/admin/tasks/count — Menü-Badge: Admin = gemeldete Aufgaben zum Prüfen, Team = offene Aufgaben
export default defineEventHandler(async (event) => {
  const u = await requireAdmin(event)
  const status = u.role === 'superadmin' ? 'gemeldet' : 'offen'
  const r = await queryOne<any>(`SELECT COUNT(*) AS n FROM tasks t WHERE t.status = :status AND ${visibleSql(u)}`, { status })
  return { count: Number(r?.n || 0) }
})
