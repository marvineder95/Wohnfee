import { requireSuperadmin } from '../../../../../utils/admin-auth'
import { employeeDetail, requireEmployee, saveEmployeeFile } from '../../../../../utils/employees'
import { DOC_CATEGORIES, docCategoryLabel, isValue } from '../../../../../../shared/employees'

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
  const category = isValue(DOC_CATEGORIES, field('category')) ? field('category') : 'sonstiges'
  const title = (field('title') || docCategoryLabel(category)).slice(0, 190)
  const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(field('valid_until')) ? field('valid_until') : null

  await saveEmployeeFile(id, file, { category, title, validUntil, by: me.displayName || me.username })
  return employeeDetail(id)
})
