import { requireSuperadmin } from '../../../../utils/admin-auth'
import { employeeDetail } from '../../../../utils/employees'

// GET /api/admin/employees/:id — alle Daten inkl. Dokumente, Abwesenheiten und Dashboard-Zugang
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  return employeeDetail(Number(getRouterParam(event, 'id')))
})
