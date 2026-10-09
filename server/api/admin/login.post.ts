import { verifyCredentials, signSession, ADMIN_COOKIE, sessionCookieOptions } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event).catch(() => ({} as any)) as {
    username?: string
    password?: string
  }

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername und Passwort erforderlich' })
  }

  const user = await verifyCredentials(username, password)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Benutzername oder Passwort falsch' })
  }

  setCookie(event, ADMIN_COOKIE, signSession(user), sessionCookieOptions())
  return { ok: true, user }
})
