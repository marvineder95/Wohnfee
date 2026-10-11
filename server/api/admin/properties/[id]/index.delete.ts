import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { loadProperty } from '../../../../utils/properties'

// DELETE /api/admin/properties/:id – Anfragen bleiben erhalten (Verknüpfung wird gelöst)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await loadProperty(id)
  await query('UPDATE contact_inquiries SET property_id = NULL WHERE property_id = :id', { id })
  await query('DELETE FROM properties WHERE id = :id', { id })
  return { ok: true }
})
