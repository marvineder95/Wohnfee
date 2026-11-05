import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { notifyUser } from '../../../../utils/notifications'
import { TASKS_URL, addEvent, notifyAssignees, requireTask } from '../../../../utils/tasks'

// POST /api/admin/tasks/:id/feedback — Rückmeldung reicht noch nicht: Text, was fehlt → Aufgabe wieder offen
export default defineEventHandler(async (event) => {
  const u = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const t = await requireTask(id, u)
  const body = await readBody(event).catch(() => ({})) as any
  const text = String(body?.text || '').trim()
  if (text.length < 3) throw createError({ statusCode: 400, statusMessage: 'Bitte kurz schreiben, was noch fehlt.' })
  const due = String(body?.due_date || '').slice(0, 10)
  await query("UPDATE tasks SET status = 'offen', due_date = COALESCE(:due, due_date) WHERE id = :id",
    { id, due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null })
  await addEvent(id, u, 'feedback', text)
  const note = { title: `Noch offen: ${t.title}`, body: text.slice(0, 300), url: `${TASKS_URL}?task=${id}` }
  if (t.reported_by && t.reported_by !== u.id) await notifyUser(t.reported_by, note)
  else await notifyAssignees({ id, title: t.title, assigned_to: t.assigned_to, due_date: t.due_date }, 'Noch offen', u.id)
  return { ok: true }
})
