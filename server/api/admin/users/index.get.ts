import { requireSuperadmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const users = await query(
    `SELECT u.id, u.username, u.email, u.display_name AS displayName, u.role, u.status,
            u.created_at AS createdAt, u.invite_expires_at AS inviteExpiresAt,
            i.username AS invitedByUsername
     FROM admin_users u
     LEFT JOIN admin_users i ON i.id = u.invited_by
     ORDER BY u.created_at ASC`
  )
  return { users }
})
