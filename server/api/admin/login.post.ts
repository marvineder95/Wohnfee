import { verifyCredentials, signSession, ADMIN_COOKIE, sessionCookieOptions } from '../../utils/admin-auth'
import { clientIp, assertNotLimited, countAttempt, clearAttempts } from '../../utils/rate-limit'

const WINDOW = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event).catch(() => ({} as any)) as {
    username?: string
    password?: string
  }

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername und Passwort erforderlich' })
  }

  // max. 10 Fehlversuche je IP in 15 Minuten
  const key = `login:${clientIp(event)}`
  assertNotLimited(key, 10, WINDOW)

  const user = await verifyCredentials(username, password)
  if (!user) {
    countAttempt(key, WINDOW)
    throw createError({ statusCode: 401, statusMessage: 'Benutzername oder Passwort falsch' })
  }

  clearAttempts(key)
  setCookie(event, ADMIN_COOKIE, signSession(user), sessionCookieOptions())
  return { ok: true, user }
})
