import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { todayVienna } from '../../../utils/site'
import { timeAbsences, timeEmployee, timeMonth } from '../../../utils/time-tracking'

// GET /api/admin/time?month=YYYY-MM[&employee=ID] — Stunden eines Monats (employee nur für den Admin)
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const today = todayVienna()
  const q = getQuery(event)
  const { month, from, to } = timeMonth(q.month, today)
  const employees = me.role === 'superadmin'
    ? await query(`SELECT id, first_name, last_name FROM employees WHERE exit_date IS NULL OR exit_date >= :from ORDER BY last_name, first_name`, { from })
    : []
  const emp = await timeEmployee(me, q.employee)
  if (!emp) return { today, month, employee: null, employees, entries: [], absences: [] }
  const entries = await query(
    `SELECT DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, TIME_FORMAT(start_time, '%H:%i') AS start_time,
            TIME_FORMAT(end_time, '%H:%i') AS end_time, break_minutes, note
     FROM time_entries WHERE employee_id = :id AND work_date BETWEEN :from AND :to ORDER BY work_date`,
    { id: emp.id, from, to }
  )
  return { today, month, employee: emp, employees, entries, absences: await timeAbsences(emp.id, from, to) }
})
