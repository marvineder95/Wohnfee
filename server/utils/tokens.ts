import { createHash, randomBytes } from 'node:crypto'

// Generates a URL-safe account token (invite / password reset).
// Only the SHA-256 hash is stored in the database.
export function createAccountToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex')
  return { token, tokenHash: createHash('sha256').update(token).digest('hex') }
}

export function hashAccountToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function isValidTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
}

export function validatePasswordStrength(password: unknown): string | null {
  const pw = String(password || '')
  if (pw.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein'
  if (pw.length > 128) return 'Passwort darf maximal 128 Zeichen lang sein'
  return null
}
