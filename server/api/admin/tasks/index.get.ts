import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { teamMembers, visibleSql } from '../../../utils/tasks'

// GET /api/admin/tasks — sichtbare Aufgaben inkl. Verlauf (+ Team-Liste für den Admin)
export default defineEventHandler(async (event) => {
  const u = await requireAdmin(event)
  const tasks = await query<any>(
    `SELECT t.id, t.title, t.description, t.due_date, t.priority, t.assigned_to, t.status, t.reported_at, t.created_at,
            COALESCE(NULLIF(a.display_name, ''), a.username) AS assigned_name,
            COALESCE(NULLIF(c.display_name, ''), c.username) AS created_name,
            COALESCE(NULLIF(r.display_name, ''), r.username) AS reported_name
     FROM tasks t
     LEFT JOIN admin_users a ON a.id = t.assigned_to
     LEFT JOIN admin_users c ON c.id = t.created_by
     LEFT JOIN admin_users r ON r.id = t.reported_by
     WHERE ${visibleSql(u)}
     ORDER BY t.due_date IS NULL, t.due_date, t.priority = 'hoch' DESC, t.id`
  )
  const ids = tasks.map(t => t.id)
  const events = ids.length
    ? await query<any>(`SELECT id, task_id, user_name, kind, text, created_at FROM task_events WHERE task_id IN (${ids.map(Number).join(',')}) ORDER BY id`)
    : []
  for (const t of tasks) t.events = events.filter(e => e.task_id === t.id)
  return { tasks, team: u.role === 'superadmin' ? await teamMembers() : [] }
})
