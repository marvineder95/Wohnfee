import { queryOne } from '../../../utils/db'
import { hashAccountToken, isValidTokenFormat } from '../../../utils/tokens'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event) as { token?: string }
  if (!isValidTokenFormat(token)) return { valid: false, reason: 'ungültig' }
  const row = await queryOne<any>(
    `SELECT username, (reset_expires_at > NOW()) AS notExpired FROM admin_users
     WHERE reset_token_hash = :tokenHash AND status = 'active' LIMIT 1`,
    { tokenHash: hashAccountToken(token!) }
  )
  if (!row) return { valid: false, reason: 'ungültig' }
  if (!Number(row.notExpired)) return { valid: false, reason: 'abgelaufen' }
  return { valid: true, username: row.username }
})
