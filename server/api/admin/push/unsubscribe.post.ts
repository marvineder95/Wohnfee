import { requireAdmin } from '../../../utils/admin-auth'
import { removeSubscription } from '../../../utils/push'

// POST /api/admin/push/unsubscribe — Push auf diesem Gerät abschalten
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  await removeSubscription(String(body?.endpoint || ''))
  return { ok: true }
})
