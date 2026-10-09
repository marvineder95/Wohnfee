import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

// DELETE /api/admin/recurring/:id — Abo beenden (bereits erstellte Rechnungen bleiben)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await query('UPDATE invoices SET recurring_id = NULL WHERE recurring_id = :id', { id })
  await query('DELETE FROM recurring_invoices WHERE id = :id', { id })
  return { ok: true }
})
