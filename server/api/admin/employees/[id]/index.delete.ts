import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { EMPLOYEE_FILES_ROOT, requireEmployee } from '../../../../utils/employees'

// DELETE /api/admin/employees/:id — Mitarbeiter samt Dokumenten löschen.
// Mit Dashboard-Zugang nicht möglich (erst Zugang entfernen) – schützt vor versehentlichem Aussperren.
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const emp = await requireEmployee(id)
  if (emp.user_id) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte zuerst den Dashboard-Zugang entfernen' })
  }
  await query('DELETE FROM employee_documents WHERE employee_id = :id', { id })
  await query('DELETE FROM employee_absences WHERE employee_id = :id', { id })
  await query('DELETE FROM time_entries WHERE employee_id = :id', { id })
  await query('DELETE FROM employees WHERE id = :id', { id })
  await rm(join(EMPLOYEE_FILES_ROOT, String(id)), { recursive: true, force: true })
  if (emp.photo_path?.startsWith('/uploads/employees/')) {
    await rm(join(process.cwd(), 'public', emp.photo_path.replace(/^\//, '')), { force: true })
  }
  return { ok: true }
})
