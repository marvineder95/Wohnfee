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
    `SELECT id, name, email, phone, subject, status, customer_type AS customerType,
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
  // „Wie haben Sie uns gefunden?" – letzte 12 Monate (nur Anfragen mit Angabe)
  const referrals = await query(
    `SELECT referral AS value, COUNT(*) AS n FROM contact_inquiries
     WHERE referral IS NOT NULL AND created_at > NOW() - INTERVAL 12 MONTH
     GROUP BY referral ORDER BY n DESC`
  )
  return {
    inquiries,
    counts: countMap,
    referrals: (referrals as any[]).map(r => ({ value: String(r.value), n: Number(r.n) }))
  }
})
