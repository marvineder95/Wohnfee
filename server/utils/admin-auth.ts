import { createHmac, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto'

export const ADMIN_COOKIE = 'wf_admin'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 Tage

// In Produktion zwingend per NUXT_ADMIN_SECRET setzen; Dev-Fallback nur fuer lokal.
function secret(): string {
  const config = useRuntimeConfig()
  return (config.adminSecret as string | undefined) || 'wf-dev-secret-bitte-setzen'
}

export type AdminRole = 'superadmin' | 'admin' | 'user'

export interface AdminUser {
  id: number
  username: string
  displayName: string | null
  role: AdminRole
  email?: string | null
  phone?: string | null
  position?: string | null
  bio?: string | null
  avatarPath?: string | null
  createdAt?: string | Date | null
}

function mapUser(u: any): AdminUser {
  return {
    id: u.id, username: u.username, displayName: u.display_name, role: u.role,
    email: u.email ?? null, phone: u.phone ?? null, position: u.position ?? null,
    bio: u.bio ?? null, avatarPath: u.avatar_path ?? null, createdAt: u.created_at ?? null
  }
}

const USER_FIELDS = 'id, username, display_name, role, email, phone, position, bio, avatar_path, created_at'

export async function verifyCredentials(username: string, password: string): Promise<AdminUser | null> {
  const { queryOne } = await import('./db')
  const user = await queryOne<any>(
    `SELECT ${USER_FIELDS}, salt, pw_hash FROM admin_users
     WHERE LOWER(username) = LOWER(:username) AND status = 'active' LIMIT 1`,
    { username: String(username || '') }
  )
  if (!user || !user.salt || !user.pw_hash) return null
  const candidate = scryptSync(String(password || ''), user.salt, 64)
  const expected = Buffer.from(user.pw_hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
    ? mapUser(user)
    : null
}

export function signSession(user: AdminUser): string {
  const payload = JSON.stringify({ u: user.username, r: user.role, exp: Date.now() + SESSION_MAX_AGE * 1000 })
  const body = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function readSession(token: string | undefined): AdminUser | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return { id: 0, username: payload.u, displayName: null, role: payload.r || 'user' }
  } catch {
    return null
  }
}

// Resolves the CURRENT session user from the database (status/role may have changed
// since the cookie was issued) — use for guards; falls back to cookie payload on DB errors.
export async function currentAdminUser(event: any): Promise<AdminUser | null> {
  const fromCookie = readSession(getCookie(event, ADMIN_COOKIE))
  if (!fromCookie) return null
  const { queryOne } = await import('./db')
  const user = await queryOne<any>(
    `SELECT ${USER_FIELDS} FROM admin_users
     WHERE LOWER(username) = LOWER(:username) AND status = 'active' LIMIT 1`,
    { username: fromCookie.username }
  ).catch(() => null)
  if (!user) return null
  return mapUser(user)
}

export async function requireAdmin(event: any): Promise<AdminUser> {
  const user = await currentAdminUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  return user
}

export async function requireSuperadmin(event: any): Promise<AdminUser> {
  const user = await requireAdmin(event)
  if (user.role !== 'superadmin') {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung (Superadmin erforderlich)' })
  }
  return user
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/'
  }
}

export async function setUserPassword(userId: number, password: string) {
  const { query } = await import('./db')
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  await query('UPDATE admin_users SET salt = :salt, pw_hash = :hash WHERE id = :id', {
    salt, hash, id: userId
  })
}
