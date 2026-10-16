import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { requireAdmin } from '../../../utils/admin-auth'
import { optimizeImage, MAX_UPLOAD_BYTES } from '../../../utils/image-optimize'

const MIME_EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const MAX_BYTES = MAX_UPLOAD_BYTES

// POST /api/admin/properties/upload – Foto einer Immobilie (multipart Feld "file")
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei erhalten' })
  const ext = MIME_EXT[file.type || '']
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Nur JPEG, PNG oder WebP erlaubt' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 25 MB)' })
  const dir = join(process.cwd(), 'public', 'uploads', 'immobilien')
  await mkdir(dir, { recursive: true })
  // gleich in Web-Qualität zuschneiden (server/utils/image-optimize.ts)
  const img = await optimizeImage(file.data, file.type || '', 'large')
  const fname = `immo-${Date.now()}-${randomBytes(3).toString('hex')}${img.ext}`
  await writeFile(join(dir, fname), img.data)
  return { path: `/uploads/immobilien/${fname}` }
})
