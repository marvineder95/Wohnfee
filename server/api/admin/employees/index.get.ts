import { requireSuperadmin } from '../../../utils/admin-auth'
import { listEmployees } from '../../../utils/employees'

// GET /api/admin/employees — Übersicht aller Mitarbeiter (aktive zuerst)
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  return listEmployees()
})
