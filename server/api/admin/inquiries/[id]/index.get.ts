import { requireAdmin } from '../../../../utils/admin-auth'
import { queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage-ID' })
  }
  const inquiry = await queryOne(
    `SELECT id, name, email, phone, subject, message, status,
            created_at AS createdAt, updated_at AS updatedAt
     FROM contact_inquiries WHERE id = :id`,
    { id }
  )
  if (!inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Anfrage nicht gefunden' })
  }
  return { inquiry }
})
