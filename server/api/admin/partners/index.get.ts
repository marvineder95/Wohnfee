import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { mapPartner } from '../../../utils/partners'

// GET /api/admin/partners – alle Partner & Referenzen (auch ausgeblendete)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await query<any>('SELECT * FROM partners ORDER BY kind, sort_order, name')
  return { items: rows.map(mapPartner) }
})
