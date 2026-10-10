import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { INVENTORY_CATEGORY_KEYS } from '../../../../shared/inventory-categories'

const STATUSES = ['lager', 'vermietet', 'pflege', 'verkauft', 'ausser_dienst']

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}
function price(v: any): number | null {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

// POST /api/admin/inventory — neues Inventarobjekt
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const title = clean(body?.title)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Bitte eine Bezeichnung angeben.' })
  const status = STATUSES.includes(body?.status) ? body.status : 'lager'
  const category = INVENTORY_CATEGORY_KEYS.includes(body?.category) ? body.category : null

  // Objekt-ID explizit vergeben: oberhalb beider Nummernkreise (interne IDs + alte ASOL-IDs),
  // damit es niemals zu Überschneidungen mit dem Altsystem kommen kann
  const result: any = await query(
    `INSERT INTO inventory_items
       (id, title, title_en, category, description, description_en, supplier, artnr, ean, quantity, original_price,
        rent_price_1m, rent_price_3m, rentable, status, warehouse, customer_location, purchased_at, purchased_year, source)
     SELECT
       GREATEST(
         (SELECT COALESCE(MAX(id), 0) FROM inventory_items),
         (SELECT COALESCE(MAX(asol_id), 0) FROM inventory_items),
         31999
       ) + 1,
       :title, :titleEn, :category, :desc, :descEn, :supplier, :artnr, :ean, :qty, :orig, :r1, :r3, :rentable, :status,
       :wh, :cloc, :purch, :pyear, 'manual'`,
    {
      title, category,
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
  const id = result.insertId
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 20)
    : []
  for (const tag of tags) {
    await query('INSERT IGNORE INTO item_tags (item_id, tag) VALUES (:id, :tag)', { id, tag })
  }
  return { ok: true, id }
})
