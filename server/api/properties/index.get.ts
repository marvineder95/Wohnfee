import { publicProperties } from '../../utils/properties'

// GET /api/properties – öffentliche Immobilien (verfügbar, reserviert, vergeben)
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'public, max-age=60')
  return { items: await publicProperties() }
})
