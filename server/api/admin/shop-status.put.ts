import { requireAdmin } from '../../utils/admin-auth'
import { setShopPublic, shopPublic } from '../../utils/shop-status'

// PUT /api/admin/shop-status { public: boolean } — Mietshop für Besucher ein-/ausblenden (Recht: Konditionen bearbeiten)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  await setShopPublic(!!body?.public)
  return { public: await shopPublic() }
})
