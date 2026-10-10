import { requireAdmin } from '../../../utils/admin-auth'
import { saveSubscription } from '../../../utils/push'

// POST /api/admin/push/subscribe — Push-Abo dieses Geräts speichern
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event)
  await saveSubscription(user.id || null, body?.subscription, getRequestHeader(event, 'user-agent') || null)
  return { ok: true }
})
