import { requireAdmin } from '../../../utils/admin-auth'
import { loadPackages } from '../../../utils/rental-packages'

// GET /api/admin/packages – alle Möbelpakete inkl. Stückliste, Preis und Verfügbarkeit
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { items: await loadPackages() }
})
