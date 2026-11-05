// Mitarbeiter-Verwaltung (/admin/mitarbeiter): Auswahllisten + kleine Helfer für Server und UI.
// Der Dashboard-Zugang (admin_users) ist nur ein Teil – verknüpft über employees.user_id.

export const EMPLOYMENT_TYPES = [
  { value: 'vollzeit', label: 'Vollzeit' },
  { value: 'teilzeit', label: 'Teilzeit' },
  { value: 'geringfuegig', label: 'Geringfügig' },
  { value: 'freier_dn', label: 'Freier Dienstnehmer' },
  { value: 'selbststaendig', label: 'Selbstständig / Werkvertrag' },
  { value: 'lehrling', label: 'Lehrling' },
  { value: 'praktikum', label: 'Praktikum' },
  { value: 'geschaeftsfuehrung', label: 'Geschäftsführung' }
] as const

export const SALARY_TYPES = [
  { value: 'monat', label: '€ brutto / Monat' },
  { value: 'stunde', label: '€ brutto / Stunde' },
  { value: 'pauschal', label: '€ Pauschale / Monat' }
] as const

export const DOC_CATEGORIES = [
  { value: 'vertrag', label: 'Dienstvertrag' },
  { value: 'ausweis', label: 'Ausweis / Pass' },
  { value: 'meldezettel', label: 'Meldezettel' },
  { value: 'sv', label: 'SV-Anmeldung / e-card' },
  { value: 'fuehrerschein', label: 'Führerschein' },
  { value: 'zeugnis', label: 'Zeugnis / Nachweis' },
  { value: 'lohn', label: 'Lohnzettel' },
  { value: 'sonstiges', label: 'Sonstiges' }
] as const

export const ABSENCE_TYPES = [
  { value: 'urlaub', label: 'Urlaub' },
  { value: 'krankenstand', label: 'Krankenstand' },
  { value: 'zeitausgleich', label: 'Zeitausgleich' },
  { value: 'sonstiges', label: 'Sonstiges' }
] as const

const find = (list: readonly { value: string; label: string }[], v: string | null | undefined) =>
  list.find(x => x.value === v)?.label || ''

export const employmentLabel = (v: string | null | undefined) => find(EMPLOYMENT_TYPES, v)
export const docCategoryLabel = (v: string | null | undefined) => find(DOC_CATEGORIES, v) || 'Sonstiges'
export const absenceLabel = (v: string | null | undefined) => find(ABSENCE_TYPES, v) || 'Sonstiges'

export const isValue = (list: readonly { value: string }[], v: unknown) => list.some(x => x.value === v)

/** Arbeitstage Mo–Fr zwischen zwei Daten (inklusive), 'YYYY-MM-DD'. Feiertage zählt man bei Bedarf selbst ab. */
export function workdaysBetween(from: string, to: string): number {
  if (!from || !to || to < from) return 0
  const d = new Date(from + 'T12:00:00Z')
  const end = new Date(to + 'T12:00:00Z')
  let n = 0
  while (d <= end) {
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) n++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return n
}

/** Ausgeschieden = Austrittsdatum liegt vor heute. */
export const isFormer = (exitDate: string | null | undefined, today: string) => !!exitDate && exitDate < today

export function initials(first?: string | null, last?: string | null) {
  return ((first || '').trim().charAt(0) + (last || '').trim().charAt(0)).toUpperCase() || '?'
}
