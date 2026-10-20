import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'
import { notifyUser, notifySuperadmins, eventSummary, calendarUrl } from '../../../utils/notifications'

const TYPES = ['aufbau', 'abholung', 'lieferung', 'beratung', 'sonstiges']

// PUT /api/admin/calendar/:id – Termin ändern.
// Erlaubt für: Ersteller selbst ODER Superadmin (Chef).
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const existing = await queryOne<any>('SELECT created_by AS createdBy, review_status AS reviewStatus FROM calendar_events WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Termin nicht gefunden' })
  // Admin & Designerin dürfen alle Termine ändern, Spediteure nur ihre eigenen
  if (user.role === 'driver' && Number(existing.createdBy) !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Nur der Ersteller oder der Chef darf diesen Termin ändern' })
  }

  const b = await readBody(event)
  const title = String(b.title || '').trim()
  const type = TYPES.includes(b.type) ? b.type : 'sonstiges'
  const eventDate = String(b.eventDate || '').slice(0, 10)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Titel fehlt' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw createError({ statusCode: 400, statusMessage: 'Datum ungültig' })

  const allDay = b.allDay ? 1 : 0
  const startTime = allDay ? null : (String(b.startTime || '').slice(0, 5) || null)
  const endTime = allDay ? null : (String(b.endTime || '').slice(0, 5) || null)

  await query(
    `UPDATE calendar_events SET
       title = :title, type = :type, event_date = :eventDate,
       start_time = :startTime, end_time = :endTime, all_day = :allDay,
       location = :location, project_id = :projectId, notes = :notes
     WHERE id = :id`,
    {
      title: title.slice(0, 190), type, eventDate, startTime, endTime, allDay,
      location: String(b.location || '').trim().slice(0, 190) || null,
      projectId: Number(b.projectId) || null,
      notes: String(b.notes || '').trim() || null,
      id
    }
  )
  const who = user.displayName || user.username || 'Jemand'
  const summary = `${title.slice(0, 120)} – ${eventSummary({ type, eventDate, startTime, allDay })}`
  if (user.role !== 'superadmin') {
    // Mitarbeiter ändert → wieder zur Bestätigung beim Chef
    await query("UPDATE calendar_events SET review_status = 'offen', review_note = NULL, reviewed_by_name = NULL, reviewed_at = NULL WHERE id = :id", { id })
    await notifySuperadmins({ title: `${who} hat einen Termin geändert`, body: summary, url: calendarUrl(id, eventDate) }, user.id)
  } else if (existing.createdBy && Number(existing.createdBy) !== user.id) {
    // Chef ändert den Termin eines Mitarbeiters → Mitarbeiter informieren
    await notifyUser(Number(existing.createdBy), { title: `${who} hat deinen Termin geändert`, body: summary, url: calendarUrl(id, eventDate) })
  }
  return { ok: true }
})
