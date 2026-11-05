import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { notifyUser } from '../../../../utils/notifications'
import { absenceRange } from '../../../../utils/absences'

// POST /api/admin/absences/:id/review — Urlaubsantrag genehmigen/ablehnen (nur Chef), Antragsteller bekommt Nachricht
export default defineEventHandler(async (event) => {
  const me = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody(event).catch(() => ({})) as any
  const status = b?.status === 'abgelehnt' ? 'abgelehnt' : 'genehmigt'
  const note = String(b?.note || '').trim().slice(0, 500) || null
  const a = await queryOne<any>(
    `SELECT id, type, requested_by, DATE_FORMAT(date_from, '%Y-%m-%d') AS date_from, DATE_FORMAT(date_to, '%Y-%m-%d') AS date_to
     FROM employee_absences WHERE id = :id`, { id }
  )
  if (!a) throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden' })
  await query('UPDATE employee_absences SET status = :status, review_note = :note, reviewed_by_name = :by WHERE id = :id',
    { status, note, by: me.displayName || me.username, id })
  await notifyUser(a.requested_by, {
    title: status === 'genehmigt' ? 'Urlaub genehmigt ✓' : 'Urlaubsantrag abgelehnt',
    body: `${absenceRange(a)}${note ? ' – „' + note + '“' : ''}`,
    url: `/admin/kalender?focus=${a.date_from}&abwesenheit=${id}`
  })
  return { ok: true }
})
