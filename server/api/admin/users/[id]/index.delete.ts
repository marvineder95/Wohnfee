import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const me = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Ungültige Benutzer-ID' })
  if (id === me.id) throw createError({ statusCode: 400, statusMessage: 'Eigenes Konto kann nicht gelöscht werden' })

  const target = await queryOne<any>('SELECT id, role, status FROM admin_users WHERE id = :id LIMIT 1', { id })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })

  if (target.role === 'superadmin') {
    const others = await queryOne(
      `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'superadmin' AND status = 'active' AND id != :id`,
      { id }
    )
    if (Number(others?.n) === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Der letzte Superadmin kann nicht gelöscht werden' })
    }
  }

  await query('DELETE FROM admin_users WHERE id = :id', { id })
  return { ok: true }
})
