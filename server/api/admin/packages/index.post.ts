import { requireAdmin } from '../../../utils/admin-auth'
import { savePackage } from '../../../utils/package-save'

// POST /api/admin/packages – neues Möbelpaket
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { ok: true, id: await savePackage(null, await readBody(event)) }
})
