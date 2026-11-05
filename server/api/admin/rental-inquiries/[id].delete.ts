import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'

// DELETE /api/admin/rental-inquiries/:id — Mietanfrage endgültig löschen (z. B. Test- oder Spam-Anfragen).
// Positionen gehen per FK mit, damit endet auch eine laufende Reservierung (Möbel sofort wieder im Shop).
// Das automatisch erzeugte Angebot wird nur mitgelöscht, solange es ein ungesendeter Entwurf ist;
// gesendete/angenommene Angebote, Projekte und Rechnungen bleiben unangetastet.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage-ID' })
  const inq: any = await queryOne('SELECT id, offer_id FROM rental_inquiries WHERE id = :id', { id })
  if (!inq) throw createError({ statusCode: 404, statusMessage: 'Mietanfrage nicht gefunden.' })

  let offerDeleted = false
  if (inq.offer_id) {
    const offer: any = await queryOne('SELECT id, number, status, invoice_id FROM offers WHERE id = :oid', { oid: inq.offer_id })
    const otherRefs: any = await queryOne('SELECT COUNT(*) AS n FROM rental_inquiries WHERE offer_id = :oid AND id != :id', { oid: inq.offer_id, id })
    if (offer && offer.status === 'entwurf' && !offer.invoice_id && Number(otherRefs?.n) === 0) {
      await query('DELETE FROM documents WHERE source = :src AND number = :number AND kind = :kind',
        { src: 'dashboard', number: offer.number, kind: 'angebot' })
      await query('DELETE FROM offers WHERE id = :oid', { oid: offer.id })
      offerDeleted = true
    }
  }
  await query('DELETE FROM rental_inquiries WHERE id = :id', { id })
  return { ok: true, offerDeleted }
})
