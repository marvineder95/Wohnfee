import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { notifyUser, eventSummary, calendarUrl } from '../../../../utils/notifications'

// POST /api/admin/calendar/:id/review  { status: 'bestaetigt' | 'abgelehnt', note? }
// Nur der Chef (Superadmin) reagiert auf Termine von Mitarbeitern; der Ersteller wird benachrichtigt.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  if (user.role !== 'superadmin') throw createError({ statusCode: 403, statusMessage: 'Nur der Chef kann Termine bestätigen.' })
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody(event)
  const status = b?.status === 'abgelehnt' ? 'abgelehnt' : b?.status === 'bestaetigt' ? 'bestaetigt' : ''
  if (!id || !status) throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage' })
  const note = String(b?.note || '').trim().slice(0, 500) || null

  const ev = await queryOne<any>('SELECT id, title, type, event_date, start_time, all_day, created_by FROM calendar_events WHERE id = :id', { id })
  if (!ev) throw createError({ statusCode: 404, statusMessage: 'Termin nicht gefunden' })
  const who = user.displayName || user.username || 'Chef'
  await query(
    'UPDATE calendar_events SET review_status = :status, review_note = :note, reviewed_by_name = :who, reviewed_at = NOW() WHERE id = :id',
    { status, note, who: who.slice(0, 128), id }
  )
  if (ev.created_by && Number(ev.created_by) !== user.id) {
    await notifyUser(Number(ev.created_by), {
      title: `${who} hat deinen Termin ${status === 'bestaetigt' ? 'bestätigt ✓' : 'abgelehnt'}`,
      body: `${ev.title} – ${eventSummary(ev)}${note ? `\n„${note}“` : ''}`,
      url: calendarUrl(id, String(ev.event_date).slice(0, 10))
    })
  }
  return { ok: true }
})
