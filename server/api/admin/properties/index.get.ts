import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { toAdminProperty } from '../../../utils/properties'

// GET /api/admin/properties – alle Immobilien inkl. Anzahl Anfragen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows: any[] = await query(
    `SELECT p.*, (SELECT COUNT(*) FROM contact_inquiries c WHERE c.property_id = p.id) AS inquiry_count
     FROM properties p ORDER BY FIELD(p.status, 'aktiv', 'reserviert', 'entwurf', 'vergeben', 'archiviert'), p.updated_at DESC`)
  return { items: rows.map(r => ({ ...toAdminProperty(r), inquiryCount: Number(r.inquiry_count) })) }
})
