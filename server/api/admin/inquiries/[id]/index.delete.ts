import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage-ID' })
  }
  const existing = await queryOne('SELECT id FROM contact_inquiries WHERE id = :id', { id })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Anfrage nicht gefunden' })
  }
  await query('DELETE FROM contact_inquiries WHERE id = :id', { id })
  return { ok: true }
})
