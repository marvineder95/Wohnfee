import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { addEvent, notifyAssignees, requireTask, taskValues } from '../../../../utils/tasks'

// PUT /api/admin/tasks/:id — Aufgabe ändern (nur Admin). Neue Zuständigkeit → Benachrichtigung.
export default defineEventHandler(async (event) => {
  const u = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const old = await requireTask(id, u)
  const v = taskValues(await readBody(event).catch(() => ({})))
  await query(`UPDATE tasks SET title = :title, description = :description, due_date = :due_date, priority = :priority,
               assigned_to = :assigned_to WHERE id = :id`, { ...v, id })
  await addEvent(id, u, 'geaendert')
  if ((old.assigned_to ?? null) !== v.assigned_to) await notifyAssignees({ id, ...v }, 'Aufgabe für dich', u.id)
  return { ok: true }
})
