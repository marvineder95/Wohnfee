import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'

const STATUSES = ['neu', 'in_bearbeitung', 'beantwortet', 'archiviert']

// PUT /api/admin/rental-inquiries/:id/status — Status ändern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const status = String(body?.status || '')
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige ID.' })
  }
  if (!STATUSES.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Status.' })
  }
  const result: any = await query(
    'UPDATE rental_inquiries SET status = :status WHERE id = :id', { status, id }
  )
  if (!result.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: 'Mietanfrage nicht gefunden.' })
  }
  return { ok: true, status }
})
