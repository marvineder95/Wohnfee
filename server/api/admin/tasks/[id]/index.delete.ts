import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { notifyUser } from '../../../../utils/notifications'
import { TASKS_URL, requireTask } from '../../../../utils/tasks'

// DELETE /api/admin/tasks/:id[?approved=1] — Aufgabe entfernen (nur Admin).
// approved=1: Rückmeldung geprüft und passt → wer erledigt gemeldet hat, bekommt ein „Danke, passt“.
export default defineEventHandler(async (event) => {
  const u = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const t = await requireTask(id, u)
  await query('DELETE FROM tasks WHERE id = :id', { id })
  if (getQuery(event).approved && t.reported_by && t.reported_by !== u.id) {
    await notifyUser(t.reported_by, { title: `Passt – danke! ${t.title}`, body: 'Deine Rückmeldung wurde geprüft und abgehakt.', url: TASKS_URL })
  }
  return { ok: true }
})
