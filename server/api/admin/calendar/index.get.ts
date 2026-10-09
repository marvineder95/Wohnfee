import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Liefert alle Termine im Zeitraum (inkl. Projektzuordnung), sortiert nach Datum/Zeit.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const qs = getQuery(event)
  const from = String(qs.from || '').slice(0, 10)
  const to = String(qs.to || '').slice(0, 10)

  const events = await query(
    `SELECT e.id, e.title, e.type,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') AS eventDate,
            e.start_time AS startTime, e.end_time AS endTime,
            e.all_day AS allDay, e.location, e.project_id AS projectId,
            e.notes, e.created_by AS createdBy, e.created_by_name AS createdByName,
            p.title AS projectTitle, p.customer AS projectCustomer, p.category AS projectCategory
     FROM calendar_events e
     LEFT JOIN projects p ON p.id = e.project_id
     WHERE e.event_date >= :from AND e.event_date <= :to
     ORDER BY e.event_date, e.all_day, e.start_time, e.id`,
    { from: from || '1970-01-01', to: to || '2999-12-31' }
  )
  return { events }
})
