<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Touren - WOHNFEE Dashboard', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

// Tourenplan der eigenen Spedition: Termine (Aufbau/Lieferung/Abholung) aus dem
// Kalender + fällige Projekt-Abholungen (Deadline) + Rückgaben einzelner Möbel.
// Überfälliges steht immer oben. Druckbar als Tagesplan.

interface Entry {
  kind: 'termin' | 'deadline' | 'rueckgabe'
  date: string
  title: string
  type?: string
  startTime?: string | null
  endTime?: string | null
  allDay?: number
  location?: string | null
  notes?: string | null
  projectId: number | null
  projectCustomer: string | null
  projectTitle: string | null
  projectCategory?: string | null
  itemCount: number
  pieceCount?: number
  deadlineText?: string | null
}

const perms = usePermissions()
const TYPE_LABELS: Record<string, string> = {
  aufbau: 'Aufbau', abholung: 'Abholung', lieferung: 'Lieferung', beratung: 'Beratung', sonstiges: 'Termin'
}
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const RANGES = [{ days: 1, label: 'Heute' }, { days: 7, label: '7 Tage' }, { days: 14, label: '14 Tage' }, { days: 30, label: '30 Tage' }]

const rangeDays = ref(14)
const loading = ref(true)
const error = ref('')
const today = ref(localToday())
const entries = ref<Entry[]>([])
const overdue = ref<Entry[]>([])

function isoPlus(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtDate(iso: string) {
  return String(iso).slice(0, 10).split('-').reverse().join('.')
}
function dayLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  if (iso === today.value) return `Heute · ${WEEKDAYS[d.getDay()]}, ${fmtDate(iso)}`
  if (iso === isoPlus(today.value, 1)) return `Morgen · ${WEEKDAYS[d.getDay()]}, ${fmtDate(iso)}`
  return `${WEEKDAYS[d.getDay()]}, ${fmtDate(iso)}`
}
function daysAgo(iso: string) {
  return Math.round((new Date(today.value + 'T12:00:00').getTime() - new Date(String(iso).slice(0, 10) + 'T12:00:00').getTime()) / 86400000)
}
function projectLabel(e: Entry) {
  return [e.projectCustomer, e.projectTitle].filter(Boolean).join(' – ')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<any>('/api/admin/logistics', {
      query: { from: today.value, to: isoPlus(today.value, rangeDays.value - 1) }
    })
    const list: Entry[] = [
      ...res.events.map((e: any) => ({ ...e, kind: 'termin', itemCount: Number(e.itemCount) || 0 })),
      ...res.deadlines.map((d: any) => ({ ...d, kind: 'deadline', title: 'Leihmöbel abholen', itemCount: Number(d.itemCount), pieceCount: Number(d.pieceCount) })),
      ...res.returns.map((r: any) => ({ ...r, kind: 'rueckgabe', title: 'Rückgabe einzelner Möbel', itemCount: Number(r.itemCount), pieceCount: Number(r.pieceCount) }))
    ]
    entries.value = list.sort((a, b) =>
      a.date.localeCompare(b.date) || String(a.startTime || '99').localeCompare(String(b.startTime || '99')))
    overdue.value = res.overdue.map((o: any) => ({
      ...o, title: o.kind === 'deadline' ? 'Leihmöbel noch beim Kunden' : 'Rückgabe überfällig',
      itemCount: Number(o.itemCount), pieceCount: Number(o.pieceCount)
    }))
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Touren konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}
watch(rangeDays, load)
onMounted(load)

const days = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const e of entries.value) {
    if (!map.has(e.date)) map.set(e.date, [])
    map.get(e.date)!.push(e)
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }))
})

function kindLabel(e: Entry) {
  if (e.kind === 'deadline') return 'Abholung fällig'
  if (e.kind === 'rueckgabe') return 'Rückgabe'
  return TYPE_LABELS[e.type || 'sonstiges'] || 'Termin'
}
function kindTone(e: Entry) {
  if (e.kind !== 'termin') return 'wf-pill--amber'
  return e.type === 'aufbau' ? 'wf-pill--green' : e.type === 'lieferung' ? 'wf-pill--blue' : e.type === 'abholung' ? 'wf-pill--amber' : 'wf-pill--gray'
}
function timeLabel(e: Entry) {
  if (e.kind !== 'termin') return ''
  if (e.allDay) return 'ganztägig'
  return e.startTime ? e.startTime + (e.endTime ? '–' + e.endTime : '') : ''
}

// Verlängerung anbieten → Angebotsentwurf aus den Möbeln des Projekts
const extBusy = ref<number | null>(null)
async function offerExtension(e: Entry) {
  if (!e.projectId) return
  if (!confirm(`Angebot „Mietverlängerung" für ${projectLabel(e)} erstellen?\n\nAlle ${e.itemCount} Möbel des Projekts werden mit ihrem Monatspreis übernommen – du kannst es danach anpassen.`)) return
  extBusy.value = e.projectId
  try {
    const res = await $fetch<{ offerId: number }>(`/api/admin/projects/${e.projectId}/extension-offer`, { method: 'POST' })
    await navigateTo(`/admin/angebote?open=${res.offerId}`)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Angebot konnte nicht erstellt werden.'
  } finally {
    extBusy.value = null
  }
}

// Abholung erledigt → Möbel zurück ins Lager. Erst dann sind sie wieder im Shop
// (oder bewusst in Reinigung/Reparatur bzw. defekt).
interface ReturnLine { itemId: number; title: string; quantity: number; pick: boolean; state: 'lager' | 'pflege' | 'ausser_dienst'; note: string }
const ret = ref<{ projectId: number; label: string; lines: ReturnLine[] } | null>(null)
const retBusy = ref(false)
const retError = ref('')
const RETURN_STATES = [
  { value: 'lager', label: 'Zurück in den Shop' },
  { value: 'pflege', label: 'Reinigung / Reparatur' },
  { value: 'ausser_dienst', label: 'Defekt' }
] as const
async function openReturn(e: Entry) {
  if (!e.projectId) return
  retError.value = ''
  try {
    const res = await $fetch<{ items: any[] }>(`/api/admin/projects/${e.projectId}/items`)
    ret.value = {
      projectId: e.projectId,
      label: projectLabel(e) || `Projekt #${e.projectId}`,
      lines: res.items.map((i) => ({ itemId: i.item_id, title: i.title, quantity: Number(i.quantity) || 1, pick: true, state: 'lager', note: '' }))
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Möbel des Projekts konnten nicht geladen werden.'
  }
}
async function confirmReturn() {
  if (!ret.value) return
  const picked = ret.value.lines.filter((l) => l.pick)
  if (!picked.length) { retError.value = 'Bitte mindestens ein Möbelstück auswählen.'; return }
  retBusy.value = true
  retError.value = ''
  try {
    await $fetch(`/api/admin/projects/${ret.value.projectId}/return`, {
      method: 'POST', body: { items: picked.map((l) => ({ itemId: l.itemId, state: l.state, note: l.note })) }
    })
    ret.value = null
    await load()
  } catch (err: any) {
    retError.value = err?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    retBusy.value = false
  }
}
const canReturn = (e: Entry) => !!e.projectId && !!e.itemCount && perms.can('touren') && (e.kind !== 'termin' || e.type === 'abholung')

function printPlan() {
  window.print()
}
</script>

<template>
  <div class="tour">
    <section class="tour__head wf-card">
      <div>
        <p class="wf-eyebrow">Spedition</p>
        <h1 class="wf-title">Touren &amp; Rückgaben</h1>
        <p class="wf-subtitle">Aufbau, Lieferung und Abholung der nächsten Tage – mit Packliste je Projekt.</p>
      </div>
      <div class="tour__tools no-print">
        <div class="tour__ranges" role="tablist">
          <button v-for="r in RANGES" :key="r.days" class="tour__range" :class="{ 'is-active': rangeDays === r.days }"
                  @click="rangeDays = r.days">{{ r.label }}</button>
        </div>
        <button class="wf-btn wf-btn--sm" @click="printPlan"><WfIcon name="print" :size="14" /> Drucken</button>
        <NuxtLink to="/admin/kalender?new=1" class="wf-btn wf-btn--sm wf-btn--primary"><WfIcon name="plus" :size="14" /> Termin</NuxtLink>
      </div>
    </section>

    <p v-if="error" class="tour__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="tour__muted">Touren werden geladen …</p>

    <template v-else>
      <!-- Überfällig -->
      <section v-if="overdue.length" class="tour__overdue">
        <h2 class="tour__h2"><WfIcon name="alert" :size="16" /> Überfällig – Möbel noch beim Kunden</h2>
        <ul class="tour__list">
          <li v-for="o in overdue" :key="o.kind + o.projectId + o.date" class="tour__row is-overdue">
            <span class="wf-pill wf-pill--red">seit {{ daysAgo(o.date) }} Tag{{ daysAgo(o.date) === 1 ? '' : 'en' }}</span>
            <span class="tour__main">
              <strong>{{ projectLabel(o) || 'Projekt #' + o.projectId }}</strong>
              <small>{{ o.title }} · fällig {{ fmtDate(o.date) }} · {{ o.pieceCount || o.itemCount }} Stück</small>
            </span>
            <span class="tour__acts no-print">
              <button v-if="canReturn(o)" class="wf-btn wf-btn--sm wf-btn--primary" @click="openReturn(o)"><WfIcon name="check" :size="13" /> Abholung erledigt</button>
              <NuxtLink v-if="o.projectId" :to="`/admin/packliste/${o.projectId}?modus=abholung`" class="wf-btn wf-btn--sm"><WfIcon name="list" :size="13" /> Packliste</NuxtLink>
              <button v-if="perms.canEdit('angebote')" class="wf-btn wf-btn--sm" :disabled="extBusy === o.projectId" @click="offerExtension(o)"><WfIcon name="file" :size="13" /> Verlängerung anbieten</button>
              <NuxtLink v-if="o.projectId" :to="`/admin/projekte?open=${o.projectId}&cat=${o.projectCategory}`" class="wf-btn wf-btn--sm">Projekt</NuxtLink>
            </span>
          </li>
        </ul>
      </section>

      <p v-if="!days.length" class="tour__empty wf-card">
        Keine Touren im gewählten Zeitraum. Termine legst du im <NuxtLink to="/admin/kalender">Kalender</NuxtLink> an –
        Abholungen erscheinen automatisch, sobald ein Projekt mit Möbeln eine Deadline hat.
      </p>

      <section v-for="d in days" :key="d.date" class="tour__day wf-card" :class="{ 'is-today': d.date === today }">
        <h2 class="tour__dayh">{{ dayLabel(d.date) }} <small>{{ d.items.length }} Eintr{{ d.items.length === 1 ? 'ag' : 'äge' }}</small></h2>
        <ul class="tour__list">
          <li v-for="(e, i) in d.items" :key="i" class="tour__row">
            <span class="tour__time">{{ timeLabel(e) }}</span>
            <span class="wf-pill" :class="kindTone(e)">{{ kindLabel(e) }}</span>
            <span class="tour__main">
              <strong>{{ e.kind === 'termin' ? e.title : (projectLabel(e) || e.title) }}</strong>
              <small>
                <template v-if="e.kind === 'termin' && projectLabel(e)">{{ projectLabel(e) }} · </template>
                <template v-if="e.location"><WfIcon name="pin" :size="11" /> {{ e.location }} · </template>
                <template v-if="e.itemCount">{{ e.pieceCount || e.itemCount }} Stück</template>
                <template v-if="e.deadlineText"> · {{ e.deadlineText }}</template>
              </small>
              <small v-if="e.notes" class="tour__notes">{{ e.notes }}</small>
            </span>
            <span class="tour__acts no-print">
              <NuxtLink v-if="e.projectId && e.itemCount" :to="`/admin/packliste/${e.projectId}?modus=${e.kind === 'termin' && e.type !== 'abholung' ? 'lieferung' : 'abholung'}`" class="wf-btn wf-btn--sm">
                <WfIcon name="list" :size="13" /> Packliste
              </NuxtLink>
              <button v-if="canReturn(e)" class="wf-btn wf-btn--sm wf-btn--primary" @click="openReturn(e)"><WfIcon name="check" :size="13" /> Abholung erledigt</button>
              <button v-if="e.kind !== 'termin' && e.projectId && perms.canEdit('angebote')" class="wf-btn wf-btn--sm" :disabled="extBusy === e.projectId" @click="offerExtension(e)">Verlängerung anbieten</button>
            </span>
          </li>
        </ul>
      </section>
    </template>

    <!-- Abholung erledigt -->
    <div v-if="ret" class="wf-modal-overlay" @click.self="ret = null">
      <div class="wf-modal tour__retmodal">
        <h2 class="tour__rettitle">Abholung erledigt</h2>
        <p class="tour__retsub">{{ ret.label }} – was ist mit den Möbeln? Nur „Zurück in den Shop" macht sie sofort wieder mietbar.
          Nicht angehakte Stücke bleiben im Projekt.</p>
        <p v-if="!ret.lines.length" class="tour__muted">Dem Projekt sind keine Möbel mehr zugewiesen.</p>
        <ul class="tour__retlist">
          <li v-for="l in ret.lines" :key="l.itemId" :class="{ 'is-off': !l.pick }">
            <label class="tour__retpick">
              <input v-model="l.pick" type="checkbox">
              <span><strong>{{ l.title }}</strong><small v-if="l.quantity > 1">{{ l.quantity }} Stück</small></span>
            </label>
            <div class="tour__retstates" role="radiogroup">
              <button v-for="st in RETURN_STATES" :key="st.value" type="button" class="tour__retstate"
                      :class="[{ 'is-on': l.state === st.value }, 'is-' + st.value]" :disabled="!l.pick" @click="l.state = st.value">{{ st.label }}</button>
            </div>
            <input v-if="l.pick && l.state !== 'lager'" v-model="l.note" type="text" class="tour__retnote" maxlength="120"
                   :placeholder="l.state === 'pflege' ? 'z. B. Bezug waschen' : 'z. B. Bein gebrochen'">
          </li>
        </ul>
        <p v-if="retError" class="tour__error">{{ retError }}</p>
        <div class="tour__retacts">
          <button class="wf-btn" @click="ret = null">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="retBusy || !ret.lines.length" @click="confirmReturn">
            {{ retBusy ? 'Speichert …' : 'Ins Lager buchen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tour__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.2em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1.2em; }
.tour__tools { display: flex; gap: .5em; flex-wrap: wrap; align-items: center; }
.tour__ranges { display: inline-flex; padding: 3px; border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; }
.tour__range { border: 0; background: none; font: inherit; font-size: .84em; padding: .35em .9em; border-radius: 999px; cursor: pointer; color: var(--wf-ink); }
.tour__range.is-active { background: var(--wf-green); color: #fff; }
.tour__error { color: var(--wf-red); }
.tour__muted { color: var(--wf-muted); }
.tour__empty { padding: 1.4em 1.6em; color: var(--wf-muted); }
.tour__empty a { color: var(--wf-green); }

.tour__overdue { border: 1px solid #efc7c1; background: var(--wf-red-soft); border-radius: var(--wf-radius); padding: 1em 1.2em; margin-bottom: 1.2em; }
.tour__h2 { display: flex; align-items: center; gap: .5em; margin: 0 0 .6em; font-size: 1em; color: var(--wf-red); }

.tour__day { padding: 1em 1.3em; margin-bottom: 1em; }
.tour__day.is-today { border: 2px solid var(--wf-green); }
.tour__dayh { margin: 0 0 .5em; font-size: 1.02em; display: flex; align-items: baseline; gap: .6em; }
.tour__dayh small { font-weight: 400; font-size: .78em; color: var(--wf-muted); }

.tour__list { list-style: none; margin: 0; padding: 0; display: grid; gap: .45em; }
.tour__row { display: flex; align-items: center; gap: .8em; flex-wrap: wrap; padding: .65em .8em; border-radius: 10px; background: #fff; border: 1px solid var(--wf-line); }
.tour__row.is-overdue { border-color: #efc7c1; }
.tour__time { min-width: 5.5em; font-size: .85em; font-weight: 600; color: var(--wf-ink); font-variant-numeric: tabular-nums; }
.tour__main { flex: 1; min-width: 14em; display: flex; flex-direction: column; gap: .1em; }
.tour__main strong { font-size: .92em; }
.tour__main small { font-size: .78em; color: var(--wf-muted); }
.tour__notes { font-style: italic; }
.tour__acts { display: flex; gap: .4em; flex-wrap: wrap; }

.tour__retmodal { max-width: 640px; width: calc(100vw - 32px); }
.tour__rettitle { margin: 0 0 .3em; font-size: 1.25em; text-align: left; }
.tour__retsub { margin: 0 0 1em; color: var(--wf-muted); font-size: .88em; }
.tour__retlist { list-style: none; margin: 0 0 1em; padding: 0; display: grid; gap: .5em; max-height: 55vh; overflow: auto; }
.tour__retlist li { display: grid; gap: .5em; padding: .7em .8em; border: 1px solid var(--wf-line); border-radius: 12px; background: #fff; }
.tour__retlist li.is-off { opacity: .55; }
.tour__retpick { display: flex; gap: .6em; align-items: center; cursor: pointer; min-width: 0; }
.tour__retpick span { display: flex; flex-direction: column; min-width: 0; }
.tour__retpick strong { font-size: .92em; overflow-wrap: anywhere; }
.tour__retpick small { color: var(--wf-muted); font-size: .78em; }
.tour__retstates { display: flex; flex-wrap: wrap; gap: .35em; }
.tour__retstate { border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .3em .8em; font: inherit; font-size: .8em; cursor: pointer; color: var(--wf-ink); }
.tour__retstate.is-on.is-lager { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.tour__retstate.is-on.is-pflege { background: #c98a1f; border-color: #c98a1f; color: #fff; }
.tour__retstate.is-on.is-ausser_dienst { background: var(--wf-red); border-color: var(--wf-red); color: #fff; }
.tour__retstate:disabled { cursor: default; }
.tour__retnote { font: inherit; font-size: .85em; padding: .45em .7em; border: 1px solid var(--wf-line); border-radius: 8px; }
.tour__retacts { display: flex; justify-content: flex-end; gap: .5em; flex-wrap: wrap; }

@media print {
  .no-print { display: none !important; }
  .tour__day, .tour__overdue { break-inside: avoid; box-shadow: none; }
}
</style>

<style>
/* Druck: nur der Plan, ohne Sidebar/Topbar des Dashboards */
@media print {
  .admin-shell__side, .admin-shell__top { display: none !important; }
  .admin-shell__content { padding: 0 !important; max-width: none !important; }
}
</style>
