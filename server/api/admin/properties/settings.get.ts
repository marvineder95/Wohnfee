import { requireAdmin } from '../../../utils/admin-auth'
import { getSetting } from '../../../utils/settings'
import { publicOrigin } from '../../../utils/site'

// GET /api/admin/properties/settings – willhaben-Schnittstelle (Feed an/aus + Feed-Adresse)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = await getSetting('willhaben_feed_key')
  return {
    feed: (await getSetting('willhaben_feed')) === 'on',
    feedUrl: key ? `${publicOrigin(event)}/api/feeds/openimmo?key=${key}` : null
  }
})
