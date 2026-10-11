import { queryOne } from '../../../utils/db'
import { toPublicProperty, PUBLIC_STATUSES } from '../../../utils/properties'

// GET /api/properties/:slug – Detail (nur öffentliche Status)
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const r = await queryOne(
    `SELECT * FROM properties WHERE slug = :slug AND status IN (${PUBLIC_STATUSES.map(s => `'${s}'`).join(',')})`, { slug })
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Immobilie nicht gefunden' })
  return toPublicProperty(r)
})
