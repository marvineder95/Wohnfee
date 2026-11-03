import { shopAccess, propertiesPublic } from '../utils/shop-status'

// GET /api/shop-status — { public, preview }: Website blendet den Mietshop danach ein (oder zeigt „Coming Soon“)
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  // properties: Immobilien-Bereich öffentlich (Menüpunkt)
  return { ...(await shopAccess(event)), properties: await propertiesPublic() }
})
