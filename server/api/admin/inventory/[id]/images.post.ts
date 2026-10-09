import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const MAX_BYTES = 10 * 1024 * 1024

// POST /api/admin/inventory/:id/images — zusätzliches Foto (multipart Feld "file")
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige ID' })
  }
  const item = await queryOne('SELECT id, image_path FROM inventory_items WHERE id = :id', { id })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Objekt nicht gefunden' })

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei erhalten' })

  const ext = MIME_EXT[file.type || '']
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Nur JPEG, PNG oder WebP erlaubt' })
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 10 MB)' })
  }

  const dir = join(process.cwd(), 'public', 'uploads', 'inventory')
  await mkdir(dir, { recursive: true })
  const fname = `item-${id}-${Date.now()}${ext}`
  await writeFile(join(dir, fname), file.data)
  const path = `/uploads/inventory/${fname}`

  const maxPos: any = await queryOne('SELECT COALESCE(MAX(position), -1) AS mp FROM item_images WHERE item_id = :id', { id })
  const result: any = await query(
    'INSERT INTO item_images (item_id, path, position) VALUES (:id, :path, :pos)',
    { id, path, pos: Number(maxPos?.mp) + 1 }
  )

  // erstes Foto wird gleich als Listen-Thumbnail gesetzt
  if (!item.image_path) {
    await query('UPDATE inventory_items SET image_path = :p WHERE id = :id', { p: path, id })
  }
  return { id: result.insertId, path }
})
