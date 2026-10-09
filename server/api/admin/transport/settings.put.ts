import { requireAdmin } from '../../../utils/admin-auth'
import { getTransportSettings, saveTransportSettings, geocode, type TransportSettings } from '../../../utils/transport'

// PUT /api/admin/transport/settings — Konditionen speichern.
// Bei geändertem Lagerstandort wird er neu geokodiert (muss auffindbar sein).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const current = await getTransportSettings()
  const num = (v: any, min: number, max: number, fallback: number) => {
    const n = Number(String(v ?? '').replace(',', '.'))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
  }
  const next: TransportSettings = {
    ...current,
    depotAddress: String(body?.depotAddress || current.depotAddress).trim().slice(0, 190),
    hourlyRate: num(body?.hourlyRate, 0, 1000, current.hourlyRate),
    drivers: Math.round(num(body?.drivers, 0, 20, current.drivers)),
    designers: Math.round(num(body?.designers, 0, 20, current.designers)),
    onSiteDeliveryMin: Math.round(num(body?.onSiteDeliveryMin, 0, 1440, current.onSiteDeliveryMin)),
    onSitePickupMin: Math.round(num(body?.onSitePickupMin, 0, 1440, current.onSitePickupMin)),
    truckFactor: num(body?.truckFactor, 0, 200, current.truckFactor),
    freeKm: num(body?.freeKm, 0, 1000, current.freeKm),
    kmRate: num(body?.kmRate, 0, 100, current.kmRate),
    roundMinutes: Math.round(num(body?.roundMinutes, 1, 120, current.roundMinutes))
  }
  if (next.drivers + next.designers < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Mindestens eine Person muss im Team sein.' })
  }
  if (next.depotAddress !== current.depotAddress || current.depotLat === null) {
    const pos = await geocode(next.depotAddress).catch(() => null)
    if (!pos) throw createError({ statusCode: 400, statusMessage: 'Der Lagerstandort wurde auf der Karte nicht gefunden – bitte Adresse prüfen.' })
    next.depotLat = pos.lat
    next.depotLon = pos.lon
  }
  await saveTransportSettings(next)
  return { ok: true, settings: next }
})
