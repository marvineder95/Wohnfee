import { getTransportSettings } from '../utils/transport'

// GET /api/rental-extras — öffentliche Zusatzoptionen für den Checkout (derzeit: Deko-Paket)
export default defineEventHandler(async () => {
  const s = await getTransportSettings()
  return {
    deco: s.decoEnabled && s.decoPrice > 0
      ? { title: s.decoTitle, text: s.decoText, price: s.decoPrice }
      : null
  }
})
