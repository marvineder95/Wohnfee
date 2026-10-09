import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// DELETE /api/admin/offers/:id — Angebot löschen (inkl. Dashboard-Dokumenteneintrag)
// Eine daraus erstellte Rechnung bleibt bestehen, die Verknuepfung wird geloescht.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Angebots-ID' })
  }
  const offer = await queryOne('SELECT id, number FROM offers WHERE id = :id', { id })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  await query('DELETE FROM documents WHERE source = :src AND number = :number AND kind = :kind',
    { src: 'dashboard', number: (offer as any).number, kind: 'angebot' })
  await query('DELETE FROM offers WHERE id = :id', { id })
  return { ok: true }
})
