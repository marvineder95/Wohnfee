import { requireAdmin } from '../../../utils/admin-auth'
import { saveTiers } from '../../../utils/rental-pricing'

// PUT /api/admin/rental-pricing – Rabattstaffel speichern ({ tiers: [{ from, pct }] })
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  return { ok: true, tiers: await saveTiers(body?.tiers) }
})
