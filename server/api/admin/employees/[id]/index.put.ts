import { requireSuperadmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { employeeValues, employeeDetail, requireEmployee } from '../../../../utils/employees'

// PUT /api/admin/employees/:id — Stammdaten, Anstellung, Lohn & Bank speichern
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const emp = await requireEmployee(id)
  const v = employeeValues(await readBody(event).catch(() => ({})))
  await query(`UPDATE employees SET ${Object.keys(v).map(c => `${c} = :${c}`).join(', ')} WHERE id = :id`, { ...v, id })
  // Name/Telefon/Position auch im Dashboard-Konto aktuell halten (Anzeige oben rechts, Kalender …)
  if (emp.user_id) {
    const name = [v.first_name, v.last_name].filter(Boolean).join(' ')
    await query('UPDATE admin_users SET display_name = :name, phone = :phone, position = :position WHERE id = :uid',
      { name, phone: v.phone, position: v.position, uid: emp.user_id })
  }
  return employeeDetail(id)
})
