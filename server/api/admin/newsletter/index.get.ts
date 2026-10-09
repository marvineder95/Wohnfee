import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// GET /api/admin/newsletter — Abonnenten + letzte Versände
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const subscribers = await query<any>(
    `SELECT id, email, lang, status, created_at
     FROM newsletter_subscribers
     ORDER BY created_at DESC`
  )
  const sends = await query<any>(
    `SELECT id, subject, recipient_count, sent_by, created_at
     FROM newsletter_sends
     ORDER BY created_at DESC
     LIMIT 20`
  )
  const count = await query<any>(
    `SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE status = 'aktiv'`
  )
  return {
    subscribers,
    sends,
    activeCount: Number(count?.[0]?.n || 0)
  }
})
