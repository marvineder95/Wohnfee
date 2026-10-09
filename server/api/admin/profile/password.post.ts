import { requireAdmin, verifyCredentials, setUserPassword } from '../../../utils/admin-auth'
import { validatePasswordStrength } from '../../../utils/tokens'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const { currentPassword, newPassword } = await readBody(event).catch(() => ({} as any)) as {
    currentPassword?: string
    newPassword?: string
  }

  const pwError = validatePasswordStrength(newPassword)
  if (pwError) throw createError({ statusCode: 400, statusMessage: pwError })

  // current password must be verified before changing
  const verified = await verifyCredentials(user.username, String(currentPassword || ''))
  if (!verified) {
    throw createError({ statusCode: 403, statusMessage: 'Aktuelles Passwort ist falsch' })
  }

  await setUserPassword(user.id, String(newPassword))
  return { ok: true }
})
