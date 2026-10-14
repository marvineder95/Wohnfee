import { requireAdmin } from '../../../utils/admin-auth'
import { savePackage } from '../../../utils/package-save'

// PUT /api/admin/packages/:id – Paket inkl. Stückliste speichern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { ok: true, id: await savePackage(Number(getRouterParam(event, 'id')), await readBody(event)) }
})
