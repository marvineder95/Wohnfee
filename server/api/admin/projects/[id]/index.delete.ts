import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Projekt-ID' })
  }
  const existing = await queryOne('SELECT id, customer FROM projects WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  await query('DELETE FROM projects WHERE id = :id', { id })
  return { ok: true }
})
