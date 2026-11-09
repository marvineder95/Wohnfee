import { query, queryOne } from './db'
import { TIME_TRACKING_START } from '../../shared/time-tracking'

// Stundenaufzeichnung: Mitarbeiter sehen und ändern nur ihre eigenen Stunden, der Admin die aller.
const EMP_FIELDS = 'id, first_name, last_name, weekly_hours, employment_type, entry_date, exit_date, user_id'

/** Mitarbeiter, dessen Stunden angezeigt/geändert werden (null = für diesen Zugang keiner hinterlegt). */
export async function timeEmployee(me: { id: number; role: string }, requested: unknown) {
  const id = Number(requested)
  if (me.role === 'superadmin') {
    if (id) {
      const emp = await queryOne<any>(`SELECT ${EMP_FIELDS} FROM employees WHERE id = :id`, { id })
      if (!emp) throw createError({ statusCode: 404, statusMessage: 'Mitarbeiter nicht gefunden' })
      return emp
    }
    // Admin trägt meist nicht selbst ein – zuerst das Team zeigen
    return queryOne<any>(`SELECT ${EMP_FIELDS} FROM employees ORDER BY (exit_date IS NOT NULL AND exit_date < CURDATE()), user_id <=> :uid, last_name, first_name LIMIT 1`, { uid: me.id })
  }
  return queryOne<any>(`SELECT ${EMP_FIELDS} FROM employees WHERE user_id = :uid`, { uid: me.id })
}

/** Monat aus der URL (Standard: aktueller, frühestens Aufzeichnungsbeginn) + letzter Tag. */
export function timeMonth(value: unknown, today: string) {
  const firstMonth = TIME_TRACKING_START.slice(0, 7)
  const wanted = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value)) ? String(value) : today.slice(0, 7)
  const month = wanted < firstMonth ? firstMonth : wanted
  const [y, m] = month.split('-').map(Number)
  return { month, from: `${month}-01`, to: `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}` }
}

export function timeAbsences(employeeId: number, from: string, to: string) {
  return query<any>(
    `SELECT type, DATE_FORMAT(date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(date_to, '%Y-%m-%d') AS date_to
     FROM employee_absences
     WHERE employee_id = :employeeId AND status = 'genehmigt' AND date_to >= :from AND date_from <= :to`,
    { employeeId, from, to }
  )
}
