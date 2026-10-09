import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'

// DELETE /api/admin/calendar/:id – Termin löschen.
// Erlaubt für: Ersteller selbst ODER Superadmin (Chef).
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const existing = await queryOne<any>('SELECT created_by AS createdBy FROM calendar_events WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Termin nicht gefunden' })
  if (user.role !== 'superadmin' && Number(existing.createdBy) !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Nur der Ersteller oder der Chef darf diesen Termin löschen' })
  }

  await query('DELETE FROM calendar_events WHERE id = :id', { id })
  return { ok: true }
})
