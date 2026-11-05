import { requireSuperadmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { addEvent, notifyAssignees, taskValues } from '../../../utils/tasks'

// POST /api/admin/tasks — neue Aufgabe (nur Admin); Zuständige bekommen eine Benachrichtigung
export default defineEventHandler(async (event) => {
  const u = await requireSuperadmin(event)
  const v = taskValues(await readBody(event).catch(() => ({})))
  const res: any = await query(
    `INSERT INTO tasks (title, description, due_date, priority, assigned_to, created_by)
     VALUES (:title, :description, :due_date, :priority, :assigned_to, :uid)`, { ...v, uid: u.id })
  const id = Number(res.insertId)
  await addEvent(id, u, 'erstellt')
  await notifyAssignees({ id, ...v }, 'Neue Aufgabe', u.id)
  return { ok: true, id }
})
