import { requireAdmin } from '../../../utils/admin-auth'
import { vapidPublicKey } from '../../../utils/push'

// GET /api/admin/push/key — öffentlicher VAPID-Schlüssel für die Anmeldung im Browser
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { key: await vapidPublicKey() }
})
