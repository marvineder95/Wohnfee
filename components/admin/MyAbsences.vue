<script setup lang="ts">
import { absenceLabel, workdaysBetween, ABSENCE_STATUS, SICK_NOTE_REMINDER_DAYS } from '~~/shared/employees'

// „Urlaub beantragen“ + „Krankenstand melden“ für Mitarbeiter mit Dashboard-Zugang (Kalender + Übersicht).
// Urlaub → Antrag an den Chef; Krankenstand gilt sofort, Krankmeldung kann (muss) nachgereicht werden.
const props = defineProps<{ highlight?: number | null }>()
const emit = defineEmits<{ changed: [] }>()
const ask = useConfirm()

interface Abs {
  id: number; type: string; date_from: string; date_to: string; days: number; note: string | null
  status: string; review_note: string | null; reviewed_by_name: string | null; requested_by: number | null
  files: Array<{ id: number; title: string }>
}
const employee = ref<{ id: number; vacation: { left: number; total: number } | null } | null>(null)
const absences = ref<Abs[]>([])
const loaded = ref(false)
const msg = ref<{ ok: boolean; text: string } | null>(null)

async function load() {
  try {
    const r = await $fetch<{ employee: any; absences: Abs[] }>('/api/admin/me/absences')
    employee.value = r.employee
    absences.value = r.absences
  } catch { employee.value = null } finally { loaded.value = true }
}
onMounted(load)
defineExpose({ load })

const today = localToday()
const fmt = (iso: string) => String(iso).slice(0, 10).split('-').reverse().join('.')
const range = (a: { date_from: string; date_to: string }) => a.date_from === a.date_to ? fmt(a.date_from) : `${fmt(a.date_from)} – ${fmt(a.date_to)}`
const fmtNum = (n: number) => Number(n || 0).toLocaleString('de-AT', { maximumFractionDigits: 1 })
const missingNote = (a: Abs) => a.type === 'krankenstand' && !a.files.length && a.requested_by != null

// ---------- Dialog ----------
type Mode = 'urlaub' | 'krankenstand' | 'nachreichen'
const dlg = ref<{ mode: Mode; abs?: Abs } | null>(null)
const form = ref({ date_from: '', date_to: '', note: '' })
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const err = ref('')
const days = computed(() => form.value.date_from ? workdaysBetween(form.value.date_from, form.value.date_to || form.value.date_from) : 0)
watch(() => form.value.date_from, (from) => { if (from && (!form.value.date_to || form.value.date_to < from)) form.value.date_to = from })

function open(mode: Mode, abs?: Abs) {
  err.value = ''
  files.value = []
  form.value = abs
    ? { date_from: abs.date_from, date_to: abs.date_to, note: '' }
    : { date_from: mode === 'krankenstand' ? today : '', date_to: mode === 'krankenstand' ? today : '', note: '' }
  dlg.value = { mode, abs }
}
function pickFiles(e: Event) {
  const list = Array.from((e.target as HTMLInputElement).files || [])
  files.value = [...files.value, ...list].slice(0, 5)
  ;(e.target as HTMLInputElement).value = ''
}

async function submit() {
  if (!dlg.value) return
  const { mode, abs } = dlg.value
  if (!form.value.date_from && mode !== 'nachreichen') { err.value = 'Bitte das Datum angeben.'; return }
  busy.value = true
  err.value = ''
  try {
    if (mode === 'urlaub') {
      await $fetch('/api/admin/me/absences', { method: 'POST', body: { type: 'urlaub', ...form.value } })
      msg.value = { ok: true, text: 'Urlaubsantrag gesendet – du bekommst eine Nachricht, sobald er genehmigt ist.' }
    } else {
      const fd = new FormData()
      for (const f of files.value) fd.append('file', f)
      if (mode === 'krankenstand') {
        fd.append('type', 'krankenstand')
        fd.append('date_from', form.value.date_from)
        fd.append('date_to', form.value.date_to || form.value.date_from)
        fd.append('note', form.value.note)
        await $fetch('/api/admin/me/absences', { method: 'POST', body: fd })
        msg.value = { ok: true, text: files.value.length ? 'Krankenstand gemeldet. Gute Besserung!' : `Krankenstand gemeldet. Gute Besserung! Bitte die Krankmeldung innerhalb von ${SICK_NOTE_REMINDER_DAYS} Tagen hochladen.` }
      } else if (abs) {
        if (form.value.date_to !== abs.date_to) fd.append('date_to', form.value.date_to)
        if (!files.value.length && form.value.date_to === abs.date_to) { err.value = 'Bitte Krankmeldung auswählen oder ein neues Enddatum angeben.'; busy.value = false; return }
        await $fetch(`/api/admin/me/absences/${abs.id}/files`, { method: 'POST', body: fd })
        msg.value = { ok: true, text: 'Gespeichert – danke!' }
      }
    }
    dlg.value = null
    await load()
    emit('changed')
  } catch (e: any) {
    err.value = e?.data?.statusMessage || 'Senden fehlgeschlagen.'
  } finally { busy.value = false }
}

async function withdraw(a: Abs) {
  if (!await ask({ title: 'Urlaubsantrag zurückziehen?', message: range(a), confirmText: 'Zurückziehen', danger: true })) return
  try {
    await $fetch(`/api/admin/me/absences/${a.id}`, { method: 'DELETE' })
    await load()
    emit('changed')
  } catch (e: any) { msg.value = { ok: false, text: e?.data?.statusMessage || 'Zurückziehen fehlgeschlagen.' } }
}

watch(() => props.highlight, async (id) => {
  if (!id) return
  await nextTick()
  document.getElementById(`my-abs-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})
</script>

<template>
  <section v-if="loaded && employee" class="mya wf-card">
    <header class="mya__head">
      <div>
        <h2>Meine Abwesenheiten</h2>
        <p v-if="employee.vacation">Noch <strong>{{ fmtNum(employee.vacation.left) }}</strong> Urlaubstage frei</p>
      </div>
      <div class="mya__btns">
        <button type="button" class="wf-btn wf-btn--primary" @click="open('urlaub')"><WfIcon name="calendar" :size="14" /> Urlaub beantragen</button>
        <button type="button" class="wf-btn" @click="open('krankenstand')"><WfIcon name="alert" :size="14" /> Krankenstand melden</button>
      </div>
    </header>
    <p v-if="msg" class="mya__msg" :class="{ 'is-error': !msg.ok }">{{ msg.text }}</p>

    <ul v-if="absences.length" class="mya__list">
      <li v-for="a in absences" :id="`my-abs-${a.id}`" :key="a.id" class="mya__row" :class="{ 'is-highlight': highlight === a.id, 'is-missing': missingNote(a) }">
        <span class="mya__type" :data-type="a.type">{{ absenceLabel(a.type) }}</span>
        <span class="mya__main">
          <strong>{{ range(a) }}</strong>
          <small>
            {{ fmtNum(a.days) }} {{ Number(a.days) === 1 ? 'Arbeitstag' : 'Arbeitstage' }}
            <template v-if="a.type === 'krankenstand'"> · {{ a.files.length ? `Krankmeldung ✓${a.files.length > 1 ? ` (${a.files.length})` : ''}` : 'Krankmeldung fehlt' }}</template>
            <template v-if="a.review_note"> · „{{ a.review_note }}“</template>
          </small>
        </span>
        <span v-if="a.type === 'urlaub'" class="wf-pill" :class="`wf-pill--${ABSENCE_STATUS[a.status]?.tone || 'gray'}`">{{ ABSENCE_STATUS[a.status]?.label || a.status }}</span>
        <span class="mya__acts">
          <button v-if="a.type === 'krankenstand'" type="button" class="wf-btn wf-btn--sm" :class="{ 'wf-btn--primary': missingNote(a) }" @click="open('nachreichen', a)">
            <WfIcon name="camera" :size="13" /> {{ missingNote(a) ? 'Krankmeldung hochladen' : 'Verlängern / Bild nachreichen' }}
          </button>
          <button v-if="a.status === 'beantragt'" type="button" class="wf-btn wf-btn--sm" @click="withdraw(a)">Zurückziehen</button>
        </span>
      </li>
    </ul>

    <!-- Dialog -->
    <div v-if="dlg" class="wf-modal-overlay" @click.self="dlg = null">
      <form class="wf-modal mya__dlg" @submit.prevent="submit">
        <header class="mya__dlghead">
          <h2>{{ dlg.mode === 'urlaub' ? 'Urlaub beantragen' : dlg.mode === 'krankenstand' ? 'Krankenstand melden' : 'Krankmeldung / Verlängerung' }}</h2>
          <button type="button" class="mya__x" aria-label="Schließen" @click="dlg = null">×</button>
        </header>
        <p v-if="dlg.mode === 'urlaub' && employee.vacation" class="mya__lead">Verfügbar: <strong>{{ fmtNum(employee.vacation.left) }} Tage</strong>. Der Chef bekommt den Antrag und genehmigt ihn – dann steht er im Kalender.</p>
        <p v-else-if="dlg.mode === 'krankenstand'" class="mya__lead">Gute Besserung! Die Krankmeldung kannst du gleich oder später hochladen – spätestens nach {{ SICK_NOTE_REMINDER_DAYS }} Tagen kommt eine Erinnerung.</p>
        <p v-else-if="dlg.abs" class="mya__lead">Krankenstand {{ range(dlg.abs) }}. Lade die Krankmeldung hoch oder verlängere das Enddatum (mit neuer Krankmeldung).</p>

        <div class="mya__fields">
          <label v-if="dlg.mode !== 'nachreichen'"><span class="wf-label">Von</span><input v-model="form.date_from" class="wf-input" type="date" required></label>
          <label><span class="wf-label">{{ dlg.mode === 'urlaub' ? 'Bis' : 'Voraussichtlich bis' }}</span><input v-model="form.date_to" class="wf-input" type="date" :min="form.date_from"></label>
          <p v-if="dlg.mode !== 'nachreichen' && days" class="mya__days">{{ days }} {{ days === 1 ? 'Arbeitstag' : 'Arbeitstage' }} (Mo–Fr)</p>
          <label v-if="dlg.mode !== 'nachreichen'" class="mya__full"><span class="wf-label">Notiz (optional)</span><input v-model="form.note" class="wf-input" maxlength="255" :placeholder="dlg.mode === 'urlaub' ? 'z. B. Sommerurlaub' : ''"></label>
          <div v-if="dlg.mode !== 'urlaub'" class="mya__full">
            <span class="wf-label">Krankmeldung (Foto oder PDF){{ dlg.mode === 'krankenstand' ? ' – optional, kann nachgereicht werden' : '' }}</span>
            <input ref="fileInput" type="file" accept="image/*,application/pdf" multiple hidden @change="pickFiles">
            <button type="button" class="mya__drop" @click="fileInput?.click()">
              <WfIcon name="camera" :size="18" />
              <span>{{ files.length ? 'Weitere Datei hinzufügen' : 'Foto machen oder Datei wählen' }}</span>
            </button>
            <ul v-if="files.length" class="mya__files">
              <li v-for="(f, i) in files" :key="i"><WfIcon name="file" :size="13" /> {{ f.name }} <button type="button" aria-label="Entfernen" @click="files.splice(i, 1)">×</button></li>
            </ul>
            <p v-if="dlg.abs?.files.length" class="mya__had">Bereits hochgeladen: {{ dlg.abs.files.length }} {{ dlg.abs.files.length === 1 ? 'Datei' : 'Dateien' }}</p>
          </div>
        </div>
        <p v-if="err" class="mya__msg is-error">{{ err }}</p>
        <footer class="mya__foot">
          <button type="button" class="wf-btn" @click="dlg = null">Abbrechen</button>
          <button type="submit" class="wf-btn wf-btn--primary" :disabled="busy">
            {{ busy ? 'Sendet …' : dlg.mode === 'urlaub' ? 'Antrag senden' : dlg.mode === 'krankenstand' ? 'Krankenstand melden' : 'Speichern' }}
          </button>
        </footer>
      </form>
    </div>
  </section>
</template>

<style scoped>
.mya { padding: 1.1em 1.3em; margin-bottom: 1.2em; }
.mya__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .8em; }
.mya__head h2 { margin: 0; font-family: var(--wf-serif); font-weight: 400; font-size: 1.2em; text-align: left; }
.mya__head p { margin: .15em 0 0; font-size: .85em; color: var(--wf-muted); }
.mya__head p strong { color: var(--wf-green); }
.mya__btns { display: flex; flex-wrap: wrap; gap: .5em; }
.mya__msg { margin: .8em 0 0; padding: .55em .8em; border-radius: 10px; background: var(--wf-green-soft); color: var(--wf-green); font-size: .85em; }
.mya__msg.is-error { background: var(--wf-red-soft); color: var(--wf-red); }
.mya__list { list-style: none; margin: .9em 0 0; padding: 0; display: grid; gap: .45em; }
.mya__row { display: flex; flex-wrap: wrap; align-items: center; gap: .6em .8em; padding: .6em .8em; border: 1px solid var(--wf-line); border-radius: 12px; background: #fff; }
.mya__row.is-missing { border-color: #e9c77f; background: #fffaf0; }
.mya__row.is-highlight { box-shadow: 0 0 0 2px var(--wf-green); }
.mya__type { font-size: .72em; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: .3em .6em; border-radius: 999px; background: var(--wf-green-soft); color: var(--wf-green); }
.mya__type[data-type="krankenstand"] { background: var(--wf-red-soft); color: var(--wf-red); }
.mya__main { flex: 1; min-width: 12em; display: grid; }
.mya__main strong { font-size: .92em; }
.mya__main small { font-size: .78em; color: var(--wf-muted); }
.mya__acts { display: flex; gap: .4em; margin-left: auto; }
.mya__dlg { max-width: 30em; width: calc(100% - 2em); }
.mya__dlghead { display: flex; align-items: center; justify-content: space-between; }
.mya__dlghead h2 { margin: 0; text-align: left; }
.mya__x { border: 0; background: none; font-size: 1.6em; line-height: 1; cursor: pointer; color: var(--wf-muted); }
.mya__lead { font-size: .86em; color: var(--wf-muted); margin: .4em 0 1em; text-align: left; }
.mya__lead strong { color: var(--wf-green); }
.mya__fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8em; }
.mya__fields label { display: block; }
.mya__full { grid-column: 1 / -1; }
.mya__days { grid-column: 1 / -1; margin: -.3em 0 0; font-size: .8em; color: var(--wf-green); text-align: left; }
.mya__drop { display: flex; align-items: center; justify-content: center; gap: .5em; width: 100%; padding: 1em; border: 1.5px dashed #d6ccb8; border-radius: 12px; background: #fdfbf7; color: var(--wf-green); font: inherit; font-size: .9em; cursor: pointer; }
.mya__drop:hover { border-color: var(--wf-green); }
.mya__files { list-style: none; margin: .5em 0 0; padding: 0; display: grid; gap: .3em; font-size: .82em; }
.mya__files li { display: flex; align-items: center; gap: .4em; }
.mya__files button { margin-left: auto; border: 0; background: none; cursor: pointer; color: var(--wf-muted); font-size: 1.2em; }
.mya__had { margin: .4em 0 0; font-size: .78em; color: var(--wf-muted); text-align: left; }
.mya__foot { display: flex; justify-content: flex-end; gap: .5em; margin-top: 1.2em; }
@media (max-width: 560px) {
  .mya__fields { grid-template-columns: 1fr; }
  .mya__btns, .mya__btns .wf-btn { width: 100%; }
  .mya__btns .wf-btn { justify-content: center; }
}
</style>
