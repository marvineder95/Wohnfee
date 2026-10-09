import { requireAdmin } from '../../../../utils/admin-auth'
import { createOfferForContactInquiry } from '../../../../utils/offer-create'

// POST /api/admin/inquiries/:id/offer — Kontaktanfrage → Kontakt + Angebotsentwurf
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Anfrage-ID' })
  try {
    return { ok: true, ...(await createOfferForContactInquiry(id)) }
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: e?.message || 'Angebot konnte nicht erstellt werden.' })
  }
})
