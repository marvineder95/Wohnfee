import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../../../utils/admin-auth'
import { query, queryOne } from '../../../../../utils/db'

// DELETE /api/admin/inventory/:id/images/:imageId — ein Foto entfernen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const imageId = Number(getRouterParam(event, 'imageId'))
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(imageId) || imageId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Parameter' })
  }
  const img: any = await queryOne(
    'SELECT id, path FROM item_images WHERE id = :imageId AND item_id = :id',
    { imageId, id }
  )
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Foto nicht gefunden' })

  await query('DELETE FROM item_images WHERE id = :imageId', { imageId })
  try { await unlink(join(process.cwd(), 'public', String(img.path).replace(/^\//, ''))) } catch { /* Datei schon weg */ }

  // wenn das Thumbnail entfernt wurde: auf das erste verbleibende Foto umstellen
  const item: any = await queryOne('SELECT image_path FROM inventory_items WHERE id = :id', { id })
  if (item && item.image_path === img.path) {
    const next: any = await queryOne(
      'SELECT path FROM item_images WHERE item_id = :id ORDER BY position LIMIT 1', { id }
    )
    await query('UPDATE inventory_items SET image_path = :p WHERE id = :id', { p: next?.path || null, id })
  }
  return { ok: true }
})
