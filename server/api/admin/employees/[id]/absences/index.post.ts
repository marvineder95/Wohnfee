import { requireSuperadmin } from '../../../../../utils/admin-auth'
import { query } from '../../../../../utils/db'
import { employeeDetail, requireEmployee } from '../../../../../utils/employees'
import { ABSENCE_TYPES, isValue, workdaysBetween } from '../../../../../../shared/employees'

// POST /api/admin/employees/:id/absences — Urlaub, Krankenstand, Zeitausgleich eintragen
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await requireEmployee(id)
  const b = await readBody(event).catch(() => ({})) as any
  const from = String(b?.date_from || '').slice(0, 10)
  const to = String(b?.date_to || from).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte gültigen Zeitraum angeben' })
  }
  const type = isValue(ABSENCE_TYPES, b?.type) ? b.type : 'urlaub'
  const n = Number(String(b?.days ?? '').replace(',', '.'))
  const days = Number.isFinite(n) && n >= 0 && String(b?.days ?? '') !== '' ? n : workdaysBetween(from, to)
  await query(
    `INSERT INTO employee_absences (employee_id, type, date_from, date_to, days, note)
     VALUES (:id, :type, :from, :to, :days, :note)`,
    { id, type, from, to, days: Math.min(days, 999), note: String(b?.note || '').trim().slice(0, 255) || null }
  )
  return employeeDetail(id)
})
