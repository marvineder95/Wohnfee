import { query, queryOne } from '../../../utils/db'
import { hashAccountToken, isValidTokenFormat, validatePasswordStrength } from '../../../utils/tokens'
import { setUserPassword } from '../../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const { token, password } = await readBody(event).catch(() => ({} as any)) as {
    token?: string
    password?: string
  }

  if (!isValidTokenFormat(token)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Link' })
  const pwError = validatePasswordStrength(password)
  if (pwError) throw createError({ statusCode: 400, statusMessage: pwError })

  const row = await queryOne<any>(
    `SELECT id, status, (reset_expires_at > NOW()) AS notExpired FROM admin_users
     WHERE reset_token_hash = :tokenHash LIMIT 1`,
    { tokenHash: hashAccountToken(token!) }
  )
  if (!row) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Link' })
  if (row.status !== 'active') throw createError({ statusCode: 400, statusMessage: 'Konto ist nicht aktiv' })
  if (!Number(row.notExpired)) {
    throw createError({ statusCode: 400, statusMessage: 'Link ist abgelaufen — bitte erneut anfordern' })
  }

  await setUserPassword(row.id, String(password))
  // Token einmalig — nach Verwendung ungültig machen
  await query('UPDATE admin_users SET reset_token_hash = NULL, reset_expires_at = NULL WHERE id = :id', { id: row.id })
  return { ok: true }
})
