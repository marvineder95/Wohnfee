import { getDb } from './db'

// Paket speichern (Kopf + Stückliste) in einer Transaktion
export async function savePackage(id: number | null, body: any): Promise<number> {
  const clean = (v: any, max = 190) => String(v ?? '').trim().slice(0, max) || null
  const title = clean(body?.title)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Paketnamen angeben.' })
  const img = clean(body?.imagePath, 255)
  const num = (v: any) => (v === '' || v === null || v === undefined || !(Number(String(v).replace(',', '.')) > 0))
    ? null : Math.round(Number(String(v).replace(',', '.')) * 100) / 100
  const f = {
    title, title_en: clean(body?.titleEn),
    description: clean(body?.description, 2000), description_en: clean(body?.descriptionEn, 2000),
    image_path: img && img.startsWith('/uploads/') ? img : null,
    discount_pct: Math.min(90, Math.max(0, Math.round((Number(body?.discountPct) || 0) * 10) / 10)),
    price_override: num(body?.priceOverride),
    visible: body?.visible ? 1 : 0,
    sort_order: Math.round(Number(body?.sortOrder) || 0)
  }
  const items: Array<{ id: number; quantity: number }> = (Array.isArray(body?.items) ? body.items : [])
    .map((i: any) => ({ id: Number(i?.id), quantity: Math.min(99, Math.max(1, Math.round(Number(i?.quantity) || 1))) }))
    .filter((i: any) => Number.isInteger(i.id) && i.id > 0)
    .slice(0, 60)
  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    if (id) {
      const [res]: any = await conn.query(
        `UPDATE rental_packages SET title = ?, title_en = ?, description = ?, description_en = ?, image_path = ?,
           discount_pct = ?, price_override = ?, visible = ?, sort_order = ? WHERE id = ?`,
        [f.title, f.title_en, f.description, f.description_en, f.image_path, f.discount_pct, f.price_override, f.visible, f.sort_order, id])
      if (!res.affectedRows) throw createError({ statusCode: 404, statusMessage: 'Paket nicht gefunden' })
      await conn.query('DELETE FROM rental_package_items WHERE package_id = ?', [id])
    } else {
      const [res]: any = await conn.query(
        `INSERT INTO rental_packages (title, title_en, description, description_en, image_path, discount_pct, price_override, visible, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.title, f.title_en, f.description, f.description_en, f.image_path, f.discount_pct, f.price_override, f.visible, f.sort_order])
      id = res.insertId
    }
    let pos = 0
    const seen = new Set<number>()
    for (const it of items) {
      if (seen.has(it.id)) continue
      seen.add(it.id)
      await conn.query('INSERT INTO rental_package_items (package_id, item_id, quantity, position) VALUES (?, ?, ?, ?)', [id, it.id, it.quantity, ++pos])
    }
    await conn.commit()
    return id as number
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
