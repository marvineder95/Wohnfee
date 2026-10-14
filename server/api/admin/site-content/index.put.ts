import { requireAdmin } from '../../../utils/admin-auth'
import { saveSiteContent } from '../../../utils/site-content'

// PUT /api/admin/site-content – Kennzahlen & Bauträger-Fakten speichern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { ok: true, content: await saveSiteContent((await readBody(event))?.content) }
})
