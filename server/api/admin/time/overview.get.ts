import { requireSuperadmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { todayVienna } from '../../../utils/site'
import { timeMonth } from '../../../utils/time-tracking'
import { buildMonth, type TimeAbsence, type TimeEntry } from '../../../../shared/time-tracking'

// GET /api/admin/time/overview?month=YYYY-MM — Team-Übersicht: Stunden je Mitarbeiter (nur Admin)
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const today = todayVienna()
  const { month, from, to } = timeMonth(getQuery(event).month, today)
  const [employees, entries, absences] = await Promise.all([
    query<any>(
      `SELECT e.id, e.first_name, e.last_name, e.employment_type, e.weekly_hours, e.entry_date, e.exit_date, u.role
       FROM employees e LEFT JOIN admin_users u ON u.id = e.user_id
       WHERE (e.exit_date IS NULL OR e.exit_date >= :from) AND (e.entry_date IS NULL OR e.entry_date <= :to)
       ORDER BY e.last_name, e.first_name`, { from, to }
    ),
    query<any>(
      `SELECT employee_id, DATE_FORMAT(work_date, '%Y-%m-%d') AS work_date, TIME_FORMAT(start_time, '%H:%i') AS start_time,
              TIME_FORMAT(end_time, '%H:%i') AS end_time, break_minutes, note
       FROM time_entries WHERE work_date BETWEEN :from AND :to`, { from, to }
    ),
    query<any>(
      `SELECT employee_id, type, DATE_FORMAT(date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(date_to, '%Y-%m-%d') AS date_to
       FROM employee_absences WHERE status = 'genehmigt' AND date_to >= :from AND date_from <= :to`, { from, to }
    )
  ])
  const rows = employees.flatMap((e) => {
    const own: TimeEntry[] = entries.filter(x => x.employee_id === e.id)
    // Admins zeichnen meist nicht auf – ohne Einträge würden sie nur mit vollem Minus auftauchen
    if (e.role === 'superadmin' && !own.length) return []
    const abs: TimeAbsence[] = absences.filter(x => x.employee_id === e.id)
    const { days, totals, daily } = buildMonth(month, today, e, own, abs)
    return [{
      id: e.id, first_name: e.first_name, last_name: e.last_name, employment_type: e.employment_type, daily, totals,
      recordedDays: days.filter(d => d.entry).length,
      missingDays: days.filter(d => d.date < today && d.targetMin && !d.creditMin && !d.entry && !d.absenceType).length
    }]
  })
  return { today, month, employees: rows }
})
