import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const status = String(q.status || '')
  const params: any = {}
  let where = ''
  if (['neu', 'gelesen', 'archiviert'].includes(status)) {
    where = 'WHERE status = :status'
    params.status = status
  }
  const inquiries = await query(
    `SELECT id, name, email, phone, subject, status,
            LEFT(message, 160) AS messagePreview,
            created_at AS createdAt
     FROM contact_inquiries
     ${where}
     ORDER BY created_at DESC
     LIMIT 500`,
    params
  )
  const counts = await query(
    `SELECT status, COUNT(*) AS n FROM contact_inquiries GROUP BY status`
  )
  const countMap: Record<string, number> = { neu: 0, gelesen: 0, archiviert: 0 }
  for (const row of counts as any[]) countMap[row.status] = Number(row.n)
  return { inquiries, counts: countMap }
})
