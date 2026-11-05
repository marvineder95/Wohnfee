import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { requireSuperadmin } from '../../../../../utils/admin-auth'
import { query } from '../../../../../utils/db'
import { MAX_UPLOAD_BYTES } from '../../../../../utils/image-optimize'
import { EMPLOYEE_FILES_ROOT, employeeDetail, requireEmployee } from '../../../../../utils/employees'
import { DOC_CATEGORIES, docCategoryLabel, isValue } from '../../../../../../shared/employees'

const EXT: Record<string, string> = {
  'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'
}

// POST /api/admin/employees/:id/documents — Dokument hochladen (multipart: file, category, title, valid_until)
// Ablage geschützt unter public/uploads/private/employees/<id>/ (nicht über /uploads erreichbar).
export default defineEventHandler(async (event) => {
  const me = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await requireEmployee(id)
  const parts = await readMultipartFormData(event) || []
  const field = (n: string) => parts.find(p => p.name === n && !p.filename)?.data.toString('utf8').trim() || ''
  const file = parts.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei erhalten' })
  const ext = EXT[file.type || '']
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Nur PDF, JPEG, PNG oder WebP erlaubt' })
  if (file.data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 25 MB)' })

  const category = isValue(DOC_CATEGORIES, field('category')) ? field('category') : 'sonstiges'
  const title = (field('title') || docCategoryLabel(category)).slice(0, 190)
  const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(field('valid_until')) ? field('valid_until') : null

  const dir = join(EMPLOYEE_FILES_ROOT, String(id))
  await mkdir(dir, { recursive: true })
  const fname = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
  await writeFile(join(dir, fname), file.data)
  await query(
    `INSERT INTO employee_documents (employee_id, category, title, file_path, mime, size, valid_until, uploaded_by_name)
     VALUES (:id, :category, :title, :path, :mime, :size, :validUntil, :by)`,
    { id, category, title, path: `${id}/${fname}`, mime: file.type, size: file.data.length, validUntil, by: me.displayName || me.username }
  )
  return employeeDetail(id)
})
