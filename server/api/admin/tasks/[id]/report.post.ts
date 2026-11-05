import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { notifySuperadmins } from '../../../../utils/notifications'
import { TASKS_URL, addEvent, requireTask, userName } from '../../../../utils/tasks'

// POST /api/admin/tasks/:id/report — „erledigt“ zurückmelden, mit kurzem Text (Pflicht). Admin wird benachrichtigt.
export default defineEventHandler(async (event) => {
  const u = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const t = await requireTask(id, u)
  if (t.status !== 'offen') throw createError({ statusCode: 409, statusMessage: 'Diese Aufgabe wurde bereits als erledigt gemeldet.' })
  const text = String((await readBody(event).catch(() => ({})) as any)?.text || '').trim()
  if (text.length < 3) throw createError({ statusCode: 400, statusMessage: 'Bitte kurz beschreiben, was erledigt wurde.' })
  await query("UPDATE tasks SET status = 'gemeldet', reported_by = :uid, reported_at = NOW() WHERE id = :id", { uid: u.id, id })
  await addEvent(id, u, 'gemeldet', text)
  await notifySuperadmins({
    title: `Erledigt gemeldet: ${t.title}`,
    body: `${userName(u)}: ${text}`.slice(0, 300),
    url: `${TASKS_URL}?task=${id}`
  }, u.id)
  return { ok: true }
})
