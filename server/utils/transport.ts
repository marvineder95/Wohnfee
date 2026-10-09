import { query, queryOne } from './db'
import { getSetting, setSetting } from './settings'
import { rentalPerks, transportPerk, OTHER_STATES_DISCOUNT } from '../../shared/rental-perks'

// Transportkosten für Furniture-Leasing-Angebote (eigene Spedition).
//
// Modell (im Dashboard unter „Konditionen" einstellbar):
//   Lieferung und Abholung sind je eine Tour Lager → Kunde → Lager.
//   Personal  = Team (Spediteure + Designerinnen) × Stundensatz ×
//               (2 × Fahrzeit + Zeit vor Ort) – je Tour
//   Kilometer = nur die Kilometer über der Freigrenze (einfache Strecke),
//               × 4 Strecken (2 Touren hin & zurück) × Kilometergeld
//   Vorteile  = Gratis-Transport Wien bzw. −50 % (shared/rental-perks.ts)
// Entfernung/Fahrzeit: OpenStreetMap (Nominatim + OSRM), Ergebnisse werden gecacht.

export interface TransportSettings {
  depotAddress: string
  depotLat: number | null
  depotLon: number | null
  hourlyRate: number        // € pro Mitarbeiter und Stunde
  drivers: number           // Spediteure je Auftrag
  designers: number         // Wohnfee-Designerinnen je Auftrag
  onSiteDeliveryMin: number // Aufbau beim Kunden (Minuten)
  onSitePickupMin: number   // Abbau beim Kunden (Minuten)
  truckFactor: number       // Fahrzeit-Zuschlag für den Transporter in % (Routing rechnet mit PKW)
  freeKm: number            // Freikilometer je einfacher Strecke
  kmRate: number            // Kilometergeld € pro km
  roundMinutes: number      // Zeit je Tour aufrunden auf … Minuten
}

export const DEFAULT_TRANSPORT: TransportSettings = {
  depotAddress: 'Feldgasse 7, 2203 Eibesbrunn, Österreich',
  depotLat: 48.3660855,
  depotLon: 16.4727115,
  hourlyRate: 45,
  drivers: 2,
  designers: 1,
  onSiteDeliveryMin: 90,
  onSitePickupMin: 60,
  truckFactor: 15,
  freeKm: 30,
  kmRate: 0.5,
  roundMinutes: 15
}

const KEY = 'transport_settings'
const UA = 'WOHNFEE-Dashboard/1.0 (office@wohnfee.at)'

export async function getTransportSettings(): Promise<TransportSettings> {
  try {
    const raw = await getSetting(KEY)
    return raw ? { ...DEFAULT_TRANSPORT, ...JSON.parse(raw) } : { ...DEFAULT_TRANSPORT }
  } catch {
    return { ...DEFAULT_TRANSPORT }
  }
}

export async function saveTransportSettings(s: TransportSettings) {
  await setSetting(KEY, JSON.stringify(s))
}

// ---------- Geokodierung & Route (OpenStreetMap) ----------
async function ensureCacheTable() {
  await query(`CREATE TABLE IF NOT EXISTS geo_cache (
    \`key\` VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
}
async function cached<T>(key: string, fn: () => Promise<T | null>): Promise<T | null> {
  await ensureCacheTable()
  const k = key.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 255)
  const hit: any = await queryOne('SELECT value FROM geo_cache WHERE `key` = :k AND created_at > NOW() - INTERVAL 180 DAY', { k })
  if (hit) return JSON.parse(hit.value)
  const val = await fn()
  if (val) await query('REPLACE INTO geo_cache (`key`, value) VALUES (:k, :v)', { k, v: JSON.stringify(val) })
  return val
}

let lastNominatim = 0
export async function geocode(address: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const q = address.trim()
  if (!q) return null
  return cached(`geo:${q}`, async () => {
    // Nominatim-Nutzungsregeln: max. 1 Anfrage/Sekunde, eindeutiger User-Agent
    const wait = 1100 - (Date.now() - lastNominatim)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    lastNominatim = Date.now()
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=at,de,hu,sk,cz,si,it,ch&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Geokodierung fehlgeschlagen (${res.status})`)
    const rows: any[] = await res.json()
    if (!rows.length) return null
    return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: String(rows[0].display_name || q) }
  })
}

export async function route(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<{ km: number; minutes: number } | null> {
  const key = `route:${from.lat.toFixed(5)},${from.lon.toFixed(5)};${to.lat.toFixed(5)},${to.lon.toFixed(5)}`
  return cached(key, async () => {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Routenberechnung fehlgeschlagen (${res.status})`)
    const data: any = await res.json()
    const r = data?.routes?.[0]
    if (data?.code !== 'Ok' || !r) return null
    return { km: Math.round(r.distance / 100) / 10, minutes: Math.round(r.duration / 60) }
  })
}

// ---------- Kosten ----------
export interface TransportQuote {
  ok: boolean
  error?: string
  address: string
  resolvedAddress?: string
  km: number               // einfache Strecke
  driveMinutes: number     // einfache Strecke inkl. Transporter-Zuschlag
  crew: number
  delivery: { minutes: number; hours: number; personHours: number; cost: number }
  pickup: { minutes: number; hours: number; personHours: number; cost: number }
  extraKm: number          // gesamt (4 Strecken × Mehr-km)
  kmCost: number
  subtotal: number         // vor Vorteil
  perk: 'none' | 'free' | 'discount'
  perkFactor: number       // 1 = voll, 0.5 = −50 %, 0 = gratis
  total: number            // nach Vorteil
  settings: TransportSettings
}

const r2 = (v: number) => Math.round(v * 100) / 100

export function priceTransport(s: TransportSettings, km: number, rawMinutes: number, perk: 'none' | 'free' | 'discount'): Omit<TransportQuote, 'ok' | 'address'> {
  const crew = Math.max(1, Math.round(s.drivers) + Math.round(s.designers))
  const driveMinutes = Math.round(rawMinutes * (1 + (Number(s.truckFactor) || 0) / 100))
  const roundTo = Math.max(1, Math.round(s.roundMinutes) || 1)
  const tour = (onSite: number) => {
    const minutes = Math.ceil((2 * driveMinutes + Math.max(0, onSite)) / roundTo) * roundTo
    const hours = minutes / 60
    const personHours = r2(hours * crew)
    return { minutes, hours: r2(hours), personHours, cost: r2(personHours * s.hourlyRate) }
  }
  const delivery = tour(s.onSiteDeliveryMin)
  const pickup = tour(s.onSitePickupMin)
  const extraKm = Math.round(Math.max(0, km - s.freeKm) * 4 * 10) / 10
  const kmCost = r2(extraKm * s.kmRate)
  const subtotal = r2(delivery.cost + pickup.cost + kmCost)
  const perkFactor = perk === 'free' ? 0 : perk === 'discount' ? 1 - OTHER_STATES_DISCOUNT : 1
  return {
    km, driveMinutes, crew, delivery, pickup, extraKm, kmCost, subtotal, perk, perkFactor,
    total: r2(subtotal * perkFactor), settings: s
  }
}

/** Komplette Berechnung für eine Lieferadresse (+ optional Warenkorb-Zeilen für die Vorteile) */
export async function quoteTransport(
  address: { street?: string | null; zip?: string | null; city?: string | null; country?: string | null },
  lines: Array<{ price: number | null; quantity: number; durationMonths: number }> = []
): Promise<TransportQuote> {
  const s = await getTransportSettings()
  const addr = [address.street, [address.zip, address.city].filter(Boolean).join(' '), address.country || 'Österreich']
    .filter(Boolean).join(', ')
  const perk = lines.length ? transportPerk(lines, address.zip) : 'none'
  const fail = (error: string): TransportQuote => ({
    ok: false, error, address: addr, ...priceTransport(s, 0, 0, perk), subtotal: 0, total: 0
  })
  try {
    let depot = s.depotLat !== null && s.depotLon !== null ? { lat: s.depotLat, lon: s.depotLon } : null
    if (!depot) depot = await geocode(s.depotAddress)
    if (!depot) return fail('Lagerstandort konnte nicht gefunden werden – bitte unter „Konditionen" prüfen.')
    // erst mit Straße, sonst nur PLZ + Ort
    let target = await geocode(addr)
    if (!target && (address.zip || address.city)) target = await geocode([address.zip, address.city, address.country || 'Österreich'].filter(Boolean).join(' '))
    if (!target) return fail('Lieferadresse wurde auf der Karte nicht gefunden.')
    const r = await route(depot, target)
    if (!r) return fail('Keine Straßenroute gefunden.')
    return { ok: true, address: addr, resolvedAddress: target.label, ...priceTransport(s, r.km, r.minutes, perk) }
  } catch (e: any) {
    return fail(e?.message || 'Routenberechnung nicht erreichbar.')
  }
}

export { rentalPerks }
