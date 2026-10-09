import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// DELETE /api/admin/invoices/:id — Rechnung löschen (inkl. Dashboard-Dokumenteneintrag)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rechnungs-ID' })
  }
  const invoice = await queryOne('SELECT id, number FROM invoices WHERE id = :id', { id })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  await query('DELETE FROM documents WHERE source = :src AND number = :number',
    { src: 'dashboard', number: (invoice as any).number })
  await query('DELETE FROM invoices WHERE id = :id', { id })
  return { ok: true }
})
