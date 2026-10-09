import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const MAX_BYTES = 10 * 1024 * 1024

// POST /api/admin/inventory/:id/image — multipart Datei-Feld "file"
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(event.context.params?.id)
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
  const fname = `item-${id}${ext}`
  await writeFile(join(dir, fname), file.data)

  // alte Datei mit abweichender Endung aufräumen
  const old = item.image_path ? String(item.image_path) : ''
  if (old && !old.endsWith(fname)) {
    try { await unlink(join(process.cwd(), 'public', old.replace(/^\//, ''))) } catch { /* Datei schon weg */ }
  }

  const imagePath = `/uploads/inventory/${fname}`
  await query('UPDATE inventory_items SET image_path = :p WHERE id = :id', { p: imagePath, id })
  return { imagePath }
})
