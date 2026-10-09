// Furniture Leasing: Mindestmietwert & Transport-Vorteile (eigene Spedition).
// Gemeinsam genutzt von Warenkorb (RentalShop, AppCartDrawer), Checkout und
// der Server-Validierung (rental-inquiry.post.ts) – Werte nur hier ändern.

/** Mindestmietwert pro Monat (alle Positionen) */
export const MIN_MONTHLY = 100
/** Ab diesem Monatswert (nur Positionen mit ≥ FREE_MIN_MONTHS) ist der Transport gratis */
export const FREE_TRANSPORT_FROM = 350
export const FREE_MIN_MONTHS = 3
/** Rabatt auf die Liefer-/Abholgebühr außerhalb Wiens, sobald die Schwelle erreicht ist */
export const OTHER_STATES_DISCOUNT = 0.5

export interface PerkLine {
  price: number | null
  quantity: number
  durationMonths: number
}

const round = (v: number) => Math.round(v * 100) / 100

export function rentalPerks(lines: PerkLine[]) {
  const monthly = round(lines.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0))
  // nur Langzeit-Positionen zählen für den Gratis-Transport
  const qualifying = round(lines
    .filter((l) => l.durationMonths >= FREE_MIN_MONTHS)
    .reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0))
  const minReached = monthly >= MIN_MONTHLY
  const transportUnlocked = qualifying >= FREE_TRANSPORT_FROM
  return {
    monthly,
    qualifying,
    minReached,
    missingMin: minReached ? 0 : round(MIN_MONTHLY - monthly),
    transportUnlocked,
    missingTransport: transportUnlocked ? 0 : round(FREE_TRANSPORT_FROM - qualifying),
    /** Fortschritt 0–1 bis zum Gratis-Transport (für den Balken) */
    progress: Math.min(1, qualifying / FREE_TRANSPORT_FROM)
  }
}

/** Wiener Postleitzahl (1010–1239, inkl. Sonder-PLZ wie 1400 UNO-City) */
export function isViennaZip(zip: string | null | undefined): boolean {
  const z = String(zip ?? '').trim()
  return /^1(0[1-9]|1\d|2[0-3])\d$/.test(z) || z === '1400'
}

/** Transport-Ergebnis für eine konkrete Lieferadresse */
export function transportPerk(lines: PerkLine[], zip: string | null | undefined) {
  if (!rentalPerks(lines).transportUnlocked) return 'none' as const
  return isViennaZip(zip) ? ('free' as const) : ('discount' as const)
}
