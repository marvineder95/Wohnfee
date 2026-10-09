import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { INVENTORY_CATEGORY_KEYS } from '../../../../shared/inventory-categories'

// GET /api/admin/inventory?q=&status=&warehouse=&supplier=&category=&rentable=&page=
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const qs = getQuery(event)
  const q = String(qs.q || '').trim()
  const status = String(qs.status || '').trim()
  const warehouse = String(qs.warehouse || '').trim()
  const supplier = String(qs.supplier || '').trim()
  const category = String(qs.category || '').trim()
  const rentable = String(qs.rentable || '').trim()
  const page = Math.max(0, Number(qs.page || 0))
  const pageLen = Math.min(100, Math.max(10, Number(qs.pagelen || 50)))

  const where: string[] = []
  const params: any = {}
  if (['lager', 'vermietet', 'verkauft', 'ausser_dienst'].includes(status)) {
    where.push('status = :status')
    params.status = status
  }
  if (warehouse) {
    where.push('warehouse = :warehouse')
    params.warehouse = warehouse
  }
  if (supplier) {
    where.push('supplier = :supplier')
    params.supplier = supplier
  }
  if (INVENTORY_CATEGORY_KEYS.includes(category)) {
    where.push('category = :category')
    params.category = category
  }
  if (rentable === '1') {
    where.push('rentable = 1')
  }
  if (q) {
    where.push(`(title LIKE :q OR description LIKE :q OR supplier LIKE :q OR ean LIKE :q OR customer_location LIKE :q OR CAST(id AS CHAR) LIKE :q OR CAST(asol_id AS CHAR) LIKE :q)`)
    params.q = `%${q}%`
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const total = await query(`SELECT COUNT(*) AS n FROM inventory_items ${whereSql}`, params)
  const items = await query(
    `SELECT id, asol_id AS asolId, title, category, image_path AS imagePath, supplier, ean, quantity, original_price AS originalPrice,
            rent_price_1m AS rentPrice1m, rent_price_3m AS rentPrice3m, rentable,
            status, warehouse, customer_location AS customerLocation, purchased_year AS purchasedYear,
            (SELECT MIN(pi.return_date) FROM project_items pi
              WHERE pi.item_id = inventory_items.id AND pi.return_date IS NOT NULL) AS returnDate
     FROM inventory_items ${whereSql}
     ORDER BY title
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: pageLen, offset: page * pageLen }
  )
  const stats = await query(
    `SELECT status, COUNT(*) AS n FROM inventory_items GROUP BY status`
  )
  const warehouses = await query(
    `SELECT warehouse AS name, COUNT(*) AS n FROM inventory_items
     WHERE warehouse IS NOT NULL GROUP BY warehouse ORDER BY n DESC`
  )
  const suppliers = await query(
    `SELECT supplier AS name, COUNT(*) AS n FROM inventory_items
     WHERE supplier IS NOT NULL GROUP BY supplier ORDER BY n DESC LIMIT 40`
  )
  const categories = await query(
    `SELECT category AS name, COUNT(*) AS n FROM inventory_items
     WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC`
  )
  return {
    items,
    total: Number(total[0]?.n || 0),
    page, pageLen,
    stats: Object.fromEntries(stats.map((r: any) => [r.status, Number(r.n)])),
    warehouses: warehouses.map((r: any) => ({ name: r.name, count: Number(r.n) })),
    suppliers: suppliers.map((r: any) => ({ name: r.name, count: Number(r.n) })),
    categories: categories.map((r: any) => ({ name: r.name, count: Number(r.n) }))
  }
})
