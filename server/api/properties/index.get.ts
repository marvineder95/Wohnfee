import { publicProperties } from '../../utils/properties'
import { requirePropertiesAccess } from '../../utils/shop-status'

// GET /api/properties – öffentliche Immobilien (verfügbar, reserviert, vergeben)
export default defineEventHandler(async (event) => {
  await requirePropertiesAccess(event)
  setResponseHeader(event, 'cache-control', 'private, max-age=60')
  return { items: await publicProperties() }
})
