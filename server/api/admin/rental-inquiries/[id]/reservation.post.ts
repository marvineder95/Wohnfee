import { requireAdmin } from '../../../../utils/admin-auth'
import { queryOne } from '../../../../utils/db'
import { extendReservation, releaseReservation } from '../../../../utils/reservations'

// POST /api/admin/rental-inquiries/:id/reservation — { action: 'extend' | 'release' }
// extend: +3 Tage (auch nach Ablauf, solange nicht angenommen/abgelehnt); release: Möbel sofort wieder in den Shop
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event).catch(() => ({}))
  const inq: any = await queryOne('SELECT id, reservation_status FROM rental_inquiries WHERE id = :id', { id })
  if (!inq) throw createError({ statusCode: 404, statusMessage: 'Mietanfrage nicht gefunden.' })
  if (['angenommen', 'abgelehnt'].includes(inq.reservation_status)) {
    throw createError({ statusCode: 409, statusMessage: 'Das Angebot wurde bereits beantwortet – die Reservierung ist abgeschlossen.' })
  }
  if (body?.action === 'release') await releaseReservation(id)
  else if (body?.action === 'extend') await extendReservation(id)
  else throw createError({ statusCode: 400, statusMessage: 'Unbekannte Aktion.' })
  const r: any = await queryOne(
    `SELECT reservation_status AS reservationStatus, DATE_FORMAT(reserved_until, '%Y-%m-%dT%H:%i:%sZ') AS reservedUntil
     FROM rental_inquiries WHERE id = :id`, { id })
  return { ok: true, ...r }
})
