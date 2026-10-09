import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// POST /api/admin/newsletter/remove — Abonnenten entfernen. Body: { id }
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body?.id || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Ungültige ID' })
  await query('DELETE FROM newsletter_subscribers WHERE id = :id', { id })
  return { ok: true }
})
