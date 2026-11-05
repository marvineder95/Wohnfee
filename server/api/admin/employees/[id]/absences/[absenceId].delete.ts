import { requireSuperadmin } from '../../../../../utils/admin-auth'
import { query } from '../../../../../utils/db'
import { employeeDetail } from '../../../../../utils/employees'

// DELETE /api/admin/employees/:id/absences/:absenceId
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const absenceId = Number(getRouterParam(event, 'absenceId'))
  await query('DELETE FROM employee_absences WHERE id = :absenceId AND employee_id = :id', { id, absenceId })
  return employeeDetail(id)
})
