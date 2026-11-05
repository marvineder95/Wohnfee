import { query, queryOne } from './db'
import { todayVienna } from './site'
import { notifySuperadmins, notifyUser } from './notifications'
import { SICK_NOTE_REMINDER_DAYS, absenceLabel, workdaysBetween } from '../../shared/employees'

// Selbst-Meldungen der Mitarbeiter: Urlaubsantrag (Admin genehmigt) und Krankenstand (sofort gültig,
// Krankmeldung wird nachgereicht – Erinnerung nach SICK_NOTE_REMINDER_DAYS Tagen, siehe sickNoteReminders()).

export const ABSENCE_URL = '/admin/kalender?abwesenheit=1'
const fmt = (iso: string) => String(iso).slice(0, 10).split('-').reverse().join('.')
export const absenceRange = (a: { date_from: string; date_to: string }) =>
  String(a.date_from).slice(0, 10) === String(a.date_to).slice(0, 10) ? fmt(a.date_from) : `${fmt(a.date_from)} – ${fmt(a.date_to)}`

/** Mitarbeiter-Eintrag des angemeldeten Benutzers – ohne gibt es keine Selbst-Meldung. */
export async function employeeForUser(userId: number) {
  const emp = await queryOne<any>('SELECT id, first_name, last_name FROM employees WHERE user_id = :userId', { userId })
  if (!emp) throw createError({ statusCode: 403, statusMessage: 'Für Ihren Zugang ist kein Mitarbeiter hinterlegt – bitte beim Chef melden.' })
  return emp
}

export function parseRange(b: any) {
  const from = String(b?.date_from || '').slice(0, 10)
  const to = String(b?.date_to || from).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte gültigen Zeitraum angeben' })
  }
  return { from, to, days: Math.min(workdaysBetween(from, to), 999) }
}

export async function myAbsences(employeeId: number) {
  const absences = await query<any>(
    `SELECT a.id, a.type, DATE_FORMAT(a.date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(a.date_to, '%Y-%m-%d') AS date_to,
            a.days, a.note, a.status, a.review_note, a.reviewed_by_name, a.requested_by
     FROM employee_absences a
     WHERE a.employee_id = :employeeId AND (a.date_to >= :since OR a.status = 'beantragt')
     ORDER BY a.date_from DESC LIMIT 30`,
    { employeeId, since: shiftDays(todayVienna(), -60) }
  )
  const files = await query<any>(
    `SELECT id, absence_id, title, created_at FROM employee_documents WHERE employee_id = :employeeId AND absence_id IS NOT NULL ORDER BY id`,
    { employeeId }
  )
  for (const a of absences) a.files = files.filter(f => f.absence_id === a.id).map(f => ({ id: f.id, title: f.title, created_at: f.created_at }))
  return absences
}

export function shiftDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const personName = (e: { first_name?: string | null; last_name?: string | null }) =>
  [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Mitarbeiter'

/**
 * Krankenstand ohne Krankmeldung: nach SICK_NOTE_REMINDER_DAYS Tagen (ab Meldung) Erinnerung an den Mitarbeiter,
 * danach im selben Abstand erneut. Bei der ersten Erinnerung bekommt auch der Chef einen Hinweis.
 */
export async function sickNoteReminders() {
  try {
    const due = await query<any>(
      `SELECT a.id, a.requested_by, DATE_FORMAT(a.date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(a.date_to, '%Y-%m-%d') AS date_to,
              a.reminder_at, e.first_name, e.last_name
       FROM employee_absences a JOIN employees e ON e.id = a.employee_id
       WHERE a.type = 'krankenstand' AND a.status = 'genehmigt' AND a.requested_by IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM employee_documents d WHERE d.absence_id = a.id)
         AND a.created_at <= NOW() - INTERVAL :d DAY
         AND (a.reminder_at IS NULL OR a.reminder_at <= NOW() - INTERVAL :d DAY)`,
      { d: SICK_NOTE_REMINDER_DAYS }
    )
    for (const a of due) {
      await query('UPDATE employee_absences SET reminder_at = NOW() WHERE id = :id', { id: a.id })
      await notifyUser(a.requested_by, {
        title: 'Bitte Krankmeldung hochladen',
        body: `Für Ihren Krankenstand ${absenceRange(a)} fehlt noch die Krankmeldung. Foto oder PDF im Kalender unter „Meine Abwesenheiten“ hochladen.`,
        url: ABSENCE_URL
      })
      if (!a.reminder_at) {
        await notifySuperadmins({
          title: `Krankmeldung fehlt: ${personName(a)}`,
          body: `${absenceLabel('krankenstand')} ${absenceRange(a)} – noch keine Krankmeldung hochgeladen, Erinnerung ist raus.`,
          url: '/admin/mitarbeiter'
        })
      }
    }
  } catch (e: any) {
    console.error('[absences] Erinnerung fehlgeschlagen:', e?.message || e)
  }
}

/** Krankmeldung (Foto/PDF) zum Krankenstand ablegen – landet auch bei den Dokumenten des Mitarbeiters. */
export async function saveSickNote(employeeId: number, absenceId: number, file: { data: Buffer; type?: string }, by: string) {
  const { saveEmployeeFile } = await import('./employees')
  const a = await queryOne<any>(`SELECT DATE_FORMAT(date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(date_to, '%Y-%m-%d') AS date_to
                                 FROM employee_absences WHERE id = :absenceId`, { absenceId })
  await saveEmployeeFile(employeeId, file, { category: 'krankmeldung', title: `Krankmeldung ${a ? absenceRange(a) : ''}`.trim(), by, absenceId })
}
