import { query } from '../utils/db'
import { RESERVED_SQL } from '../utils/reservations'
import { getTiers } from '../utils/rental-pricing'
import { loadPackages } from '../utils/rental-packages'
import { basePrice } from '../../shared/rental-pricing'

// GET /api/rental-catalog — öffentlicher Katalog der vermietbaren Möbel (kein Admin-Login nötig).
// Liefert nur öffentliche Felder — keine Einkaufspreise, EANs, Lagerdetails o. Ä.
// quantity = frei verfügbarer Bestand (abzüglich der Stücke, die in Projekten im Einsatz oder
// für eine offene Mietanfrage reserviert sind).
// price = Grundpreis (Monatsmiete bei 1 Monat); Rabatt je Mietdauer über `tiers` (shared/rental-pricing.ts).
// packages = sichtbare Möbelpakete mit Paket-Grundpreis und Verfügbarkeit.
export default defineEventHandler(async () => {
  const items = await query(
    `SELECT id, title, title_en AS titleEn, category, image_path AS imagePath,
            description, description_en AS descriptionEn,
            rent_price_1m AS price,
            quantity - COALESCE(a.assigned, 0) - COALESCE(r.reserved, 0) AS quantity,
            (SELECT GROUP_CONCAT(m.match_id ORDER BY m.position) FROM item_matches m WHERE m.item_id = inventory_items.id) AS matchIds
     FROM inventory_items
     LEFT JOIN (SELECT item_id, SUM(quantity) AS assigned FROM project_items GROUP BY item_id) a
       ON a.item_id = inventory_items.id
     LEFT JOIN (${RESERVED_SQL}) r ON r.item_id = inventory_items.id
     WHERE rentable = 1 AND status = 'lager'
       AND quantity - COALESCE(a.assigned, 0) - COALESCE(r.reserved, 0) > 0
     ORDER BY category, title`
  )
  for (const it of items as any[]) {
    // „Passt dazu": Liste der IDs (nur verfügbare Artikel werden im Shop gezeigt)
    it.matches = it.matchIds ? String(it.matchIds).split(',').map(Number) : []
    delete it.matchIds
    it.price = basePrice(it.price)
  }
  const packages = (await loadPackages({ visibleOnly: true }))
    .filter(p => p.base !== null)
    .map(p => ({
      id: p.id, title: p.title, titleEn: p.titleEn, description: p.description, descriptionEn: p.descriptionEn,
      imagePath: p.imagePath, base: p.base, sum: p.sum, discountPct: p.discountPct, available: p.available,
      items: p.items.map(i => ({ id: i.id, title: i.title, titleEn: i.titleEn, imagePath: i.imagePath, quantity: i.quantity }))
    }))
  return { items, packages, tiers: await getTiers() }
})
