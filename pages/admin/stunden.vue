<script setup lang="ts">
import { absenceLabel } from '~~/shared/employees'
import { TIME_TRACKING_START, buildMonth, defaultPause, type TimeAbsence, type TimeDay, type TimeEmployee, type TimeEntry } from '~~/shared/time-tracking'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Stundenaufzeichnung - WOHNFEE Dashboard', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

const { user } = useAdminAuth()
const isChef = computed(() => user.value?.role === 'superadmin')

interface Emp extends TimeEmployee { id: number; first_name: string | null; last_name: string | null }
const today = ref(localToday())
const month = ref(today.value.slice(0, 7))
const employeeId = ref<number | ''>('')
const employee = ref<Emp | null>(null)
const employees = ref<Array<{ id: number; first_name: string | null; last_name: string | null }>>([])
const entries = ref<TimeEntry[]>([])
const absences = ref<TimeAbsence[]>([])
const loading = ref(true)
const error = ref('')

const drafts = reactive<Record<string, { start: string; end: string; pause: string; note: string }>>({})
const rowState = reactive<Record<string, { saving?: boolean; saved?: boolean; error?: string }>>({})

const fullName = (e: { first_name: string | null; last_name: string | null }) => [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Mitarbeiter'
const sheet = computed(() => buildMonth(month.value, today.value, employee.value || {}, entries.value, absences.value))
const days = computed(() => sheet.value.days)
const totals = computed(() => sheet.value.totals)

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const monthLabel = computed(() => `${MONTHS[Number(month.value.slice(5)) - 1]} ${month.value.slice(0, 4)}`)
const weekday = (d: string) => WEEKDAYS[new Date(d + 'T12:00:00Z').getUTCDay()]
const shortDate = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}.`
const hours = (min: number) => (min / 60).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const saldo = (min: number) => `${min > 0 ? '+' : ''}${hours(min)}`

let loadRun = 0
async function load() {
  const run = ++loadRun
  loading.value = true
  error.value = ''
  try {
    const r = await $fetch<any>('/api/admin/time', { query: { month: month.value, employee: employeeId.value || undefined } })
    if (run !== loadRun) return
    today.value = r.today
    employee.value = r.employee
    employees.value = r.employees
    entries.value = r.entries
    absences.value = r.absences
    if (r.employee && !employeeId.value) employeeId.value = r.employee.id
    for (const k of Object.keys(drafts)) delete drafts[k]
    for (const k of Object.keys(rowState)) delete rowState[k]
    for (const d of days.value) {
      const e = entries.value.find(x => x.work_date === d.date)
      drafts[d.date] = { start: e?.start_time || '', end: e?.end_time || '', pause: e ? String(e.break_minutes) : '', note: e?.note || '' }
    }
  } catch (e: any) {
    if (run === loadRun) error.value = e?.data?.statusMessage || 'Stunden konnten nicht geladen werden.'
  } finally {
    if (run === loadRun) loading.value = false
  }
}
function shiftMonth(delta: number) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  month.value = d.toISOString().slice(0, 7)
  load()
}
const canGoNext = computed(() => month.value < today.value.slice(0, 7))
const canGoPrev = computed(() => month.value > TIME_TRACKING_START.slice(0, 7))

onMounted(async () => {
  await load()
  await nextTick()
  document.getElementById(`std-${today.value}`)?.scrollIntoView({ block: 'center' })
})

// Speichert, sobald Beginn und Ende stehen; beide leer = Eintrag weg
async function saveRow(d: TimeDay) {
  const r = drafts[d.date]
  const existing = entries.value.find(x => x.work_date === d.date)
  rowState[d.date] = {}
  if ((!r.start || !r.end) && (r.start || r.end)) return
  if (!r.start && !r.end && !existing) return
  if (r.start && r.end) {
    if (r.end <= r.start) { rowState[d.date] = { error: 'Das Ende muss nach dem Beginn liegen.' }; return }
    if (r.pause === '') r.pause = String(defaultPause(r.start, r.end))
  }
  rowState[d.date] = { saving: true }
  try {
    await $fetch('/api/admin/time', {
      method: 'POST',
      body: { employeeId: employee.value?.id, date: d.date, start: r.start, end: r.end, pause: Number(r.pause) || 0, note: r.note }
    })
    entries.value = entries.value.filter(x => x.work_date !== d.date)
    if (r.start && r.end) entries.value.push({ work_date: d.date, start_time: r.start, end_time: r.end, break_minutes: Number(r.pause) || 0, note: r.note || null })
    else { r.pause = ''; r.note = '' }
    rowState[d.date] = { saved: true }
  } catch (e: any) {
    rowState[d.date] = { error: e?.data?.statusMessage || 'Speichern fehlgeschlagen.' }
  }
}

function lockText(d: TimeDay) {
  if (d.holiday) return `${d.holiday} – frei`
  if (d.absenceType === 'urlaub' || d.absenceType === 'krankenstand') return absenceLabel(d.absenceType)
  if (!d.inService) return 'Nicht im Dienst'
  return ''
}
const rowHours = (d: TimeDay) => d.workedMin + d.creditMin
const print = () => window.print()
</script>

<template>
  <div class="std">
    <section class="std__head wf-card">
      <div>
        <p class="wf-eyebrow">Planung</p>
        <h1 class="wf-title std__title">Stundenaufzeichnung</h1>
        <p class="wf-subtitle std__sub">
          <template v-if="employee">{{ fullName(employee) }} · {{ monthLabel }}<template v-if="sheet.daily"> · {{ hours(sheet.daily) }} Std. pro Arbeitstag</template></template>
          <template v-else>Arbeitszeiten digital erfassen.</template>
        </p>
      </div>
      <div class="std__tools no-print">
        <select v-if="isChef && employees.length" v-model.number="employeeId" class="wf-input std__who" aria-label="Mitarbeiter" @change="load">
          <option v-for="e in employees" :key="e.id" :value="e.id">{{ fullName(e) }}</option>
        </select>
        <div class="std__month">
          <button type="button" class="std__nav" aria-label="Vorheriger Monat" :disabled="!canGoPrev" @click="shiftMonth(-1)"><WfIcon name="chevron" :size="15" class="std__flip" /></button>
          <strong>{{ monthLabel }}</strong>
          <button type="button" class="std__nav" aria-label="Nächster Monat" :disabled="!canGoNext" @click="shiftMonth(1)"><WfIcon name="chevron" :size="15" /></button>
        </div>
        <button type="button" class="wf-btn" @click="print"><WfIcon name="print" :size="14" /> Drucken</button>
      </div>
    </section>

    <p v-if="error" class="std__error" role="alert">{{ error }}</p>
    <p v-if="loading && !employee" class="std__muted">Stunden werden geladen …</p>
    <div v-else-if="!employee" class="std__none wf-card">
      {{ isChef ? 'Noch keine Mitarbeiter angelegt.' : 'Für deinen Zugang ist noch kein Mitarbeiter hinterlegt – bitte beim Chef melden.' }}
    </div>

    <template v-else>
      <p v-if="isChef && sheet.daily && !employee.weekly_hours" class="std__hint no-print">
        Bei {{ fullName(employee) }} sind keine Wochenstunden hinterlegt – gerechnet wird mit 8 Stunden pro Tag.
        <NuxtLink :to="`/admin/mitarbeiter?open=${employee.id}&tab=anstellung`">Jetzt eintragen</NuxtLink>
      </p>

      <section class="std__tiles" :class="{ 'std__tiles--four': !sheet.daily }">
        <div class="wf-card"><strong>{{ hours(totals.workedMin) }}</strong><span>Gearbeitet</span></div>
        <div class="wf-card"><strong>{{ hours(totals.holidayMin) }}</strong><span>Feiertage</span></div>
        <div class="wf-card"><strong>{{ hours(totals.vacationMin + totals.sickMin) }}</strong><span>Urlaub &amp; Krankenstand</span></div>
        <div class="wf-card std__tile--main"><strong>{{ hours(totals.totalMin) }}</strong><span>{{ sheet.daily ? `Gesamt von ${hours(totals.targetMin)} Soll` : 'Gesamt' }}</span></div>
        <div v-if="sheet.daily" class="wf-card" :class="totals.saldoMin < 0 ? 'std__tile--minus' : 'std__tile--plus'"><strong>{{ saldo(totals.saldoMin) }}</strong><span>Saldo bis heute</span></div>
      </section>

      <section class="std__sheet wf-card">
        <div class="std__row std__row--head" aria-hidden="true">
          <span>Tag</span><span>Beginn</span><span>Ende</span><span>Pause (Min.)</span><span>Stunden</span><span>Tätigkeit / Notiz</span>
        </div>
        <div v-for="d in days" :id="`std-${d.date}`" :key="d.date" class="std__row"
             :class="{ 'is-weekend': d.weekend, 'is-holiday': d.holiday, 'is-absent': lockText(d) && !d.holiday, 'is-today': d.date === today, 'is-future': d.future }">
          <span class="std__day"><b>{{ weekday(d.date) }}</b> {{ shortDate(d.date) }}<em v-if="d.date === today">Heute</em></span>

          <span v-if="lockText(d)" class="std__locked">{{ lockText(d) }}</span>
          <template v-else-if="drafts[d.date] && !d.future">
            <label class="std__cell"><i>Beginn</i><input v-model="drafts[d.date].start" type="time" class="wf-input" :aria-label="`Beginn ${shortDate(d.date)}`" @change="saveRow(d)"></label>
            <label class="std__cell"><i>Ende</i><input v-model="drafts[d.date].end" type="time" class="wf-input" :aria-label="`Ende ${shortDate(d.date)}`" @change="saveRow(d)"></label>
            <label class="std__cell"><i>Pause</i><input v-model="drafts[d.date].pause" type="number" min="0" step="5" inputmode="numeric" class="wf-input" :aria-label="`Pause ${shortDate(d.date)} in Minuten`" @change="saveRow(d)"></label>
          </template>
          <span v-else class="std__locked std__locked--future" />

          <span class="std__hours">{{ rowHours(d) ? hours(rowHours(d)) : '–' }}</span>

          <span v-if="!lockText(d) && drafts[d.date] && !d.future" class="std__cell std__cell--note">
            <input v-model="drafts[d.date].note" type="text" maxlength="255" class="wf-input" :placeholder="d.date === today ? 'z. B. Aufbau Sievering' : ''" :aria-label="`Notiz ${shortDate(d.date)}`" @change="saveRow(d)">
            <small v-if="rowState[d.date]?.error" class="std__rowerr">{{ rowState[d.date].error }}</small>
            <small v-else-if="rowState[d.date]?.saving" class="std__rowok">Speichert …</small>
            <small v-else-if="rowState[d.date]?.saved" class="std__rowok">Gespeichert ✓</small>
          </span>
          <span v-else class="std__cell--empty" />
        </div>
        <div class="std__row std__row--sum">
          <span>Summe {{ monthLabel }}</span><span class="std__sumval">{{ hours(totals.totalMin) }} Std.</span>
        </div>
      </section>

      <p class="std__note no-print"><template v-if="sheet.daily">Gesetzliche Feiertage sind automatisch frei und zählen wie Urlaub und Krankenstand mit den Stunden eines normalen Arbeitstags. </template>Über 6 Stunden Arbeit trägt das System 30 Minuten Pause vor – du kannst sie ändern.</p>

      <div class="std__sign">
        <span>Datum, Unterschrift Mitarbeiter</span>
        <span>Datum, Unterschrift Dienstgeber</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.std__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1em; padding: 1.5em 1.8em; margin-bottom: 1.2em; }
.std__title { text-align: left; margin-left: 0; }
.std__sub { text-align: left; margin-bottom: 0; }
.std__tools { display: flex; flex-wrap: wrap; align-items: center; gap: .6em; }
.std__who { width: auto; min-width: 12em; }
.std__month { display: flex; align-items: center; gap: .5em; }
.std__month strong { font-family: var(--wf-serif); font-weight: 400; font-size: 1.1em; min-width: 8.5em; text-align: center; }
.std__nav { display: grid; place-items: center; width: 2.1em; height: 2.1em; border: 1px solid var(--wf-line); border-radius: 9px; background: #fff; color: var(--wf-ink); cursor: pointer; }
.std__nav:disabled { opacity: .35; cursor: default; }
.std__flip { transform: rotate(180deg); }
.std__error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .7em 1em; font-size: .9em; }
.std__muted { color: var(--wf-muted); }
.std__none { padding: 2em; text-align: center; color: var(--wf-muted); }
.std__hint { background: var(--wf-amber-soft); color: var(--wf-amber); border-radius: 10px; padding: .65em 1em; font-size: .88em; text-align: left; }
.std__hint a { color: inherit; font-weight: 600; }

.std__tiles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .8em; margin-bottom: 1.2em; }
.std__tiles > div { padding: .9em 1.1em; display: flex; flex-direction: column; }
.std__tiles strong { font-family: var(--wf-serif); font-weight: 400; font-size: 1.55em; line-height: 1.15; color: var(--wf-ink); font-variant-numeric: tabular-nums; }
.std__tiles span { font-size: .78em; color: var(--wf-muted); }
.std__tiles--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.std__tile--main { background: var(--wf-green-soft) !important; }
.std__tile--main strong, .std__tile--plus strong { color: var(--wf-green); }
.std__tile--minus strong { color: var(--wf-red); }

.std__sheet { padding: .4em 1.1em .6em; }
.std__row { display: grid; grid-template-columns: 7.5em 7.2em 7.2em 6em 4.6em minmax(0, 1fr); gap: .5em; align-items: center; padding: .28em 0; border-bottom: 1px solid #f4efe6; scroll-margin-top: 90px; }
.std__row--head { padding: .6em 0 .4em; }
.std__row--head span { font-size: .72em; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--wf-muted); }
.std__row--head span:nth-child(5) { text-align: right; padding-right: .95em; }
.std__day { font-size: .88em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.std__day b { display: inline-block; width: 1.9em; font-weight: 700; }
.std__day em { margin-left: .4em; font-style: normal; font-size: .76em; font-weight: 700; color: var(--wf-green); }
.std__cell { display: block; min-width: 0; }
.std__cell i { display: none; }
.std__cell .wf-input { padding: .36em .5em; font-size: .88em; width: 100%; box-sizing: border-box; }
.std__hours { font-size: .9em; font-weight: 600; text-align: right; padding-right: .7em; font-variant-numeric: tabular-nums; }
.std__locked { grid-column: span 3; font-size: .85em; font-weight: 600; color: var(--wf-green); padding: .42em 0; }
.std__locked--future { padding: 0; }
.std__rowerr, .std__rowok { display: block; font-size: .74em; margin-top: .15em; }
.std__rowerr { color: var(--wf-red); }
.std__rowok { color: var(--wf-green); }
.std__row.is-weekend:not(.is-holiday) .std__day { color: var(--wf-muted); }
.std__row.is-holiday { background: var(--wf-green-soft); margin: 0 -1.1em; padding-left: 1.1em; padding-right: 1.1em; }
.std__row.is-absent .std__locked { color: var(--wf-blue); }
.std__row.is-absent { background: var(--wf-blue-soft); margin: 0 -1.1em; padding-left: 1.1em; padding-right: 1.1em; }
.std__row.is-today { box-shadow: inset 3px 0 0 var(--wf-green); margin: 0 -1.1em; padding-left: 1.1em; padding-right: 1.1em; }
.std__row.is-future:not(.is-holiday) .std__day, .std__row.is-future:not(.is-holiday) .std__hours { color: #c3bcad; }
.std__row--sum { grid-template-columns: 1fr auto; border-bottom: 0; padding: .8em 0 .4em; font-weight: 600; }
.std__sumval { font-family: var(--wf-serif); font-size: 1.15em; font-weight: 400; color: var(--wf-green); }
.std__note { font-size: .8em; color: var(--wf-muted); text-align: left; margin-top: .9em; }
.std__sign { display: none; }

@media (max-width: 760px) {
  .std__head { padding: 1.2em; }
  .std__tools, .std__who { width: 100%; }
  .std__month { flex: 1; justify-content: space-between; }
  .std__tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .std__tile--main { grid-column: 1 / -1; order: -1; }
  .std__row--head { display: none; }
  .std__row { grid-template-columns: repeat(3, minmax(0, 1fr)); padding: .6em 0; }
  .std__day { grid-column: 1 / 3; grid-row: 1; font-size: .94em; }
  .std__hours { grid-column: 3; grid-row: 1; padding-right: 0; }
  .std__cell i { display: block; font-style: normal; font-size: .7em; color: var(--wf-muted); margin-bottom: .1em; }
  .std__cell .wf-input { font-size: 16px; }
  .std__cell--note { grid-column: 1 / -1; display: block; }
  .std__cell--empty, .std__locked--future { display: none; }
  .std__locked { grid-column: 1 / -1; padding: 0; }
  .std__row--sum { grid-template-columns: 1fr auto; }
}
@media print {
  .no-print { display: none !important; }
  .std__head, .std__tiles > div, .std__sheet { box-shadow: none; padding: .3em 0; }
  .std__tiles { margin-bottom: .5em; }
  .std__row { padding: 0; font-size: 11px; }
  .std__row--head { padding: .3em 0; }
  .std__cell .wf-input { border: 0; background: none; padding: 0; font-size: 11px; }
  .std__cell .wf-input::-webkit-calendar-picker-indicator { display: none; }
  .std__row.is-holiday, .std__row.is-absent { background: none; }
  .std__row.is-today { box-shadow: none; }
  .std__sign { display: grid; grid-template-columns: 1fr 1fr; gap: 3em; margin-top: 3.5em; font-size: 11px; }
  .std__sign span { border-top: 1px solid #333; padding-top: .3em; }
}
</style>

<style>
/* Druck: nur das Blatt, ohne Sidebar/Topbar des Dashboards */
@media print {
  .admin-shell__side, .admin-shell__top { display: none !important; }
  .admin-shell__content { padding: 0 !important; max-width: none !important; }
}
</style>
