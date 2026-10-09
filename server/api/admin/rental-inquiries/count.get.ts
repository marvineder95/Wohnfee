import { requireAdmin } from '../../../utils/admin-auth'
import { queryOne } from '../../../utils/db'

// Anzahl neuer Mietanfragen — für den Badge in der Navigation
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const row = await queryOne(
    `SELECT COUNT(*) AS n FROM rental_inquiries WHERE status = 'neu'`
  )
  return { count: Number(row?.n || 0) }
})
