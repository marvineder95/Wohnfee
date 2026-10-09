import { query, queryOne } from '../../../utils/db'
import { createAccountToken } from '../../../utils/tokens'
import { sendMail, selfResetMail, mailerConfigured } from '../../../utils/mailer'

const RESET_VALID_HOURS = 2

// Public self-service "Passwort vergessen" — always responds ok to avoid
// leaking which accounts exist. Only sends mail if the account was found.
export default defineEventHandler(async (event) => {
  const { usernameOrEmail } = await readBody(event).catch(() => ({} as any)) as { usernameOrEmail?: string }
  const q = String(usernameOrEmail || '').trim()
  if (!q) throw createError({ statusCode: 400, statusMessage: 'Bitte Benutzername oder E-Mail eingeben' })

  const user = await queryOne<any>(
    `SELECT id, username, email, display_name FROM admin_users
     WHERE status = 'active' AND (LOWER(username) = LOWER(:q) OR LOWER(email) = LOWER(:q)) LIMIT 1`,
    { q }
  )

  let devResetUrl: string | undefined
  if (user?.email) {
    const { token, tokenHash } = createAccountToken()
    await query(
      `UPDATE admin_users SET reset_token_hash = :tokenHash,
         reset_expires_at = DATE_ADD(NOW(), INTERVAL ${RESET_VALID_HOURS} HOUR)
       WHERE id = :id`,
      { tokenHash, id: user.id }
    )
    const origin = getRequestURL(event).origin
    const resetUrl = `${origin}/admin/passwort?token=${token}`
    devResetUrl = resetUrl
    const mail = selfResetMail({ to: user.email, displayName: user.display_name || user.username, resetUrl })
    try {
      await sendMail(user.email, mail.subject, mail.text, mail.html)
    } catch (e: any) {
      console.error('[self-reset] Mailversand fehlgeschlagen:', e?.message || e)
    }
  }

  return {
    ok: true,
    message: 'Falls ein Konto mit diesen Daten existiert, wurde eine E-Mail mit einem Link zum Zurücksetzen versendet.',
    ...(mailerConfigured() || !devResetUrl ? {} : { devResetUrl })
  }
})
