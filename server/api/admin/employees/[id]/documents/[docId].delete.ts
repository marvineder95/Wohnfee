import { rm } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'
import { requireSuperadmin } from '../../../../../utils/admin-auth'
import { query, queryOne } from '../../../../../utils/db'
import { EMPLOYEE_FILES_ROOT, employeeDetail } from '../../../../../utils/employees'

// DELETE /api/admin/employees/:id/documents/:docId
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  const doc = await queryOne<any>('SELECT * FROM employee_documents WHERE id = :docId AND employee_id = :id', { id, docId })
  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Dokument nicht gefunden' })
  const file = normalize(join(EMPLOYEE_FILES_ROOT, doc.file_path))
  if (file.startsWith(EMPLOYEE_FILES_ROOT + sep)) await rm(file, { force: true })
  await query('DELETE FROM employee_documents WHERE id = :docId', { docId })
  return employeeDetail(id)
})
