import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

const STATUSES = ['neu', 'in_bearbeitung', 'beantwortet', 'archiviert']

// GET /api/admin/rental-inquiries — Mietanfragen-Liste mit Status-Filter und Zählern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const status = String(q.status || '')
  const params: any = {}
  let where = ''
  if (STATUSES.includes(status)) {
    where = 'WHERE status = :status'
    params.status = status
  }
  const inquiries = await query(
    `SELECT id, number, status, first_name AS firstName, last_name AS lastName, company,
            email, phone, city, start_date AS startDate, end_date AS endDate,
            duration_months AS durationMonths, monthly_total AS monthlyTotal,
            created_at AS createdAt
     FROM rental_inquiries
     ${where}
     ORDER BY created_at DESC
     LIMIT 500`,
    params
  )
  const counts = await query(
    `SELECT status, COUNT(*) AS n FROM rental_inquiries GROUP BY status`
  )
  const countMap: Record<string, number> = { neu: 0, in_bearbeitung: 0, beantwortet: 0, archiviert: 0 }
  for (const row of counts as any[]) countMap[row.status] = Number(row.n)
  return { inquiries, counts: countMap }
})
