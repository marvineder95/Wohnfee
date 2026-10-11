import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { readPropertyInput, PROPERTY_COLS, loadProperty, toAdminProperty } from '../../../../utils/properties'

// PUT /api/admin/properties/:id – speichern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await loadProperty(id)
  const d = await readPropertyInput(await readBody(event), id)
  await query(`UPDATE properties SET ${PROPERTY_COLS} WHERE id = :id`, { ...d, id })
  return toAdminProperty(await loadProperty(id))
})
