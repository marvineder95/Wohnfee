import { requireAdmin } from '../../utils/admin-auth'
import { query } from '../../utils/db'
import { todayVienna } from '../../utils/site'

// GET /api/admin/logistics?from=&to= — alles, was die eigene Spedition betrifft:
// - Termine (Aufbau/Lieferung/Abholung/…) aus dem Kalender
// - Projekt-Deadlines (Leihmöbel bis …), solange noch Möbel im Projekt sind
// - Rückgaben einzelner Möbel (return_date), je Projekt und Tag gebündelt
// Überfälliges (Deadline/Rückgabe in der Vergangenheit, Möbel noch draußen) kommt
// zusätzlich in `overdue`, unabhängig vom Zeitraum.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const qs = getQuery(event)
  const iso = (v: any) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null)
  const today = todayVienna()
  const from = iso(qs.from) || today
  const to = iso(qs.to) || from

  const events = await query(
    `SELECT e.id, e.title, e.type, DATE_FORMAT(e.event_date, '%Y-%m-%d') AS date,
            e.start_time AS startTime, e.end_time AS endTime, e.all_day AS allDay, e.location, e.notes,
            e.project_id AS projectId, p.customer AS projectCustomer, p.title AS projectTitle, p.category AS projectCategory,
            (SELECT COUNT(*) FROM project_items pi WHERE pi.project_id = e.project_id) AS itemCount
     FROM calendar_events e LEFT JOIN projects p ON p.id = e.project_id
     WHERE e.event_date BETWEEN :from AND :to
     ORDER BY e.event_date, e.all_day DESC, e.start_time`,
    { from, to }
  )

  const deadlineSql = (where: string) =>
    `SELECT p.id AS projectId, p.customer AS projectCustomer, p.title AS projectTitle, p.category AS projectCategory,
            p.deadline_date AS date, p.deadline_text AS deadlineText, p.team, p.who,
            COUNT(pi.id) AS itemCount, COALESCE(SUM(pi.quantity), 0) AS pieceCount
     FROM projects p JOIN project_items pi ON pi.project_id = p.id
     WHERE ${where}
     GROUP BY p.id, p.customer, p.title, p.category, p.deadline_date, p.deadline_text, p.team, p.who
     ORDER BY p.deadline_date`
  const deadlines = await query(deadlineSql('p.deadline_date BETWEEN :from AND :to'), { from, to })

  const returnSql = (where: string) =>
    `SELECT p.id AS projectId, p.customer AS projectCustomer, p.title AS projectTitle, p.category AS projectCategory,
            pi.return_date AS date, COUNT(pi.id) AS itemCount, SUM(pi.quantity) AS pieceCount
     FROM project_items pi JOIN projects p ON p.id = pi.project_id
     WHERE ${where}
       -- Rückgaben am Tag der Projekt-Deadline sind dort schon enthalten
       AND (p.deadline_date IS NULL OR pi.return_date <> p.deadline_date)
     GROUP BY p.id, p.customer, p.title, p.category, pi.return_date
     ORDER BY pi.return_date`
  const returns = await query(returnSql('pi.return_date BETWEEN :from AND :to'), { from, to })

  // Überfällig: Möbel sind noch im Projekt, obwohl Deadline/Rückgabe vorbei ist
  const overdue = [
    ...(await query(deadlineSql('p.deadline_date < :today'), { today })).map((r: any) => ({ ...r, kind: 'deadline' })),
    ...(await query(returnSql('pi.return_date < :today'), { today })).map((r: any) => ({ ...r, kind: 'rueckgabe' }))
  ].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))

  return { from, to, today, events, deadlines, returns, overdue }
})
