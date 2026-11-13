// Länder für Rechnungen/Angebote (Kürzel wie im Dashboard-Auswahlfeld).
// Österreich ist Standard; im PDF wird es nicht gedruckt (Inlandsadresse), andere Länder ausgeschrieben.
export const DEFAULT_COUNTRY = 'AT'

const NAMES: Record<string, [string, string]> = {
  AT: ['Österreich', 'Austria'],
  DE: ['Deutschland', 'Germany'],
  CH: ['Schweiz', 'Switzerland'],
  LI: ['Liechtenstein', 'Liechtenstein'],
  HU: ['Ungarn', 'Hungary'],
  CZ: ['Tschechien', 'Czech Republic'],
  SK: ['Slowakei', 'Slovakia'],
  SI: ['Slowenien', 'Slovenia'],
  IT: ['Italien', 'Italy']
}

/** Landeszeile für die Anschrift im PDF – leer bei Österreich */
export function countryLine(code: unknown, lang: string): string {
  const c = String(code || '').trim()
  if (!c || c.toUpperCase() === DEFAULT_COUNTRY) return ''
  const n = NAMES[c.toUpperCase()]
  return n ? n[lang === 'en' ? 1 : 0] : c
}
