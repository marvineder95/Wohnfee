import { requireAdmin } from '../../../utils/admin-auth'
import { propertiesPublic, setPropertiesPublic } from '../../../utils/shop-status'

// PUT /api/admin/properties/public { public: boolean } — Immobilien-Bereich der Website ein-/ausblenden
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  await setPropertiesPublic(!!body?.public)
  return { public: await propertiesPublic() }
})
