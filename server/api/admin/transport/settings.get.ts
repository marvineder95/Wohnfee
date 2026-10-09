import { requireAdmin } from '../../../utils/admin-auth'
import { getTransportSettings, DEFAULT_TRANSPORT } from '../../../utils/transport'

// GET /api/admin/transport/settings — Konditionen für die Transportkosten
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { settings: await getTransportSettings(), defaults: DEFAULT_TRANSPORT }
})
