import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// Status setzen: neu | gelesen | archiviert
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage-ID' })
  }
  const body = await readBody(event)
  const status = String(body?.status || '')
  if (!['neu', 'gelesen', 'archiviert'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Status' })
  }
  const existing = await queryOne('SELECT id FROM contact_inquiries WHERE id = :id', { id })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Anfrage nicht gefunden' })
  }
  await query('UPDATE contact_inquiries SET status = :status WHERE id = :id', { status, id })
  return { ok: true }
})
