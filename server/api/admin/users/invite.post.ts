import { createHash, randomBytes } from 'node:crypto'
import { publicOrigin } from '../../../utils/site'
import { requireSuperadmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'
import { sendMail, inviteMail, mailerConfigured } from '../../../utils/mailer'

const INVITE_VALID_HOURS = 48

export default defineEventHandler(async (event) => {
  const inviter = await requireSuperadmin(event)
  const { email, displayName, role, employeeId } = await readBody(event).catch(() => ({} as any)) as {
    email?: string
    displayName?: string
    role?: string
    employeeId?: number
  }

  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Gültige E-Mail-Adresse erforderlich' })
  }
  const cleanName = String(displayName || '').trim()
  if (!cleanName) {
    throw createError({ statusCode: 400, statusMessage: 'Name erforderlich' })
  }
  const inviteRole = ['superadmin', 'designer', 'driver'].includes(role || '') ? role : 'driver'

  const existing = await queryOne(
    'SELECT id, status FROM admin_users WHERE LOWER(email) = LOWER(:email) LIMIT 1',
    { email: cleanEmail }
  )
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Es existiert bereits ein Benutzer mit dieser E-Mail-Adresse' })
  }

  // Klartext-Token für den Link, nur der SHA-256-Hash landet in der Datenbank
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const res = await query(
    `INSERT INTO admin_users (email, display_name, role, status, invite_token_hash, invite_expires_at, invited_by)
     VALUES (:email, :name, :role, 'pending', :tokenHash, DATE_ADD(NOW(), INTERVAL ${INVITE_VALID_HOURS} HOUR), :invitedBy)`,
    { email: cleanEmail, name: cleanName, role: inviteRole, tokenHash, invitedBy: inviter.id }
  )
  const insertId = (res as any).insertId

  // Dashboard-Zugang gehört immer zu einem Mitarbeiter (/admin/mitarbeiter): verknüpfen oder neu anlegen
  const empId = Number(employeeId)
  if (Number.isInteger(empId) && empId > 0) {
    await query('UPDATE employees SET user_id = :uid, email = COALESCE(email, :email) WHERE id = :id AND user_id IS NULL',
      { uid: insertId, email: cleanEmail, id: empId })
  } else {
    const [first, ...rest] = cleanName.split(/\s+/)
    await query(`INSERT INTO employees (user_id, first_name, last_name, email, vacation_days) VALUES (:uid, :first, :last, :email, 25)`,
      { uid: insertId, first, last: rest.join(' ') || null, email: cleanEmail })
  }

  const origin = publicOrigin(event)
  const inviteUrl = `${origin}/admin/einladung?token=${token}`
  const inviterName = inviter.displayName || inviter.username
  const mail = inviteMail({ to: cleanEmail, displayName: cleanName, inviterName, inviteUrl })
  let sent = false
  try {
    sent = await sendMail(cleanEmail, mail.subject, mail.text, mail.html)
  } catch (e: any) {
    console.error('[invite] Mailversand fehlgeschlagen:', e?.message || e)
  }

  return {
    ok: true,
    id: insertId,
    email: cleanEmail,
    sent,
    // Nur für Entwicklung, wenn kein SMTP eingerichtet ist:
    ...(mailerConfigured() ? {} : { devInviteUrl: inviteUrl })
  }
})
