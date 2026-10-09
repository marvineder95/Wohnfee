import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { INVENTORY_CATEGORY_KEYS } from '../../../../../shared/inventory-categories'

const STATUSES = ['lager', 'vermietet', 'verkauft', 'ausser_dienst']

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}
function price(v: any): number | null {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

// PUT /api/admin/inventory/:id — Objekt bearbeiten
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Objekt-ID' })
  }
  const existing = await queryOne('SELECT id FROM inventory_items WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Objekt nicht gefunden' })

  const body = await readBody(event)
  const title = clean(body?.title)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Bitte eine Bezeichnung angeben.' })
  const status = STATUSES.includes(body?.status) ? body.status : 'lager'
  const category = INVENTORY_CATEGORY_KEYS.includes(body?.category) ? body.category : null

  await query(
    `UPDATE inventory_items SET
       title = :title, title_en = :titleEn, category = :category, description = :desc, description_en = :descEn,
       supplier = :supplier, artnr = :artnr, ean = :ean,
       quantity = :qty, original_price = :orig, rent_price_1m = :r1, rent_price_3m = :r3,
       rentable = :rentable, status = :status, warehouse = :wh, customer_location = :cloc,
       purchased_at = :purch, purchased_year = :pyear
     WHERE id = :id`,
    {
      id, title, category,
      titleEn: clean(body?.titleEn, 190),
      desc: clean(body?.description, 5000),
      descEn: clean(body?.descriptionEn, 5000),
      supplier: clean(body?.supplier, 128),
      artnr: clean(body?.artnr, 64),
      ean: clean(body?.ean, 32),
      qty: Math.max(1, Number(body?.quantity) || 1),
      orig: price(body?.originalPrice),
      r1: price(body?.rentPrice1m),
      r3: price(body?.rentPrice3m),
      rentable: body?.rentable ? 1 : 0,
      status,
      wh: clean(body?.warehouse, 64),
      cloc: status === 'vermietet' ? clean(body?.customerLocation) : null,
      purch: clean(body?.purchasedAt, 32),
      pyear: Number(body?.purchasedYear) > 1900 ? Number(body.purchasedYear) : null
    }
  )
  if (Array.isArray(body?.tags)) {
    await query('DELETE FROM item_tags WHERE item_id = :id', { id })
    const tags = body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 20)
    for (const tag of tags) {
      await query('INSERT IGNORE INTO item_tags (item_id, tag) VALUES (:id, :tag)', { id, tag })
    }
  }
  return { ok: true }
})
