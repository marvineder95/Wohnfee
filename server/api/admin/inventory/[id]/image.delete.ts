import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// DELETE /api/admin/inventory/:id/image
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige ID' })
  }
  const item = await queryOne('SELECT id, image_path FROM inventory_items WHERE id = :id', { id })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Objekt nicht gefunden' })

  if (item.image_path) {
    try { await unlink(join(process.cwd(), 'public', String(item.image_path).replace(/^\//, ''))) } catch { /* Datei schon weg */ }
  }
  await query('UPDATE inventory_items SET image_path = NULL WHERE id = :id', { id })
  return { ok: true }
})
