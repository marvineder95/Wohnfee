import { requireAdmin } from '../../../../utils/admin-auth'
import { createOfferForInquiry } from '../../../../utils/offer-create'

// POST /api/admin/rental-inquiries/:id/offer — Angebot aus einer Mietanfrage erstellen
// (idempotent: existiert schon eines, wird dieses zurückgegeben)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage-ID' })
  try {
    return { ok: true, ...(await createOfferForInquiry(id)) }
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: e?.message || 'Angebot konnte nicht erstellt werden.' })
  }
})
