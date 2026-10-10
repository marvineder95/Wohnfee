import { query } from '../utils/db'

// GET /api/rental-catalog — öffentlicher Katalog der vermietbaren Möbel (kein Admin-Login nötig).
// Liefert nur öffentliche Felder — keine Einkaufspreise, EANs, Lagerdetails o. Ä.
// quantity = frei verfügbarer Bestand (abzüglich der Stücke, die in Projekten im Einsatz sind).
export default defineEventHandler(async () => {
  const items = await query(
    `SELECT id, title, title_en AS titleEn, category, image_path AS imagePath,
            description, description_en AS descriptionEn,
            rent_price_1m AS rentPrice1m, rent_price_3m AS rentPrice3m,
            quantity - COALESCE(a.assigned, 0) AS quantity,
            (SELECT GROUP_CONCAT(m.match_id ORDER BY m.position) FROM item_matches m WHERE m.item_id = inventory_items.id) AS matchIds
     FROM inventory_items
     LEFT JOIN (SELECT item_id, SUM(quantity) AS assigned FROM project_items GROUP BY item_id) a
       ON a.item_id = inventory_items.id
     WHERE rentable = 1 AND status = 'lager'
       AND quantity - COALESCE(a.assigned, 0) > 0
     ORDER BY category, title`
  )
  // „Passt dazu": Liste der IDs (nur verfügbare Artikel werden im Shop gezeigt)
  for (const it of items as any[]) it.matches = it.matchIds ? String(it.matchIds).split(',').map(Number) : []
  for (const it of items as any[]) delete it.matchIds
  return { items }
})
