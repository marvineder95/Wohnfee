import { requireAdmin } from '../../../utils/admin-auth'
import { notifyTeam } from '../../../utils/push'

// POST /api/admin/push/test — Testbenachrichtigung an die eigenen Geräte
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const res = await notifyTeam({
    title: 'WOHNFEE Dashboard',
    body: 'Push-Benachrichtigungen sind aktiv ✓',
    url: '/admin/dashboard',
    tag: 'wf-test'
  }, user.id)
  return { ok: true, ...res }
})
