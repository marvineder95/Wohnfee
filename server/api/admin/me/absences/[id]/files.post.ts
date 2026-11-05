import { requireAdmin } from '../../../../../utils/admin-auth'
import { query, queryOne } from '../../../../../utils/db'
import { notifySuperadmins } from '../../../../../utils/notifications'
import { employeeForUser, parseRange, absenceRange, personName, saveSickNote } from '../../../../../utils/absences'

// POST /api/admin/me/absences/:id/files — Krankmeldung nachreichen und/oder Krankenstand verlängern (multipart: file, date_to)
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const emp = await employeeForUser(me.id)
  const id = Number(getRouterParam(event, 'id'))
  const a = await queryOne<any>(
    `SELECT id, type, DATE_FORMAT(date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(date_to, '%Y-%m-%d') AS date_to
     FROM employee_absences WHERE id = :id AND employee_id = :emp`, { id, emp: emp.id }
  )
  if (!a || a.type !== 'krankenstand') throw createError({ statusCode: 404, statusMessage: 'Krankenstand nicht gefunden' })
  const parts = await readMultipartFormData(event) || []
  const files = parts.filter(p => p.name === 'file' && p.filename)
  const newTo = parts.find(p => p.name === 'date_to' && !p.filename)?.data.toString('utf8').trim() || ''
  let extended = ''
  if (newTo && newTo !== a.date_to) {
    const r = parseRange({ date_from: a.date_from, date_to: newTo })
    await query('UPDATE employee_absences SET date_to = :to, days = :days WHERE id = :id', { to: r.to, days: r.days, id })
    extended = absenceRange({ date_from: a.date_from, date_to: r.to })
  }
  if (!files.length && !extended) throw createError({ statusCode: 400, statusMessage: 'Bitte Krankmeldung auswählen oder neues Enddatum angeben' })
  for (const f of files.slice(0, 5)) await saveSickNote(emp.id, id, f, me.displayName || me.username || '')
  await notifySuperadmins({
    title: extended ? `Krankenstand verlängert: ${personName(emp)}` : `Krankmeldung hochgeladen: ${personName(emp)}`,
    body: extended ? `Jetzt ${extended}${files.length ? ' – neue Krankmeldung hochgeladen' : ' – Krankmeldung folgt'}` : `Krankenstand ${absenceRange(a)}`,
    url: `/admin/kalender?focus=${a.date_from}&abwesenheit=${id}`
  }, me.id)
  return { ok: true }
})
