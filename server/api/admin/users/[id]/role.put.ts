import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const me = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const { role } = await readBody(event).catch(() => ({} as any)) as { role?: string }

  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Ungültige Benutzer-ID' })
  if (!['superadmin', 'admin', 'user'].includes(role || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rolle' })
  }
  if (id === me.id) throw createError({ statusCode: 400, statusMessage: 'Eigene Rolle kann nicht geändert werden' })

  const target = await queryOne<any>('SELECT id, role FROM admin_users WHERE id = :id LIMIT 1', { id })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })

  // protect the last remaining superadmin
  if (target.role === 'superadmin' && role !== 'superadmin') {
    const others = await queryOne(
      `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'superadmin' AND status = 'active' AND id != :id`,
      { id }
    )
    if (Number(others?.n) === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Der letzte Superadmin kann nicht herabgestuft werden' })
    }
  }

  await query('UPDATE admin_users SET role = :role WHERE id = :id', { role, id })
  return { ok: true, role }
})
