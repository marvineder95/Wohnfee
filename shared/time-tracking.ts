// Stundenaufzeichnung (/admin/stunden): Feiertage, Soll/Ist je Tag – eine Rechnung für Server und Oberfläche.
// Tagessoll = Wochenstunden / 5 (40 Std. → 8, 30 Std. → 6), Arbeitstage Mo–Fr.

/** Ab diesem Tag wird aufgezeichnet – davor gibt es weder Einträge noch Soll. */
export const TIME_TRACKING_START = '2026-11-01'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)

/** Ostersonntag (gregorianisch, Algorithmus von Meeus/Jones/Butcher). */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(y, month - 1, day))
}

/** Gesetzliche Feiertage in Österreich (§ 7 ARG): 'YYYY-MM-DD' → Name. */
export function austrianHolidays(year: number): Record<string, string> {
  const e = easter(year)
  return {
    [`${year}-01-01`]: 'Neujahr',
    [`${year}-01-06`]: 'Heilige Drei Könige',
    [iso(addDays(e, 1))]: 'Ostermontag',
    [`${year}-05-01`]: 'Staatsfeiertag',
    [iso(addDays(e, 39))]: 'Christi Himmelfahrt',
    [iso(addDays(e, 50))]: 'Pfingstmontag',
    [iso(addDays(e, 60))]: 'Fronleichnam',
    [`${year}-08-15`]: 'Mariä Himmelfahrt',
    [`${year}-10-26`]: 'Nationalfeiertag',
    [`${year}-11-01`]: 'Allerheiligen',
    [`${year}-12-08`]: 'Mariä Empfängnis',
    [`${year}-12-25`]: 'Christtag',
    [`${year}-12-26`]: 'Stefanitag'
  }
}
export const holidayName = (date: string) => austrianHolidays(Number(date.slice(0, 4)))[date] || null

export const isWeekday = (date: string) => {
  const wd = new Date(date + 'T12:00:00Z').getUTCDay()
  return wd !== 0 && wd !== 6
}

/** Tagessoll in Minuten; ohne hinterlegte Wochenstunden 8 Stunden. */
export const dailyMinutes = (weeklyHours?: number | string | null) => {
  const w = Number(weeklyHours)
  return w > 0 ? Math.round((w / 5) * 60) : 480
}

export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
/** Netto-Arbeitszeit in Minuten. */
export const workedMinutes = (start: string, end: string, pause: number) => Math.max(0, toMinutes(end) - toMinutes(start) - (Number(pause) || 0))
/** Gesetzliche Ruhepause: über 6 Stunden Arbeit mindestens 30 Minuten (§ 11 AZG). */
export const defaultPause = (start: string, end: string) => toMinutes(end) - toMinutes(start) > 360 ? 30 : 0

export interface TimeEntry { work_date: string; start_time: string; end_time: string; break_minutes: number; note: string | null }
export interface TimeAbsence { type: string; date_from: string; date_to: string }
export interface TimeEmployee { weekly_hours?: number | string | null; entry_date?: string | null; exit_date?: string | null }

const inService = (date: string, emp: TimeEmployee) =>
  date >= TIME_TRACKING_START && !(emp.entry_date && date < emp.entry_date) && !(emp.exit_date && date > emp.exit_date)

/** Warum an diesem Tag keine Stunden eingetragen werden können (null = möglich). */
export function dayLock(date: string, today: string, emp: TimeEmployee, absences: TimeAbsence[]): string | null {
  if (date < TIME_TRACKING_START) return 'Die Aufzeichnung beginnt am 01.11.2026'
  if (!inService(date, emp)) return 'Nicht im Dienst'
  if (holidayName(date)) return 'Feiertag – an gesetzlichen Feiertagen ist immer frei'
  if (creditedAbsence(date, absences)) return 'An diesem Tag ist Urlaub oder Krankenstand eingetragen'
  if (date > today) return 'Stunden können erst am jeweiligen Tag eingetragen werden'
  return null
}

// Urlaub + Krankenstand zählen wie gearbeitet; Zeitausgleich baut Plusstunden ab und wird nicht gutgeschrieben
const creditedAbsence = (date: string, absences: TimeAbsence[]) =>
  absences.find(a => (a.type === 'urlaub' || a.type === 'krankenstand') && a.date_from <= date && a.date_to >= date) || null

export interface TimeDay {
  date: string; holiday: string | null; absenceType: string | null; weekend: boolean; inService: boolean; future: boolean
  locked: string | null; entry: TimeEntry | null; targetMin: number; workedMin: number; creditMin: number
}

export function buildMonth(month: string, today: string, emp: TimeEmployee, entries: TimeEntry[], absences: TimeAbsence[]) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const daily = dailyMinutes(emp.weekly_hours)
  const byDate = new Map(entries.map(e => [e.work_date, e]))
  const days: TimeDay[] = []
  const totals = { workedMin: 0, holidayMin: 0, vacationMin: 0, sickMin: 0, totalMin: 0, targetMin: 0, saldoMin: 0 }
  for (let d = 1; d <= last; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`
    const weekend = !isWeekday(date)
    const active = inService(date, emp)
    const holiday = holidayName(date)
    const absence = active && !holiday ? creditedAbsence(date, absences) : null
    const otherAbsence = active && !holiday ? absences.find(a => a.date_from <= date && a.date_to >= date) : null
    const locked = dayLock(date, today, emp, absences)
    const targetMin = active && !weekend ? daily : 0
    const creditMin = active && !weekend && (holiday || absence) ? daily : 0
    const entry = holiday || absence || !active ? null : byDate.get(date) || null
    const workedMin = entry ? workedMinutes(entry.start_time, entry.end_time, entry.break_minutes) : 0
    days.push({ date, holiday, absenceType: otherAbsence?.type || null, weekend, inService: active, future: date > today, locked, entry, targetMin, workedMin, creditMin })
    totals.workedMin += workedMin
    if (holiday) totals.holidayMin += creditMin
    else if (absence?.type === 'urlaub') totals.vacationMin += creditMin
    else if (absence) totals.sickMin += creditMin
    totals.targetMin += targetMin
    if (date <= today) totals.saldoMin += workedMin + creditMin - targetMin
  }
  totals.totalMin = totals.workedMin + totals.holidayMin + totals.vacationMin + totals.sickMin
  return { days, totals, daily }
}
