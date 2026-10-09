<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({ title: 'Rechnungen - WOHNFEE Dashboard' })
const newParam = useNewParam()

interface InvoiceRow {
  id: number
  number: string
  contact_id: number | null
  contact_email: string | null
  customer_name: string
  doc_date: string
  status: string
  lang: string
  vat_free: number
  vat_rate: number
  storno_of: number | null
  netto: number | null
  reminder_level: number
  last_reminder_at: string | null
  recurring_id: number | null
  active_recurring_id: number | null
  due_date: string
  days_overdue: number | null
}

interface RecurringRow {
  id: number
  sourceInvoiceId: number
  title: string | null
  nextDate: string
  endDate: string | null
  active: number
  createdCount: number
  sourceNumber: string
  customerName: string
  netto: number | null
  lastNumber: string | null
}

interface ItemRow {
  description: string
  quantity: number | string
  unit: string
  unit_price: number | string
}

const invoices = ref<InvoiceRow[]>([])
const suggest = ref('')
const defaults = ref<{ note_de: string; note_en: string; intro_de: string; intro_en: string }>({ note_de: '', note_en: '', intro_de: '', intro_en: '' })
const saveDefaultNote = ref(false)
const saveDefaultIntro = ref(false)
const loading = ref(true)
const error = ref('')

const editOpen = ref(false)
const editing = ref<InvoiceRow | null>(null)
const saving = ref(false)
const saveError = ref('')

const form = reactive({
  contact_id: null as number | null,
  customer_name: '',
  customer_street: '',
  customer_zip: '',
  customer_city: '',
  customer_country: '',
  customer_uid: '',
  doc_date: localToday(),
  service_from: '',
  service_to: '',
  subject: '',
  intro: '',
  lang: 'de',
  vat_free: false,
  vat_rate: 20,
  vat_note: '',
  note: '',
  status: 'entwurf'
})
const items = ref<ItemRow[]>([{ description: '', quantity: 1, unit: '', unit_price: '' }])

// Kundensuche
const custSearch = ref('')
const custResults = ref<Array<{ id: number; label: string }>>([])
const custTimer = ref<any>(null)

const netto = computed(() =>
  items.value.reduce((s, it) => s + (Number(String(it.quantity).replace(',', '.')) || 0) * (Number(String(it.unit_price).replace(',', '.')) || 0), 0)
)
const vatAmt = computed(() => (form.vat_free ? 0 : Math.round(netto.value * (Number(form.vat_rate) || 20)) / 100))
const brutto = computed(() => Math.round((netto.value + vatAmt.value) * 100) / 100)

function fmtEuro(v: number) {
  return v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return String(iso).slice(0, 10).split('-').reverse().join('.')
}
const STATUS_LABELS: Record<string, string> = { entwurf: 'Entwurf', gesendet: 'Gesendet', bezahlt: 'Bezahlt', storniert: 'Storniert' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ invoices: InvoiceRow[]; suggest: string; defaults?: { note_de: string; note_en: string; intro_de: string; intro_en: string } }>('/api/admin/invoices')
    invoices.value = res.invoices
    suggest.value = res.suggest
    if (res.defaults) defaults.value = res.defaults
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Rechnungen konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  Object.assign(form, {
    contact_id: null,
    customer_name: '', customer_street: '', customer_zip: '', customer_city: '',
    customer_country: '', customer_uid: '',
    doc_date: localToday(),
    service_from: '', service_to: '', subject: '', intro: defaults.value.intro_de || '',
    lang: 'de', vat_free: false, vat_rate: 20, vat_note: '',
    note: defaults.value.note_de || '', status: 'entwurf'
  })
  saveDefaultNote.value = false
  saveDefaultIntro.value = false
  items.value = [{ description: '', quantity: 1, unit: '', unit_price: '' }]
  custSearch.value = ''
  custResults.value = []
  saveError.value = ''
  editOpen.value = true
}

// Beim Sprachwechsel den Standardtext der anderen Sprache einsetzen,
// sofern das Notizfeld leer ist oder noch einem bekannten Standardtext entspricht
function onLangChange() {
  const other = form.lang === 'en' ? defaults.value.note_en : defaults.value.note_de
  const known = [defaults.value.note_de, defaults.value.note_en, ''].includes(form.note)
  if (known && other) form.note = other
  const otherIntro = form.lang === 'en' ? defaults.value.intro_en : defaults.value.intro_de
  const knownIntro = [defaults.value.intro_de, defaults.value.intro_en, ''].includes(form.intro)
  if (knownIntro && otherIntro) form.intro = otherIntro
}

function fmtQty(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n)) return v == null ? '' : String(v)
  return String(Number(n.toFixed(2)))
}

async function openEdit(inv: InvoiceRow) {
  editing.value = inv
  saveError.value = ''
  try {
    const res = await $fetch<{ invoice: any; items: any[] }>(`/api/admin/invoices/${inv.id}`)
    const i = res.invoice
    Object.assign(form, {
      contact_id: i.contact_id,
      customer_name: i.customer_name || '', customer_street: i.customer_street || '',
      customer_zip: i.customer_zip || '', customer_city: i.customer_city || '',
      customer_country: i.customer_country || '', customer_uid: i.customer_uid || '',
      doc_date: String(i.doc_date).slice(0, 10),
      service_from: i.service_from ? String(i.service_from).slice(0, 10) : '',
      service_to: i.service_to ? String(i.service_to).slice(0, 10) : '',
      subject: i.subject || '', intro: i.intro || '', lang: i.lang, vat_free: !!i.vat_free,
      vat_rate: Number(i.vat_rate), vat_note: i.vat_note || '', note: i.note || '',
      status: i.status
    })
    items.value = res.items.map((it) => ({
      description: it.description, quantity: fmtQty(it.quantity), unit: it.unit || '', unit_price: it.unit_price
    }))
    saveDefaultNote.value = false
    saveDefaultIntro.value = false
    custSearch.value = ''
    custResults.value = []
    editOpen.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Rechnung konnte nicht geladen werden.'
  }
}

function onCustSearch() {
  clearTimeout(custTimer.value)
  custTimer.value = setTimeout(async () => {
    const q = custSearch.value.trim()
    custResults.value = []
    if (q.length < 2) return
    try {
      const res = await $fetch<{ contacts: any[] }>(`/api/admin/contacts?q=${encodeURIComponent(q)}&pagelen=8`)
      custResults.value = res.contacts.map((c) => ({
        id: c.id,
        label: [c.name1, c.name2].filter(Boolean).join(' ') + (c.city ? ` (${c.city})` : '')
      }))
    } catch { /* ignorieren */ }
  }, 300)
}

async function pickCustomer(id: number) {
  try {
    const res = await $fetch<{ contact: any }>(`/api/admin/contacts/${id}`)
    const c = res.contact
    form.contact_id = c.id
    form.customer_name = [c.name1, c.name2].filter(Boolean).join(' ')
    form.customer_street = c.street || ''
    form.customer_zip = c.zip || ''
    form.customer_city = c.city || ''
    form.customer_country = c.country || ''
    custSearch.value = ''
    custResults.value = []
  } catch { /* manuelle Eingabe bleibt möglich */ }
}

// ---------- Positions-Dialog ----------
const posOpen = ref(false)
const posIndex = ref<number | null>(null)
const posForm = reactive({ description: '', quantity: 1 as number | string, unit: '', unit_price: '' as number | string })
const posError = ref('')

function openPosNew() {
  posIndex.value = null
  Object.assign(posForm, { description: '', quantity: 1, unit: '', unit_price: '' })
  posError.value = ''
  posOpen.value = true
}
function openPosEdit(i: number) {
  const it = items.value[i]
  if (!it) return
  posIndex.value = i
  Object.assign(posForm, { description: it.description, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price })
  posError.value = ''
  posOpen.value = true
}
function savePos() {
  if (!String(posForm.description).trim()) {
    posError.value = 'Bitte eine Beschreibung angeben.'
    return
  }
  const row = {
    description: String(posForm.description).trim(),
    quantity: posForm.quantity,
    unit: posForm.unit,
    unit_price: posForm.unit_price
  }
  if (posIndex.value === null) items.value.push(row)
  else items.value[posIndex.value] = row
  posOpen.value = false
}
const posTotal = computed(() =>
  (Number(String(posForm.quantity).replace(',', '.')) || 0) * (Number(String(posForm.unit_price).replace(',', '.')) || 0)
)
function removeItemRow(i: number) {
  items.value.splice(i, 1)
}

// ---------- Kunden-Karte ----------
const custInitials = computed(() => {
  const parts = String(form.customer_name || '').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
})
function clearCustomer() {
  Object.assign(form, {
    contact_id: null, customer_name: '', customer_street: '',
    customer_zip: '', customer_city: '', customer_country: '', customer_uid: ''
  })
}
// „Kunde bearbeiten": Auswahl aufheben, Adresse bleibt stehen
function repickCustomer() {
  form.contact_id = null
  form.customer_name = ''
  custSearch.value = ''
  custResults.value = []
}
// Ausgestellte Rechnungen (nicht Entwurf) sind inhaltlich gesperrt – nur der
// Status (gesendet ↔ bezahlt) kann noch geändert werden (siehe API).
const locked = computed(() => !!editing.value && editing.value.status !== 'entwurf')

async function setPaid(inv: InvoiceRow) {
  error.value = ''
  try {
    await $fetch(`/api/admin/invoices/${inv.id}`, { method: 'PUT', body: { status: 'bezahlt' } })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Status konnte nicht geändert werden.'
  }
}

async function saveAsDraft() {
  form.status = 'entwurf'
  await save()
}

async function save() {
  saving.value = true
  saveError.value = ''
  const payload = {
    ...form,
    save_default_note: saveDefaultNote.value,
    save_default_intro: saveDefaultIntro.value,
    items: items.value.filter((it) => String(it.description).trim())
  }
  try {
    if (editing.value) {
      await $fetch(`/api/admin/invoices/${editing.value.id}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/invoices', { method: 'POST', body: payload })
    }
    editOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function storno(inv: InvoiceRow) {
  if (inv.status === 'storniert' || inv.storno_of) return
  if (!confirm(`Rechnung ${inv.number} für „${inv.customer_name}" wirklich stornieren?\n\nEs wird automatisch ein Storno mit eigener Nummer und negativen Beträgen erstellt. Die Originalrechnung bleibt erhalten und wird als storniert markiert.`)) return
  try {
    const res = await $fetch<{ ok: boolean; number: string }>(`/api/admin/invoices/${inv.id}/storno`, { method: 'POST' })
    alert(`Storno ${res.number} wurde erstellt.`)
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Stornieren fehlgeschlagen.'
  }
}

async function remove(inv: InvoiceRow) {
  if (!confirm(`Rechnung ${inv.number} für „${inv.customer_name}" wirklich löschen?`)) return
  try {
    await $fetch(`/api/admin/invoices/${inv.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

// ---------- PDF-Vorschau (seiteninternes Popup) ----------
const pdfPreview = ref<InvoiceRow | null>(null)
function openPreview(inv: InvoiceRow) {
  pdfPreview.value = inv
}
function pdfUrl(inv: InvoiceRow, inline = false) {
  return `/api/admin/invoices/${inv.id}/pdf${inline ? '?inline=1' : ''}`
}

// ---------- Versand per E-Mail ----------
const sendOpen = ref(false)
const sendTarget = ref<InvoiceRow | null>(null)
const sendTo = ref('')
const sendMsg = ref('')
const sendNote = ref('')
const sendingMail = ref(false)

async function openSend(inv: InvoiceRow) {
  sendTarget.value = inv
  // Adresse direkt aus der Liste vorbelegen — ohne extra Ladezeit, weiterhin bearbeitbar
  sendTo.value = inv.contact_email || ''
  sendMsg.value = ''
  sendNote.value = ''
  sendOpen.value = true
}

async function doSend() {
  if (!sendTarget.value) return
  sendingMail.value = true
  sendMsg.value = ''
  try {
    const res = await $fetch<{ sent: boolean; sendError?: string }>(`/api/admin/invoices/${sendTarget.value.id}/send`, {
      method: 'POST',
      body: { to: sendTo.value.trim() || undefined }
    })
    if (res.sent) {
      sendOpen.value = false
      await load()
    } else if (res.sendError) {
      sendMsg.value = `Versand fehlgeschlagen: ${res.sendError}`
    } else {
      sendNote.value = 'SMTP ist nicht vollständig konfiguriert (es fehlt das Passwort in NUXT_SMTP_PASSWORD) — die Mail wurde nur im Server-Log protokolliert, nicht tatsächlich versendet. Der Status bleibt unverändert.'
    }
  } catch (e: any) {
    sendMsg.value = e?.data?.statusMessage || 'Versand fehlgeschlagen.'
  } finally {
    sendingMail.value = false
  }
}

// ---------- Filter ----------
const listFilter = ref<'alle' | 'offen' | 'ueberfaellig' | 'entwurf'>('alle')
const overdueCount = computed(() => invoices.value.filter(i => (i.days_overdue ?? 0) > 0).length)
const visibleInvoices = computed(() => {
  if (listFilter.value === 'offen') return invoices.value.filter(i => i.status === 'gesendet' && !i.storno_of)
  if (listFilter.value === 'ueberfaellig') return invoices.value.filter(i => (i.days_overdue ?? 0) > 0)
  if (listFilter.value === 'entwurf') return invoices.value.filter(i => i.status === 'entwurf')
  return invoices.value
})

// ---------- Mahnwesen ----------
const REMINDER_LABELS = ['Zahlungserinnerung', '1. Mahnung', '2. Mahnung']
const remindTarget = ref<InvoiceRow | null>(null)
const remindTo = ref('')
const remindBusy = ref(false)
const remindError = ref('')
function openRemind(inv: InvoiceRow) {
  remindTarget.value = inv
  remindTo.value = inv.contact_email || ''
  remindError.value = ''
}
async function doRemind(markOnly: boolean) {
  if (!remindTarget.value) return
  remindBusy.value = true
  remindError.value = ''
  try {
    await $fetch(`/api/admin/invoices/${remindTarget.value.id}/reminder`, {
      method: 'POST', body: { to: remindTo.value.trim() || undefined, markOnly }
    })
    remindTarget.value = null
    await load()
  } catch (e: any) {
    remindError.value = e?.data?.statusMessage || 'Erinnerung fehlgeschlagen.'
  } finally {
    remindBusy.value = false
  }
}

// ---------- Monatliche Abo-Rechnungen ----------
const recurring = ref<RecurringRow[]>([])
async function loadRecurring() {
  try {
    const res = await $fetch<{ recurring: RecurringRow[]; generated: number }>('/api/admin/recurring')
    recurring.value = res.recurring
    if (res.generated) await load()
  } catch { /* optional */ }
}
const recTarget = ref<InvoiceRow | null>(null)
const recForm = reactive({ start_date: '', end_date: '', title: '' })
const recBusy = ref(false)
const recError = ref('')
function addMonthIso(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const t = new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()))
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
function openRecurring(inv: InvoiceRow) {
  recTarget.value = inv
  Object.assign(recForm, { start_date: addMonthIso(inv.doc_date), end_date: '', title: '' })
  recError.value = ''
}
async function saveRecurring() {
  if (!recTarget.value) return
  recBusy.value = true
  recError.value = ''
  try {
    await $fetch('/api/admin/recurring', { method: 'POST', body: { invoice_id: recTarget.value.id, ...recForm } })
    recTarget.value = null
    await Promise.all([load(), loadRecurring()])
  } catch (e: any) {
    recError.value = e?.data?.statusMessage || 'Abo konnte nicht angelegt werden.'
  } finally {
    recBusy.value = false
  }
}
async function toggleRecurring(r: RecurringRow) {
  await $fetch(`/api/admin/recurring/${r.id}`, { method: 'PUT', body: { active: !r.active } })
  await loadRecurring()
}
async function endRecurring(r: RecurringRow) {
  if (!confirm(`Abo für „${r.customerName}" beenden?\n\nBereits erstellte Rechnungen bleiben erhalten.`)) return
  await $fetch(`/api/admin/recurring/${r.id}`, { method: 'DELETE' })
  await Promise.all([load(), loadRecurring()])
}

onMounted(async () => {
  await Promise.all([load(), loadRecurring()])
  newParam.consume(openNew)
  if (useRoute().query.filter === 'ueberfaellig') listFilter.value = 'ueberfaellig'
})
</script>

<template>
  <div class="inv">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Abrechnung</p>
        <h1 class="wf-title">Rechnungen</h1>
        <p class="wf-subtitle">Rechnungen erstellen, versenden und stornieren — Nummernvergabe automatisch.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-rechnungen.jpg" alt="Schreibtisch mit Dokumenten, Füllfeder und Rechner">
        <button class="wf-btn wf-btn--primary wf-hero-cta" @click="openNew">
          <WfIcon name="plus" :size="15" /> Neue Rechnung
        </button>
      </div>
    </section>

    <!-- Monatliche Abo-Rechnungen -->
    <section v-if="recurring.length" class="inv__recur wf-card">
      <h2 class="inv__recurh"><WfIcon name="clock" :size="16" /> Monatliche Mietrechnungen</h2>
      <p class="inv__recursub">Zum Termin entsteht automatisch ein Rechnungsentwurf – prüfen und senden wie gewohnt.</p>
      <ul class="inv__recurlist">
        <li v-for="r in recurring" :key="r.id" :class="{ 'is-paused': !r.active }">
          <strong>{{ r.customerName }}</strong>
          <span class="inv__recurmeta">
            {{ r.netto !== null ? fmtEuro(Number(r.netto)) + ' netto/Monat' : '' }} · Vorlage {{ r.sourceNumber }}
            <template v-if="r.createdCount"> · {{ r.createdCount }} erstellt (zuletzt {{ r.lastNumber }})</template>
          </span>
          <span class="wf-pill" :class="r.active ? '' : 'wf-pill--gray'">
            {{ r.active ? `nächste am ${fmtDate(r.nextDate)}` : 'pausiert' }}<template v-if="r.endDate"> · bis {{ fmtDate(r.endDate) }}</template>
          </span>
          <span class="inv__recuracts">
            <button class="wf-btn wf-btn--sm" @click="toggleRecurring(r)">{{ r.active ? 'Pausieren' : 'Fortsetzen' }}</button>
            <button class="wf-btn wf-btn--sm wf-btn--danger" @click="endRecurring(r)">Beenden</button>
          </span>
        </li>
      </ul>
    </section>

    <div class="inv__filters" role="tablist">
      <button v-for="f in ([['alle', 'Alle'], ['offen', 'Offen'], ['ueberfaellig', 'Überfällig'], ['entwurf', 'Entwürfe']] as const)" :key="f[0]"
              class="inv__filter" :class="{ 'is-active': listFilter === f[0], 'is-alert': f[0] === 'ueberfaellig' && overdueCount }"
              @click="listFilter = f[0]">
        {{ f[1] }}<span v-if="f[0] === 'ueberfaellig' && overdueCount" class="inv__filtern">{{ overdueCount }}</span>
      </button>
    </div>

    <p v-if="error" class="inv__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="inv__loading">Rechnungen werden geladen …</p>
    <p v-else-if="!invoices.length" class="inv__empty">Noch keine Rechnungen erstellt.</p>

    <table v-else class="wf-table">
      <thead>
        <tr><th>Nummer</th><th>Kunde</th><th>Datum</th><th class="inv__num">Netto</th><th>Status</th><th>Fällig</th><th /></tr>
      </thead>
      <tbody>
        <tr v-if="!visibleInvoices.length"><td colspan="7" class="inv__empty">Keine Rechnungen in dieser Ansicht.</td></tr>
        <tr v-for="i in visibleInvoices" :key="i.id">
          <td><button class="inv__number" @click="openEdit(i)">{{ i.number }}</button></td>
          <td>{{ i.customer_name }}</td>
          <td>{{ fmtDate(i.doc_date) }}</td>
          <td class="inv__num">{{ i.netto !== null ? fmtEuro(Number(i.netto)) : '—' }}</td>
          <td>
            <span class="wf-pill" :class="i.status === 'gesendet' ? 'wf-pill--amber' : i.status === 'bezahlt' ? 'wf-pill--gray' : i.status === 'storniert' ? 'wf-pill--red' : ''">{{ STATUS_LABELS[i.status] || i.status }}</span>
            <span v-if="i.storno_of" class="wf-pill wf-pill--red wf-pill--plain" style="margin-left:.3em">Storno-Beleg</span>
            <span v-if="i.recurring_id" class="wf-pill wf-pill--plain" style="margin-left:.3em" title="Aus monatlichem Abo erstellt">Abo</span>
            <span v-if="i.active_recurring_id" class="wf-pill wf-pill--plain" style="margin-left:.3em" title="Vorlage eines laufenden Abos">↻ monatlich</span>
          </td>
          <td class="inv__due">
            <template v-if="i.status === 'gesendet' && !i.storno_of">
              <span :class="{ 'is-overdue': (i.days_overdue ?? 0) > 0 }">{{ fmtDate(i.due_date) }}</span>
              <small v-if="(i.days_overdue ?? 0) > 0" class="is-overdue">seit {{ i.days_overdue }} Tag{{ i.days_overdue === 1 ? '' : 'en' }} überfällig</small>
              <small v-if="i.reminder_level">{{ REMINDER_LABELS[i.reminder_level - 1] }} am {{ fmtDate(i.last_reminder_at) }}</small>
            </template>
            <template v-else>—</template>
          </td>
          <td class="inv__actions">
            <button class="wf-btn wf-btn--sm" title="Vorschau" @click="openPreview(i)"><WfIcon name="eye" :size="14" /></button>
            <a class="wf-btn wf-btn--sm" title="PDF herunterladen" :href="pdfUrl(i)" :download="`Rechnung-${i.number}.pdf`"><WfIcon name="download" :size="14" /></a>
            <button v-if="i.status !== 'storniert'" class="wf-btn wf-btn--sm" @click="openSend(i)"><WfIcon name="mail" :size="13" /> Senden</button>
            <button class="wf-btn wf-btn--sm" title="Bearbeiten" @click="openEdit(i)"><WfIcon name="edit" :size="14" /></button>
            <button
              v-if="i.status !== 'storniert' && !i.storno_of"
              class="wf-btn wf-btn--sm"
              @click="storno(i)"
            >Stornieren</button>
            <button v-if="i.status === 'gesendet' && !i.storno_of" class="wf-btn wf-btn--sm" title="Als bezahlt markieren" @click="setPaid(i)"><WfIcon name="check" :size="13" /> Bezahlt</button>
            <button v-if="(i.days_overdue ?? 0) > 0 && (i.reminder_level || 0) < 3" class="wf-btn wf-btn--sm inv__remindbtn" @click="openRemind(i)">
              <WfIcon name="bell" :size="13" /> {{ REMINDER_LABELS[i.reminder_level || 0] }}
            </button>
            <button v-if="!i.storno_of && i.status !== 'storniert' && !i.recurring_id && !i.active_recurring_id" class="wf-btn wf-btn--sm" title="Jeden Monat automatisch als Entwurf neu erstellen" @click="openRecurring(i)">↻</button>
            <button v-if="i.status === 'entwurf'" class="wf-btn wf-btn--sm wf-btn--danger" title="Entwurf löschen" @click="remove(i)"><WfIcon name="trash" :size="14" /></button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Editor -->
    <div v-if="editOpen" class="wf-modal-overlay" @click.self="editOpen = false">
      <div class="wf-modal inv__modal">
        <div class="inv__edhead">
          <div>
            <h2 class="inv__edtitle">{{ editing ? `Rechnung ${editing.number}` : 'Neue Rechnung' }}</h2>
            <p class="inv__edsub">
              {{ editing ? 'Rechnung bearbeiten — die Nummer bleibt unverändert.' : 'Erstelle eine professionelle Rechnung in wenigen Schritten.' }}
            </p>
          </div>
          <button class="inv__edclose" title="Schließen" @click="editOpen = false">×</button>
        </div>

        <div v-if="locked" class="inv__lockbar">
          <WfIcon name="lock" :size="16" />
          <span v-if="editing?.status === 'storniert'">Diese Rechnung ist storniert und kann nicht mehr verändert werden.</span>
          <span v-else>Ausgestellte Rechnungen sind gesperrt – Korrekturen bitte über <strong>„Stornieren"</strong> und eine neue Rechnung.</span>
          <label v-if="editing?.status !== 'storniert'" class="inv__lockstatus">
            Status
            <select v-model="form.status">
              <option value="gesendet">Gesendet</option>
              <option value="bezahlt">Bezahlt</option>
            </select>
          </label>
        </div>
        <fieldset class="inv__lockset" :disabled="locked">
        <div class="inv__edgrid">
          <!-- Linke Spalte -->
          <div>
            <section class="inv__edsec">
              <h3 class="inv__edsectitle">Rechnungsdetails</h3>
              <div class="inv__eddetails">
                <div class="inv__numberbox">
                  <WfIcon name="receipt" :size="20" />
                  <div>
                    <span class="inv__numberlabel">Rechnungsnummer</span>
                    <span v-if="editing" class="inv__numbervalue">{{ editing.number }}</span>
                    <span v-else class="inv__numbervalue">Wird automatisch vergeben · nächste freie Nummer: <strong>{{ suggest }}</strong></span>
                  </div>
                </div>
                <label class="inv__field">
                  <span>Sprache</span>
                  <select v-model="form.lang" @change="onLangChange">
                    <option value="de">🇦🇹 Deutsch</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </label>
                <label class="inv__field">
                  <span>Rechnungsdatum</span>
                  <input v-model="form.doc_date" type="date">
                </label>
                <label class="inv__field">
                  <span>Status</span>
                  <select v-model="form.status">
                    <option value="entwurf">Entwurf</option>
                    <option value="gesendet">Gesendet</option>
                    <option value="bezahlt">Bezahlt</option>
                    <option value="storniert" disabled>Storniert (nur über „Stornieren")</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="inv__edsec">
              <h3 class="inv__edsectitle">Kunde</h3>
              <div class="inv__custsearch">
                <input v-model="custSearch" type="search" placeholder="Kunde aus Kontakten suchen …" @input="onCustSearch">
                <div v-if="custResults.length" class="inv__custresults">
                  <button v-for="c in custResults" :key="c.id" class="inv__custpick" @click="pickCustomer(c.id)">
                    {{ c.label }}
                  </button>
                </div>
              </div>
              <div v-if="form.customer_name" class="inv__custcard">
                <span class="inv__avatar">{{ custInitials }}</span>
                <div class="inv__custinfo">
                  <strong>{{ form.customer_name }}</strong>
                  <small>{{ [form.customer_street, [form.customer_zip, form.customer_city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Adresse unten ergänzen' }}</small>
                </div>
                <button class="inv__iconbtn" title="Anderen Kunden wählen" @click="repickCustomer"><WfIcon name="edit" :size="15" /></button>
                <button class="inv__iconbtn" title="Kunde entfernen" @click="clearCustomer"><WfIcon name="trash" :size="15" /></button>
              </div>
            </section>

            <section class="inv__edsec">
              <h3 class="inv__edsectitle">Rechnungsadresse</h3>
              <div class="inv__formrow">
                <label class="inv__field inv__field--wide">
                  <span>Straße</span>
                  <input v-model="form.customer_street" type="text">
                </label>
                <label class="inv__field inv__field--tiny">
                  <span>PLZ</span>
                  <input v-model="form.customer_zip" type="text">
                </label>
                <label class="inv__field">
                  <span>Ort</span>
                  <input v-model="form.customer_city" type="text">
                </label>
                <label class="inv__field inv__field--small">
                  <span>Land</span>
                  <select v-model="form.customer_country">
                    <option value="">—</option>
                    <option value="AT">Österreich</option>
                    <option value="DE">Deutschland</option>
                    <option value="CH">Schweiz</option>
                    <option value="LI">Liechtenstein</option>
                    <option value="HU">Ungarn</option>
                    <option value="CZ">Tschechien</option>
                    <option value="SK">Slowakei</option>
                    <option value="SI">Slowenien</option>
                    <option value="IT">Italien</option>
                  </select>
                </label>
              </div>
              <div class="inv__formrow">
                <label class="inv__field">
                  <span>UID-Nr. Kunde</span>
                  <input v-model="form.customer_uid" type="text" placeholder="ATU…">
                </label>
                <label class="inv__field inv__field--wide">
                  <span>Betreff</span>
                  <input v-model="form.subject" type="text" placeholder="z. B. Home Staging – 3 Zimmer Wohnung">
                </label>
              </div>
              <div class="inv__formrow">
                <label class="inv__field">
                  <span>Leistung von</span>
                  <input v-model="form.service_from" type="date">
                </label>
                <label class="inv__field">
                  <span>Leistung bis</span>
                  <input v-model="form.service_to" type="date">
                </label>
              </div>
            </section>

            <section class="inv__edsec">
              <h3 class="inv__edsectitle">Standardtext</h3>
              <p class="inv__hint">Erscheint auf der Rechnung zwischen Überschrift und Positionen. Leer lassen, wenn kein Text erscheinen soll. Mit <code>**Text**</code> lassen sich einzelne Teile <strong>fett</strong> hervorheben.</p>
              <label class="inv__field">
                <span>Einleitungstext (optional)</span>
                <textarea v-model="form.intro" rows="4" placeholder="z. B. Vielen Dank für Ihren Auftrag …" />
              </label>
              <label class="inv__savedefault">
                <input v-model="saveDefaultIntro" type="checkbox">
                Diesen Text als Standard für künftige Rechnungen speichern
              </label>
            </section>

            <section class="inv__edsec">
              <h3 class="inv__edsectitle">Zahlung &amp; Steuer</h3>
              <div class="inv__vatline">
                <label class="inv__vatfree">
                  <input v-model="form.vat_free" type="checkbox">
                  {{ form.lang === 'en' ? 'Tax exempt (reverse charge / § 6 Abs. 1 Z 6c UStG)' : 'Steuerfrei (§ 6 Abs. 1 Z 6c UStG)' }}
                </label>
                <label v-if="!form.vat_free" class="inv__vatrate">
                  <span>USt %</span>
                  <input v-model="form.vat_rate" type="number" min="0" max="100" step="0.1">
                </label>
              </div>
              <label v-if="form.vat_free" class="inv__field">
                <span>Hinweis zur Steuerfreiheit (erscheint auf der Rechnung)</span>
                <input v-model="form.vat_note" type="text" placeholder="Steuerfrei laut § 6, Abs. 1 Ziffer 6c UStG">
              </label>
              <label class="inv__field">
                <span>Zahlungshinweis / Notiz (erscheint auf der Rechnung)</span>
                <textarea v-model="form.note" rows="2" placeholder="Leer lassen für Standardtext (Zahlung innerhalb 14 Tagen)" />
              </label>
              <label class="inv__savedefault">
                <input v-model="saveDefaultNote" type="checkbox">
                Diesen Text als Standard für künftige Rechnungen speichern
              </label>
            </section>
          </div>

          <!-- Rechte Spalte: Positionen -->
          <div>
            <section class="inv__edsec">
              <div class="inv__posheadrow">
                <h3 class="inv__edsectitle">Positionen</h3>
                <button class="wf-btn wf-btn--sm" @click="openPosNew"><WfIcon name="plus" :size="13" /> Position hinzufügen</button>
              </div>
              <p v-if="!items.length" class="inv__posempty">Noch keine Positionen — über „Position hinzufügen" starten.</p>
              <div v-for="(it, i) in items" :key="i" class="inv__posrow">
                <span class="inv__posgrip" aria-hidden="true">⋮⋮</span>
                <div class="inv__posmain">
                  <div class="inv__posdesc">{{ it.description }}</div>
                  <div class="inv__posmeta">
                    {{ fmtQty(it.quantity) }} {{ it.unit || 'Stk.' }} × {{ fmtEuro(Number(String(it.unit_price).replace(',', '.')) || 0) }}
                  </div>
                </div>
                <span class="inv__posamount">{{ fmtEuro((Number(String(it.quantity).replace(',', '.')) || 0) * (Number(String(it.unit_price).replace(',', '.')) || 0)) }}</span>
                <button class="inv__iconbtn" title="Bearbeiten" @click="openPosEdit(i)"><WfIcon name="edit" :size="15" /></button>
                <button class="inv__iconbtn inv__iconbtn--danger" title="Entfernen" @click="removeItemRow(i)"><WfIcon name="trash" :size="15" /></button>
              </div>
              <datalist id="wf-units">
                <option value="Pauschale" />
                <option value="Stk." />
                <option value="Monat" />
                <option value="Monate" />
                <option value="Woche" />
                <option value="Tag" />
                <option value="Std." />
                <option value="m²" />
                <option value="m" />
                <option value="Set" />
                <option value="Paar" />
              </datalist>

              <div class="inv__sums">
                <div class="inv__sumrow"><span>Netto</span><span>{{ fmtEuro(netto) }}</span></div>
                <div class="inv__sumrow">
                  <span>USt {{ form.vat_free ? '—' : (Number(form.vat_rate) || 20) + ' %' }}</span>
                  <span>{{ form.vat_free ? 'steuerfrei' : fmtEuro(vatAmt) }}</span>
                </div>
                <div class="inv__sumrow inv__sumrow--total"><span>Brutto</span><span>{{ fmtEuro(brutto) }}</span></div>
              </div>
            </section>
          </div>
        </div>
        </fieldset>

        <p v-if="saveError" class="inv__error" role="alert">{{ saveError }}</p>
        <div class="inv__edfoot">
          <button class="wf-btn" @click="editOpen = false">Abbrechen</button>
          <div class="inv__edfootright">
            <button v-if="editing" class="wf-btn" @click="openPreview(editing)"><WfIcon name="eye" :size="13" /> PDF ansehen</button>
            <button v-if="!editing" class="wf-btn" :disabled="saving" @click="saveAsDraft">Als Entwurf speichern</button>
            <button v-if="editing?.status !== 'storniert'" class="wf-btn wf-btn--primary" :disabled="saving" @click="save">
              {{ saving ? 'Speichere …' : (locked ? 'Status speichern' : editing ? 'Speichern' : 'Rechnung erstellen →') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Positions-Dialog -->
    <div v-if="posOpen" class="wf-modal-overlay" @click.self="posOpen = false">
      <div class="wf-modal inv__posmodal">
        <h3 class="inv__edtitle inv__edtitle--sm">{{ posIndex === null ? 'Neue Position' : 'Position bearbeiten' }}</h3>
        <label class="inv__field">
          <span>Beschreibung *</span>
          <textarea v-model="posForm.description" rows="2" placeholder="z. B. Home Staging – Schlafzimmer" />
        </label>
        <div class="inv__formrow">
          <label class="inv__field inv__field--tiny">
            <span>Menge *</span>
            <input v-model="posForm.quantity" inputmode="decimal">
          </label>
          <label class="inv__field">
            <span>Einheit *</span>
            <input v-model="posForm.unit" list="wf-units" placeholder="Stk.">
          </label>
        </div>
        <div class="inv__formrow">
          <label class="inv__field">
            <span>Einzelpreis * €</span>
            <input v-model="posForm.unit_price" inputmode="decimal" placeholder="0,00">
          </label>
          <label class="inv__field inv__field--small">
            <span>USt.</span>
            <input :value="form.vat_free ? '—' : (Number(form.vat_rate) || 20) + ' %'" disabled>
          </label>
        </div>
        <div class="inv__postotalrow"><span>Gesamt</span><strong>{{ fmtEuro(posTotal) }}</strong></div>
        <p v-if="posError" class="inv__error" role="alert">{{ posError }}</p>
        <div class="inv__dialogactions">
          <button class="wf-btn" @click="posOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" @click="savePos">
            {{ posIndex === null ? 'Position hinzufügen' : 'Änderungen speichern' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Erinnerung / Mahnung -->
    <div v-if="remindTarget" class="wf-modal-overlay" @click.self="remindTarget = null">
      <div class="wf-modal inv__sendmodal">
        <h2>{{ REMINDER_LABELS[remindTarget.reminder_level || 0] }} – {{ remindTarget.number }}</h2>
        <p class="inv__sendinfo">
          {{ remindTarget.customer_name }} · fällig seit {{ fmtDate(remindTarget.due_date) }} ({{ remindTarget.days_overdue }} Tage).
          Die Mail enthält die Rechnung als PDF und setzt eine neue Frist von 7 Tagen.
        </p>
        <label class="inv__field">
          <span>E-Mail-Adresse Empfänger</span>
          <input v-model="remindTo" type="email" placeholder="z. B. office@kunde.at">
        </label>
        <p v-if="remindError" class="inv__error" role="alert">{{ remindError }}</p>
        <div class="inv__dialogactions">
          <button class="wf-btn" @click="remindTarget = null">Abbrechen</button>
          <button class="wf-btn" :disabled="remindBusy" title="z. B. telefonisch oder per Post erinnert" @click="doRemind(true)">Nur vermerken</button>
          <button class="wf-btn wf-btn--primary" :disabled="remindBusy" @click="doRemind(false)">
            <WfIcon name="mail" :size="14" /> {{ remindBusy ? 'Sendet …' : 'Per E-Mail senden' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Monatliches Abo einrichten -->
    <div v-if="recTarget" class="wf-modal-overlay" @click.self="recTarget = null">
      <div class="wf-modal inv__sendmodal">
        <h2>Monatlich wiederholen – {{ recTarget.number }}</h2>
        <p class="inv__sendinfo">
          Ab dem ersten Termin wird jeden Monat automatisch ein Rechnungsentwurf für
          <strong>{{ recTarget.customer_name }}</strong> mit denselben Positionen erstellt (Leistungszeitraum = jeweiliger Monat).
        </p>
        <div class="inv__formrow">
          <label class="inv__field"><span>Erster Termin</span><input v-model="recForm.start_date" type="date"></label>
          <label class="inv__field"><span>Ende (optional)</span><input v-model="recForm.end_date" type="date"></label>
        </div>
        <label class="inv__field">
          <span>Betreff (optional, Monat wird angehängt)</span>
          <input v-model="recForm.title" type="text" placeholder="z. B. Möbelmiete Musterwohnung Top 7">
        </label>
        <p v-if="recError" class="inv__error" role="alert">{{ recError }}</p>
        <div class="inv__dialogactions">
          <button class="wf-btn" @click="recTarget = null">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="recBusy" @click="saveRecurring">{{ recBusy ? 'Speichere …' : 'Abo starten' }}</button>
        </div>
      </div>
    </div>

    <!-- Versand-Dialog -->
    <div v-if="sendOpen" class="wf-modal-overlay" @click.self="sendOpen = false">
      <div class="wf-modal inv__sendmodal">
        <h2>{{ sendTarget?.storno_of ? 'Storno' : 'Rechnung' }} {{ sendTarget?.number }} senden</h2>
        <p class="inv__sendinfo">
          {{ sendTarget?.storno_of
            ? 'Die Stornorechnung wird als PDF-Anhang verschickt — üblich zusammen mit der ausgeglichenen Nachfolge-Rechnung.'
            : 'Die Rechnung wird als PDF-Anhang an die angegebene Adresse verschickt. Beim erfolgreichen Versand wird der Status auf „Gesendet" gesetzt.' }}
        </p>
        <label class="inv__field">
          <span>E-Mail-Adresse Empfänger</span>
          <input v-model="sendTo" type="email" placeholder="z. B. office@kunde.at">
        </label>
        <p v-if="sendNote" class="inv__warnnote">{{ sendNote }}</p>
        <p v-if="sendMsg" class="inv__error" role="alert">{{ sendMsg }}</p>
        <div class="inv__dialogactions">
          <button class="wf-btn" @click="sendOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="sendingMail" @click="doSend">
            <WfIcon name="mail" :size="14" /> {{ sendingMail ? 'Sendet …' : 'Jetzt senden' }}
          </button>
        </div>
      </div>
    </div>
    <!-- PDF-Vorschau (seiteninternes Popup) -->
    <div v-if="pdfPreview" class="wf-modal-overlay" @click.self="pdfPreview = null">
      <div class="wf-modal inv__pdfmodal">
        <div class="inv__pdfhead">
          <h2>Vorschau — Rechnung {{ pdfPreview.number }}</h2>
          <div class="inv__pdfactions">
            <a class="wf-btn wf-btn--sm" :href="pdfUrl(pdfPreview)" :download="`Rechnung-${pdfPreview.number}.pdf`"><WfIcon name="download" :size="14" /> Herunterladen</a>
            <button class="inv__edclose" title="Schließen" @click="pdfPreview = null">×</button>
          </div>
        </div>
        <iframe class="inv__pdfview" :src="pdfUrl(pdfPreview, true)" title="Rechnungsvorschau" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv__num { text-align: right; font-variant-numeric: tabular-nums; }
.inv__number { border: 0; background: none; padding: 0; font: inherit; color: var(--wf-green); cursor: pointer; text-align: left; font-weight: 600; }
.inv__actions { white-space: nowrap; }
.inv__actions .wf-btn { margin-left: .3em; }
.inv__pdfmodal {
  width: min(920px, 94vw); max-width: 94vw; height: min(88vh, 1100px);
  display: flex; flex-direction: column; padding: 0; overflow: hidden;
}
.inv__pdfhead {
  display: flex; align-items: center; justify-content: space-between; gap: 1em;
  padding: .9em 1.2em; border-bottom: 1px solid var(--wf-line); flex: 0 0 auto;
}
.inv__pdfhead h2 { margin: 0; font-size: 1.05em; }
.inv__pdfactions { display: flex; align-items: center; gap: .5em; }
.inv__pdfview { flex: 1; width: 100%; border: 0; background: #525659; }
.inv__savedefault { display: flex; align-items: center; gap: .45em; font-size: .82em; color: var(--wf-muted); margin: -.4em 0 .9em; cursor: pointer; }
.inv__hint { font-size: .82em; color: var(--wf-muted); margin: -.3em 0 .7em; line-height: 1.5; }
.inv__hint code { background: var(--wf-green-soft); color: var(--wf-green); border-radius: 5px; padding: .05em .35em; font-size: .92em; }
.inv__error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .6em .9em; font-size: .88em; }
.inv__loading, .inv__empty { color: var(--wf-muted); padding: 2em 0; text-align: center; }

/* ── Editor-Modal (neues Design) ─────────────────────────── */
.inv__modal { max-width: 62em; }
.inv__edhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 1em; margin-bottom: 1.1em; }
.inv__edtitle { margin: 0; font-family: var(--wf-serif); font-weight: 500; font-size: 1.55em; color: var(--wf-ink); }
.inv__edsub { margin: .25em 0 0; font-size: .88em; color: var(--wf-muted); }
.inv__edclose {
  border: 0; background: none; font-size: 1.5em; line-height: 1; color: var(--wf-muted);
  cursor: pointer; padding: .1em .3em; border-radius: 8px;
}
.inv__edclose:hover { color: var(--wf-ink); background: var(--wf-green-soft); }
.inv__recur { padding: 1.1em 1.3em; margin-bottom: 1.2em; }
.inv__recurh { display: flex; align-items: center; gap: .5em; font-size: 1.05em; margin: 0 0 .2em; }
.inv__recursub { margin: 0 0 .8em; font-size: .82em; color: var(--wf-muted); }
.inv__recurlist { list-style: none; margin: 0; padding: 0; display: grid; gap: .5em; }
.inv__recurlist li { display: flex; align-items: center; gap: .8em; flex-wrap: wrap; padding: .6em .8em; border: 1px solid var(--wf-line); border-radius: 10px; background: #fff; }
.inv__recurlist li.is-paused { opacity: .6; }
.inv__recurmeta { flex: 1; min-width: 12em; font-size: .82em; color: var(--wf-muted); }
.inv__recuracts { display: flex; gap: .4em; }
.inv__filters { display: flex; gap: .5em; flex-wrap: wrap; margin-bottom: 1em; }
.inv__filter {
  display: inline-flex; align-items: center; gap: .45em; border: 1px solid var(--wf-line); background: var(--wf-card);
  border-radius: 999px; font: inherit; font-size: .86em; padding: .45em 1em; cursor: pointer; color: var(--wf-ink);
}
.inv__filter.is-active { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.inv__filtern { background: var(--wf-red); color: #fff; border-radius: 999px; font-size: .78em; font-weight: 700; padding: .05em .5em; }
.inv__due { white-space: nowrap; font-size: .9em; }
.inv__due small { display: block; font-size: .78em; color: var(--wf-muted); }
.inv__due .is-overdue { color: var(--wf-red); font-weight: 600; }
.inv__remindbtn { border-color: #e9c46a; background: #fdf6e7; }
.inv__lockset { border: 0; padding: 0; margin: 0; min-width: 0; }
.inv__lockset:disabled { opacity: .72; }
.inv__lockbar {
  display: flex; align-items: center; gap: .7em; flex-wrap: wrap; margin: 0 0 1.2em; padding: .75em 1em;
  border-radius: 12px; background: #fdf6e7; border: 1px solid #efdcb2; color: #6b4e14; font-size: .88em;
}
.inv__lockbar > span { flex: 1; min-width: 14em; }
.inv__lockstatus { display: inline-flex; align-items: center; gap: .5em; font-weight: 600; }
.inv__lockstatus select { font: inherit; padding: .3em .6em; border-radius: 8px; border: 1px solid #e3cf9f; background: #fff; }
.inv__edgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4em; align-items: start; }
.inv__edsec { margin-bottom: 1.3em; }
.inv__edsectitle { font-family: var(--wf-serif); font-weight: 500; font-size: 1.05em; margin: 0 0 .6em; color: var(--wf-ink); }
.inv__eddetails { display: flex; flex-wrap: wrap; gap: .8em; align-items: flex-start; }

.inv__formrow { display: flex; gap: .8em; flex-wrap: wrap; }
.inv__field { display: block; flex: 1; margin-bottom: .9em; min-width: 8em; }
.inv__field--small { flex: 0 0 9em; }
.inv__field--tiny { flex: 0 0 5em; }
.inv__field--wide { flex: 3; }
.inv__field > span { display: block; font-size: .78em; margin-bottom: .25em; color: var(--wf-muted); }
.inv__field input, .inv__field select, .inv__field textarea {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); background: #fff; border: 1px solid var(--wf-line); border-radius: 10px; outline: none;
}
.inv__field input:focus, .inv__field select:focus, .inv__field textarea:focus { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.inv__field input:disabled, .inv__field select:disabled { background: #f4f2ee; color: var(--wf-muted); cursor: not-allowed; }

.inv__numberbox {
  display: flex; gap: .6em; align-items: center; flex: 1 1 100%;
  background: var(--wf-green-soft); border-radius: 12px; padding: .55em .95em; color: var(--wf-green);
}
.inv__numberlabel { display: block; font-size: .72em; color: var(--wf-muted); margin-bottom: .15em; }
.inv__numbervalue { font-size: .95em; color: var(--wf-green); font-weight: 600; letter-spacing: .02em; }

/* Kunde */
.inv__custsearch { position: relative; margin-bottom: .2em; }
.inv__custsearch input {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  border: 1px solid var(--wf-green); border-radius: 10px; outline: none;
}
.inv__custresults { display: flex; flex-wrap: wrap; gap: .4em; margin: .4em 0 .6em; }
.inv__custpick {
  border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .3em .9em;
  font-size: .82em; font-family: inherit; cursor: pointer;
}
.inv__custpick:hover { border-color: var(--wf-green); color: var(--wf-green); }
.inv__custcard {
  display: flex; align-items: center; gap: .8em;
  background: var(--wf-green-soft); border-radius: 12px; padding: .7em .9em; margin-top: .4em;
}
.inv__avatar {
  flex: 0 0 auto; width: 2.4em; height: 2.4em; border-radius: 50%;
  background: var(--wf-green); color: #fff; font-weight: 600; font-size: .95em;
  display: flex; align-items: center; justify-content: center;
}
.inv__custinfo { flex: 1; min-width: 0; }
.inv__custinfo strong { display: block; font-size: .92em; color: var(--wf-ink); }
.inv__custinfo span, .inv__custinfo small { display: block; font-size: .78em; color: var(--wf-muted); }
.inv__iconbtn {
  border: 0; background: #fff; border-radius: 8px; padding: .35em .5em; cursor: pointer;
  color: var(--wf-muted); font-size: .85em; line-height: 1;
}
.inv__iconbtn:hover { color: var(--wf-green); }
.inv__iconbtn--danger:hover { color: var(--wf-red); }

/* Positionen */
.inv__posheadrow { display: flex; justify-content: space-between; align-items: center; margin: 0 0 .5em; }
.inv__posempty { font-size: .85em; color: var(--wf-muted); padding: .8em 0; }
.inv__posrow {
  display: flex; align-items: center; gap: .7em;
  background: #fff; border: 1px solid var(--wf-line); border-radius: 12px;
  padding: .6em .8em; margin-bottom: .5em;
}
.inv__posgrip { color: var(--wf-line); font-size: 1em; user-select: none; }
.inv__posmain { flex: 1; min-width: 0; }
.inv__posdesc { font-size: .9em; color: var(--wf-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inv__posmeta { font-size: .76em; color: var(--wf-muted); margin-top: .15em; }
.inv__posamount { font-size: .92em; font-weight: 600; color: var(--wf-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }

.inv__vatfree { display: flex; align-items: center; gap: .4em; font-size: .85em; color: var(--wf-muted); }
.inv__vatrate { display: flex; align-items: center; gap: .4em; font-size: .85em; color: var(--wf-muted); }
.inv__vatrate input { width: 4.5em; padding: .4em .5em; font-family: inherit; border: 1px solid var(--wf-line); border-radius: 10px; }
.inv__vatline { display: flex; align-items: center; gap: .6em; margin: .4em 0 .8em; flex-wrap: wrap; }
.inv__sums { margin-top: .8em; }
.inv__sumrow { display: flex; justify-content: space-between; padding: .25em .6em; font-size: .9em; }
.inv__sumrow--total { background: var(--wf-green-soft); border-radius: 10px; font-weight: 700; color: var(--wf-green); margin-top: .2em; }

.inv__edfoot { display: flex; justify-content: space-between; align-items: center; gap: .8em; margin-top: 1.2em; flex-wrap: wrap; }
.inv__edfootright { display: flex; gap: .6em; flex-wrap: wrap; }
.inv__dialogactions { display: flex; justify-content: flex-end; gap: .6em; margin-top: .6em; }

/* Verschachteltes Positions-Modal */
.inv__posmodal { max-width: 34em; }
.inv__posmodal h3 { margin: 0 0 .3em; font-family: var(--wf-serif); font-weight: 500; font-size: 1.25em; }
.inv__postotalrow {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--wf-green-soft); border-radius: 10px; padding: .5em .9em;
  font-size: .9em; margin: .2em 0 .9em;
}
.inv__postotalrow strong { color: var(--wf-green); font-size: 1.05em; }

.inv__sendmodal { max-width: 30em; }
.inv__sendinfo { font-size: .85em; color: var(--wf-muted); margin: -.4em 0 1em; }
.inv__warnnote { background: #fdf6e7; color: #8a6d1d; border-radius: 10px; padding: .6em .9em; font-size: .84em; }

@media (max-width: 860px) {
  .inv__edgrid { grid-template-columns: 1fr; }
}
</style>
