import { publicSiteContent } from '../utils/site-content'

// GET /api/site-content – freigeschaltete Kennzahlen, Bauträger-Fakten und Kundenstimmen für die Website
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'public, max-age=60')
  return publicSiteContent()
})
