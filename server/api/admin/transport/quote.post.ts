import { requireAdmin } from '../../../utils/admin-auth'
import { quoteTransport } from '../../../utils/transport'

// POST /api/admin/transport/quote — Probe-Berechnung für eine Adresse
// Body: { street?, zip?, city?, country?, monthly? } — monthly simuliert den Warenkorb
// (ab 350 € Monatsmiete bei ≥ 3 Monaten greifen die Transport-Vorteile)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const b = await readBody(event)
  const monthly = Number(b?.monthly) || 0
  const lines = monthly > 0 ? [{ price: monthly, quantity: 1, durationMonths: 3 }] : []
  return await quoteTransport({ street: b?.street, zip: b?.zip, city: b?.city, country: b?.country }, lines)
})
