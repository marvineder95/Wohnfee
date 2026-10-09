import { requireSuperadmin } from '../../../../utils/admin-auth'
import { publicOrigin } from '../../../../utils/site'
import { query, queryOne } from '../../../../utils/db'
import { createAccountToken, isValidTokenFormat } from '../../../../utils/tokens'
import { sendMail, resetMail, mailerConfigured } from '../../../../utils/mailer'

const RESET_VALID_HOURS = 2

export default defineEventHandler(async (event) => {
  const inviter = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Benutzer-ID' })
  }

  const target = await queryOne<any>(
    `SELECT id, username, email, display_name, status FROM admin_users WHERE id = :id LIMIT 1`,
    { id }
  )
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })
  if (target.status !== 'active' || !target.username) {
    throw createError({ statusCode: 400, statusMessage: 'Nur aktive Benutzer können ein Passwort-Reset erhalten' })
  }

  const { token, tokenHash } = createAccountToken()
  await query(
    `UPDATE admin_users SET reset_token_hash = :tokenHash,
       reset_expires_at = DATE_ADD(NOW(), INTERVAL ${RESET_VALID_HOURS} HOUR)
     WHERE id = :id`,
    { tokenHash, id }
  )

  const origin = publicOrigin(event)
  const resetUrl = `${origin}/admin/passwort?token=${token}`
  const mail = resetMail({
    to: target.email,
    displayName: target.display_name || target.username,
    inviterName: inviter.displayName || inviter.username,
    resetUrl
  })
  let sent = false
  if (target.email) {
    try {
      sent = await sendMail(target.email, mail.subject, mail.text, mail.html)
    } catch (e: any) {
      console.error('[reset] Mailversand fehlgeschlagen:', e?.message || e)
    }
  }

  return {
    ok: true,
    sent,
    hasEmail: !!target.email,
    // Nur für Entwicklung, wenn kein SMTP eingerichtet ist:
    ...(mailerConfigured() ? {} : { devResetUrl: resetUrl })
  }
})
