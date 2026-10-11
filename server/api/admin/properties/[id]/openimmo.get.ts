import { requireAdmin } from '../../../../utils/admin-auth'
import { loadProperty } from '../../../../utils/properties'
import { propertyToOpenImmo } from '../../../../utils/openimmo'
import { publicOrigin } from '../../../../utils/site'

// GET /api/admin/properties/:id/openimmo – OpenImmo-XML (für willhaben & andere Portale)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const r: any = await loadProperty(Number(getRouterParam(event, 'id')))
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="openimmo-${r.slug}.xml"`)
  return propertyToOpenImmo(r, publicOrigin(event))
})
