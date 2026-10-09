import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/contacts?q=&tag=&status=&page=
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const qs = getQuery(event)
  const q = String(qs.q || '').trim()
  const tag = String(qs.tag || '').trim()
  const status = String(qs.status || 'aktiv')
  const page = Math.max(0, Number(qs.page || 0))
  const pageLen = Math.min(100, Math.max(10, Number(qs.pagelen || 50)))

  const where: string[] = []
  const params: any = {}
  if (['aktiv', 'archiviert'].includes(status)) {
    where.push('c.status = :status')
    params.status = status
  }
  if (q) {
    where.push(`(c.name1 LIKE :q OR c.name2 LIKE :q OR c.city LIKE :q OR c.email LIKE :q
                OR CONCAT_WS(' ', c.name1, c.name2) LIKE :q)`)
    params.q = `%${q}%`
  }
  if (tag) {
    where.push('EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = :tag)')
    params.tag = tag
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const total = await query(
    `SELECT COUNT(*) AS n FROM contacts c ${whereSql}`, params
  )
  const contacts = await query(
    `SELECT c.id, c.type, c.name1, c.name2, c.street, c.zip, c.city, c.email, c.phone,
            c.status, c.source,
            (SELECT GROUP_CONCAT(t.tag ORDER BY t.tag SEPARATOR ', ')
             FROM contact_tags t WHERE t.contact_id = c.id) AS tags,
            (SELECT COUNT(*) FROM locations l WHERE l.contact_id = c.id) AS locationCount
     FROM contacts c ${whereSql}
     ORDER BY c.name2, c.name1
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: pageLen, offset: page * pageLen }
  )
  const tags = await query(
    `SELECT tag, COUNT(*) AS n FROM contact_tags GROUP BY tag ORDER BY n DESC LIMIT 60`
  )
  return { contacts, total: Number(total[0]?.n || 0), page, pageLen, tags }
})
