import { visiblePartners } from '../utils/partners'

// GET /api/partners – sichtbare Partner & Referenzen für die Website (leer → Website blendet alles aus)
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'public, max-age=60')
  return visiblePartners()
})
