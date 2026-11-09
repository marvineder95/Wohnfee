import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { todayVienna } from '../../../utils/site'
import { timeAbsences, timeEmployee } from '../../../utils/time-tracking'

// GET /api/admin/time?month=YYYY-MM[&employee=ID] — Stunden eines Monats (employee nur für den Admin)
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const today = todayVienna()
  const q = getQuery(event)
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q.month)) ? String(q.month) : today.slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  const to = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  const employees = me.role === 'superadmin'
    ? await query(`SELECT id, first_name, last_name FROM employees WHERE exit_date IS NULL OR exit_date >= :from ORDER BY last_name, first_name`, { from: `${month}-01` })
    : []
  const emp = await timeEmployee(me, q.employee)
  if (!emp) return { today, month, employee: null, employees, entries: [], absences: [] }
  const entries = await query(
    `SELECT DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, TIME_FORMAT(start_time, '%H:%i') AS start_time,
            TIME_FORMAT(end_time, '%H:%i') AS end_time, break_minutes, note
     FROM time_entries WHERE employee_id = :id AND work_date BETWEEN :from AND :to ORDER BY work_date`,
    { id: emp.id, from: `${month}-01`, to }
  )
  return { today, month, employee: emp, employees, entries, absences: await timeAbsences(emp.id, `${month}-01`, to) }
})
