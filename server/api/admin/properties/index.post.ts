import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { readPropertyInput, PROPERTY_COLS, loadProperty, toAdminProperty } from '../../../utils/properties'

// POST /api/admin/properties – neue Immobilie
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const d = await readPropertyInput(await readBody(event), null)
  const res: any = await query(`INSERT INTO properties SET ${PROPERTY_COLS}, created_by = :by`, { ...d, by: user.displayName || user.username })
  return toAdminProperty(await loadProperty(Number(res.insertId)))
})
