import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// PUT /api/admin/profile — eigene Profildaten pflegen
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event).catch(() => ({} as any)) as any

  const clean = String(body?.displayName || '').trim().slice(0, 128)
  if (!clean) {
    throw createError({ statusCode: 400, statusMessage: 'Anzeigename darf nicht leer sein' })
  }
  const email = String(body?.email || '').trim().slice(0, 190)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte eine gültige E-Mail-Adresse angeben' })
  }
  const phone = String(body?.phone || '').trim().slice(0, 64)
  const position = String(body?.position || '').trim().slice(0, 128)
  const bio = String(body?.bio || '').trim().slice(0, 500)

  await query(
    `UPDATE admin_users SET display_name = :name, email = :email, phone = :phone,
       position = :position, bio = :bio WHERE id = :id`,
    { name: clean, email: email || null, phone: phone || null, position: position || null, bio: bio || null, id: user.id }
  )
  return { ok: true, displayName: clean }
})
