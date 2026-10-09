import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { requireAdmin } from '../../../utils/admin-auth'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}
const MAX_BYTES = 10 * 1024 * 1024

// POST /api/admin/blog/upload – Bild für Titelbild oder Artikeltext (multipart Feld "file")
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei erhalten' })

  const ext = MIME_EXT[file.type || '']
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Nur JPEG, PNG oder WebP erlaubt' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 10 MB)' })

  const dir = join(process.cwd(), 'public', 'uploads', 'blog')
  await mkdir(dir, { recursive: true })
  const fname = `blog-${Date.now()}-${randomBytes(3).toString('hex')}${ext}`
  await writeFile(join(dir, fname), file.data)
  return { path: `/uploads/blog/${fname}` }
})
