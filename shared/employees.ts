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
  { value: 'krankmeldung', label: 'Krankmeldung' },
  { value: 'sonstiges', label: 'Sonstiges' }
] as const

export const ABSENCE_TYPES = [
  { value: 'urlaub', label: 'Urlaub' },
  { value: 'krankenstand', label: 'Krankenstand' },
  { value: 'zeitausgleich', label: 'Zeitausgleich' },
  { value: 'sonstiges', label: 'Sonstiges' }
] as const

/** Status einer Abwesenheit: vom Admin eingetragen = genehmigt; Urlaubsantrag vom Mitarbeiter = beantragt. */
export const ABSENCE_STATUS: Record<string, { label: string; tone: string }> = {
  beantragt: { label: 'Beantragt', tone: 'amber' },
  genehmigt: { label: 'Genehmigt', tone: 'green' },
  abgelehnt: { label: 'Abgelehnt', tone: 'red' }
}
/** Erinnerung an die Krankmeldung, wenn nach so vielen Tagen noch keine hochgeladen ist (danach im selben Abstand). */
export const SICK_NOTE_REMINDER_DAYS = 3

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

/** Ab diesem Jahr werden Abwesenheiten im Dashboard erfasst – davor gibt es keinen automatischen Übertrag. */
export const VACATION_TRACKING_SINCE = 2026

const halfUp = (n: number) => Math.ceil(n * 2 - 1e-9) / 2
const daysInYear = (y: number) => (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365)
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000) + 1

/** Anspruch im Kalenderjahr: Jahresurlaub aliquot zu den Tagen im Dienst (Eintritt/Austritt), auf halbe Tage aufgerundet. */
export function vacationEntitlement(annual: number, year: number, entry?: string | null, exit?: string | null): number {
  if (!annual) return 0
  const from = entry && entry > `${year}-01-01` ? entry : `${year}-01-01`
  const to = exit && exit < `${year}-12-31` ? exit : `${year}-12-31`
  if (to < from) return 0
  const days = dayDiff(from, to)
  return days >= daysInYear(year) ? annual : halfUp((annual * days) / daysInYear(year))
}

export interface VacationAccount {
  year: number
  /** Anspruch dieses Jahres (aliquot im Ein-/Austrittsjahr) */
  entitlement: number
  /** Rest aus Vorjahren (nach Verjährung), kann negativ sein (Vorgriff) */
  carryover: number
  total: number
  used: number
  left: number
  /** Tage, die Ende dieses Jahres verjähren, wenn sie nicht verbraucht werden */
  expiring: number
  aliquot: boolean
}

/**
 * Urlaubskonto je Kalenderjahr: Anspruch aliquot ab Eintritt, nicht verbrauchter Urlaub wandert ins nächste Jahr.
 * Verbrauch zuerst vom ältesten Rest; Rest verjährt 2 Jahre nach Ende seines Urlaubsjahres (§ 4 Abs. 5 UrlG).
 * Start: Stichtag-Übertrag (openingYear/openingDays), sonst Eintrittsjahr, frühestens VACATION_TRACKING_SINCE.
 */
export function vacationAccount(opts: {
  annual: number
  entry?: string | null
  exit?: string | null
  openingYear?: number | null
  openingDays?: number | null
  /** verbrauchte Urlaubstage je Kalenderjahr */
  usedByYear: Record<number, number>
  year: number
}): VacationAccount {
  const annual = Number(opts.annual) || 0
  const entryYear = opts.entry ? Number(opts.entry.slice(0, 4)) : 0
  const opening = opts.openingYear ? Number(opts.openingYear) : 0
  const start = opening || Math.max(entryYear, VACATION_TRACKING_SINCE)
  // Töpfe je Urlaubsjahr; Übertrag zum Stichtag zählt als Rest des Vorjahres
  let buckets: Array<{ y: number; d: number }> = opening && opts.openingDays ? [{ y: start - 1, d: Number(opts.openingDays) }] : []
  let acc: VacationAccount = { year: opts.year, entitlement: 0, carryover: 0, total: 0, used: 0, left: 0, expiring: 0, aliquot: false }
  for (let y = Math.min(start, opts.year); y <= opts.year; y++) {
    buckets = buckets.filter(b => b.y >= y - 2 || b.d < 0)
    const carryover = buckets.reduce((s, b) => s + b.d, 0)
    const entitlement = y < start ? 0 : vacationEntitlement(annual, y, opts.entry, opts.exit)
    buckets.push({ y, d: entitlement })
    const used = Number(opts.usedByYear[y] || 0)
    let rest = used
    for (const b of buckets) {
      if (rest <= 0) break
      if (b.d <= 0) continue
      const take = Math.min(b.d, rest)
      b.d -= take
      rest -= take
    }
    if (rest > 0) buckets[buckets.length - 1].d -= rest
    const total = carryover + entitlement
    acc = {
      year: y, entitlement, carryover, total, used, left: total - used,
      expiring: buckets.filter(b => b.y === y - 2 && b.d > 0).reduce((s, b) => s + b.d, 0),
      aliquot: entitlement > 0 && entitlement !== annual
    }
  }
  return acc
}
