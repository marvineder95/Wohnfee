import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// DELETE /api/admin/contacts/:id — archiviert statt hart zu löschen (Historie bleibt erhalten)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Kontakt-ID' })
  }
  const existing = await queryOne('SELECT id, status FROM contacts WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Kontakt nicht gefunden' })
  const next = existing.status === 'archiviert' ? 'aktiv' : 'archiviert'
  await query('UPDATE contacts SET status = :next WHERE id = :id', { next, id })
  return { ok: true, status: next }
})
