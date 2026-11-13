<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'To-Do - WOHNFEE Dashboard', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

// To-Do-Liste: Admin legt Aufgaben an (für eine Person oder alle), das Team meldet mit Text „erledigt“,
// der Admin prüft → „Passt“ (entfernt, Melder bekommt ein Danke) oder Feedback (wieder offen).
// API: /api/admin/tasks (server/utils/tasks.ts)
interface TaskEvent { id: number; user_name: string | null; kind: string; text: string | null; created_at: string }
interface Task {
  id: number; title: string; description: string | null; due_date: string | null; priority: string
  assigned_to: number | null; assigned_name: string | null; status: 'offen' | 'gemeldet'
  created_name: string | null; reported_name: string | null; reported_at: string | null; events: TaskEvent[]
}

const { user } = useAdminAuth()
const isAdmin = computed(() => user.value?.role === 'superadmin')
const ask = useConfirm()
const route = useRoute()

const tasks = ref<Task[]>([])
const team = ref<Array<{ id: number; name: string; role: string }>>([])
const loading = ref(true)
const error = ref('')
const today = ref(localToday())
const personFilter = ref<number | 'alle'>('alle')

async function load() {
  error.value = ''
  try {
    const res = await $fetch<{ tasks: Task[]; team: any[] }>('/api/admin/tasks')
    tasks.value = res.tasks
    team.value = res.team
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Aufgaben konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}
function changed() {
  window.dispatchEvent(new Event('wf:tasks-changed'))
  return load()
}

const filtered = computed(() => personFilter.value === 'alle'
  ? tasks.value
  : tasks.value.filter(t => t.assigned_to === personFilter.value || t.assigned_to === null))
const toReview = computed(() => filtered.value.filter(t => t.status === 'gemeldet'))
const open = computed(() => filtered.value.filter(t => t.status === 'offen'))
const overdueCount = computed(() => open.value.filter(t => t.due_date && t.due_date < today.value).length)

// ---------- Anzeige-Helfer ----------
function addDays(d: string, n: number) {
  const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10)
}
function dayDiff(a: string, b: string) {
  return Math.round((new Date(a + 'T12:00:00Z').getTime() - new Date(b + 'T12:00:00Z').getTime()) / 86400000)
}
function dueInfo(t: Task): { text: string; tone: string } | null {
  if (!t.due_date) return null
  const d = t.due_date.slice(0, 10)
  const diff = dayDiff(d, today.value)
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(d + 'T12:00:00Z').getUTCDay()]
  const short = `${wd} ${d.slice(8, 10)}.${d.slice(5, 7)}.`
  if (t.status === 'gemeldet') return { text: `bis ${short}`, tone: 'is-muted' }
  if (diff < 0) return { text: `überfällig seit ${-diff} ${diff === -1 ? 'Tag' : 'Tagen'}`, tone: 'is-late' }
  if (diff === 0) return { text: 'heute fällig', tone: 'is-soon' }
  if (diff === 1) return { text: 'bis morgen', tone: 'is-soon' }
  return { text: `bis ${short}`, tone: diff <= 3 ? 'is-soon' : '' }
}
function fmtDateTime(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }) + ', ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
}
const KIND: Record<string, string> = { erstellt: 'angelegt', gemeldet: 'erledigt gemeldet', feedback: 'Feedback', geaendert: 'geändert' }
const lastOf = (t: Task, kind: string) => [...t.events].reverse().find(e => e.kind === kind) || null
// Feedback ist „aktuell“, wenn danach noch nicht wieder gemeldet wurde
function openFeedback(t: Task) {
  const fb = lastOf(t, 'feedback'); if (!fb || t.status !== 'offen') return null
  const rep = lastOf(t, 'gemeldet')
  return !rep || rep.id < fb.id ? fb : null
}
const forWhom = (t: Task) => t.assigned_name || 'Alle'

const expanded = ref<Set<number>>(new Set())
function toggleHistory(id: number) {
  const s = new Set(expanded.value); s.has(id) ? s.delete(id) : s.add(id); expanded.value = s
}

// ---------- Anlegen / Bearbeiten (Admin) ----------
const formOpen = ref(false)
const editing = ref<Task | null>(null)
const form = reactive({ title: '', description: '', due_date: '', priority: 'normal', assigned_to: '' as number | '' })
const saving = ref(false)
const formError = ref('')
function openNew() {
  editing.value = null
  Object.assign(form, { title: '', description: '', due_date: addDays(today.value, 7), priority: 'normal', assigned_to: '' })
  formError.value = ''; formOpen.value = true; focusEl(titleInput)
}
function openEdit(t: Task) {
  editing.value = t
  Object.assign(form, { title: t.title, description: t.description || '', due_date: t.due_date?.slice(0, 10) || '', priority: t.priority, assigned_to: t.assigned_to ?? '' })
  formError.value = ''; formOpen.value = true
}
const QUICK_DUE = [
  { label: 'Heute', days: 0 }, { label: 'Morgen', days: 1 }, { label: 'In 3 Tagen', days: 3 }, { label: 'In 1 Woche', days: 7 }
]
async function saveTask() {
  formError.value = ''
  if (!form.title.trim()) { formError.value = 'Bitte einen Titel eingeben.'; return }
  saving.value = true
  try {
    const body = { ...form, assigned_to: form.assigned_to || null }
    if (editing.value) await $fetch(`/api/admin/tasks/${editing.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/admin/tasks', { method: 'POST', body })
    formOpen.value = false
    await changed()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}
async function removeTask(t: Task) {
  if (!await ask({ title: 'Aufgabe löschen?', message: `„${t.title}“ wird ohne Rückmeldung entfernt.`, confirmText: 'Löschen', danger: true })) return
  try { await $fetch(`/api/admin/tasks/${t.id}`, { method: 'DELETE' }); await changed() } catch (e: any) { error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.' }
}
async function approve(t: Task) {
  if (!await ask({
    title: 'Passt so?',
    message: `„${t.title}“ wird abgehakt und aus der Liste entfernt.`,
    points: t.reported_name ? [`${t.reported_name} bekommt ein kurzes „Passt – danke!“.`] : undefined,
    confirmText: 'Passt – abhaken', icon: 'check'
  })) return
  try { await $fetch(`/api/admin/tasks/${t.id}?approved=1`, { method: 'DELETE' }); await changed() } catch (e: any) { error.value = e?.data?.statusMessage || 'Abhaken fehlgeschlagen.' }
}

// ---------- Rückmelden (Team) / Feedback (Admin) ----------
const textOpen = ref<{ mode: 'report' | 'feedback'; task: Task } | null>(null)
const text = ref('')
const newDue = ref('')
const textBusy = ref(false)
const textError = ref('')
// Dialog-Felder per v-if: autofocus greift nicht, daher selbst fokussieren
const textArea = ref<HTMLTextAreaElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const focusEl = (el: Ref<HTMLElement | null>) => nextTick(() => el.value?.focus())
function openReport(t: Task) { textOpen.value = { mode: 'report', task: t }; text.value = ''; textError.value = ''; focusEl(textArea) }
function openFeedbackDialog(t: Task) { textOpen.value = { mode: 'feedback', task: t }; text.value = ''; newDue.value = ''; textError.value = ''; focusEl(textArea) }
async function sendText() {
  if (!textOpen.value) return
  textError.value = ''
  if (text.value.trim().length < 3) {
    textError.value = textOpen.value.mode === 'report' ? 'Bitte kurz beschreiben, was erledigt wurde.' : 'Bitte kurz schreiben, was noch fehlt.'
    return
  }
  textBusy.value = true
  try {
    const { mode, task } = textOpen.value
    await $fetch(`/api/admin/tasks/${task.id}/${mode}`, { method: 'POST', body: { text: text.value, due_date: newDue.value || undefined } })
    textOpen.value = null
    await changed()
  } catch (e: any) {
    textError.value = e?.data?.statusMessage || 'Senden fehlgeschlagen.'
  } finally {
    textBusy.value = false
  }
}

// ?task=ID (Link aus Benachrichtigung) → Aufgabe hervorheben
const highlight = ref<number | null>(null)
async function focusFromQuery() {
  const id = Number(route.query.task)
  if (!id) return
  highlight.value = id
  await nextTick()
  document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { if (highlight.value === id) highlight.value = null }, 4000)
}
watch(() => route.query.task, focusFromQuery)

onMounted(async () => {
  await load()
  focusFromQuery()
})
</script>

<template>
  <div class="todo">
    <section class="todo__head wf-card">
      <div>
        <p class="wf-eyebrow">Planung</p>
        <h1 class="wf-title">To-Do</h1>
        <p class="wf-subtitle">
          {{ isAdmin
            ? 'Aufgaben fürs Team anlegen. Erledigte Punkte kommen mit kurzer Rückmeldung zurück – du prüfst und hakst ab oder gibst Feedback.'
            : 'Deine Aufgaben. Wenn etwas erledigt ist: abhaken und kurz schreiben, was gemacht wurde.' }}
        </p>
      </div>
      <div class="todo__headside">
        <div class="todo__nums">
          <span><strong>{{ open.length }}</strong> offen</span>
          <span v-if="overdueCount" class="is-late"><strong>{{ overdueCount }}</strong> überfällig</span>
          <span v-if="toReview.length" class="is-review"><strong>{{ toReview.length }}</strong> {{ isAdmin ? 'zu prüfen' : 'gemeldet' }}</span>
        </div>
        <button v-if="isAdmin" class="wf-btn wf-btn--primary" @click="openNew"><WfIcon name="plus" :size="15" /> Neue Aufgabe</button>
      </div>
    </section>

    <div v-if="isAdmin && team.length > 1" class="todo__filter">
      <button class="todo__chip" :class="{ 'is-on': personFilter === 'alle' }" @click="personFilter = 'alle'">Ganzes Team</button>
      <button v-for="m in team.filter(m => m.role !== 'superadmin')" :key="m.id" class="todo__chip" :class="{ 'is-on': personFilter === m.id }" @click="personFilter = m.id">{{ m.name }}</button>
    </div>

    <p v-if="error" class="todo__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="todo__muted">Aufgaben werden geladen …</p>

    <template v-else>
      <!-- Zu prüfen (Admin) bzw. gemeldet (Team) -->
      <section v-if="toReview.length" class="todo__sec">
        <h2 class="todo__h2">
          <WfIcon :name="isAdmin ? 'bell' : 'clock'" :size="16" />
          {{ isAdmin ? 'Erledigt gemeldet – bitte prüfen' : 'Gemeldet – wartet auf Prüfung' }}
        </h2>
        <article v-for="t in toReview" :id="`task-${t.id}`" :key="t.id" class="todo__card is-review" :class="{ 'is-hl': highlight === t.id }">
          <span class="todo__tick is-done" aria-hidden="true"><WfIcon name="check" :size="15" /></span>
          <div class="todo__body">
            <div class="todo__titlerow">
              <h3 class="todo__title">{{ t.title }}</h3>
              <span v-if="t.priority === 'hoch'" class="todo__prio">Wichtig</span>
            </div>
            <div class="todo__meta">
              <span><WfIcon name="users" :size="12" /> {{ forWhom(t) }}</span>
              <span v-if="dueInfo(t)" class="todo__due" :class="dueInfo(t)!.tone">{{ dueInfo(t)!.text }}</span>
            </div>
            <blockquote v-if="lastOf(t, 'gemeldet')" class="todo__report">
              <span class="todo__quotehead"><strong>{{ lastOf(t, 'gemeldet')!.user_name }}</strong> · {{ fmtDateTime(lastOf(t, 'gemeldet')!.created_at) }}</span>
              {{ lastOf(t, 'gemeldet')!.text }}
            </blockquote>
            <div v-if="isAdmin" class="todo__actions">
              <button class="wf-btn wf-btn--sm wf-btn--primary" @click="approve(t)"><WfIcon name="check" :size="13" /> Passt – abhaken</button>
              <button class="wf-btn wf-btn--sm" @click="openFeedbackDialog(t)"><WfIcon name="edit" :size="13" /> Feedback: noch offen</button>
              <button class="todo__link" @click="toggleHistory(t.id)">{{ expanded.has(t.id) ? 'Verlauf ausblenden' : 'Verlauf' }}</button>
            </div>
            <button v-else class="todo__link" @click="toggleHistory(t.id)">{{ expanded.has(t.id) ? 'Verlauf ausblenden' : 'Verlauf' }}</button>
            <ol v-if="expanded.has(t.id)" class="todo__history">
              <li v-for="e in t.events" :key="e.id" :data-kind="e.kind">
                <span><strong>{{ e.user_name }}</strong> {{ KIND[e.kind] || e.kind }} · {{ fmtDateTime(e.created_at) }}</span>
                <p v-if="e.text">{{ e.text }}</p>
              </li>
            </ol>
          </div>
        </article>
      </section>

      <!-- Offen -->
      <section class="todo__sec">
        <h2 v-if="toReview.length" class="todo__h2"><WfIcon name="list" :size="16" /> Offen</h2>
        <article v-for="t in open" :id="`task-${t.id}`" :key="t.id" class="todo__card"
                 :class="{ 'is-late': dueInfo(t)?.tone === 'is-late', 'is-hl': highlight === t.id, 'is-fb': openFeedback(t) }">
          <button v-if="!isAdmin" class="todo__tick" type="button" :title="'Als erledigt melden'" :aria-label="`${t.title} als erledigt melden`" @click="openReport(t)">
            <WfIcon name="check" :size="15" />
          </button>
          <span v-else class="todo__tick is-static" aria-hidden="true" />
          <div class="todo__body">
            <div class="todo__titlerow">
              <h3 class="todo__title">{{ t.title }}</h3>
              <span v-if="t.priority === 'hoch'" class="todo__prio">Wichtig</span>
              <span v-if="openFeedback(t)" class="todo__fbtag">Nachbessern</span>
            </div>
            <div class="todo__meta">
              <span><WfIcon name="users" :size="12" /> {{ forWhom(t) }}</span>
              <span v-if="dueInfo(t)" class="todo__due" :class="dueInfo(t)!.tone"><WfIcon name="clock" :size="12" /> {{ dueInfo(t)!.text }}</span>
              <span v-if="t.created_name" class="todo__by">von {{ t.created_name }}</span>
            </div>
            <p v-if="t.description" class="todo__desc">{{ t.description }}</p>
            <blockquote v-if="openFeedback(t)" class="todo__feedback">
              <span class="todo__quotehead"><strong>Feedback von {{ openFeedback(t)!.user_name }}</strong> · {{ fmtDateTime(openFeedback(t)!.created_at) }}</span>
              {{ openFeedback(t)!.text }}
            </blockquote>
            <div class="todo__actions">
              <button v-if="!isAdmin" class="wf-btn wf-btn--sm wf-btn--primary" @click="openReport(t)"><WfIcon name="check" :size="13" /> Erledigt melden</button>
              <template v-if="isAdmin">
                <button class="wf-btn wf-btn--sm" @click="openEdit(t)"><WfIcon name="edit" :size="13" /> Bearbeiten</button>
                <button class="wf-btn wf-btn--sm wf-btn--danger" @click="removeTask(t)"><WfIcon name="trash" :size="13" /></button>
              </template>
              <button v-if="t.events.length > 1" class="todo__link" @click="toggleHistory(t.id)">{{ expanded.has(t.id) ? 'Verlauf ausblenden' : 'Verlauf' }}</button>
            </div>
            <ol v-if="expanded.has(t.id)" class="todo__history">
              <li v-for="e in t.events" :key="e.id" :data-kind="e.kind">
                <span><strong>{{ e.user_name }}</strong> {{ KIND[e.kind] || e.kind }} · {{ fmtDateTime(e.created_at) }}</span>
                <p v-if="e.text">{{ e.text }}</p>
              </li>
            </ol>
          </div>
        </article>

        <div v-if="!open.length" class="todo__empty wf-card">
          <span class="todo__emptyicon"><WfIcon name="check" :size="22" /></span>
          <strong>{{ isAdmin ? 'Keine offenen Aufgaben' : 'Alles erledigt' }}</strong>
          <span>{{ isAdmin ? 'Neue Aufgaben fürs Team legst du oben rechts an.' : 'Neue Aufgaben erscheinen hier – du bekommst eine Benachrichtigung.' }}</span>
        </div>
      </section>
    </template>

    <!-- Aufgabe anlegen / bearbeiten -->
    <div v-if="formOpen" class="wf-modal-overlay" @click.self="formOpen = false">
      <form class="wf-modal todo__modal" @submit.prevent="saveTask">
        <h2 class="todo__mh">{{ editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}</h2>
        <label class="todo__f"><span class="wf-label">Was ist zu tun? *</span>
          <input ref="titleInput" v-model="form.title" class="wf-input" maxlength="190" placeholder="z. B. Lager Eibesbrunn aufräumen">
        </label>
        <label class="todo__f"><span class="wf-label">Infos</span>
          <textarea v-model="form.description" class="wf-input" rows="4" placeholder="Details, Adresse, Ansprechpartner, worauf zu achten ist …" />
        </label>
        <div class="todo__frow">
          <label class="todo__f"><span class="wf-label">Erledigt bis</span>
            <input v-model="form.due_date" class="wf-input" type="date">
          </label>
          <label class="todo__f"><span class="wf-label">Für</span>
            <select v-model="form.assigned_to" class="wf-input">
              <option value="">Ganzes Team</option>
              <option v-for="m in team.filter(m => m.role !== 'superadmin')" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
        </div>
        <div class="todo__quick">
          <button v-for="q in QUICK_DUE" :key="q.days" type="button" class="todo__chip todo__chip--sm" :class="{ 'is-on': form.due_date === addDays(today, q.days) }" @click="form.due_date = addDays(today, q.days)">{{ q.label }}</button>
          <button type="button" class="todo__chip todo__chip--sm" :class="{ 'is-on': !form.due_date }" @click="form.due_date = ''">Ohne Termin</button>
        </div>
        <label class="todo__check">
          <input v-model="form.priority" type="checkbox" true-value="hoch" false-value="normal"> Wichtig markieren
        </label>
        <p class="todo__hint"><WfIcon name="bell" :size="13" /> {{ form.assigned_to ? 'Die Person' : 'Alle im Team' }} bekommt eine Benachrichtigung{{ editing ? ' (nur bei neuer Zuständigkeit)' : '' }}.</p>
        <p v-if="formError" class="todo__error" role="alert">{{ formError }}</p>
        <div class="todo__mfoot">
          <button type="button" class="wf-btn" @click="formOpen = false">Abbrechen</button>
          <button type="submit" class="wf-btn wf-btn--primary" :disabled="saving">{{ saving ? 'Speichere …' : editing ? 'Speichern' : 'Aufgabe anlegen' }}</button>
        </div>
      </form>
    </div>

    <!-- Erledigt melden / Feedback -->
    <div v-if="textOpen" class="wf-modal-overlay" @click.self="textOpen = null">
      <form class="wf-modal todo__modal todo__modal--sm" @submit.prevent="sendText">
        <span class="todo__micon" :class="{ 'is-fb': textOpen.mode === 'feedback' }"><WfIcon :name="textOpen.mode === 'report' ? 'check' : 'edit'" :size="20" /></span>
        <h2 class="todo__mh">{{ textOpen.mode === 'report' ? 'Als erledigt melden' : 'Was fehlt noch?' }}</h2>
        <p class="todo__msub">„{{ textOpen.task.title }}“</p>
        <blockquote v-if="textOpen.mode === 'feedback' && lastOf(textOpen.task, 'gemeldet')" class="todo__report todo__report--sm">
          <span class="todo__quotehead"><strong>{{ lastOf(textOpen.task, 'gemeldet')!.user_name }}</strong> schrieb:</span>
          {{ lastOf(textOpen.task, 'gemeldet')!.text }}
        </blockquote>
        <label class="todo__f"><span class="wf-label">{{ textOpen.mode === 'report' ? 'Was wurde gemacht? *' : 'Feedback *' }}</span>
          <textarea ref="textArea" v-model="text" class="wf-input" rows="4"
                    :placeholder="textOpen.mode === 'report' ? 'z. B. Alles erledigt, Schlüssel liegt im Büro. Fotos im Projekt.' : 'z. B. Bitte noch die Kartons im hinteren Regal beschriften.'" />
        </label>
        <label v-if="textOpen.mode === 'feedback'" class="todo__f"><span class="wf-label">Neues Datum (optional)</span>
          <input v-model="newDue" class="wf-input" type="date">
        </label>
        <p class="todo__hint"><WfIcon name="bell" :size="13" /> {{ textOpen.mode === 'report' ? 'Der Admin wird benachrichtigt und prüft.' : 'Die Aufgabe ist danach wieder offen, die Person wird benachrichtigt.' }}</p>
        <p v-if="textError" class="todo__error" role="alert">{{ textError }}</p>
        <div class="todo__mfoot">
          <button type="button" class="wf-btn" @click="textOpen = null">Abbrechen</button>
          <button type="submit" class="wf-btn wf-btn--primary" :disabled="textBusy">
            {{ textBusy ? 'Sende …' : textOpen.mode === 'report' ? 'Erledigt melden' : 'Feedback senden' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.todo__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.5em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1.1em; }
.todo__head > div:first-child { flex: 1 1 26em; min-width: 0; }
.todo__head .wf-title { text-align: left; margin: 0 0 .25em; }
.todo__headside { display: flex; flex-direction: column; align-items: flex-end; gap: .8em; }
.todo__nums { display: flex; gap: 1em; font-size: .85em; color: var(--wf-muted); flex-wrap: wrap; justify-content: flex-end; }
.todo__nums strong { font-family: var(--wf-serif); font-weight: 400; font-size: 1.5em; color: var(--wf-green); margin-right: .15em; }
.todo__nums .is-late strong { color: var(--wf-red); }
.todo__nums .is-review strong { color: var(--wf-amber); }

.todo__filter { display: flex; gap: .4em; flex-wrap: wrap; margin-bottom: 1.1em; }
.todo__chip {
  display: inline-flex; align-items: center; height: 36px; padding: 0 1em; border: 1px solid var(--wf-line); background: var(--wf-card);
  border-radius: 999px; font: inherit; font-size: .86em; color: var(--wf-ink); cursor: pointer; transition: border-color .15s, background .15s, color .15s;
}
.todo__chip:hover { border-color: var(--wf-green); }
.todo__chip.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.todo__chip--sm { height: 30px; padding: 0 .8em; font-size: .8em; }

.todo__sec { display: grid; gap: .7em; margin-bottom: 1.6em; }
.todo__h2 { display: flex; align-items: center; gap: .5em; font-family: var(--wf-serif); font-weight: 400; font-size: 1.15em; margin: 0 0 .1em; text-align: left; color: var(--wf-ink); }

.todo__card {
  display: flex; gap: 1em; align-items: flex-start; padding: 1.1em 1.3em; background: var(--wf-card);
  border: 1px solid rgba(74, 62, 40, .05); border-left: 4px solid transparent; border-radius: 16px; box-shadow: var(--wf-shadow);
  transition: box-shadow .2s, border-color .2s;
}
.todo__card.is-late { border-left-color: var(--wf-red); }
.todo__card.is-fb { border-left-color: var(--wf-amber); }
.todo__card.is-review { border-left-color: var(--wf-amber); background: #fffdf8; }
.todo__card.is-hl { box-shadow: 0 0 0 3px rgba(47, 93, 64, .3), var(--wf-shadow); }

.todo__tick {
  flex: 0 0 30px; width: 30px; height: 30px; margin-top: .05em; border-radius: 50%; border: 2px solid #cfc6b4; background: #fff;
  display: grid; place-items: center; color: transparent; cursor: pointer; transition: border-color .15s, color .15s, background .15s;
}
button.todo__tick:hover { border-color: var(--wf-green); color: var(--wf-green); background: var(--wf-green-soft); }
.todo__tick.is-static { cursor: default; }
.todo__tick.is-done { border-color: var(--wf-amber); background: var(--wf-amber-soft); color: var(--wf-amber); cursor: default; }

.todo__body { flex: 1; min-width: 0; display: grid; gap: .45em; }
.todo__titlerow { display: flex; align-items: center; gap: .6em; flex-wrap: wrap; }
.todo__title { margin: 0; font-size: 1.02em; font-weight: 600; line-height: 1.35; text-align: left; font-family: inherit; }
.todo__prio, .todo__fbtag { font-size: .7em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .2em .6em; border-radius: 999px; }
.todo__prio { background: var(--wf-red-soft); color: var(--wf-red); }
.todo__fbtag { background: var(--wf-amber-soft); color: var(--wf-amber); }
.todo__meta { display: flex; gap: .9em; flex-wrap: wrap; font-size: .82em; color: var(--wf-muted); }
.todo__meta > span { display: inline-flex; align-items: center; gap: .35em; }
.todo__due.is-late { color: var(--wf-red); font-weight: 600; }
.todo__due.is-soon { color: var(--wf-amber); font-weight: 600; }
.todo__desc { margin: .1em 0 0; font-size: .9em; line-height: 1.55; white-space: pre-line; color: #4a463d; }

.todo__report, .todo__feedback {
  text-align: left; font-style: normal; font-family: inherit; color: var(--wf-ink); quotes: none; width: auto; max-width: none;
  margin: .2em 0 0; padding: .7em .9em; border-radius: 12px; font-size: .9em; line-height: 1.5; white-space: pre-line;
  background: var(--wf-green-soft); border: 1px solid rgba(47, 93, 64, .12);
}
.todo__feedback { background: var(--wf-amber-soft); border-color: rgba(146, 97, 14, .15); }
.todo__report::before, .todo__report::after, .todo__feedback::before, .todo__feedback::after { content: none; }
.todo__quotehead { display: block; font-size: .8em; color: var(--wf-muted); margin-bottom: .2em; }
.todo__report--sm { margin: 0 0 1em; }

.todo__actions { display: flex; gap: .4em; flex-wrap: wrap; align-items: center; margin-top: .3em; }
.todo__link { background: none; border: 0; padding: .3em .2em; font: inherit; font-size: .8em; color: var(--wf-muted); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; justify-self: start; }
.todo__link:hover { color: var(--wf-green); }
.todo__history { list-style: none; margin: .3em 0 0; padding: 0 0 0 1em; border-left: 2px solid var(--wf-line); display: grid; gap: .5em; font-size: .82em; }
.todo__history span { color: var(--wf-muted); }
.todo__history p { margin: .15em 0 0; white-space: pre-line; }
.todo__history li[data-kind="feedback"] strong { color: var(--wf-amber); }
.todo__history li[data-kind="gemeldet"] strong { color: var(--wf-green); }

.todo__empty { display: flex; flex-direction: column; align-items: center; gap: .35em; padding: 2.2em 1em; text-align: center; color: var(--wf-muted); font-size: .9em; }
.todo__empty strong { color: var(--wf-ink); font-family: var(--wf-serif); font-weight: 400; font-size: 1.2em; }
.todo__emptyicon { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--wf-green-soft); color: var(--wf-green); margin-bottom: .3em; }

.todo__error { color: var(--wf-red); font-size: .88em; }
.todo__muted { color: var(--wf-muted); }

/* Dialoge */
.todo__modal { max-width: 34em; display: grid; gap: .9em; }
.todo__modal--sm { max-width: 30em; }
.todo__mh { margin: 0; font-size: 1.4em; text-align: left; }
.todo__msub { margin: -.5em 0 0; color: var(--wf-muted); font-size: .9em; }
.todo__micon { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--wf-green-soft); color: var(--wf-green); }
.todo__micon.is-fb { background: var(--wf-amber-soft); color: var(--wf-amber); }
.todo__f { display: block; min-width: 0; }
.todo__frow { display: grid; grid-template-columns: 1fr 1fr; gap: .9em; }
.todo__quick { display: flex; gap: .35em; flex-wrap: wrap; margin-top: -.4em; }
.todo__check { display: inline-flex; align-items: center; gap: .5em; font-size: .9em; cursor: pointer; }
.todo__check input { accent-color: var(--wf-red); width: 16px; height: 16px; }
.todo__hint { display: flex; align-items: center; gap: .4em; margin: 0; font-size: .8em; color: var(--wf-muted); }
.todo__mfoot { display: flex; justify-content: flex-end; gap: .5em; margin-top: .3em; }

@media (max-width: 640px) {
  .todo__head { padding: 1.3em 1.2em; }
  .todo__headside { align-items: stretch; width: 100%; }
  .todo__nums { justify-content: flex-start; }
  .todo__card { padding: 1em; gap: .8em; }
  .todo__frow { grid-template-columns: 1fr; }
}
</style>
