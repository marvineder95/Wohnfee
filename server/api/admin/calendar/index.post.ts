import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

const TYPES = ['aufbau', 'abholung', 'lieferung', 'beratung', 'sonstiges']

// POST /api/admin/calendar – neuen Termin anlegen (Chef UND Mitarbeiter)
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const b = await readBody(event)

  const title = String(b.title || '').trim()
  const type = TYPES.includes(b.type) ? b.type : 'sonstiges'
  const eventDate = String(b.eventDate || '').slice(0, 10)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Titel fehlt' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw createError({ statusCode: 400, statusMessage: 'Datum ungültig' })

  const allDay = b.allDay ? 1 : 0
  const startTime = allDay ? null : (String(b.startTime || '').slice(0, 5) || null)
  const endTime = allDay ? null : (String(b.endTime || '').slice(0, 5) || null)
  const location = String(b.location || '').trim().slice(0, 190) || null
  const notes = String(b.notes || '').trim() || null
  const projectId = Number(b.projectId) || null
  const createdByName = (user.displayName || user.username || '').slice(0, 128)

  const res = await query(
    `INSERT INTO calendar_events
       (title, type, event_date, start_time, end_time, all_day, location, project_id, notes, created_by, created_by_name)
     VALUES (:title, :type, :eventDate, :startTime, :endTime, :allDay, :location, :projectId, :notes, :createdBy, :createdByName)`,
    { title: title.slice(0, 190), type, eventDate, startTime, endTime, allDay, location, projectId, notes, createdBy: user.id, createdByName }
  )
  return { id: Number((res as any).insertId) }
})
