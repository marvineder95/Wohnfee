import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// POST /api/admin/notifications/read  { id }  → eine als gelesen markieren · { all: true } → alle
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const b = await readBody(event).catch(() => ({}))
  if (b?.all) {
    await query('UPDATE notifications SET read_at = NOW() WHERE user_id = :uid AND read_at IS NULL', { uid: user.id })
  } else {
    const id = Number(b?.id)
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })
    await query('UPDATE notifications SET read_at = NOW() WHERE id = :id AND user_id = :uid AND read_at IS NULL', { id, uid: user.id })
  }
  return { ok: true }
})
