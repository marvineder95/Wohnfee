import { requireAdmin } from '../../../utils/admin-auth'
import { getSiteContent, catalogCount } from '../../../utils/site-content'

// GET /api/admin/site-content – Kennzahlen & Bauträger-Fakten (inkl. ausgeblendeter)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { content: await getSiteContent(), catalogCount: await catalogCount() }
})
