import { query } from './db'
import { RESERVED_SQL } from './reservations'
import { basePrice, packageBase } from '../../shared/rental-pricing'

// Möbelpakete (Dashboard /admin/pakete): Paket = feste Liste von Inventar-Stücken.
// Preis = Summe der Grundpreise − Paketrabatt (oder fester Preis); buchbar nur, wenn ALLE Stücke frei sind.

/** Frei verfügbare Menge je Artikel (vermietbar, im Lager, abzüglich Projekte & Reservierungen) */
export async function freeStock(itemIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  if (!itemIds.length) return out
  const rows = await query<any>(
    `SELECT i.id, IF(i.rentable = 1 AND i.status = 'lager',
              i.quantity - COALESCE(a.assigned, 0) - COALESCE(r.reserved, 0), 0) AS free
     FROM inventory_items i
     LEFT JOIN (SELECT item_id, SUM(quantity) AS assigned FROM project_items GROUP BY item_id) a ON a.item_id = i.id
     LEFT JOIN (${RESERVED_SQL}) r ON r.item_id = i.id
     WHERE i.id IN (:ids)`, { ids: itemIds })
  for (const r of rows) out.set(Number(r.id), Math.max(0, Number(r.free) || 0))
  return out
}

export interface PackageView {
  id: number; title: string; titleEn: string | null; description: string | null; descriptionEn: string | null
  imagePath: string | null; discountPct: number; priceOverride: number | null; visible: boolean; sortOrder: number
  items: Array<{ id: number; title: string; titleEn: string | null; imagePath: string | null; quantity: number; price: number | null; free: number }>
  sum: number | null      // Summe der Grundpreise (ohne Paketrabatt)
  base: number | null     // Paket-Grundpreis pro Monat (vor Mietdauer-Rabatt)
  available: boolean
}

export async function loadPackages(opts: { visibleOnly?: boolean; ids?: number[] } = {}): Promise<PackageView[]> {
  const where: string[] = []
  const params: any = {}
  if (opts.visibleOnly) where.push('visible = 1')
  if (opts.ids?.length) { where.push('id IN (:ids)'); params.ids = opts.ids }
  const pkgs = await query<any>(
    `SELECT * FROM rental_packages ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY sort_order, title`, params)
  if (!pkgs.length) return []
  const links = await query<any>(
    `SELECT pi.package_id, pi.item_id, pi.quantity, i.title, i.title_en, i.image_path, i.rent_price_1m
     FROM rental_package_items pi JOIN inventory_items i ON i.id = pi.item_id
     WHERE pi.package_id IN (:ids) ORDER BY pi.position, i.title`, { ids: pkgs.map((p: any) => p.id) })
  const stock = await freeStock([...new Set(links.map((l: any) => Number(l.item_id)))])
  return pkgs.map((p: any) => {
    const items = links.filter((l: any) => l.package_id === p.id).map((l: any) => ({
      id: Number(l.item_id), title: l.title, titleEn: l.title_en || null, imagePath: l.image_path || null,
      quantity: Number(l.quantity) || 1, price: basePrice(l.rent_price_1m), free: stock.get(Number(l.item_id)) ?? 0
    }))
    const override = p.price_override !== null ? Number(p.price_override) : null
    const sum = items.length && items.every(i => i.price !== null)
      ? Math.round(items.reduce((s, i) => s + (i.price as number) * i.quantity, 0) * 100) / 100 : null
    const base = packageBase(items, Number(p.discount_pct) || 0, override)
    return {
      id: Number(p.id), title: p.title, titleEn: p.title_en || null, description: p.description || null,
      descriptionEn: p.description_en || null, imagePath: p.image_path || items.find(i => i.imagePath)?.imagePath || null,
      discountPct: Number(p.discount_pct) || 0, priceOverride: override, visible: !!p.visible, sortOrder: Number(p.sort_order) || 0,
      items, sum, base,
      available: items.length > 0 && items.every(i => i.free >= i.quantity)
    }
  })
}
