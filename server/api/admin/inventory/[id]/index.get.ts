import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Objekt-ID' })
  }
  const item = await queryOne(
    `SELECT id, asol_id AS asolId, title, title_en AS titleEn, category, image_path AS imagePath,
            description, description_en AS descriptionEn, supplier, artnr, ean, quantity,
            original_price AS originalPrice, rent_price_1m AS rentPrice1m, rent_price_3m AS rentPrice3m, rentable,
            status, warehouse, customer_location AS customerLocation,
            purchased_at AS purchasedAt, purchased_year AS purchasedYear, source
     FROM inventory_items WHERE id = :id`, { id }
  )
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Objekt nicht gefunden' })
  const tags = await query('SELECT tag FROM item_tags WHERE item_id = :id ORDER BY tag', { id })
  const images = await query(
    'SELECT id, path FROM item_images WHERE item_id = :id ORDER BY position, id', { id }
  )
  return { item, tags: tags.map(t => t.tag), images }
})
