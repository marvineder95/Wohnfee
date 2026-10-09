import { queryOne } from '../../../utils/db'
import { hashAccountToken, isValidTokenFormat } from '../../../utils/tokens'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event) as { token?: string }
  if (!isValidTokenFormat(token)) return { valid: false, reason: 'ungültig' }
  const row = await queryOne<any>(
    `SELECT display_name AS displayName, email, status, (invite_expires_at > NOW()) AS notExpired
     FROM admin_users WHERE invite_token_hash = :tokenHash LIMIT 1`,
    { tokenHash: hashAccountToken(token!) }
  )
  if (!row) return { valid: false, reason: 'ungültig' }
  if (row.status !== 'pending') return { valid: false, reason: 'bereits verwendet' }
  if (!Number(row.notExpired)) return { valid: false, reason: 'abgelaufen' }
  return { valid: true, displayName: row.displayName, email: row.email }
})
