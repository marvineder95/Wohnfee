// Furniture Leasing – Preislogik (Shop, Warenkorb, Checkout, Server, Angebote).
// Grundpreis = Monatsmiete bei 1 Monat (inventory_items.rent_price_1m). Je länger die Mietdauer,
// desto mehr Rabatt: Staffel im Dashboard unter „Konditionen“ einstellbar (Setting rental_discount_tiers).
// Möbelpakete: Summe der Grundpreise − Paketrabatt (oder fester Paketpreis); die Staffel kommt obendrauf.

export interface DiscountTier { from: number; pct: number }

/** Standard: 1–2 Mon. 0 %, 3–5 Mon. 5 %, 6–23 Mon. 10 %, ab 24 Mon. 20 %, ab 36 Mon. 25 % */
export const DEFAULT_TIERS: DiscountTier[] = [
  { from: 1, pct: 0 }, { from: 3, pct: 5 }, { from: 6, pct: 10 }, { from: 24, pct: 20 }, { from: 36, pct: 25 }
]
/** Schnellauswahl im Shop (frei 1–MAX_MONTHS im Checkout) */
export const DURATION_CHOICES = [1, 2, 3, 6, 12, 24, 36]
export const MAX_MONTHS = 48
export const DEFAULT_MONTHS = 3

const round2 = (v: number) => Math.round(v * 100) / 100

/** Staffel bereinigen: ab 1 Monat, aufsteigend, Rabatt 0–90 %, keine doppelten Stufen */
export function normalizeTiers(raw: unknown): DiscountTier[] {
  const list = Array.isArray(raw) ? raw : []
  const map = new Map<number, number>()
  for (const t of list as any[]) {
    const from = Math.round(Number(t?.from))
    const pct = Math.round(Number(t?.pct) * 10) / 10
    if (!Number.isFinite(from) || from < 1 || from > MAX_MONTHS || !Number.isFinite(pct)) continue
    map.set(from, Math.min(90, Math.max(0, pct)))
  }
  if (!map.has(1)) map.set(1, 0)
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([from, pct]) => ({ from, pct }))
}

/** Rabatt in % für eine Mietdauer */
export function discountFor(months: number, tiers: DiscountTier[] = DEFAULT_TIERS): number {
  const m = Math.max(1, Math.round(Number(months) || 1))
  let pct = 0
  for (const t of tiers) if (m >= t.from) pct = t.pct
  return pct
}

/** Monatspreis nach Staffel-Rabatt */
export function priceForMonths(base: number | null | undefined, months: number, tiers: DiscountTier[] = DEFAULT_TIERS): number | null {
  if (base === null || base === undefined || !(Number(base) > 0)) return null
  return round2(Number(base) * (1 - discountFor(months, tiers) / 100))
}

/** Gültiger Grundpreis (0 oder leer = „auf Anfrage“) */
export function basePrice(p: number | string | null | undefined): number | null {
  const n = Number(p)
  return p === null || p === undefined || p === '' || !(n > 0) ? null : round2(n)
}

/** Monatlicher Paket-Grundpreis: fester Preis oder Summe × (1 − Paketrabatt). null, wenn ein Preis fehlt. */
export function packageBase(items: Array<{ price: number | null; quantity: number }>, discountPct: number, override?: number | null): number | null {
  if (override !== null && override !== undefined && Number(override) > 0) return round2(Number(override))
  if (!items.length || items.some((i) => i.price === null)) return null
  const sum = items.reduce((s, i) => s + (i.price as number) * i.quantity, 0)
  return round2(sum * (1 - Math.min(90, Math.max(0, Number(discountPct) || 0)) / 100))
}

/** Text für eine Stufe, z. B. „3–5 Monate“ / „ab 36 Monaten“ */
export function tierLabel(tiers: DiscountTier[], i: number, en = false): string {
  const from = tiers[i].from
  const next = tiers[i + 1]?.from
  if (!next) return en ? `${from}+ months` : `ab ${from} Monaten`
  const to = next - 1
  if (to === from) return en ? `${from} month${from > 1 ? 's' : ''}` : `${from} ${from > 1 ? 'Monate' : 'Monat'}`
  return en ? `${from}–${to} months` : `${from}–${to} Monate`
}
