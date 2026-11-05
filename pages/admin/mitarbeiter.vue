<script setup lang="ts">
import { ROLES, roleLabel, type Role } from '~~/shared/permissions'
import {
  EMPLOYMENT_TYPES, SALARY_TYPES, DOC_CATEGORIES, ABSENCE_TYPES,
  employmentLabel, docCategoryLabel, absenceLabel, workdaysBetween, isFormer, initials, vacationAccount, ABSENCE_STATUS
} from '~~/shared/employees'
definePageMeta({ layout: 'admin' })

useHead({
  title: 'Mitarbeiter - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

// Mitarbeiter: alle Daten zur Person (Tabelle employees). Der Dashboard-Zugang (admin_users)
// ist nur ein Reiter davon. Nur für Admins (Bereich „users“).
const { user } = useAdminAuth()
const list = ref<any[] | null>(null)
const today = ref(localToday())
const error = ref('')
const filter = ref<'aktiv' | 'ehemalige' | 'alle'>('aktiv')
const search = ref('')

async function load() {
  error.value = ''
  try {
    const res = await $fetch<{ today: string; employees: any[] }>('/api/admin/employees')
    list.value = res.employees
    today.value = res.today
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Mitarbeiter konnten nicht geladen werden'
    list.value = []
  }
}

const fullName = (e: any) => [e?.title, e?.first_name, e?.last_name].filter(Boolean).join(' ') || '—'
const photoOf = (e: any) => e?.photo_path || e?.avatar_path || ''
const former = (e: any) => isFormer(e?.exit_date, today.value)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (list.value || []).filter((e) => {
    if (filter.value === 'aktiv' && former(e)) return false
    if (filter.value === 'ehemalige' && !former(e)) return false
    if (!q) return true
    return [fullName(e), e.position, e.email, e.phone, employmentLabel(e.employment_type)]
      .filter(Boolean).join(' ').toLowerCase().includes(q)
  })
})
const counts = computed(() => {
  const all = list.value || []
  return { aktiv: all.filter(e => !former(e)).length, ehemalige: all.filter(e => former(e)).length, alle: all.length }
})

function addDays(d: string, n: number) {
  const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10)
}
const absentToday = computed(() => (list.value || []).filter(e => e.absent_today && !former(e)))
// Fristen in den nächsten 30 Tagen: Probezeit-Ende, ablaufende Dokumente, Austritt
const deadlines = computed(() => {
  const until = addDays(today.value, 30)
  const out: Array<{ id: number; name: string; text: string; date: string }> = []
  for (const e of list.value || []) {
    if (former(e)) continue
    const n = fullName(e)
    if (e.probation_until && e.probation_until >= today.value && e.probation_until <= until) out.push({ id: e.id, name: n, text: 'Probezeit endet', date: e.probation_until })
    if (e.next_doc_expiry && e.next_doc_expiry <= until) out.push({ id: e.id, name: n, text: 'Dokument läuft ab', date: e.next_doc_expiry })
    if (e.exit_date && e.exit_date >= today.value && e.exit_date <= until) out.push({ id: e.id, name: n, text: 'Austritt', date: e.exit_date })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
})

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  return y && m && day ? `${day}.${m}.${y}` : '—'
}
const fmtEuro = (n: any) => n == null || n === '' ? '—' : Number(n).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const fmtNum = (n: any) => Number(n || 0).toLocaleString('de-AT', { maximumFractionDigits: 1 })
const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toLocaleString('de-AT', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
function tenure(from: string | null, to?: string | null) {
  if (!from) return ''
  const a = new Date(from + 'T12:00:00Z'); const b = new Date((to && to < today.value ? to : today.value) + 'T12:00:00Z')
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()
  if (b.getUTCDate() < a.getUTCDate()) months--
  if (months < 1) return 'neu im Team'
  const y = Math.floor(months / 12); const m = months % 12
  return [y ? `${y} J.` : '', m ? `${m} Mon.` : ''].filter(Boolean).join(' ')
}
function age(birth: string | null) {
  if (!birth) return ''
  const [y, m, d] = birth.split('-').map(Number); const [ty, tm, td] = today.value.split('-').map(Number)
  return String(ty - y - (tm < m || (tm === m && td < d) ? 1 : 0))
}
const userStatusLabel = (s: string) => s === 'active' ? 'Aktiv' : s === 'pending' ? 'Eingeladen' : 'Gesperrt'
const accessPill = (e: any) => !e.user_id ? 'wf-pill--gray' : e.user_status === 'active' ? '' : e.user_status === 'pending' ? 'wf-pill--amber' : 'wf-pill--red'
const accessText = (e: any) => !e.user_id ? 'Kein Zugang' : e.user_status === 'active' ? roleLabel(e.role) : `${roleLabel(e.role)} · ${userStatusLabel(e.user_status)}`

// ---------- Dialog ----------
type Tab = 'person' | 'anstellung' | 'lohn' | 'dokumente' | 'abwesenheit' | 'zugang'
const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'person', label: 'Person', icon: 'users' },
  { key: 'anstellung', label: 'Anstellung', icon: 'folder' },
  { key: 'lohn', label: 'Lohn & Bank', icon: 'euro' },
  { key: 'dokumente', label: 'Dokumente', icon: 'file' },
  { key: 'abwesenheit', label: 'Urlaub & Abwesenheit', icon: 'calendar' },
  { key: 'zugang', label: 'Dashboard-Zugang', icon: 'key' }
]
const FORM_TABS: Tab[] = ['person', 'anstellung', 'lohn']

const open = ref(false)
const ask = useConfirm()
const tab = ref<Tab>('person')
const detail = ref<{ employee: any; documents: any[]; absences: any[]; user: any } | null>(null)
const emptyForm = () => ({
  title: '', first_name: '', last_name: '', position: '', email: '', private_email: '', phone: '',
  street: '', zip: '', city: '', birth_date: '', nationality: '', svnr: '',
  employment_type: '', entry_date: '', exit_date: '', probation_until: '', weekly_hours: '', work_days: '',
  salary_type: 'monat', salary: '', collective_agreement: '', vacation_days: '25', vacation_opening_year: '', vacation_opening_days: '',
  iban: '', bic: '', account_holder: '',
  emergency_name: '', emergency_relation: '', emergency_phone: '',
  driving_license: '', clothing_size: '', equipment: '', notes: ''
})
const form = ref<Record<string, any>>(emptyForm())
const saving = ref(false)
const saveError = ref('')
const msg = ref<{ ok: boolean; text: string } | null>(null)
const isNew = computed(() => !detail.value)
const emp = computed(() => detail.value?.employee || null)
const isSelf = computed(() => !!detail.value?.user && detail.value.user.id === user.value?.id)

function fillForm(e: any) {
  const f: Record<string, any> = emptyForm()
  for (const k of Object.keys(f)) f[k] = e?.[k] == null ? '' : String(e[k]).slice(0, k.endsWith('_date') || k === 'probation_until' ? 10 : undefined)
  if (!f.salary_type) f.salary_type = 'monat'
  form.value = f
}
function applyDetail(d: any) {
  detail.value = d
  fillForm(d.employee)
}

async function openEmployee(id: number, startTab: Tab = 'person') {
  saveError.value = ''; msg.value = null; tab.value = startTab
  try {
    applyDetail(await $fetch(`/api/admin/employees/${id}`))
    inviteEmail.value = detail.value?.employee.email || ''
    open.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Mitarbeiter konnte nicht geladen werden'
  }
}
function openNew() {
  detail.value = null; form.value = emptyForm(); saveError.value = ''; msg.value = null; tab.value = 'person'; open.value = true
}
function close() {
  open.value = false; docPreview.value = null
}

async function save() {
  saveError.value = ''; msg.value = null
  saving.value = true
  try {
    const d = isNew.value
      ? await $fetch('/api/admin/employees', { method: 'POST', body: form.value })
      : await $fetch(`/api/admin/employees/${emp.value.id}`, { method: 'PUT', body: form.value })
    const wasNew = isNew.value
    applyDetail(d)
    inviteEmail.value = inviteEmail.value || detail.value?.employee.email || ''
    msg.value = { ok: true, text: wasNew ? 'Mitarbeiter angelegt – jetzt können Dokumente, Urlaub und Zugang ergänzt werden.' : 'Gespeichert.' }
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
  }
}

async function removeEmployee() {
  if (!emp.value) return
  if (detail.value?.user) { saveError.value = 'Bitte zuerst im Reiter „Dashboard-Zugang“ den Zugang entfernen.'; return }
  if (!await ask({ title: 'Mitarbeiter löschen?', message: `${fullName(emp.value)} wird mit allen Dokumenten und Abwesenheiten endgültig gelöscht.`, points: ['Tipp: Für ehemalige Mitarbeiter reicht ein Austrittsdatum – dann bleibt alles erhalten.'], confirmText: 'Endgültig löschen', danger: true })) return
  try {
    await $fetch(`/api/admin/employees/${emp.value.id}`, { method: 'DELETE' })
    close(); await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen'
  }
}

// ---------- Foto ----------
const photoInput = ref<HTMLInputElement | null>(null)
const photoBusy = ref(false)
async function uploadPhoto(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file || !emp.value) return
  photoBusy.value = true; saveError.value = ''
  try {
    const fd = new FormData(); fd.append('file', file)
    const res = await $fetch<{ photoPath: string }>(`/api/admin/employees/${emp.value.id}/photo`, { method: 'POST', body: fd })
    detail.value!.employee.photo_path = res.photoPath
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Foto-Upload fehlgeschlagen'
  } finally {
    photoBusy.value = false
    if (photoInput.value) photoInput.value.value = ''
  }
}

// ---------- Dokumente ----------
const docForm = ref({ category: 'vertrag', title: '', valid_until: '' })
const docFile = ref<HTMLInputElement | null>(null)
const docBusy = ref(false)
const docPreview = ref<any | null>(null)
const docUrl = (d: any, download = false) => `/api/admin/employees/${emp.value?.id}/documents/${d.id}${download ? '?download=1' : ''}`
const docExpiring = (d: any) => d.valid_until && String(d.valid_until).slice(0, 10) <= addDays(today.value, 30)

async function uploadDoc() {
  const file = docFile.value?.files?.[0]
  if (!file || !emp.value) { saveError.value = 'Bitte eine Datei auswählen.'; return }
  docBusy.value = true; saveError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', docForm.value.category)
    fd.append('title', docForm.value.title)
    fd.append('valid_until', docForm.value.valid_until)
    applyDetail(await $fetch(`/api/admin/employees/${emp.value.id}/documents`, { method: 'POST', body: fd }))
    docForm.value = { category: docForm.value.category, title: '', valid_until: '' }
    if (docFile.value) docFile.value.value = ''
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Upload fehlgeschlagen'
  } finally {
    docBusy.value = false
  }
}
async function removeDoc(d: any) {
  if (!await ask({ title: 'Dokument löschen?', message: `„${d.title}“ wird endgültig vom Server gelöscht.`, confirmText: 'Löschen', danger: true })) return
  try {
    applyDetail(await $fetch(`/api/admin/employees/${emp.value.id}/documents/${d.id}`, { method: 'DELETE' }))
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen'
  }
}

// ---------- Urlaub & Abwesenheit ----------
const absForm = ref({ type: 'urlaub', date_from: '', date_to: '', days: '', note: '' })
const absDaysTouched = ref(false)
watch(() => [absForm.value.date_from, absForm.value.date_to], ([from, to]) => {
  if (from && (!to || to < from)) absForm.value.date_to = from
  if (!absDaysTouched.value) absForm.value.days = from ? String(workdaysBetween(from, absForm.value.date_to || from)) : ''
})
const year = computed(() => today.value.slice(0, 4))
const vacation = computed(() => {
  const usedByYear: Record<number, number> = {}
  for (const a of detail.value?.absences || []) {
    if (a.type !== 'urlaub' || (a.status && a.status !== 'genehmigt')) continue
    const y = Number(String(a.date_from).slice(0, 4))
    usedByYear[y] = (usedByYear[y] || 0) + Number(a.days || 0)
  }
  const acc = vacationAccount({
    annual: Number(emp.value?.vacation_days || 0), entry: emp.value?.entry_date, exit: emp.value?.exit_date,
    openingYear: emp.value?.vacation_opening_year, openingDays: emp.value?.vacation_opening_days,
    usedByYear, year: Number(year.value)
  })
  const { total, used } = acc
  const sick = (detail.value?.absences || [])
    .filter(a => a.type === 'krankenstand' && (!a.status || a.status === 'genehmigt') && String(a.date_from).startsWith(year.value))
    .reduce((s, a) => s + Number(a.days || 0), 0)
  return { ...acc, annual: Number(emp.value?.vacation_days || 0), sick, pct: total > 0 ? Math.min(100, (used / total) * 100) : 0 }
})
async function addAbsence() {
  if (!emp.value) return
  saveError.value = ''
  try {
    applyDetail(await $fetch(`/api/admin/employees/${emp.value.id}/absences`, { method: 'POST', body: absForm.value }))
    absForm.value = { type: absForm.value.type, date_from: '', date_to: '', days: '', note: '' }
    absDaysTouched.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Eintragen fehlgeschlagen'
  }
}
async function removeAbsence(a: any) {
  if (!await ask({ title: `${absenceLabel(a.type)} löschen?`, message: `${fmtDate(a.date_from)} – ${fmtDate(a.date_to)} (${fmtNum(a.days)} Tage)`, confirmText: 'Löschen', danger: true })) return
  try {
    applyDetail(await $fetch(`/api/admin/employees/${emp.value.id}/absences/${a.id}`, { method: 'DELETE' }))
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen'
  }
}

async function reviewAbsence(a: any, status: 'genehmigt' | 'abgelehnt') {
  if (status === 'abgelehnt' && !await ask({ title: 'Urlaubsantrag ablehnen?', message: `${fmtDate(a.date_from)} – ${fmtDate(a.date_to)}`, confirmText: 'Ablehnen', danger: true })) return
  try {
    await $fetch(`/api/admin/absences/${a.id}/review`, { method: 'POST', body: { status } })
    await openEmployee(emp.value.id, 'abwesenheit')
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen'
  }
}
const absenceFiles = (a: any) => (detail.value?.documents || []).filter((d: any) => d.absence_id === a.id)
const missingSickNote = (a: any) => a.type === 'krankenstand' && a.requested_by && !Number(a.file_count)

// ---------- Dashboard-Zugang ----------
const inviteRole = ref<Role>('designer')
const inviteEmail = ref('')
const accessBusy = ref(false)
const devUrl = ref('')
const errText = (e: any, fallback: string) => e?.data?.statusMessage || fallback

async function refreshDetail() {
  if (emp.value) applyDetail(await $fetch(`/api/admin/employees/${emp.value.id}`))
  await load()
}
async function invite() {
  if (!emp.value) return
  msg.value = null; devUrl.value = ''; accessBusy.value = true
  try {
    const res = await $fetch<{ sent: boolean; devInviteUrl?: string }>('/api/admin/users/invite', {
      method: 'POST',
      body: { displayName: fullName({ first_name: emp.value.first_name, last_name: emp.value.last_name }), email: inviteEmail.value.trim(), role: inviteRole.value, employeeId: emp.value.id }
    })
    msg.value = { ok: true, text: res.sent ? `Einladung an ${inviteEmail.value.trim()} verschickt (48 Stunden gültig).` : 'Einladung erstellt – Mail konnte nicht versendet werden.' }
    devUrl.value = res.devInviteUrl || ''
    await refreshDetail()
  } catch (e: any) {
    msg.value = { ok: false, text: errText(e, 'Einladung fehlgeschlagen') }
  } finally {
    accessBusy.value = false
  }
}
async function changeRole(role: string) {
  const u = detail.value?.user; if (!u) return
  msg.value = null
  try {
    await $fetch(`/api/admin/users/${u.id}/role`, { method: 'PUT', body: { role } })
    msg.value = { ok: true, text: `Rolle auf „${roleLabel(role)}“ geändert.` }
  } catch (e: any) {
    msg.value = { ok: false, text: errText(e, 'Rollenänderung fehlgeschlagen') }
  }
  await refreshDetail()
}
async function resetPassword() {
  const u = detail.value?.user; if (!u) return
  msg.value = null; devUrl.value = ''
  if (!await ask({ title: 'Passwort zurücksetzen?', message: `Ein Link zum Festlegen eines neuen Passworts geht an ${u.email || 'keine E-Mail'} (2 Stunden gültig).`, confirmText: 'Link senden', icon: 'key' })) return
  try {
    const res = await $fetch<{ sent: boolean; hasEmail: boolean; devResetUrl?: string }>(`/api/admin/users/${u.id}/reset`, { method: 'POST' })
    msg.value = !res.hasEmail
      ? { ok: false, text: 'Für den Zugang ist keine E-Mail-Adresse hinterlegt.' }
      : { ok: true, text: res.sent ? 'Reset-Link per E-Mail verschickt.' : 'Reset-Link erstellt – Mail konnte nicht versendet werden.' }
    devUrl.value = res.devResetUrl || ''
  } catch (e: any) {
    msg.value = { ok: false, text: errText(e, 'Reset fehlgeschlagen') }
  }
}
async function toggleAccess() {
  const u = detail.value?.user; if (!u) return
  const target = u.status === 'active' ? 'deactivated' : 'active'
  if (target === 'deactivated' && !await ask({ title: 'Zugang sperren?', message: 'Der Login ist dann nicht mehr möglich, alle Daten bleiben erhalten. Entsperren geht jederzeit.', confirmText: 'Sperren', danger: true, icon: 'lock' })) return
  msg.value = null
  try {
    await $fetch(`/api/admin/users/${u.id}/status`, { method: 'PUT', body: { status: target } })
    msg.value = { ok: true, text: target === 'active' ? 'Zugang wieder freigeschaltet.' : 'Zugang gesperrt.' }
  } catch (e: any) {
    msg.value = { ok: false, text: errText(e, 'Änderung fehlgeschlagen') }
  }
  await refreshDetail()
}
async function removeAccess() {
  const u = detail.value?.user; if (!u) return
  const what = u.status === 'pending' ? 'Einladung zurückziehen' : 'Dashboard-Zugang endgültig entfernen'
  if (!await ask({ title: `${what}?`, message: 'Die Mitarbeiterdaten bleiben erhalten – nur der Login ins Dashboard ist weg.', confirmText: u.status === 'pending' ? 'Zurückziehen' : 'Entfernen', danger: true })) return
  msg.value = null
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    msg.value = { ok: true, text: u.status === 'pending' ? 'Einladung zurückgezogen.' : 'Zugang entfernt.' }
  } catch (e: any) {
    msg.value = { ok: false, text: errText(e, 'Entfernen fehlgeschlagen') }
  }
  await refreshDetail()
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (docPreview.value) docPreview.value = null
  else if (open.value) close()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (user.value?.role !== 'superadmin') { error.value = 'Nur für Admins sichtbar.'; list.value = []; return }
  load()
  // Link aus Kalender/Benachrichtigung: ?open=<Mitarbeiter-ID>&tab=abwesenheit
  const q = useRoute().query
  const openId = Number(q.open)
  if (openId) openEmployee(openId, (TABS.some(t => t.key === q.tab) ? q.tab : 'person') as Tab)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="mit">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Team</p>
        <h1 class="wf-title">Mitarbeiter</h1>
        <p class="wf-subtitle">Alles zu Ihrem Team an einem Ort: Kontakt, Anstellung, Dokumente, Urlaub und der Zugang zum Dashboard.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-users.jpg" alt="Helles Büro mit zwei Arbeitsplätzen und Pflanzen">
        <button v-if="user?.role === 'superadmin'" class="wf-btn wf-btn--primary wf-hero-cta" @click="openNew">
          <WfIcon name="plus" :size="15" /> Mitarbeiter anlegen
        </button>
      </div>
    </section>

    <p v-if="error" class="mit__note mit__note--error">{{ error }}</p>
    <p v-else-if="!list" class="mit__note">Mitarbeiter werden geladen …</p>

    <template v-else>
      <!-- Auf einen Blick -->
      <div class="mit__glance">
        <div class="wf-card mit__stat">
          <span class="mit__statlabel">Im Team</span>
          <strong class="mit__statnum">{{ counts.aktiv }}</strong>
          <span class="mit__stathint">{{ counts.ehemalige ? `${counts.ehemalige} ehemalige` : 'aktive Mitarbeiter' }}</span>
        </div>
        <div class="wf-card mit__stat">
          <span class="mit__statlabel">Heute abwesend</span>
          <strong class="mit__statnum">{{ absentToday.length }}</strong>
          <span class="mit__stathint">
            <template v-if="absentToday.length">
              <button v-for="(e, i) in absentToday" :key="e.id" class="mit__link" @click="openEmployee(e.id, 'abwesenheit')">{{ e.first_name || fullName(e) }} ({{ absenceLabel(e.absent_today) }}){{ i < absentToday.length - 1 ? ', ' : '' }}</button>
            </template>
            <template v-else>alle an Bord</template>
          </span>
        </div>
        <div class="wf-card mit__stat mit__stat--wide">
          <span class="mit__statlabel">Fristen · nächste 30 Tage</span>
          <ul v-if="deadlines.length" class="mit__deadlines">
            <li v-for="d in deadlines.slice(0, 3)" :key="d.id + d.text + d.date">
              <button class="mit__link" @click="openEmployee(d.id, d.text === 'Dokument läuft ab' ? 'dokumente' : 'anstellung')">{{ d.name }}</button>
              · {{ d.text }} <span class="mit__date">{{ fmtDate(d.date) }}</span>
            </li>
          </ul>
          <span v-else class="mit__stathint">Keine Probezeit-Enden oder ablaufenden Dokumente.</span>
        </div>
      </div>

      <div class="mit__bar">
        <div class="mit__chips" role="tablist">
          <button v-for="f in (['aktiv', 'ehemalige', 'alle'] as const)" :key="f" class="mit__chip" :class="{ 'is-active': filter === f }" @click="filter = f">
            {{ f === 'aktiv' ? 'Aktiv' : f === 'ehemalige' ? 'Ehemalige' : 'Alle' }} <span>{{ counts[f] }}</span>
          </button>
        </div>
        <label class="mit__search">
          <WfIcon name="search" :size="15" />
          <input v-model="search" type="search" placeholder="Name, Position, Telefon …" aria-label="Mitarbeiter suchen">
        </label>
      </div>

      <div class="mit__grid">
        <button v-for="e in filtered" :key="e.id" class="wf-card mit__card" :class="{ 'is-former': former(e) }" @click="openEmployee(e.id)">
          <div class="mit__cardhead">
            <span class="mit__avatar">
              <img v-if="photoOf(e)" :src="photoOf(e)" alt="">
              <span v-else>{{ initials(e.first_name, e.last_name) }}</span>
              <i v-if="e.absent_today" class="mit__away" :title="`Heute: ${absenceLabel(e.absent_today)}`" />
            </span>
            <span class="mit__who">
              <strong>{{ fullName(e) }}</strong>
              <span>{{ e.position || employmentLabel(e.employment_type) || 'Position offen' }}</span>
            </span>
          </div>
          <dl class="mit__facts">
            <div><dt>Anstellung</dt><dd>{{ employmentLabel(e.employment_type) || '—' }}<template v-if="e.weekly_hours"> · {{ fmtNum(e.weekly_hours) }} Std.</template></dd></div>
            <div><dt>{{ former(e) ? 'Ausgeschieden' : 'Im Team seit' }}</dt><dd>{{ former(e) ? fmtDate(e.exit_date) : e.entry_date ? `${fmtDate(e.entry_date)} · ${tenure(e.entry_date)}` : '—' }}</dd></div>
            <div><dt>Telefon</dt><dd>{{ e.phone || '—' }}</dd></div>
          </dl>
          <div class="mit__cardfoot">
            <span class="wf-pill" :class="accessPill(e)">{{ accessText(e) }}</span>
            <span v-if="!former(e) && e.vacation" class="mit__vac" :title="`Urlaub ${year}: ${fmtNum(e.vacation.used)} von ${fmtNum(e.vacation.total)} Tagen verbraucht (Anspruch ${fmtNum(e.vacation.entitlement)}${e.vacation.carryover ? ` + Übertrag ${fmtNum(e.vacation.carryover)}` : ''})`">
              <WfIcon name="calendar" :size="13" /> {{ fmtNum(e.vacation.left) }} Tage frei
            </span>
            <span v-if="Number(e.sick_days)" class="mit__vac" :title="`Krankenstandstage ${year}`"><WfIcon name="alert" :size="13" /> {{ fmtNum(e.sick_days) }} Tage krank</span>
            <span v-if="Number(e.pending_requests)" class="wf-pill wf-pill--amber">Urlaubsantrag offen</span>
            <span v-if="Number(e.missing_sick_notes)" class="wf-pill wf-pill--red">Krankmeldung fehlt</span>
          </div>
        </button>
        <button v-if="filter !== 'ehemalige'" class="mit__card mit__card--add" @click="openNew">
          <WfIcon name="plus" :size="22" />
          <span>Mitarbeiter anlegen</span>
        </button>
      </div>
      <p v-if="!filtered.length && filter === 'ehemalige'" class="mit__note">Keine ehemaligen Mitarbeiter. Wer ein Austrittsdatum in der Vergangenheit hat, erscheint hier.</p>
    </template>

    <!-- Mitarbeiter-Dialog -->
    <div v-if="open" class="wf-modal-overlay" @click.self="close">
      <div class="wf-modal mit__modal" role="dialog" aria-modal="true" :aria-label="isNew ? 'Neuer Mitarbeiter' : fullName(emp)">
        <header class="mit__mhead">
          <div class="mit__mavatar">
            <img v-if="emp && photoOf({ ...emp, avatar_path: detail?.user?.avatar_path })" :src="photoOf({ ...emp, avatar_path: detail?.user?.avatar_path })" alt="">
            <span v-else>{{ initials(form.first_name, form.last_name) }}</span>
            <button v-if="emp" type="button" class="mit__photobtn" :disabled="photoBusy" :title="photoBusy ? 'Lädt hoch …' : 'Foto ändern'" @click="photoInput?.click()">
              <WfIcon name="camera" :size="14" />
            </button>
            <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadPhoto">
          </div>
          <div class="mit__mtitle">
            <p class="wf-eyebrow">{{ isNew ? 'Neuer Mitarbeiter' : (emp?.position || 'Mitarbeiter') }}</p>
            <h2>{{ isNew ? ([form.first_name, form.last_name].filter(Boolean).join(' ') || 'Name eintragen') : fullName(emp) }}</h2>
            <div v-if="emp" class="mit__mpills">
              <span v-if="emp.employment_type" class="wf-pill wf-pill--blue">{{ employmentLabel(emp.employment_type) }}</span>
              <span v-if="former(emp)" class="wf-pill wf-pill--gray">Ausgeschieden {{ fmtDate(emp.exit_date) }}</span>
              <span v-else-if="emp.entry_date" class="wf-pill wf-pill--plain wf-pill--gray">seit {{ fmtDate(emp.entry_date) }} · {{ tenure(emp.entry_date) }}</span>
              <span class="wf-pill" :class="detail?.user ? (detail.user.status === 'active' ? '' : detail.user.status === 'pending' ? 'wf-pill--amber' : 'wf-pill--red') : 'wf-pill--gray'">
                {{ detail?.user ? `Dashboard: ${roleLabel(detail.user.role)}${detail.user.status !== 'active' ? ' · ' + userStatusLabel(detail.user.status) : ''}` : 'Kein Dashboard-Zugang' }}
              </span>
            </div>
          </div>
          <button type="button" class="mit__close" aria-label="Schließen" @click="close">×</button>
        </header>

        <nav class="mit__tabs" role="tablist">
          <button v-for="t in TABS" :key="t.key" class="mit__tab" role="tab" :aria-selected="tab === t.key"
                  :class="{ 'is-active': tab === t.key }" :disabled="isNew && !FORM_TABS.includes(t.key)"
                  :title="isNew && !FORM_TABS.includes(t.key) ? 'Zuerst speichern' : undefined" @click="tab = t.key">
            <WfIcon :name="t.icon" :size="14" /> {{ t.label }}
            <span v-if="t.key === 'dokumente' && detail?.documents.length" class="mit__tabcount">{{ detail.documents.length }}</span>
          </button>
        </nav>

        <!-- Person -->
        <div v-show="tab === 'person'" class="mit__pane">
          <h3 class="mit__h3">Name &amp; Funktion</h3>
          <div class="mit__fields">
            <label class="mit__f mit__f--s"><span class="wf-label">Titel</span><input v-model="form.title" class="wf-input" placeholder="z. B. Mag."></label>
            <label class="mit__f"><span class="wf-label">Vorname *</span><input v-model="form.first_name" class="wf-input" autocomplete="off"></label>
            <label class="mit__f"><span class="wf-label">Nachname *</span><input v-model="form.last_name" class="wf-input" autocomplete="off"></label>
            <label class="mit__f mit__f--l"><span class="wf-label">Position / Funktion</span><input v-model="form.position" class="wf-input" placeholder="z. B. Interior Designerin, Fahrer, Lager"></label>
          </div>
          <h3 class="mit__h3">Erreichbarkeit</h3>
          <div class="mit__fields">
            <label class="mit__f"><span class="wf-label">Telefon</span><input v-model="form.phone" class="wf-input" type="tel"></label>
            <label class="mit__f"><span class="wf-label">E-Mail (dienstlich)</span><input v-model="form.email" class="wf-input" type="email" placeholder="name@wohnfee.at"></label>
            <label class="mit__f"><span class="wf-label">E-Mail (privat)</span><input v-model="form.private_email" class="wf-input" type="email"></label>
          </div>
          <h3 class="mit__h3">Wohnadresse &amp; persönliche Daten</h3>
          <div class="mit__fields">
            <label class="mit__f mit__f--l"><span class="wf-label">Straße</span><input v-model="form.street" class="wf-input"></label>
            <label class="mit__f mit__f--s"><span class="wf-label">PLZ</span><input v-model="form.zip" class="wf-input"></label>
            <label class="mit__f"><span class="wf-label">Ort</span><input v-model="form.city" class="wf-input"></label>
            <label class="mit__f"><span class="wf-label">Geburtsdatum <em v-if="age(form.birth_date)">· {{ age(form.birth_date) }} Jahre</em></span><input v-model="form.birth_date" class="wf-input" type="date"></label>
            <label class="mit__f"><span class="wf-label">Staatsbürgerschaft</span><input v-model="form.nationality" class="wf-input" placeholder="Österreich"></label>
            <label class="mit__f"><span class="wf-label">SV-Nummer</span><input v-model="form.svnr" class="wf-input" placeholder="1234 010190" inputmode="numeric"></label>
          </div>
          <h3 class="mit__h3">Notfallkontakt</h3>
          <div class="mit__fields">
            <label class="mit__f"><span class="wf-label">Name</span><input v-model="form.emergency_name" class="wf-input"></label>
            <label class="mit__f mit__f--s"><span class="wf-label">Beziehung</span><input v-model="form.emergency_relation" class="wf-input" placeholder="z. B. Partner"></label>
            <label class="mit__f"><span class="wf-label">Telefon</span><input v-model="form.emergency_phone" class="wf-input" type="tel"></label>
          </div>
        </div>

        <!-- Anstellung -->
        <div v-show="tab === 'anstellung'" class="mit__pane">
          <h3 class="mit__h3">Dienstverhältnis</h3>
          <div class="mit__fields">
            <label class="mit__f"><span class="wf-label">Beschäftigungsart</span>
              <select v-model="form.employment_type" class="wf-input">
                <option value="">— bitte wählen —</option>
                <option v-for="t in EMPLOYMENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </label>
            <label class="mit__f"><span class="wf-label">Eintritt</span><input v-model="form.entry_date" class="wf-input" type="date"></label>
            <label class="mit__f"><span class="wf-label">Probezeit bis</span><input v-model="form.probation_until" class="wf-input" type="date"></label>
            <label class="mit__f"><span class="wf-label">Austritt</span><input v-model="form.exit_date" class="wf-input" type="date"></label>
          </div>
          <h3 class="mit__h3">Arbeitszeit &amp; Urlaub</h3>
          <div class="mit__fields">
            <label class="mit__f mit__f--s"><span class="wf-label">Std. / Woche</span><input v-model="form.weekly_hours" class="wf-input" inputmode="decimal" placeholder="38,5"></label>
            <label class="mit__f"><span class="wf-label">Arbeitstage</span><input v-model="form.work_days" class="wf-input" placeholder="z. B. Mo–Fr oder Di, Do"></label>
            <label class="mit__f mit__f--s"><span class="wf-label" title="Voller Jahresanspruch – im Eintritts- und Austrittsjahr wird automatisch aliquot gerechnet">Urlaub / Jahr (Tage)</span><input v-model="form.vacation_days" class="wf-input" inputmode="decimal"></label>
            <label class="mit__f"><span class="wf-label">Kollektivvertrag / Einstufung</span><input v-model="form.collective_agreement" class="wf-input" placeholder="z. B. KV Handel, Beschäftigungsgruppe C"></label>
          </div>
          <div class="mit__fields">
            <label class="mit__f mit__f--s"><span class="wf-label">Resturlaub zum 1.1.</span><input v-model="form.vacation_opening_year" class="wf-input" inputmode="numeric" :placeholder="year"></label>
            <label class="mit__f mit__f--s"><span class="wf-label">Tage</span><input v-model="form.vacation_opening_days" class="wf-input" inputmode="decimal" placeholder="0"></label>
          </div>
          <p class="mit__hint">Urlaub wird ab Eintritt aliquot gerechnet, nicht verbrauchte Tage wandern ins nächste Jahr (verjähren 2 Jahre nach Ende des Urlaubsjahres). „Resturlaub“ nur für offene Tage aus der Zeit vor dem Dashboard eintragen (z. B. 2027 / 3,5) – ab diesem Jahr rechnet das Dashboard selbst weiter.</p>
          <h3 class="mit__h3">Ausstattung &amp; Einsatz</h3>
          <div class="mit__fields">
            <label class="mit__f"><span class="wf-label">Führerschein-Klassen</span><input v-model="form.driving_license" class="wf-input" placeholder="z. B. B, C1"></label>
            <label class="mit__f mit__f--s"><span class="wf-label">Kleidergröße</span><input v-model="form.clothing_size" class="wf-input" placeholder="M"></label>
            <label class="mit__f mit__f--l"><span class="wf-label">Schlüssel &amp; Ausstattung</span><input v-model="form.equipment" class="wf-input" placeholder="z. B. Lagerschlüssel Eibesbrunn, Firmenhandy, Akkuschrauber"></label>
          </div>
          <label class="mit__f mit__f--full"><span class="wf-label">Interne Notizen</span><textarea v-model="form.notes" class="wf-input" rows="4" placeholder="Stärken, Vereinbarungen, Gesprächsnotizen …" /></label>
        </div>

        <!-- Lohn & Bank -->
        <div v-show="tab === 'lohn'" class="mit__pane">
          <p class="mit__hint"><WfIcon name="lock" :size="13" /> Vertraulich – nur für Admins sichtbar, erscheint nirgends sonst.</p>
          <h3 class="mit__h3">Entlohnung</h3>
          <div class="mit__fields">
            <label class="mit__f"><span class="wf-label">Betrag</span><input v-model="form.salary" class="wf-input" inputmode="decimal" placeholder="0,00"></label>
            <label class="mit__f"><span class="wf-label">Art</span>
              <select v-model="form.salary_type" class="wf-input">
                <option v-for="t in SALARY_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </label>
          </div>
          <h3 class="mit__h3">Bankverbindung</h3>
          <div class="mit__fields">
            <label class="mit__f mit__f--l"><span class="wf-label">IBAN</span><input v-model="form.iban" class="wf-input mit__mono" placeholder="AT12 3456 7890 1234 5678"></label>
            <label class="mit__f mit__f--s"><span class="wf-label">BIC</span><input v-model="form.bic" class="wf-input mit__mono"></label>
            <label class="mit__f"><span class="wf-label">Kontoinhaber (falls abweichend)</span><input v-model="form.account_holder" class="wf-input"></label>
          </div>
        </div>

        <!-- Dokumente -->
        <div v-if="tab === 'dokumente' && detail" class="mit__pane">
          <form class="mit__upload" @submit.prevent="uploadDoc">
            <label class="mit__f"><span class="wf-label">Art</span>
              <select v-model="docForm.category" class="wf-input">
                <option v-for="c in DOC_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </label>
            <label class="mit__f"><span class="wf-label">Bezeichnung (optional)</span><input v-model="docForm.title" class="wf-input" :placeholder="docCategoryLabel(docForm.category)"></label>
            <label class="mit__f mit__f--s"><span class="wf-label">Gültig bis</span><input v-model="docForm.valid_until" class="wf-input" type="date"></label>
            <label class="mit__f mit__f--l"><span class="wf-label">Datei (PDF oder Foto)</span><input ref="docFile" class="wf-input mit__file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label>
            <button type="submit" class="wf-btn wf-btn--primary" :disabled="docBusy"><WfIcon name="plus" :size="14" /> {{ docBusy ? 'Lädt hoch …' : 'Hochladen' }}</button>
          </form>
          <ul v-if="detail.documents.length" class="mit__list">
            <li v-for="d in detail.documents" :key="d.id" class="mit__row">
              <span class="mit__doctype">{{ docCategoryLabel(d.category) }}</span>
              <span class="mit__rowmain">
                <strong>{{ d.title }}</strong>
                <small>{{ d.mime === 'application/pdf' ? 'PDF' : 'Bild' }} · {{ fmtSize(d.size) }} · {{ fmtDate(d.created_at) }}<template v-if="d.uploaded_by_name"> · {{ d.uploaded_by_name }}</template></small>
              </span>
              <span v-if="d.valid_until" class="wf-pill" :class="docExpiring(d) ? 'wf-pill--amber' : 'wf-pill--gray'">gültig bis {{ fmtDate(d.valid_until) }}</span>
              <span class="mit__rowact">
                <button type="button" class="mit__iconbtn" title="Ansehen" @click="docPreview = d"><WfIcon name="eye" :size="15" /></button>
                <a class="mit__iconbtn" :href="docUrl(d, true)" title="Herunterladen"><WfIcon name="download" :size="15" /></a>
                <button type="button" class="mit__iconbtn mit__iconbtn--danger" title="Löschen" @click="removeDoc(d)"><WfIcon name="trash" :size="15" /></button>
              </span>
            </li>
          </ul>
          <p v-else class="mit__empty">Noch keine Dokumente. Typisch: Dienstvertrag, Meldezettel, Ausweis, SV-Anmeldung, Führerschein.</p>
          <p class="mit__hint"><WfIcon name="lock" :size="13" /> Dateien liegen geschützt am Server und sind nur über das Dashboard erreichbar.</p>
        </div>

        <!-- Urlaub & Abwesenheit -->
        <div v-if="tab === 'abwesenheit' && detail" class="mit__pane">
          <div class="mit__vacbox">
            <div class="mit__vacnums">
              <div><strong>{{ fmtNum(vacation.left) }}</strong><span>Urlaubstage frei {{ year }}</span></div>
              <div><strong>{{ fmtNum(vacation.used) }}</strong><span>verbraucht von {{ fmtNum(vacation.total) }}</span></div>
              <div><strong>{{ fmtNum(vacation.sick) }}</strong><span>Krankenstandstage {{ year }}</span></div>
            </div>
            <div class="mit__vacbar" :aria-label="`${fmtNum(vacation.used)} von ${fmtNum(vacation.total)} Urlaubstagen verbraucht`"><i :style="{ width: vacation.pct + '%' }" /></div>
            <p v-if="vacation.annual" class="mit__vacmath">
              Anspruch {{ year }}: <strong>{{ fmtNum(vacation.entitlement) }} Tage</strong><template v-if="vacation.aliquot"> (aliquot von {{ fmtNum(vacation.annual) }}<template v-if="emp.entry_date && String(emp.entry_date).slice(0, 4) === year"> ab Eintritt {{ fmtDate(emp.entry_date) }}</template><template v-if="emp.exit_date && String(emp.exit_date).slice(0, 4) === year"> bis Austritt {{ fmtDate(emp.exit_date) }}</template>)</template>
              <template v-if="vacation.carryover"> · {{ vacation.carryover > 0 ? 'Übertrag aus Vorjahren' : 'Vorgriff aus Vorjahren' }}: <strong>{{ fmtNum(vacation.carryover) }}</strong></template>
              <template v-if="vacation.left > 0 && !emp.exit_date"> · Rest geht ins Jahr {{ Number(year) + 1 }} mit</template>
              <template v-if="vacation.expiring > 0"> · <span class="mit__vacwarn">{{ fmtNum(vacation.expiring) }} Tage verjähren Ende {{ year }}</span></template>
            </p>
            <small v-else>Urlaubsanspruch im Reiter „Anstellung“ eintragen.</small>
          </div>
          <form class="mit__upload" @submit.prevent="addAbsence">
            <label class="mit__f"><span class="wf-label">Art</span>
              <select v-model="absForm.type" class="wf-input">
                <option v-for="t in ABSENCE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </label>
            <label class="mit__f"><span class="wf-label">Von</span><input v-model="absForm.date_from" class="wf-input" type="date" required></label>
            <label class="mit__f"><span class="wf-label">Bis</span><input v-model="absForm.date_to" class="wf-input" type="date" :min="absForm.date_from"></label>
            <label class="mit__f mit__f--s"><span class="wf-label" title="Mo–Fr automatisch, Feiertage bitte abziehen">Arbeitstage</span><input v-model="absForm.days" class="wf-input" inputmode="decimal" @input="absDaysTouched = true"></label>
            <label class="mit__f"><span class="wf-label">Notiz</span><input v-model="absForm.note" class="wf-input" placeholder="optional"></label>
            <button type="submit" class="wf-btn wf-btn--primary"><WfIcon name="plus" :size="14" /> Eintragen</button>
          </form>
          <ul v-if="detail.absences.length" class="mit__list">
            <li v-for="a in detail.absences" :key="a.id" class="mit__row">
              <span class="mit__abstype" :data-type="a.type">{{ absenceLabel(a.type) }}</span>
              <span class="mit__rowmain">
                <strong>{{ fmtDate(a.date_from) }}<template v-if="a.date_to !== a.date_from"> – {{ fmtDate(a.date_to) }}</template></strong>
                <small>
                  {{ fmtNum(a.days) }} {{ Number(a.days) === 1 ? 'Tag' : 'Tage' }}<template v-if="a.note"> · {{ a.note }}</template>
                  <template v-if="a.requested_by_name"> · {{ a.type === 'urlaub' ? 'beantragt' : 'gemeldet' }} von {{ a.requested_by_name }}</template>
                  <template v-if="a.review_note"> · „{{ a.review_note }}“</template>
                </small>
                <span v-if="absenceFiles(a).length" class="mit__absfiles">
                  <button v-for="d in absenceFiles(a)" :key="d.id" type="button" class="mit__absfile" @click="docPreview = d"><WfIcon name="file" :size="12" /> {{ d.title }}</button>
                </span>
              </span>
              <span v-if="a.status && a.status !== 'genehmigt'" class="wf-pill" :class="`wf-pill--${ABSENCE_STATUS[a.status]?.tone}`">{{ ABSENCE_STATUS[a.status]?.label }}</span>
              <span v-if="missingSickNote(a)" class="wf-pill wf-pill--red">Krankmeldung fehlt</span>
              <span v-if="today >= String(a.date_from).slice(0, 10) && today <= String(a.date_to).slice(0, 10)" class="wf-pill wf-pill--amber">heute</span>
              <span v-if="a.status === 'beantragt'" class="mit__absreview">
                <button type="button" class="wf-btn wf-btn--sm wf-btn--primary" @click="reviewAbsence(a, 'genehmigt')"><WfIcon name="check" :size="13" /> Genehmigen</button>
                <button type="button" class="wf-btn wf-btn--sm" @click="reviewAbsence(a, 'abgelehnt')">Ablehnen</button>
              </span>
              <span class="mit__rowact">
                <button type="button" class="mit__iconbtn mit__iconbtn--danger" title="Löschen" @click="removeAbsence(a)"><WfIcon name="trash" :size="15" /></button>
              </span>
            </li>
          </ul>
          <p v-else class="mit__empty">Noch keine Einträge.</p>
        </div>

        <!-- Dashboard-Zugang -->
        <div v-if="tab === 'zugang' && detail" class="mit__pane">
          <template v-if="detail.user">
            <div class="mit__access">
              <dl class="mit__accessfacts">
                <div><dt>Benutzername</dt><dd>{{ detail.user.username || '— (Einladung noch nicht angenommen)' }}</dd></div>
                <div><dt>Login-E-Mail</dt><dd>{{ detail.user.email || '—' }}</dd></div>
                <div><dt>Status</dt><dd><span class="wf-pill" :class="detail.user.status === 'active' ? '' : detail.user.status === 'pending' ? 'wf-pill--amber' : 'wf-pill--red'">{{ userStatusLabel(detail.user.status) }}</span></dd></div>
                <div><dt>{{ detail.user.status === 'pending' ? 'Eingeladen am' : 'Zugang seit' }}</dt><dd>{{ fmtDate(String(detail.user.createdAt || '').slice(0, 10)) }}<template v-if="detail.user.invitedByUsername"> · von {{ detail.user.invitedByUsername }}</template></dd></div>
              </dl>
              <div class="mit__roles">
                <span class="wf-label">Rolle</span>
                <label v-for="r in ROLES" :key="r.value" class="mit__role" :class="{ 'is-active': detail.user.role === r.value, 'is-locked': isSelf || detail.user.status === 'pending' }">
                  <input type="radio" name="role" :value="r.value" :checked="detail.user.role === r.value" :disabled="isSelf || detail.user.status === 'pending'" @change="changeRole(r.value)">
                  <span><strong>{{ r.label }}</strong><small>{{ r.text }}</small></span>
                </label>
              </div>
            </div>
            <div v-if="isSelf" class="mit__hint">Das ist Ihr eigener Zugang – Rolle und Sperre lassen sich hier nicht ändern. Passwort ändern unter „Mein Profil“.</div>
            <div v-else class="mit__accessactions">
              <button v-if="detail.user.status === 'active'" class="wf-btn" @click="resetPassword"><WfIcon name="key" :size="14" /> Passwort-Reset senden</button>
              <button v-if="detail.user.status !== 'pending'" class="wf-btn" @click="toggleAccess"><WfIcon name="lock" :size="14" /> {{ detail.user.status === 'active' ? 'Zugang sperren' : 'Zugang freischalten' }}</button>
              <button class="wf-btn wf-btn--danger" @click="removeAccess"><WfIcon name="trash" :size="14" /> {{ detail.user.status === 'pending' ? 'Einladung zurückziehen' : 'Zugang entfernen' }}</button>
            </div>
          </template>
          <template v-else>
            <div class="mit__invite">
              <p class="mit__lead">{{ emp.first_name || 'Diese Person' }} hat noch keinen Zugang zum Dashboard. Mit einer Einladung bekommt sie eine E-Mail und legt Benutzername und Passwort selbst fest (Link 48 Stunden gültig).</p>
              <div class="mit__fields">
                <label class="mit__f mit__f--l"><span class="wf-label">Login-E-Mail</span><input v-model="inviteEmail" class="wf-input" type="email" :placeholder="emp.email || 'name@wohnfee.at'"></label>
              </div>
              <div class="mit__roles">
                <span class="wf-label">Rolle</span>
                <label v-for="r in ROLES" :key="r.value" class="mit__role" :class="{ 'is-active': inviteRole === r.value }">
                  <input v-model="inviteRole" type="radio" name="invrole" :value="r.value">
                  <span><strong>{{ r.label }}</strong><small>{{ r.text }}</small></span>
                </label>
              </div>
              <button class="wf-btn wf-btn--primary" :disabled="accessBusy || !inviteEmail.trim()" @click="invite"><WfIcon name="mail" :size="14" /> {{ accessBusy ? 'Wird gesendet …' : 'Einladung senden' }}</button>
            </div>
          </template>
          <p v-if="devUrl" class="mit__dev"><strong>Dev-Modus</strong> (kein SMTP): <a :href="devUrl">{{ devUrl }}</a></p>
        </div>

        <p v-if="msg" class="mit__note" :class="msg.ok ? 'mit__note--ok' : 'mit__note--error'" role="status">{{ msg.text }}</p>
        <p v-if="saveError" class="mit__note mit__note--error" role="alert">{{ saveError }}</p>

        <footer class="mit__mfoot">
          <button v-if="emp" type="button" class="wf-btn wf-btn--danger mit__del" @click="removeEmployee"><WfIcon name="trash" :size="14" /> Löschen</button>
          <span class="mit__spacer" />
          <button type="button" class="wf-btn" @click="close">{{ FORM_TABS.includes(tab) ? 'Abbrechen' : 'Schließen' }}</button>
          <button v-if="FORM_TABS.includes(tab)" type="button" class="wf-btn wf-btn--primary" :disabled="saving" @click="save()">
            {{ saving ? 'Speichere …' : isNew ? 'Mitarbeiter anlegen' : 'Speichern' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Dokument-Vorschau -->
    <div v-if="docPreview && emp" class="wf-modal-overlay mit__pdfoverlay" @click.self="docPreview = null">
      <div class="wf-modal mit__pdfmodal">
        <div class="mit__pdfhead">
          <strong>{{ docPreview.title }}</strong>
          <span class="mit__spacer" />
          <a class="wf-btn wf-btn--sm" :href="docUrl(docPreview, true)"><WfIcon name="download" :size="14" /> Herunterladen</a>
          <button class="wf-btn wf-btn--sm" @click="docPreview = null">Schließen</button>
        </div>
        <iframe v-if="docPreview.mime === 'application/pdf'" :src="docUrl(docPreview)" class="mit__pdfframe" title="Dokument" />
        <div v-else class="mit__imgwrap"><img :src="docUrl(docPreview)" :alt="docPreview.title"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mit__note { color: var(--wf-muted); font-size: .92em; }
.mit__note--error { color: var(--wf-red); }
.mit__note--ok { color: var(--wf-green); }

/* ---------- Auf einen Blick ---------- */
.mit__glance { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 1em; margin-bottom: 1.3em; }
.mit__stat { padding: 1.1em 1.3em; display: flex; flex-direction: column; gap: .2em; min-width: 0; }
.mit__statlabel { font-size: .68em; letter-spacing: .16em; text-transform: uppercase; color: var(--wf-muted); font-weight: 600; }
.mit__statnum { font-family: var(--wf-serif); font-weight: 400; font-size: 2em; line-height: 1.1; color: var(--wf-green); }
.mit__stathint { font-size: .84em; color: var(--wf-muted); }
.mit__deadlines { list-style: none; margin: .45em 0 0; padding: 0; display: grid; gap: .35em; font-size: .88em; }
.mit__date { color: var(--wf-amber); font-weight: 600; }
.mit__link { background: none; border: 0; padding: 0; font: inherit; color: var(--wf-green); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; text-decoration-color: rgba(47, 93, 64, .35); }
.mit__link:hover { text-decoration-color: currentColor; }

/* ---------- Filter ---------- */
.mit__bar { display: flex; gap: 1em; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1.1em; }
.mit__chips { display: flex; gap: .4em; flex-wrap: wrap; }
.mit__chip {
  display: inline-flex; align-items: center; gap: .5em; height: 38px; padding: 0 1em;
  border: 1px solid var(--wf-line); background: var(--wf-card); border-radius: 999px;
  font: inherit; font-size: .86em; color: var(--wf-ink); cursor: pointer; transition: border-color .15s, background .15s, color .15s;
}
.mit__chip span { font-size: .85em; color: var(--wf-muted); }
.mit__chip:hover { border-color: var(--wf-green); }
.mit__chip.is-active { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.mit__chip.is-active span { color: rgba(255, 255, 255, .75); }
.mit__search {
  display: flex; align-items: center; gap: .5em; height: 38px; padding: 0 .9em; min-width: 0; flex: 0 1 19em;
  background: var(--wf-card); border: 1px solid var(--wf-line); border-radius: 999px; color: var(--wf-muted);
}
.mit__search:focus-within { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.mit__search input { border: 0; outline: none; background: none; font: inherit; font-size: .88em; color: var(--wf-ink); width: 100%; min-width: 0; }

/* ---------- Karten ---------- */
.mit__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(17.5em, 1fr)); gap: 1em; }
.mit__card {
  display: flex; flex-direction: column; gap: 1em; text-align: left; padding: 1.25em 1.3em 1.1em;
  font: inherit; color: inherit; cursor: pointer; border-radius: 18px;
  transition: transform .15s, box-shadow .15s, border-color .15s;
}
.mit__card:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(74, 62, 40, .06), 0 12px 32px rgba(74, 62, 40, .1); }
.mit__card:focus-visible { outline: 2px solid var(--wf-green); outline-offset: 2px; }
.mit__card.is-former { opacity: .72; }
.mit__card.is-former .mit__avatar { filter: grayscale(1); }
.mit__cardhead { display: flex; align-items: center; gap: .9em; }
.mit__avatar {
  position: relative; flex: 0 0 56px; width: 56px; height: 56px; border-radius: 50%;
  background: var(--wf-green-soft); color: var(--wf-green); display: grid; place-items: center;
  font-family: var(--wf-serif); font-size: 1.25em;
}
.mit__avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.mit__away { position: absolute; right: 0; bottom: 2px; width: 13px; height: 13px; border-radius: 50%; background: #d39a2c; border: 2px solid var(--wf-card); }
.mit__who { display: flex; flex-direction: column; min-width: 0; }
.mit__who strong { font-family: var(--wf-serif); font-weight: 400; font-size: 1.18em; line-height: 1.25; }
.mit__who span { font-size: .84em; color: var(--wf-muted); }
.mit__facts { margin: 0; display: grid; gap: .45em; padding: .85em 0; border-top: 1px solid #f4efe6; border-bottom: 1px solid #f4efe6; }
.mit__facts div { display: flex; justify-content: space-between; gap: 1em; font-size: .84em; }
.mit__facts dt { color: var(--wf-muted); flex: none; width: auto; text-align: left; hyphens: none; white-space: nowrap; }
.mit__facts dd { margin: 0; flex: 1 1 auto; min-width: 0; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mit__cardfoot { display: flex; align-items: center; justify-content: space-between; gap: .6em; flex-wrap: wrap; }
.mit__vac { display: inline-flex; align-items: center; gap: .35em; font-size: .8em; color: var(--wf-muted); }
.mit__card--add {
  align-items: center; justify-content: center; min-height: 14em; gap: .5em;
  background: transparent; border: 1.5px dashed #d9cfbd; color: var(--wf-muted); box-shadow: none;
}
.mit__card--add:hover { border-color: var(--wf-green); color: var(--wf-green); box-shadow: none; }

/* ---------- Dialog ---------- */
.mit__modal { max-width: 62em; height: min(92vh, 52em); padding: 0; display: flex; flex-direction: column; }
.mit__modal > * { flex-shrink: 0; }
.mit__mfoot { margin-top: auto !important; }
.mit__mhead { display: flex; align-items: center; gap: 1.2em; padding: 1.6em 2em 1.1em; position: relative; }
.mit__mavatar {
  position: relative; flex: 0 0 84px; width: 84px; height: 84px; border-radius: 50%;
  background: var(--wf-green-soft); color: var(--wf-green); display: grid; place-items: center;
  font-family: var(--wf-serif); font-size: 1.8em;
}
.mit__mavatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.mit__photobtn {
  position: absolute; right: -2px; bottom: -2px; width: 30px; height: 30px; border-radius: 50%;
  background: var(--wf-green); color: #fff; border: 2px solid var(--wf-card); display: grid; place-items: center; cursor: pointer;
}
.mit__photobtn:hover:not(:disabled) { background: var(--wf-green-dark); }
.mit__mtitle { min-width: 0; flex: 1; }
.mit__mtitle .wf-eyebrow { margin-bottom: .2em; }
.mit__mtitle h2 { margin: 0 0 .35em; font-size: 1.7em; line-height: 1.15; text-align: left; }
.mit__mpills { display: flex; gap: .4em; flex-wrap: wrap; }
.mit__close {
  position: absolute; top: .8em; right: .9em; width: 36px; height: 36px; border-radius: 50%;
  border: 0; background: transparent; font-size: 1.6em; line-height: 1; color: var(--wf-muted); cursor: pointer;
}
.mit__close:hover { background: #f4efe6; color: var(--wf-ink); }

.mit__tabs { display: flex; gap: .2em; flex-wrap: wrap; padding: 0 1.6em; border-bottom: 1px solid var(--wf-line); }
.mit__tab {
  display: inline-flex; align-items: center; gap: .45em; background: none; border: 0; cursor: pointer; font-family: inherit;
  font-size: .87em; color: var(--wf-muted); padding: .7em .75em; border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .15s, border-color .15s;
}
.mit__tab:hover:not(:disabled) { color: var(--wf-green); }
.mit__tab.is-active { color: var(--wf-green); border-bottom-color: var(--wf-green); font-weight: 600; }
.mit__tab:disabled { opacity: .4; cursor: default; }
.mit__tabcount { font-size: .78em; background: var(--wf-green-soft); color: var(--wf-green); border-radius: 999px; padding: .05em .55em; }

.mit__pane { padding: 1.3em 2em .4em; }
.mit__h3 { font-family: var(--wf-serif); font-weight: 400; font-size: 1.05em; margin: 1.1em 0 .6em; text-align: left; }
.mit__h3:first-child { margin-top: 0; }
.mit__fields { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .8em 1em; }
.mit__f { grid-column: span 2; min-width: 0; }
.mit__f--s { grid-column: span 1; }
.mit__f--l { grid-column: span 3; }
.mit__f--full { display: block; margin-top: 1.1em; }
.mit__f .wf-label em { font-style: normal; color: var(--wf-green); }
.mit__mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: .02em; }
.mit__hint { display: flex; align-items: center; gap: .45em; font-size: .82em; color: var(--wf-muted); margin: 0 0 1em; }
.mit__pane > .mit__hint:last-child { margin: 1em 0 0; }

/* Upload- / Eintrag-Zeile */
.mit__upload {
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .8em 1em; align-items: end;
  background: #fbf9f4; border: 1px solid var(--wf-line); border-radius: 14px; padding: 1em 1.1em; margin-bottom: 1.1em;
}
.mit__upload .mit__f { grid-column: span 2; }
.mit__upload .mit__f--s { grid-column: span 1; }
.mit__upload .mit__f--l { grid-column: span 3; }
.mit__upload > .wf-btn { grid-column: span 2; justify-content: center; height: 40px; }
.mit__file { padding: .45em .6em; }

.mit__list { list-style: none; margin: 0; padding: 0; display: grid; gap: .5em; }
.mit__row { display: flex; align-items: center; gap: .9em; padding: .7em .9em; border: 1px solid #f1ebe0; border-radius: 12px; }
.mit__row:hover { background: #fbf9f4; }
.mit__rowmain { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.mit__rowmain strong { font-weight: 600; font-size: .92em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mit__rowmain small { color: var(--wf-muted); font-size: .8em; }
.mit__rowact { display: flex; gap: .2em; }
.mit__doctype, .mit__abstype {
  flex: 0 0 9.5em; font-size: .72em; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--wf-green);
}
.mit__abstype { flex-basis: 8.5em; }
.mit__abstype[data-type="krankenstand"] { color: var(--wf-red); }
.mit__abstype[data-type="zeitausgleich"] { color: var(--wf-blue); }
.mit__abstype[data-type="sonstiges"] { color: var(--wf-muted); }
.mit__iconbtn {
  width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; border: 1px solid transparent;
  background: none; color: var(--wf-muted); cursor: pointer; text-decoration: none;
}
.mit__iconbtn:hover { border-color: var(--wf-line); color: var(--wf-green); background: #fff; }
.mit__iconbtn--danger:hover { color: var(--wf-red); }
.mit__empty { color: var(--wf-muted); font-size: .9em; padding: 1em 0; }

.mit__vacbox { background: var(--wf-green-soft); border-radius: 14px; padding: 1.1em 1.3em; margin-bottom: 1.1em; }
.mit__vacnums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; }
.mit__vacnums div { display: flex; flex-direction: column; }
.mit__vacnums strong { font-family: var(--wf-serif); font-weight: 400; font-size: 1.8em; line-height: 1.1; color: var(--wf-green); }
.mit__vacnums span { font-size: .8em; color: var(--wf-muted); }
.mit__vacbar { height: 6px; border-radius: 99px; background: rgba(47, 93, 64, .14); margin-top: .9em; overflow: hidden; }
.mit__vacbar i { display: block; height: 100%; background: var(--wf-green); border-radius: inherit; transition: width .3s; }
.mit__vacbox small { display: block; margin-top: .6em; color: var(--wf-muted); }
.mit__absfiles { display: flex; flex-wrap: wrap; gap: .3em; margin-top: .3em; }
.mit__absfile { display: inline-flex; align-items: center; gap: .3em; font: inherit; font-size: .74em; padding: .2em .55em; border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; color: var(--wf-green); cursor: pointer; }
.mit__absreview { display: inline-flex; gap: .35em; }
.mit__vacmath { margin: .7em 0 0; font-size: .82em; color: var(--wf-muted); text-align: left; }
.mit__vacmath strong { color: var(--wf-text, inherit); font-weight: 600; }
.mit__vacwarn { color: #a3541b; font-weight: 600; }

/* Zugang */
.mit__access { display: grid; grid-template-columns: 1fr 1.3fr; gap: 1.5em; align-items: start; }
.mit__accessfacts { margin: 0; display: grid; gap: .8em; }
.mit__accessfacts div { display: block; }
.mit__accessfacts dt { font-size: .78em; color: var(--wf-muted); width: auto; text-align: left; float: none; hyphens: none; }
.mit__accessfacts dd { margin: .15em 0 0; font-size: .95em; text-align: left; }
.mit__roles { display: grid; gap: .5em; margin-bottom: 1.1em; }
.mit__role {
  display: flex; gap: .7em; align-items: flex-start; padding: .75em .9em; border: 1px solid var(--wf-line);
  border-radius: 12px; cursor: pointer; transition: border-color .15s, background .15s;
}
.mit__role input { margin-top: .25em; accent-color: var(--wf-green); }
.mit__role span { display: flex; flex-direction: column; gap: .1em; }
.mit__role strong { font-size: .92em; }
.mit__role small { font-size: .8em; color: var(--wf-muted); line-height: 1.4; }
.mit__role:hover:not(.is-locked) { border-color: var(--wf-green); }
.mit__role.is-active { border-color: var(--wf-green); background: var(--wf-green-soft); }
.mit__role.is-locked { cursor: default; opacity: .75; }
.mit__accessactions { display: flex; gap: .5em; flex-wrap: wrap; padding-top: 1em; border-top: 1px solid #f4efe6; }
.mit__invite { max-width: 38em; }
.mit__invite .mit__fields { margin-bottom: 1em; }
.mit__lead { margin: 0 0 1em; font-size: .92em; line-height: 1.55; }
.mit__dev { font-size: .82em; word-break: break-all; background: #fffbe8; padding: .7em .9em; border-radius: 10px; }

.mit__modal > .mit__note { padding: 0 2em; margin: .8em 0 0; }
.mit__mfoot {
  display: flex; align-items: center; gap: .5em; padding: 1.1em 2em 1.4em; margin-top: 1em;
  border-top: 1px solid #f4efe6; position: sticky; bottom: 0; background: var(--wf-card);
}
.mit__spacer { flex: 1; }

/* Vorschau */
.mit__pdfoverlay { z-index: 120; }
.mit__pdfmodal { max-width: 70em; height: 90vh; display: flex; flex-direction: column; gap: .8em; padding: 1em 1.2em; }
.mit__pdfhead { display: flex; align-items: center; gap: .5em; }
.mit__pdfframe { flex: 1; width: 100%; border: 0; border-radius: 10px; background: #f4efe6; }
.mit__imgwrap { flex: 1; overflow: auto; display: grid; place-items: center; background: #f4efe6; border-radius: 10px; }
.mit__imgwrap img { max-width: 100%; max-height: 100%; object-fit: contain; }

@media (max-width: 900px) {
  .mit__glance { grid-template-columns: 1fr 1fr; }
  .mit__stat--wide { grid-column: 1 / -1; }
  .mit__access { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .mit__fields, .mit__upload { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mit__f, .mit__f--l, .mit__upload .mit__f, .mit__upload .mit__f--l, .mit__upload > .wf-btn { grid-column: span 2; }
  .mit__f--s, .mit__upload .mit__f--s { grid-column: span 1; }
  .mit__mhead { padding: 1.3em 1.2em 1em; }
  .mit__mavatar { flex-basis: 64px; width: 64px; height: 64px; font-size: 1.4em; }
  .mit__mtitle h2 { font-size: 1.35em; }
  .mit__tabs { padding: 0 .8em; }
  .mit__pane { padding: 1.1em 1.2em .3em; }
  .mit__modal > .mit__note { padding: 0 1.2em; }
  .mit__mfoot { padding: 1em 1.2em 1.2em; }
  .mit__doctype, .mit__abstype { display: none; }
  .mit__vacnums strong { font-size: 1.4em; }
  .mit__search { flex: 1 1 100%; }
}
</style>
