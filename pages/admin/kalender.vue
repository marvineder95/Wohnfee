<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  title: 'Kalender - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

const { user } = useAdminAuth()

interface CalEvent {
  id: number
  title: string
  type: string
  eventDate: string
  startTime: string | null
  endTime: string | null
  allDay: number
  location: string | null
  projectId: number | null
  projectTitle: string | null
  projectCustomer: string | null
  projectCategory: string | null
  notes: string | null
  createdBy: number | null
  createdByName: string | null
}
interface ProjectOpt { id: number; label: string; category: string }

const TYPE_META: Record<string, { label: string; tone: string }> = {
  aufbau: { label: 'Aufbau', tone: 'green' },
  abholung: { label: 'Abholung', tone: 'amber' },
  lieferung: { label: 'Lieferung', tone: 'blue' },
  beratung: { label: 'Beratung', tone: 'purple' },
  sonstiges: { label: 'Sonstiges', tone: 'gray' }
}
const CAT_LABELS: Record<string, string> = { staging: 'Staging', leasing: 'Leasing', showroom: 'Showroom' }
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// ---------- Monatslogik ----------
const today = new Date()
const route = useRoute()
const focusParam = typeof route.query.focus === 'string' ? route.query.focus : null
const focusDate = focusParam && /^\d{4}-\d{2}-\d{2}$/.test(focusParam) ? new Date(focusParam + 'T12:00:00') : null
const viewYear = ref(focusDate ? focusDate.getFullYear() : today.getFullYear())
const viewMonth = ref(focusDate ? focusDate.getMonth() : today.getMonth()) // 0-basiert
const selectedDate = ref(focusDate ? toIso(focusDate) : toIso(today))

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const monthLabel = computed(() => `${MONTHS[viewMonth.value]} ${viewYear.value}`)
const todayIso = toIso(today)

const gridDays = computed(() => {
  // 6 Zeilen à 7 Tage, beginnend am Montag der ersten Kalenderwoche
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const start = new Date(first)
  const dow = (first.getDay() + 6) % 7 // Montag = 0
  start.setDate(first.getDate() - dow)
  const days: { iso: string; day: number; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === viewMonth.value })
  }
  return days
})

function shiftMonth(delta: number) {
  const d = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}
function goToday() {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
  selectedDate.value = todayIso
}

// ---------- Daten ----------
const events = ref<CalEvent[]>([])
const projects = ref<ProjectOpt[]>([])
const loading = ref(true)
const loadError = ref('')

const range = computed(() => {
  const first = gridDays.value[0].iso
  const last = gridDays.value[41].iso
  return { from: first, to: last }
})

async function load() {
  loading.value = true
  try {
    const [cal, proj] = await Promise.all([
      $fetch<{ events: CalEvent[] }>('/api/admin/calendar', {
        query: { from: range.value.from, to: range.value.to }
      }),
      $fetch<{ projects: any[] }>('/api/admin/projects')
    ])
    events.value = cal.events
    projects.value = proj.projects.map(p => ({
      id: p.id,
      label: `${p.customer || p.title || 'Projekt #' + p.id}${p.title && p.customer ? ' – ' + p.title : ''}`,
      category: p.category
    }))
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || 'Termine konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}
watch([viewYear, viewMonth], load)
onMounted(load)

const eventsByDate = computed(() => {
  const m: Record<string, CalEvent[]> = {}
  for (const e of events.value) {
    ;(m[e.eventDate] ||= []).push(e)
  }
  return m
})
const selectedEvents = computed(() => eventsByDate.value[selectedDate.value] || [])

function dayEvents(iso: string) {
  return eventsByDate.value[iso] || []
}

// ---------- Termin anlegen / bearbeiten ----------
const modalOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)

const emptyForm = () => ({
  title: '', type: 'aufbau', eventDate: selectedDate.value,
  startTime: '09:00', endTime: '', allDay: false,
  location: '', projectId: '', notes: ''
})
const form = ref(emptyForm())

function openNew(dateIso?: string) {
  editingId.value = null
  form.value = emptyForm()
  if (dateIso) form.value.eventDate = dateIso
  formError.value = ''
  modalOpen.value = true
}
function openEdit(ev: CalEvent) {
  editingId.value = ev.id
  form.value = {
    title: ev.title, type: ev.type, eventDate: ev.eventDate,
    startTime: ev.startTime || '09:00', endTime: ev.endTime || '',
    allDay: !!ev.allDay, location: ev.location || '',
    projectId: ev.projectId ? String(ev.projectId) : '', notes: ev.notes || ''
  }
  formError.value = ''
  modalOpen.value = true
}

async function save() {
  if (!form.value.title.trim()) { formError.value = 'Bitte einen Titel angeben.'; return }
  if (!form.value.eventDate) { formError.value = 'Bitte ein Datum wählen.'; return }
  saving.value = true
  formError.value = ''
  const payload = { ...form.value, projectId: form.value.projectId ? Number(form.value.projectId) : null }
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/calendar/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/calendar', { method: 'POST', body: payload })
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function remove(ev: CalEvent) {
  if (!confirm(`Termin „${ev.title}“ wirklich löschen?`)) return
  try {
    await $fetch(`/api/admin/calendar/${ev.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

// Bearbeiten/Löschen nur für Ersteller oder Superadmin
function canManage(ev: CalEvent) {
  return user.value?.role === 'superadmin' || (ev.createdBy && ev.createdBy === user.value?.id)
}

function fmtDate(iso: string) {
  return iso.split('-').reverse().join('.')
}
function weekdayLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return WEEKDAYS[(d.getDay() + 6) % 7]
}
function timeLabel(ev: CalEvent) {
  if (ev.allDay) return 'Ganztägig'
  return ev.startTime ? ev.startTime + (ev.endTime ? ' – ' + ev.endTime : ' Uhr') : ''
}
</script>

<template>
  <div>
    <!-- Kopf -->
    <section class="cal-hero wf-card">
      <div>
        <p class="wf-eyebrow">Terminplanung</p>
        <h1 class="wf-title">Kalender</h1>
        <p class="wf-subtitle">Aufbauten, Abholungen und Termine – im Blick für das ganze Team.</p>
      </div>
      <img src="/img/admin-hero-kalender.png" alt="Wochenplaner auf einem Eichentisch in warmem Licht">
    </section>

    <p v-if="loadError" class="cal-error">{{ loadError }}</p>

    <div class="cal-layout">
      <!-- ── Monatskalender ─────────────────────────────── -->
      <section class="cal-card wf-card">
        <header class="cal-card__head">
          <div class="cal-nav">
            <button class="cal-nav__btn" aria-label="Vorheriger Monat" @click="shiftMonth(-1)">
              <WfIcon name="chevron" :size="15" class="cal-nav__flip" />
            </button>
            <h2 class="cal-nav__title">{{ monthLabel }}</h2>
            <button class="cal-nav__btn" aria-label="Nächster Monat" @click="shiftMonth(1)">
              <WfIcon name="chevron" :size="15" />
            </button>
            <button class="wf-btn wf-btn--sm cal-nav__today" @click="goToday">Heute</button>
          </div>
          <button class="wf-btn wf-btn--primary" @click="openNew()">
            <WfIcon name="plus" :size="14" /> Neuer Termin
          </button>
        </header>

        <div class="cal-grid" :class="{ 'is-loading': loading }">
          <div v-for="wd in WEEKDAYS" :key="wd" class="cal-grid__wd">{{ wd }}</div>
          <button v-for="d in gridDays" :key="d.iso"
                  class="cal-day"
                  :class="{
                    'is-out': !d.inMonth,
                    'is-today': d.iso === todayIso,
                    'is-selected': d.iso === selectedDate
                  }"
                  @click="selectedDate = d.iso">
            <span class="cal-day__num">{{ d.day }}</span>
            <span class="cal-day__events">
              <span v-for="ev in dayEvents(d.iso).slice(0, 2)" :key="ev.id"
                    class="cal-chip" :data-tone="ev.type" :title="ev.title">
                <template v-if="!ev.allDay && ev.startTime">{{ ev.startTime.slice(0, 5) }} </template>{{ ev.title }}
              </span>
              <span v-if="dayEvents(d.iso).length > 2" class="cal-more">+{{ dayEvents(d.iso).length - 2 }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- ── Tagesliste ─────────────────────────────────── -->
      <aside class="cal-side wf-card">
        <header class="cal-side__head">
          <div>
            <h2>{{ weekdayLabel(selectedDate) }}, {{ fmtDate(selectedDate) }}</h2>
            <p v-if="selectedDate === todayIso" class="cal-side__today">Heute</p>
          </div>
          <button class="wf-btn wf-btn--sm" @click="openNew(selectedDate)">
            <WfIcon name="plus" :size="13" /> Termin
          </button>
        </header>

        <p v-if="!selectedEvents.length" class="cal-side__empty">
          Keine Termine an diesem Tag.<br>Lege einen neuen Termin an.
        </p>
        <ul v-else class="cal-list">
          <li v-for="ev in selectedEvents" :key="ev.id" class="cal-ev" :data-tone="ev.type">
            <span class="cal-ev__bar" aria-hidden="true" />
            <div class="cal-ev__body">
              <div class="cal-ev__top">
                <span class="wf-pill wf-pill--plain cal-ev__type" :data-tone="ev.type">
                  {{ TYPE_META[ev.type]?.label || ev.type }}
                </span>
                <span v-if="timeLabel(ev)" class="cal-ev__time">
                  <WfIcon name="clock" :size="12" /> {{ timeLabel(ev) }}
                </span>
              </div>
              <strong class="cal-ev__title">{{ ev.title }}</strong>
              <p v-if="ev.location" class="cal-ev__meta"><WfIcon name="pin" :size="12" /> {{ ev.location }}</p>
              <p v-if="ev.projectId" class="cal-ev__meta">
                <WfIcon name="folder" :size="12" />
                {{ ev.projectCustomer || '' }}{{ ev.projectCustomer && ev.projectTitle ? ' – ' : '' }}{{ ev.projectTitle || '' }}
                <span class="cal-ev__cat">{{ CAT_LABELS[ev.projectCategory || ''] || ev.projectCategory }}</span>
              </p>
              <p v-if="ev.notes" class="cal-ev__notes">{{ ev.notes }}</p>
              <p class="cal-ev__who">Eingetragen von {{ ev.createdByName || 'unbekannt' }}</p>
            </div>
            <div v-if="canManage(ev)" class="cal-ev__actions">
              <button class="cal-icobtn" title="Bearbeiten" @click="openEdit(ev)"><WfIcon name="edit" :size="14" /></button>
              <button class="cal-icobtn cal-icobtn--danger" title="Löschen" @click="remove(ev)"><WfIcon name="trash" :size="14" /></button>
            </div>
          </li>
        </ul>
      </aside>
    </div>

    <!-- ── Termin-Dialog ────────────────────────────────── -->
    <div v-if="modalOpen" class="wf-modal-overlay" @click.self="modalOpen = false">
      <div class="wf-modal cal-modal">
        <header class="cal-modal__head">
          <h2>{{ editingId ? 'Termin bearbeiten' : 'Neuer Termin' }}</h2>
          <button class="cal-modal__close" aria-label="Schließen" @click="modalOpen = false">×</button>
        </header>

        <div class="cal-form">
          <label class="cal-field cal-field--full">
            <span>Titel *</span>
            <input v-model="form.title" type="text" placeholder="z. B. Aufbau Musterwohnung Sievering" class="wf-input">
          </label>

          <label class="cal-field">
            <span>Typ</span>
            <select v-model="form.type" class="wf-input">
              <option v-for="(meta, key) in TYPE_META" :key="key" :value="key">{{ meta.label }}</option>
            </select>
          </label>
          <label class="cal-field">
            <span>Datum *</span>
            <input v-model="form.eventDate" type="date" class="wf-input">
          </label>

          <label class="cal-field cal-field--check">
            <input v-model="form.allDay" type="checkbox">
            <span>Ganztägig</span>
          </label>
          <div class="cal-field cal-field--times" :class="{ 'is-disabled': form.allDay }">
            <label>
              <span>Von</span>
              <input v-model="form.startTime" type="time" class="wf-input" :disabled="form.allDay">
            </label>
            <label>
              <span>Bis</span>
              <input v-model="form.endTime" type="time" class="wf-input" :disabled="form.allDay">
            </label>
          </div>

          <label class="cal-field">
            <span>Ort</span>
            <input v-model="form.location" type="text" placeholder="z. B. 1190 Wien, Sievering" class="wf-input">
          </label>
          <label class="cal-field">
            <span>Projekt (optional)</span>
            <select v-model="form.projectId" class="wf-input">
              <option value="">— kein Projekt —</option>
              <option v-for="p in projects" :key="p.id" :value="String(p.id)">
                {{ CAT_LABELS[p.category] || p.category }}: {{ p.label }}
              </option>
            </select>
          </label>

          <label class="cal-field cal-field--full">
            <span>Notizen</span>
            <textarea v-model="form.notes" rows="2" class="wf-input" placeholder="z. B. Schlüsselübergabe 8:30, 2. Stock" />
          </label>
        </div>

        <p v-if="formError" class="cal-error">{{ formError }}</p>

        <footer class="cal-modal__foot">
          <button class="wf-btn" @click="modalOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Speichert …' : editingId ? 'Speichern' : 'Termin anlegen' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hero */
.cal-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  overflow: hidden;
  margin-bottom: 1.4em;
}
.cal-hero > div { padding: 1.8em 0 1.8em 2em; align-self: center; }
.cal-hero img {
  width: 34%;
  min-height: 150px;
  object-fit: cover;
  display: block;
}
.cal-error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .7em 1em; font-size: .9em; }

/* Layout: Kalender + Tagesliste */
.cal-layout {
  display: grid;
  grid-template-columns: 1.9fr 1fr;
  gap: 1em;
  align-items: start;
}
.cal-card { padding: 1.2em 1.3em; }
.cal-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  margin-bottom: 1em;
  flex-wrap: wrap;
}

/* Monatsnavigation */
.cal-nav { display: flex; align-items: center; gap: .4em; }
.cal-nav__title {
  margin: 0 .4em;
  font-family: var(--wf-serif);
  font-weight: 500;
  font-size: 1.15em;
  min-width: 9.5em;
  text-align: center;
}
.cal-nav__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--wf-line);
  background: #fff;
  color: var(--wf-muted);
  cursor: pointer;
  transition: border-color .15s, color .15s;
}
.cal-nav__btn:hover { border-color: var(--wf-green); color: var(--wf-green); }
.cal-nav__flip { transform: rotate(180deg); }
.cal-nav__today { margin-left: .5em; }

/* Kalender-Raster */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal-grid.is-loading { opacity: .5; pointer-events: none; }
.cal-grid__wd {
  text-align: center;
  font-size: .72em;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--wf-muted);
  padding: .35em 0;
}
.cal-day {
  min-height: 6.2em;
  border: 1px solid #f0ece1;
  border-radius: 10px;
  background: #fff;
  padding: .35em .4em;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font: inherit;
  color: inherit;
  transition: border-color .15s, background .15s;
}
.cal-day:hover { border-color: var(--wf-green); }
.cal-day.is-out { background: #faf8f3; color: #b6b0a2; }
.cal-day.is-today { border-color: var(--wf-green); border-width: 1.5px; }
.cal-day.is-today .cal-day__num {
  background: var(--wf-green);
  color: #fff;
  border-radius: 50%;
  width: 1.55em;
  height: 1.55em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cal-day.is-selected { background: #f4f7f0; border-color: var(--wf-green); box-shadow: 0 0 0 2px rgba(47,93,64,.15); }
.cal-day__num { font-size: .82em; font-weight: 600; padding: .1em; }
.cal-day__events { display: flex; flex-direction: column; gap: 2px; }

/* Termin-Chips nach Typ */
.cal-chip {
  font-size: .68em;
  line-height: 1.25;
  padding: .18em .45em;
  border-radius: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #efede8;
  color: var(--wf-ink);
  border-left: 3px solid #b6b0a2;
}
.cal-chip[data-tone="aufbau"] { background: #e9f0e4; border-left-color: var(--wf-green); }
.cal-chip[data-tone="abholung"] { background: #f8eeda; border-left-color: var(--wf-amber); }
.cal-chip[data-tone="lieferung"] { background: #e4eef8; border-left-color: var(--wf-blue); }
.cal-chip[data-tone="beratung"] { background: #eee7f5; border-left-color: #7a5ea8; }
.cal-more { font-size: .66em; color: var(--wf-muted); padding-left: .3em; }

/* Tagesliste */
.cal-side { padding: 1.2em 1.3em; position: sticky; top: 1em; }
.cal-side__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .8em;
  margin-bottom: 1em;
}
.cal-side__head h2 { margin: 0; font-family: var(--wf-serif); font-weight: 500; font-size: 1.1em; }
.cal-side__today { margin: .15em 0 0; font-size: .74em; color: var(--wf-green); font-weight: 600; }
.cal-side__empty { color: var(--wf-muted); font-size: .88em; line-height: 1.5; }
.cal-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .7em; }

.cal-ev {
  display: flex;
  gap: .75em;
  border: 1px solid #f0ece1;
  border-radius: 12px;
  padding: .7em .8em;
  background: #fff;
}
.cal-ev__bar { width: 4px; border-radius: 4px; background: #b6b0a2; flex-shrink: 0; }
.cal-ev[data-tone="aufbau"] .cal-ev__bar { background: var(--wf-green); }
.cal-ev[data-tone="abholung"] .cal-ev__bar { background: var(--wf-amber); }
.cal-ev[data-tone="lieferung"] .cal-ev__bar { background: var(--wf-blue); }
.cal-ev[data-tone="beratung"] .cal-ev__bar { background: #7a5ea8; }
.cal-ev__body { flex: 1; min-width: 0; }
.cal-ev__top { display: flex; align-items: center; gap: .6em; margin-bottom: .25em; flex-wrap: wrap; }
.cal-ev__type { font-size: .68em; }
.cal-ev__type[data-tone="aufbau"] { background: #e9f0e4; color: var(--wf-green); }
.cal-ev__type[data-tone="abholung"] { background: #f8eeda; color: var(--wf-amber); }
.cal-ev__type[data-tone="lieferung"] { background: #e4eef8; color: var(--wf-blue); }
.cal-ev__type[data-tone="beratung"] { background: #eee7f5; color: #7a5ea8; }
.cal-ev__time { display: inline-flex; align-items: center; gap: .3em; font-size: .76em; color: var(--wf-muted); }
.cal-ev__title { display: block; font-size: .92em; margin-bottom: .15em; }
.cal-ev__meta {
  display: flex;
  align-items: center;
  gap: .4em;
  margin: .1em 0;
  font-size: .78em;
  color: var(--wf-muted);
}
.cal-ev__meta svg { flex-shrink: 0; color: #a9a294; }
.cal-ev__cat { font-size: .9em; color: #a9a294; }
.cal-ev__notes { margin: .3em 0 0; font-size: .8em; color: var(--wf-ink); white-space: pre-line; }
.cal-ev__who { margin: .4em 0 0; font-size: .7em; color: #b6b0a2; }
.cal-ev__actions { display: flex; flex-direction: column; gap: .35em; }
.cal-icobtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--wf-line);
  background: #fff;
  color: var(--wf-muted);
  cursor: pointer;
  transition: border-color .15s, color .15s;
}
.cal-icobtn:hover { border-color: var(--wf-green); color: var(--wf-green); }
.cal-icobtn--danger:hover { border-color: var(--wf-red); color: var(--wf-red); }

/* Dialog */
.cal-modal { max-width: 620px; width: 100%; }
.cal-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1em;
}
.cal-modal__head h2 { margin: 0; font-family: var(--wf-serif); font-weight: 500; font-size: 1.25em; }
.cal-modal__close {
  border: 0;
  background: none;
  font-size: 1.4em;
  line-height: 1;
  color: var(--wf-muted);
  cursor: pointer;
}
.cal-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .8em 1em;
}
.cal-field { display: flex; flex-direction: column; min-width: 0; }
.cal-field > span { font-size: .78em; color: var(--wf-muted); margin-bottom: .3em; }
.cal-field--full { grid-column: 1 / -1; }
.cal-field textarea { resize: vertical; font: inherit; }
.cal-field--check {
  flex-direction: row;
  align-items: center;
  gap: .5em;
  align-self: end;
  padding-bottom: .55em;
}
.cal-field--check > span { margin: 0; font-size: .85em; color: var(--wf-ink); }
.cal-field--check input { width: 16px; height: 16px; accent-color: var(--wf-green); }
.cal-field--times { display: flex; gap: .7em; }
.cal-field--times label { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.cal-field--times span { font-size: .78em; color: var(--wf-muted); margin-bottom: .3em; }
.cal-field--times.is-disabled { opacity: .45; }
.cal-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: .6em;
  margin-top: 1.2em;
}

/* Responsive */
@media (max-width: 1080px) {
  .cal-layout { grid-template-columns: 1fr; }
  .cal-side { position: static; }
}
@media (max-width: 720px) {
  .cal-hero img { display: none; }
  .cal-hero > div { padding: 1.3em 1.2em; }
  .cal-day { min-height: 4.6em; padding: .25em .3em; }
  .cal-chip { font-size: .62em; }
  .cal-form { grid-template-columns: 1fr; }
}
</style>
