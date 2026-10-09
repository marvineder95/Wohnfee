import { createHash, randomBytes, scryptSync } from 'node:crypto'
import { query, queryOne } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const { token, username, password } = await readBody(event).catch(() => ({} as any)) as {
    token?: string
    username?: string
    password?: string
  }

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Einladungslink' })
  }
  const cleanUser = String(username || '').trim()
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(cleanUser)) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername: 3–32 Zeichen (Buchstaben, Zahlen, _ . -)' })
  }
  if (String(password || '').length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Passwort muss mindestens 8 Zeichen lang sein' })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const row = await queryOne<any>(
    `SELECT id, status, (invite_expires_at > NOW()) AS notExpired FROM admin_users
     WHERE invite_token_hash = :tokenHash LIMIT 1`,
    { tokenHash }
  )
  if (!row) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Einladungslink' })
  if (row.status !== 'pending') throw createError({ statusCode: 400, statusMessage: 'Einladung wurde bereits verwendet' })
  if (!Number(row.notExpired)) {
    throw createError({ statusCode: 400, statusMessage: 'Einladungslink ist abgelaufen — bitte neue Einladung anfordern' })
  }

  const taken = await queryOne('SELECT id FROM admin_users WHERE LOWER(username) = LOWER(:u) LIMIT 1', { u: cleanUser })
  if (taken) throw createError({ statusCode: 409, statusMessage: 'Dieser Benutzername ist bereits vergeben' })

  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  await query(
    `UPDATE admin_users
     SET username = :username, salt = :salt, pw_hash = :hash, status = 'active',
         invite_token_hash = NULL, invite_expires_at = NULL
     WHERE id = :id`,
    { username: cleanUser, salt, hash, id: row.id }
  )
  return { ok: true, username: cleanUser }
})
