import { randomBytes } from 'node:crypto'
import { requireAdmin } from '../../../utils/admin-auth'
import { getSetting, setSetting } from '../../../utils/settings'

// PUT /api/admin/properties/settings – { feed: boolean, renewKey?: boolean }
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  await setSetting('willhaben_feed', body?.feed ? 'on' : 'off')
  if (body?.renewKey || !(await getSetting('willhaben_feed_key'))) await setSetting('willhaben_feed_key', randomBytes(18).toString('base64url'))
  return { ok: true }
})
