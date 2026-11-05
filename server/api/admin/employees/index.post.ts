import { requireSuperadmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { employeeValues, employeeDetail } from '../../../utils/employees'

// POST /api/admin/employees — neuen Mitarbeiter anlegen (ohne Dashboard-Zugang)
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const v = employeeValues(await readBody(event).catch(() => ({})))
  if (v.vacation_days == null) v.vacation_days = 25
  const cols = Object.keys(v)
  const res: any = await query(
    `INSERT INTO employees (${cols.join(', ')}) VALUES (${cols.map(c => ':' + c).join(', ')})`, v
  )
  return employeeDetail(Number(res.insertId))
})
