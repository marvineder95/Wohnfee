import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { optimizeImage, MAX_UPLOAD_BYTES } from '../../../../utils/image-optimize'
import { requireEmployee } from '../../../../utils/employees'

// POST /api/admin/employees/:id/photo — Porträt (multipart „file“), zugeschnitten wie Avatare (400 px)
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const emp = await requireEmployee(id)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei erhalten' })
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type || '')) {
    throw createError({ statusCode: 415, statusMessage: 'Nur JPEG, PNG oder WebP erlaubt' })
  }
  if (file.data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 25 MB)' })

  const img = await optimizeImage(file.data, file.type || '', 'avatar')
  const dir = join(process.cwd(), 'public', 'uploads', 'employees')
  await mkdir(dir, { recursive: true })
  // zufälliger Name: Fotos werden öffentlich ausgeliefert, sollen aber nicht erratbar sein
  const fname = `emp-${id}-${randomBytes(6).toString('hex')}${img.ext}`
  await writeFile(join(dir, fname), img.data)
  if (emp.photo_path?.startsWith('/uploads/employees/')) {
    await rm(join(process.cwd(), 'public', emp.photo_path.replace(/^\//, '')), { force: true })
  }
  const photoPath = `/uploads/employees/${fname}`
  await query('UPDATE employees SET photo_path = :p WHERE id = :id', { p: photoPath, id })
  return { photoPath }
})
