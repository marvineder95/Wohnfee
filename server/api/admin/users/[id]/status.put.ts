import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const me = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const { status } = await readBody(event).catch(() => ({} as any)) as { status?: string }

  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Ungültige Benutzer-ID' })
  if (!['active', 'deactivated'].includes(status || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Status' })
  }
  if (id === me.id) throw createError({ statusCode: 400, statusMessage: 'Eigenes Konto kann nicht deaktiviert werden' })

  const target = await queryOne<any>('SELECT id, role FROM admin_users WHERE id = :id LIMIT 1', { id })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })

  // protect the last remaining active superadmin
  if (target.role === 'superadmin' && status === 'deactivated') {
    const others = await queryOne(
      `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'superadmin' AND status = 'active' AND id != :id`,
      { id }
    )
    if (Number(others?.n) === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Der letzte Superadmin kann nicht deaktiviert werden' })
    }
  }

  await query('UPDATE admin_users SET status = :status WHERE id = :id', { status, id })
  return { ok: true, status }
})
