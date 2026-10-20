import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/notifications — die letzten 30 Benachrichtigungen des angemeldeten Benutzers + Anzahl ungelesen
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const items = await query(
    `SELECT id, title, body, url, created_at AS createdAt, read_at IS NOT NULL AS isRead
     FROM notifications WHERE user_id = :uid ORDER BY id DESC LIMIT 30`,
    { uid: user.id }
  )
  const [{ n }] = await query<any>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = :uid AND read_at IS NULL', { uid: user.id })
  return { items, unread: Number(n) }
})
