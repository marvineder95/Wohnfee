import { shopAccess } from '../utils/shop-status'

// GET /api/shop-status — { public, preview }: Website blendet den Mietshop danach ein (oder zeigt „Coming Soon“)
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  return await shopAccess(event)
})
