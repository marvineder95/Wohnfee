import { requireAdmin } from '../../../../../utils/admin-auth'
import { query } from '../../../../../utils/db'
import { employeeForUser } from '../../../../../utils/absences'

// DELETE /api/admin/me/absences/:id — eigenen, noch offenen Urlaubsantrag zurückziehen
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const emp = await employeeForUser(me.id)
  const id = Number(getRouterParam(event, 'id'))
  const res: any = await query(
    "DELETE FROM employee_absences WHERE id = :id AND employee_id = :emp AND status = 'beantragt'", { id, emp: emp.id }
  )
  if (!res.affectedRows) throw createError({ statusCode: 409, statusMessage: 'Nur offene Anträge lassen sich zurückziehen' })
  return { ok: true }
})
