import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { todayVienna } from '../../../utils/site'
import { timeAbsences, timeEmployee } from '../../../utils/time-tracking'
import { dayLock, toMinutes } from '../../../../shared/time-tracking'

// POST /api/admin/time — Tag speichern; Beginn und Ende leer = Eintrag löschen. Feiertage bleiben gesperrt.
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const b = await readBody(event).catch(() => ({})) as any
  const date = String(b?.date || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date) throw createError({ statusCode: 400, statusMessage: 'Ungültiges Datum' })
  const emp = await timeEmployee(me, b?.employeeId)
  if (!emp) throw createError({ statusCode: 403, statusMessage: 'Für deinen Zugang ist kein Mitarbeiter hinterlegt.' })
  const lock = dayLock(date, todayVienna(), emp, await timeAbsences(emp.id, date, date))
  if (lock) throw createError({ statusCode: 409, statusMessage: lock })

  const start = String(b?.start || '')
  const end = String(b?.end || '')
  if (!start && !end) {
    await query('DELETE FROM time_entries WHERE employee_id = :id AND work_date = :date', { id: emp.id, date })
    return { ok: true }
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte Beginn und Ende angeben' })
  }
  const span = toMinutes(end) - toMinutes(start)
  if (span <= 0) throw createError({ statusCode: 400, statusMessage: 'Das Ende muss nach dem Beginn liegen' })
  const pause = Number(b?.pause) || 0
  if (!Number.isInteger(pause) || pause < 0 || pause >= span) throw createError({ statusCode: 400, statusMessage: 'Die Pause passt nicht zur Arbeitszeit' })
  await query(
    `INSERT INTO time_entries (employee_id, work_date, start_time, end_time, break_minutes, note)
     VALUES (:id, :date, :start, :end, :pause, :note)
     ON DUPLICATE KEY UPDATE start_time = :start, end_time = :end, break_minutes = :pause, note = :note`,
    { id: emp.id, date, start, end, pause, note: String(b?.note || '').trim().slice(0, 255) || null }
  )
  return { ok: true }
})
