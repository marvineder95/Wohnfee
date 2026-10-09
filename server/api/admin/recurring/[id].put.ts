import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'
import { invDate, invClean } from '../../../utils/invoices'

// PUT /api/admin/recurring/:id — pausieren/fortsetzen, Ende, nächsten Termin ändern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const rec = await queryOne('SELECT id FROM recurring_invoices WHERE id = :id', { id })
  if (!rec) throw createError({ statusCode: 404, statusMessage: 'Abo nicht gefunden' })
  const body = await readBody(event)
  const sets: string[] = []
  const params: any = { id }
  if (body?.active !== undefined) { sets.push('active = :active'); params.active = body.active ? 1 : 0 }
  if (body?.end_date !== undefined) { sets.push('end_date = :end'); params.end = invDate(body.end_date) }
  if (body?.next_date !== undefined && invDate(body.next_date)) { sets.push('next_date = :next'); params.next = invDate(body.next_date) }
  if (body?.title !== undefined) { sets.push('title = :title'); params.title = invClean(body.title) }
  if (sets.length) await query(`UPDATE recurring_invoices SET ${sets.join(', ')} WHERE id = :id`, params)
  return { ok: true }
})
