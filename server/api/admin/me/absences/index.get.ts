import { requireAdmin } from '../../../../utils/admin-auth'
import { queryOne, query } from '../../../../utils/db'
import { todayVienna } from '../../../../utils/site'
import { myAbsences } from '../../../../utils/absences'
import { vacationAccount } from '../../../../../shared/employees'

// GET /api/admin/me/absences — eigene Abwesenheiten + Urlaubskonto (für „Urlaub beantragen“ / „Krankenstand melden“)
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const emp = await queryOne<any>('SELECT * FROM employees WHERE user_id = :id', { id: me.id })
  if (!emp) return { employee: null, absences: [] }
  const year = Number(todayVienna().slice(0, 4))
  const used = await query<{ y: number; days: number }>(
    `SELECT YEAR(date_from) AS y, SUM(days) AS days FROM employee_absences
     WHERE employee_id = :id AND type = 'urlaub' AND status = 'genehmigt' GROUP BY YEAR(date_from)`, { id: emp.id }
  )
  const usedByYear: Record<number, number> = {}
  for (const u of used) usedByYear[Number(u.y)] = Number(u.days)
  const vacation = emp.vacation_days == null ? null : vacationAccount({
    annual: Number(emp.vacation_days), entry: emp.entry_date, exit: emp.exit_date,
    openingYear: emp.vacation_opening_year, openingDays: emp.vacation_opening_days, usedByYear, year
  })
  return { employee: { id: emp.id, first_name: emp.first_name, last_name: emp.last_name, vacation }, absences: await myAbsences(emp.id) }
})
