import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { loadProperty, toAdminProperty } from '../../../../utils/properties'

// GET /api/admin/properties/:id – Detail inkl. Anfragen zu dieser Immobilie
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const p = toAdminProperty(await loadProperty(id))
  const inquiries = await query(
    `SELECT id, name, email, phone, message, status, created_at AS createdAt FROM contact_inquiries
     WHERE property_id = :id ORDER BY created_at DESC LIMIT 100`, { id })
  return { ...p, inquiries }
})
