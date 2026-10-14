import { requireAdmin } from '../../../utils/admin-auth'
import { getTiers } from '../../../utils/rental-pricing'

// GET /api/admin/rental-pricing – Rabattstaffel nach Mietdauer
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { tiers: await getTiers() }
})
