import { query } from '../utils/db'

// GET /api/rental-catalog — öffentlicher Katalog der vermietbaren Möbel (kein Admin-Login nötig).
// Liefert nur öffentliche Felder — keine Einkaufspreise, EANs, Lagerdetails o. Ä.
export default defineEventHandler(async () => {
  const items = await query(
    `SELECT id, title, title_en AS titleEn, category, image_path AS imagePath,
            description, description_en AS descriptionEn,
            rent_price_1m AS rentPrice1m, rent_price_3m AS rentPrice3m, quantity
     FROM inventory_items
     WHERE rentable = 1 AND status = 'lager'
     ORDER BY category, title`
  )
  return { items }
})
