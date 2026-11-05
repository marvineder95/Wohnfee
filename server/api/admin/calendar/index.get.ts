import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Liefert alle Termine im Zeitraum (inkl. Projektzuordnung), sortiert nach Datum/Zeit.
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const qs = getQuery(event)
  const from = String(qs.from || '').slice(0, 10)
  const to = String(qs.to || '').slice(0, 10)

  const events = await query(
    `SELECT e.id, e.title, e.type,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') AS eventDate,
            e.start_time AS startTime, e.end_time AS endTime,
            e.all_day AS allDay, e.location, e.project_id AS projectId,
            e.notes, e.created_by AS createdBy, e.created_by_name AS createdByName,
            e.review_status AS reviewStatus, e.review_note AS reviewNote, e.reviewed_by_name AS reviewedByName,
            p.title AS projectTitle, p.customer AS projectCustomer, p.category AS projectCategory
     FROM calendar_events e
     LEFT JOIN projects p ON p.id = e.project_id
     WHERE e.event_date >= :from AND e.event_date <= :to
     ORDER BY e.event_date, e.all_day, e.start_time, e.id`,
    { from: from || '1970-01-01', to: to || '2999-12-31' }
  )
  // Chef: alle offenen Bestätigungen (auch außerhalb des angezeigten Monats)
  const pending = await query(
    `SELECT id, title, type, DATE_FORMAT(event_date, '%Y-%m-%d') AS eventDate, start_time AS startTime, all_day AS allDay,
            created_by_name AS createdByName
     FROM calendar_events WHERE review_status = 'offen' ORDER BY event_date, start_time LIMIT 50`
  )
  // Abwesenheiten (Urlaub/Krankenstand …): genehmigte für alle; offene Anträge nur für Chef + Antragsteller.
  // Team sieht bei Nicht-Urlaub nur „Abwesend“ (Krankenstand ist privat).
  const isChef = me.role === 'superadmin'
  const absRows = await query<any>(
    `SELECT a.id, a.type, a.status, a.requested_by AS requestedBy, a.days, a.note,
            DATE_FORMAT(a.date_from, '%Y-%m-%d') AS dateFrom, DATE_FORMAT(a.date_to, '%Y-%m-%d') AS dateTo,
            a.employee_id AS employeeId, TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS name,
            (SELECT COUNT(*) FROM employee_documents d WHERE d.absence_id = a.id) AS fileCount
     FROM employee_absences a JOIN employees e ON e.id = a.employee_id
     WHERE (a.status = 'genehmigt' OR (a.status = 'beantragt' AND (:chef = 1 OR a.requested_by = :uid)))
       AND ((a.date_to >= :from AND a.date_from <= :to) OR (a.status = 'beantragt' AND :chef = 1))
     ORDER BY a.date_from`,
    { from: from || '1970-01-01', to: to || '2999-12-31', chef: isChef ? 1 : 0, uid: me.id }
  )
  const absences = absRows.map(a => {
    const own = a.requestedBy === me.id
    const open = isChef || own || a.type === 'urlaub'
    return {
      id: a.id, dateFrom: a.dateFrom, dateTo: a.dateTo, name: a.name, status: a.status, own,
      type: open ? a.type : 'abwesend', days: a.days,
      note: isChef || own ? a.note : null, employeeId: isChef ? a.employeeId : null,
      fileCount: isChef || own ? Number(a.fileCount) : null
    }
  })
  return { events, pending, absences }
})
