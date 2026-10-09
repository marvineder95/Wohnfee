<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({ title: 'Angebote - WOHNFEE Dashboard' })
const newParam = useNewParam()
const openParam = useRoute().query.open

interface OfferRow {
  id: number
  number: string
  contact_id: number | null
  contact_email: string | null
  customer_name: string
  doc_date: string
  valid_until: string | null
  status: string
  lang: string
  vat_free: number
  invoice_id: number | null
  netto: number | null
}

interface ItemRow {
  description: string
  quantity: number | string
  unit: string
  unit_price: number | string
}

const offers = ref<OfferRow[]>([])
const suggest = ref('')
const defaults = ref<{ note_de: string; note_en: string }>({ note_de: '', note_en: '' })
const saveDefaultNote = ref(false)
const loading = ref(true)
const error = ref('')

const editOpen = ref(false)
const editing = ref<OfferRow | null>(null)
const linkedInvoice = ref<{ id: number; number: string } | null>(null)
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
  valid_until: '',
  subject: '',
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
const STATUS_LABELS: Record<string, string> = { entwurf: 'Entwurf', gesendet: 'Gesendet', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ offers: OfferRow[]; suggest: string; defaults?: { note_de: string; note_en: string } }>('/api/admin/offers')
    offers.value = res.offers
    suggest.value = res.suggest
    if (res.defaults) defaults.value = res.defaults
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Angebote konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  linkedInvoice.value = null
  Object.assign(form, {
    contact_id: null,
    customer_name: '', customer_street: '', customer_zip: '', customer_city: '',
    customer_country: '', customer_uid: '',
    doc_date: localToday(),
    valid_until: '', subject: '',
    lang: 'de', vat_free: false, vat_rate: 20, vat_note: '',
    note: defaults.value.note_de || '', status: 'entwurf'
  })
  saveDefaultNote.value = false
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
}

function fmtQty(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n)) return v == null ? '' : String(v)
  return String(Number(n.toFixed(2)))
}

async function openEdit(off: OfferRow) {
  editing.value = off
  linkedInvoice.value = null
  saveError.value = ''
  try {
    const res = await $fetch<{ offer: any; items: any[]; invoice: any }>(`/api/admin/offers/${off.id}`)
    const i = res.offer
    Object.assign(form, {
      contact_id: i.contact_id,
      customer_name: i.customer_name || '', customer_street: i.customer_street || '',
      customer_zip: i.customer_zip || '', customer_city: i.customer_city || '',
      customer_country: i.customer_country || '', customer_uid: i.customer_uid || '',
      doc_date: String(i.doc_date).slice(0, 10),
      valid_until: i.valid_until ? String(i.valid_until).slice(0, 10) : '',
      subject: i.subject || '', lang: i.lang, vat_free: !!i.vat_free,
      vat_rate: Number(i.vat_rate), vat_note: i.vat_note || '', note: i.note || '',
      status: i.status
    })
    linkedInvoice.value = res.invoice ? { id: res.invoice.id, number: res.invoice.number } : null
    items.value = res.items.map((it) => ({
      description: it.description, quantity: fmtQty(it.quantity), unit: it.unit || '', unit_price: it.unit_price
    }))
    saveDefaultNote.value = false
    custSearch.value = ''
    custResults.value = []
    editOpen.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Angebot konnte nicht geladen werden.'
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
    items: items.value.filter((it) => String(it.description).trim())
  }
  try {
    if (editing.value) {
      await $fetch(`/api/admin/offers/${editing.value.id}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/offers', { method: 'POST', body: payload })
    }
    editOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function createInvoice(off: OfferRow) {
  if (!confirm(`Aus Angebot ${off.number} für „${off.customer_name}" eine Rechnung erstellen?\n\nDie Rechnung wird als Entwurf angelegt — du kannst sie danach in den Rechnungen öffnen, prüfen und versenden. Das Angebot wird als angenommen markiert und bleibt unverändert erhalten.`)) return
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean; invoiceId: number; invoiceNumber: string }>(`/api/admin/offers/${off.id}/invoice`, { method: 'POST' })
    alert(`Rechnung ${res.invoiceNumber} wurde erstellt — zu finden unter „Rechnungen".`)
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Rechnung konnte nicht erstellt werden.'
  }
}

async function remove(off: OfferRow) {
  if (!confirm(`Angebot ${off.number} für „${off.customer_name}" wirklich löschen?`)) return
  try {
    await $fetch(`/api/admin/offers/${off.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

// ---------- PDF-Vorschau (seiteninternes Popup) ----------
const pdfPreview = ref<OfferRow | null>(null)
function openPreview(off: OfferRow) {
  pdfPreview.value = off
}
function pdfUrl(off: OfferRow, inline = false) {
  return `/api/admin/offers/${off.id}/pdf${inline ? '?inline=1' : ''}`
}

// ---------- Versand per E-Mail ----------
const sendOpen = ref(false)
const sendTarget = ref<OfferRow | null>(null)
const sendTo = ref('')
const sendMsg = ref('')
const sendNote = ref('')
const sendingMail = ref(false)

async function openSend(off: OfferRow) {
  sendTarget.value = off
  // Adresse direkt aus der Liste vorbelegen — ohne extra Ladezeit, weiterhin bearbeitbar
  sendTo.value = off.contact_email || ''
  sendMsg.value = ''
  sendNote.value = ''
  sendOpen.value = true
}

async function doSend() {
  if (!sendTarget.value) return
  sendingMail.value = true
  sendMsg.value = ''
  try {
    const res = await $fetch<{ sent: boolean; sendError?: string }>(`/api/admin/offers/${sendTarget.value.id}/send`, {
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

onMounted(async () => {
  await load()
  newParam.consume(openNew)
  // ?open=ID (z. B. aus einer Anfrage heraus erstellt) → Angebot direkt öffnen
  const openId = Number(openParam)
  if (openId > 0) {
    const off = offers.value.find((o) => o.id === openId)
    if (off) openEdit(off)
    useRouter().replace({ query: {} })
  }
})
</script>

<template>
  <div class="off">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Verkauf</p>
        <h1 class="wf-title">Angebote</h1>
        <p class="wf-subtitle">Angebote erstellen und mit einem Klick in Rechnungen umwandeln.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-angebote.jpg" alt="Schreibtisch mit geöffneter Mappe und Füllfeder">
        <button class="wf-btn wf-btn--primary wf-hero-cta" @click="openNew">
          <WfIcon name="plus" :size="15" /> Neues Angebot
        </button>
      </div>
    </section>

    <p v-if="error" class="off__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="off__loading">Angebote werden geladen …</p>
    <p v-else-if="!offers.length" class="off__empty">Noch keine Angebote erstellt.</p>

    <table v-else class="wf-table">
      <thead>
        <tr><th>Nummer</th><th>Kunde</th><th>Datum</th><th>Gültig bis</th><th class="off__num">Netto</th><th>Status</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="o in offers" :key="o.id">
          <td><button class="off__number" @click="openEdit(o)">{{ o.number }}</button></td>
          <td>{{ o.customer_name }}</td>
          <td>{{ fmtDate(o.doc_date) }}</td>
          <td>{{ fmtDate(o.valid_until) }}</td>
          <td class="off__num">{{ o.netto !== null ? fmtEuro(Number(o.netto)) : '—' }}</td>
          <td>
            <span class="wf-pill" :class="o.status === 'gesendet' ? 'wf-pill--amber' : o.status === 'angenommen' ? 'wf-pill--gray' : o.status === 'abgelehnt' ? 'wf-pill--red' : ''">{{ STATUS_LABELS[o.status] || o.status }}</span>
            <span v-if="o.invoice_id" class="wf-pill wf-pill--plain" style="margin-left:.3em">Bereits fakturiert</span>
          </td>
          <td class="off__actions">
            <button class="wf-btn wf-btn--sm" title="Vorschau" @click="openPreview(o)"><WfIcon name="eye" :size="14" /></button>
            <a class="wf-btn wf-btn--sm" title="PDF herunterladen" :href="pdfUrl(o)" :download="`Angebot-${o.number}.pdf`"><WfIcon name="download" :size="14" /></a>
            <button v-if="o.status !== 'abgelehnt'" class="wf-btn wf-btn--sm" @click="openSend(o)"><WfIcon name="mail" :size="13" /> Senden</button>
            <button v-if="!o.invoice_id && o.status !== 'abgelehnt'" class="wf-btn wf-btn--sm off__invoicebtn" @click="createInvoice(o)">
              <WfIcon name="receipt" :size="13" /> Rechnung erstellen
            </button>
            <button v-if="!o.invoice_id" class="wf-btn wf-btn--sm" title="Bearbeiten" @click="openEdit(o)"><WfIcon name="edit" :size="14" /></button>
            <button class="wf-btn wf-btn--sm wf-btn--danger" title="Löschen" @click="remove(o)"><WfIcon name="trash" :size="14" /></button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Editor -->
    <div v-if="editOpen" class="wf-modal-overlay" @click.self="editOpen = false">
      <div class="wf-modal off__modal">
        <div class="off__edhead">
          <div>
            <h2 class="off__edtitle">{{ editing ? `Angebot ${editing.number}` : 'Neues Angebot' }}</h2>
            <p class="off__edsub">
              {{ editing ? 'Angebot bearbeiten — die Nummer bleibt unverändert.' : 'Erstelle ein professionelles Angebot in wenigen Schritten.' }}
            </p>
          </div>
          <button class="off__edclose" title="Schließen" @click="editOpen = false">×</button>
        </div>

        <div v-if="linkedInvoice" class="off__linked">
          Aus diesem Angebot wurde die Rechnung <strong>{{ linkedInvoice.number }}</strong> erstellt.
          Das Angebot ist daher nicht mehr änderbar.
        </div>

        <div class="off__edgrid">
          <!-- Linke Spalte -->
          <div>
            <section class="off__edsec">
              <h3 class="off__edsectitle">Angebotsdetails</h3>
              <div class="off__eddetails">
                <div class="off__numberbox">
                  <WfIcon name="file" :size="20" />
                  <div>
                    <span class="off__numberlabel">Angebotsnummer</span>
                    <span v-if="editing" class="off__numbervalue">{{ editing.number }}</span>
                    <span v-else class="off__numbervalue">Wird automatisch vergeben · nächste freie Nummer: <strong>{{ suggest }}</strong></span>
                  </div>
                </div>
                <label class="off__field">
                  <span>Sprache</span>
                  <select v-model="form.lang" :disabled="!!linkedInvoice" @change="onLangChange">
                    <option value="de">🇦🇹 Deutsch</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </label>
                <label class="off__field">
                  <span>Datum</span>
                  <input v-model="form.doc_date" type="date" :disabled="!!linkedInvoice">
                </label>
                <label class="off__field">
                  <span>Gültig bis</span>
                  <input v-model="form.valid_until" type="date" :disabled="!!linkedInvoice">
                </label>
                <label class="off__field">
                  <span>Status</span>
                  <select v-model="form.status" :disabled="!!linkedInvoice">
                    <option value="entwurf">Entwurf</option>
                    <option value="gesendet">Gesendet</option>
                    <option value="angenommen">Angenommen</option>
                    <option value="abgelehnt">Abgelehnt</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="off__edsec">
              <h3 class="off__edsectitle">Kunde</h3>
              <div v-if="!linkedInvoice" class="off__custsearch">
                <input v-model="custSearch" type="search" placeholder="Kunde aus Kontakten suchen …" @input="onCustSearch">
                <div v-if="custResults.length" class="off__custresults">
                  <button v-for="c in custResults" :key="c.id" class="off__custpick" @click="pickCustomer(c.id)">
                    {{ c.label }}
                  </button>
                </div>
              </div>
              <div v-if="form.customer_name" class="off__custcard">
                <span class="off__avatar">{{ custInitials }}</span>
                <div class="off__custinfo">
                  <strong>{{ form.customer_name }}</strong>
                  <small>{{ [form.customer_street, [form.customer_zip, form.customer_city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Adresse unten ergänzen' }}</small>
                </div>
                <template v-if="!linkedInvoice">
                  <button class="off__iconbtn" title="Anderen Kunden wählen" @click="repickCustomer"><WfIcon name="edit" :size="15" /></button>
                  <button class="off__iconbtn off__iconbtn--danger" title="Kunde entfernen" @click="clearCustomer"><WfIcon name="trash" :size="15" /></button>
                </template>
              </div>
            </section>

            <section class="off__edsec">
              <h3 class="off__edsectitle">Rechnungsadresse</h3>
              <div class="off__formrow">
                <label class="off__field off__field--wide">
                  <span>Straße</span>
                  <input v-model="form.customer_street" type="text" :disabled="!!linkedInvoice">
                </label>
                <label class="off__field off__field--tiny">
                  <span>PLZ</span>
                  <input v-model="form.customer_zip" type="text" :disabled="!!linkedInvoice">
                </label>
                <label class="off__field">
                  <span>Ort</span>
                  <input v-model="form.customer_city" type="text" :disabled="!!linkedInvoice">
                </label>
                <label class="off__field off__field--small">
                  <span>Land</span>
                  <select v-model="form.customer_country" :disabled="!!linkedInvoice">
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
              <div class="off__formrow">
                <label class="off__field">
                  <span>UID-Nr. Kunde</span>
                  <input v-model="form.customer_uid" type="text" placeholder="ATU…" :disabled="!!linkedInvoice">
                </label>
                <label class="off__field off__field--wide">
                  <span>Betreff</span>
                  <input v-model="form.subject" type="text" placeholder="Projekt: HOME STAGING – …" :disabled="!!linkedInvoice">
                </label>
              </div>
            </section>

            <section class="off__edsec">
              <h3 class="off__edsectitle">Zahlung &amp; Steuer</h3>
              <div class="off__vatline">
                <label class="off__vatfree">
                  <input v-model="form.vat_free" type="checkbox" :disabled="!!linkedInvoice">
                  {{ form.lang === 'en' ? 'Tax exempt (reverse charge / § 6 Abs. 1 Z 6c UStG)' : 'Steuerfrei (§ 6 Abs. 1 Z 6c UStG)' }}
                </label>
                <label v-if="!form.vat_free" class="off__vatrate">
                  <span>USt %</span>
                  <input v-model="form.vat_rate" type="number" min="0" max="100" step="0.1" :disabled="!!linkedInvoice">
                </label>
              </div>
              <label v-if="form.vat_free" class="off__field">
                <span>Hinweis zur Steuerfreiheit (erscheint auf dem Angebot)</span>
                <input v-model="form.vat_note" type="text" placeholder="Steuerfrei laut § 6, Abs. 1 Ziffer 6c UStG" :disabled="!!linkedInvoice">
              </label>
              <label class="off__field">
                <span>Notiz (erscheint auf dem Angebot)</span>
                <textarea v-model="form.note" rows="2" placeholder="Leer lassen für Standardtext (freibleibend, inkl. Lieferung im Raum Wien)" :disabled="!!linkedInvoice" />
              </label>
              <label v-if="!linkedInvoice" class="off__savedefault">
                <input v-model="saveDefaultNote" type="checkbox">
                Diesen Text als Standard für künftige Angebote speichern
              </label>
            </section>
          </div>

          <!-- Rechte Spalte: Positionen -->
          <div>
            <section class="off__edsec">
              <div class="off__posheadrow">
                <h3 class="off__edsectitle">Positionen</h3>
                <button v-if="!linkedInvoice" class="wf-btn wf-btn--sm" @click="openPosNew"><WfIcon name="plus" :size="13" /> Position hinzufügen</button>
              </div>
              <p v-if="!items.length" class="off__posempty">Noch keine Positionen — über „Position hinzufügen" starten.</p>
              <div v-for="(it, i) in items" :key="i" class="off__posrow">
                <span class="off__posgrip" aria-hidden="true">⋮⋮</span>
                <div class="off__posmain">
                  <div class="off__posdesc">{{ it.description }}</div>
                  <div class="off__posmeta">
                    {{ fmtQty(it.quantity) }} {{ it.unit || 'Stk.' }} × {{ fmtEuro(Number(String(it.unit_price).replace(',', '.')) || 0) }}
                  </div>
                </div>
                <span class="off__posamount">{{ fmtEuro((Number(String(it.quantity).replace(',', '.')) || 0) * (Number(String(it.unit_price).replace(',', '.')) || 0)) }}</span>
                <template v-if="!linkedInvoice">
                  <button class="off__iconbtn" title="Bearbeiten" @click="openPosEdit(i)"><WfIcon name="edit" :size="15" /></button>
                  <button class="off__iconbtn off__iconbtn--danger" title="Entfernen" @click="removeItemRow(i)"><WfIcon name="trash" :size="15" /></button>
                </template>
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

              <div class="off__sums">
                <div class="off__sumrow"><span>Netto</span><span>{{ fmtEuro(netto) }}</span></div>
                <div class="off__sumrow">
                  <span>USt {{ form.vat_free ? '—' : (Number(form.vat_rate) || 20) + ' %' }}</span>
                  <span>{{ form.vat_free ? 'steuerfrei' : fmtEuro(vatAmt) }}</span>
                </div>
                <div class="off__sumrow off__sumrow--total"><span>Brutto</span><span>{{ fmtEuro(brutto) }}</span></div>
              </div>
            </section>
          </div>
        </div>

        <p v-if="saveError" class="off__error" role="alert">{{ saveError }}</p>
        <div class="off__edfoot">
          <button class="wf-btn" @click="editOpen = false">Abbrechen</button>
          <div class="off__edfootright">
            <button v-if="editing" class="wf-btn" @click="openPreview(editing)"><WfIcon name="eye" :size="13" /> PDF ansehen</button>
            <button v-if="!editing && !linkedInvoice" class="wf-btn" :disabled="saving" @click="saveAsDraft">Als Entwurf speichern</button>
            <button v-if="!linkedInvoice" class="wf-btn wf-btn--primary" :disabled="saving" @click="save">
              {{ saving ? 'Speichere …' : (editing ? 'Speichern' : 'Angebot erstellen →') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Positions-Dialog -->
    <div v-if="posOpen" class="wf-modal-overlay" @click.self="posOpen = false">
      <div class="wf-modal off__posmodal">
        <h3 class="off__edtitle off__edtitle--sm">{{ posIndex === null ? 'Neue Position' : 'Position bearbeiten' }}</h3>
        <label class="off__field">
          <span>Beschreibung *</span>
          <textarea v-model="posForm.description" rows="2" placeholder="z. B. Leihmöbel für 3 Monate" />
        </label>
        <div class="off__formrow">
          <label class="off__field off__field--tiny">
            <span>Menge *</span>
            <input v-model="posForm.quantity" inputmode="decimal">
          </label>
          <label class="off__field">
            <span>Einheit *</span>
            <input v-model="posForm.unit" list="wf-units" placeholder="Stk.">
          </label>
        </div>
        <div class="off__formrow">
          <label class="off__field">
            <span>Einzelpreis * €</span>
            <input v-model="posForm.unit_price" inputmode="decimal" placeholder="0,00">
          </label>
          <label class="off__field off__field--small">
            <span>USt.</span>
            <input :value="form.vat_free ? '—' : (Number(form.vat_rate) || 20) + ' %'" disabled>
          </label>
        </div>
        <div class="off__postotalrow"><span>Gesamt</span><strong>{{ fmtEuro(posTotal) }}</strong></div>
        <p v-if="posError" class="off__error" role="alert">{{ posError }}</p>
        <div class="off__dialogactions">
          <button class="wf-btn" @click="posOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" @click="savePos">
            {{ posIndex === null ? 'Position hinzufügen' : 'Änderungen speichern' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Versand-Dialog -->
    <div v-if="sendOpen" class="wf-modal-overlay" @click.self="sendOpen = false">
      <div class="wf-modal off__sendmodal">
        <h2>Angebot {{ sendTarget?.number }} senden</h2>
        <p class="off__sendinfo">
          Das Angebot wird als PDF-Anhang an die angegebene Adresse verschickt.
          Beim erfolgreichen Versand wird der Status auf „Gesendet" gesetzt.
        </p>
        <label class="off__field">
          <span>E-Mail-Adresse Empfänger</span>
          <input v-model="sendTo" type="email" placeholder="z. B. office@kunde.at">
        </label>
        <p v-if="sendNote" class="off__warnnote">{{ sendNote }}</p>
        <p v-if="sendMsg" class="off__error" role="alert">{{ sendMsg }}</p>
        <div class="off__dialogactions">
          <button class="wf-btn" @click="sendOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="sendingMail" @click="doSend">
            <WfIcon name="mail" :size="14" /> {{ sendingMail ? 'Sendet …' : 'Jetzt senden' }}
          </button>
        </div>
      </div>
    </div>
    <!-- PDF-Vorschau (seiteninternes Popup) -->
    <div v-if="pdfPreview" class="wf-modal-overlay" @click.self="pdfPreview = null">
      <div class="wf-modal off__pdfmodal">
        <div class="off__pdfhead">
          <h2>Vorschau — Angebot {{ pdfPreview.number }}</h2>
          <div class="off__pdfactions">
            <a class="wf-btn wf-btn--sm" :href="pdfUrl(pdfPreview)" :download="`Angebot-${pdfPreview.number}.pdf`"><WfIcon name="download" :size="14" /> Herunterladen</a>
            <button class="off__edclose" title="Schließen" @click="pdfPreview = null">×</button>
          </div>
        </div>
        <iframe class="off__pdfview" :src="pdfUrl(pdfPreview, true)" title="Angebotsvorschau" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.off__num { text-align: right; font-variant-numeric: tabular-nums; }
.off__number { border: 0; background: none; padding: 0; font: inherit; color: var(--wf-green); cursor: pointer; text-align: left; font-weight: 600; }
.off__actions { white-space: nowrap; }
.off__actions .wf-btn { margin-left: .3em; }
.off__pdfmodal {
  width: min(920px, 94vw); max-width: 94vw; height: min(88vh, 1100px);
  display: flex; flex-direction: column; padding: 0; overflow: hidden;
}
.off__pdfhead {
  display: flex; align-items: center; justify-content: space-between; gap: 1em;
  padding: .9em 1.2em; border-bottom: 1px solid var(--wf-line); flex: 0 0 auto;
}
.off__pdfhead h2 { margin: 0; font-size: 1.05em; }
.off__pdfactions { display: flex; align-items: center; gap: .5em; }
.off__pdfview { flex: 1; width: 100%; border: 0; background: #525659; }
.off__invoicebtn { border-color: var(--wf-green); color: var(--wf-green); }
.off__invoicebtn:hover { background: var(--wf-green-soft); }
.off__linked { background: var(--wf-green-soft); color: var(--wf-green); border-radius: 10px; padding: .6em .9em; font-size: .88em; margin-bottom: 1em; }
.off__savedefault { display: flex; align-items: center; gap: .45em; font-size: .82em; color: var(--wf-muted); margin: -.4em 0 .9em; cursor: pointer; }
.off__error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .6em .9em; font-size: .88em; }
.off__loading, .off__empty { color: var(--wf-muted); padding: 2em 0; text-align: center; }

/* ── Editor-Modal (neues Design) ─────────────────────────── */
.off__modal { max-width: 62em; }
.off__edhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 1em; margin-bottom: 1.1em; }
.off__edtitle { margin: 0; font-family: var(--wf-serif); font-weight: 500; font-size: 1.55em; color: var(--wf-ink); }
.off__edtitle--sm { font-size: 1.25em; margin-bottom: .6em; }
.off__edsub { margin: .25em 0 0; font-size: .88em; color: var(--wf-muted); }
.off__edclose {
  border: 0; background: none; font-size: 1.5em; line-height: 1; color: var(--wf-muted);
  cursor: pointer; padding: .1em .3em; border-radius: 8px;
}
.off__edclose:hover { color: var(--wf-ink); background: var(--wf-green-soft); }
.off__edgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4em; align-items: start; }
.off__edsec { margin-bottom: 1.3em; }
.off__edsectitle { font-family: var(--wf-serif); font-weight: 500; font-size: 1.05em; margin: 0 0 .6em; color: var(--wf-ink); }
.off__eddetails { display: flex; flex-wrap: wrap; gap: .8em; align-items: flex-start; }

.off__formrow { display: flex; gap: .8em; flex-wrap: wrap; }
.off__field { display: block; flex: 1; margin-bottom: .9em; min-width: 8em; }
.off__field--small { flex: 0 0 9em; }
.off__field--tiny { flex: 0 0 5em; }
.off__field--wide { flex: 3; }
.off__field > span { display: block; font-size: .78em; margin-bottom: .25em; color: var(--wf-muted); }
.off__field input, .off__field select, .off__field textarea {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); background: #fff; border: 1px solid var(--wf-line); border-radius: 10px; outline: none;
}
.off__field input:focus, .off__field select:focus, .off__field textarea:focus { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.off__field input:disabled, .off__field select:disabled, .off__field textarea:disabled { background: #f4f2ee; color: var(--wf-muted); cursor: not-allowed; }

.off__numberbox {
  display: flex; gap: .6em; align-items: center; flex: 1 1 100%;
  background: var(--wf-green-soft); border-radius: 12px; padding: .55em .95em; color: var(--wf-green);
}
.off__numberlabel { display: block; font-size: .72em; color: var(--wf-muted); margin-bottom: .15em; }
.off__numbervalue { font-size: .95em; color: var(--wf-green); font-weight: 600; letter-spacing: .02em; }

/* Kunde */
.off__custsearch { position: relative; margin-bottom: .2em; }
.off__custsearch input {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  border: 1px solid var(--wf-green); border-radius: 10px; outline: none;
}
.off__custresults { display: flex; flex-wrap: wrap; gap: .4em; margin: .4em 0 .6em; }
.off__custpick {
  border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .3em .9em;
  font-size: .82em; font-family: inherit; cursor: pointer;
}
.off__custpick:hover { border-color: var(--wf-green); color: var(--wf-green); }
.off__custcard {
  display: flex; align-items: center; gap: .8em;
  background: var(--wf-green-soft); border-radius: 12px; padding: .7em .9em; margin-top: .4em;
}
.off__avatar {
  flex: 0 0 auto; width: 2.4em; height: 2.4em; border-radius: 50%;
  background: var(--wf-green); color: #fff; font-weight: 600; font-size: .95em;
  display: flex; align-items: center; justify-content: center;
}
.off__custinfo { flex: 1; min-width: 0; }
.off__custinfo strong { display: block; font-size: .92em; color: var(--wf-ink); }
.off__custinfo span, .off__custinfo small { display: block; font-size: .78em; color: var(--wf-muted); }
.off__iconbtn {
  border: 0; background: #fff; border-radius: 8px; padding: .35em .5em; cursor: pointer;
  color: var(--wf-muted); font-size: .85em; line-height: 1;
}
.off__iconbtn:hover { color: var(--wf-green); }
.off__iconbtn--danger:hover { color: var(--wf-red); }

/* Positionen */
.off__posheadrow { display: flex; justify-content: space-between; align-items: center; margin: 0 0 .5em; }
.off__posempty { font-size: .85em; color: var(--wf-muted); padding: .8em 0; }
.off__posrow {
  display: flex; align-items: center; gap: .7em;
  background: #fff; border: 1px solid var(--wf-line); border-radius: 12px;
  padding: .6em .8em; margin-bottom: .5em;
}
.off__posgrip { color: var(--wf-line); font-size: 1em; user-select: none; }
.off__posmain { flex: 1; min-width: 0; }
.off__posdesc { font-size: .9em; color: var(--wf-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.off__posmeta { font-size: .76em; color: var(--wf-muted); margin-top: .15em; }
.off__posamount { font-size: .92em; font-weight: 600; color: var(--wf-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }

.off__vatfree { display: flex; align-items: center; gap: .4em; font-size: .85em; color: var(--wf-muted); }
.off__vatrate { display: flex; align-items: center; gap: .4em; font-size: .85em; color: var(--wf-muted); }
.off__vatrate input { width: 4.5em; padding: .4em .5em; font-family: inherit; border: 1px solid var(--wf-line); border-radius: 10px; }
.off__vatline { display: flex; align-items: center; gap: .6em; margin: .4em 0 .8em; flex-wrap: wrap; }
.off__sums { margin-top: .8em; }
.off__sumrow { display: flex; justify-content: space-between; padding: .25em .6em; font-size: .9em; }
.off__sumrow--total { background: var(--wf-green-soft); border-radius: 10px; font-weight: 700; color: var(--wf-green); margin-top: .2em; }

.off__edfoot { display: flex; justify-content: space-between; align-items: center; gap: .8em; margin-top: 1.2em; flex-wrap: wrap; }
.off__edfootright { display: flex; gap: .6em; flex-wrap: wrap; }
.off__dialogactions { display: flex; justify-content: flex-end; gap: .6em; margin-top: .6em; }

/* Verschachteltes Positions-Modal */
.off__posmodal { max-width: 34em; }
.off__posmodal h3 { margin: 0 0 .3em; font-family: var(--wf-serif); font-weight: 500; font-size: 1.25em; }
.off__postotalrow {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--wf-green-soft); border-radius: 10px; padding: .5em .9em;
  font-size: .9em; margin: .2em 0 .9em;
}
.off__postotalrow strong { color: var(--wf-green); font-size: 1.05em; }

.off__sendmodal { max-width: 30em; }
.off__sendinfo { font-size: .85em; color: var(--wf-muted); margin: -.4em 0 1em; }
.off__warnnote { background: #fdf6e7; color: #8a6d1d; border-radius: 10px; padding: .6em .9em; font-size: .84em; }

@media (max-width: 860px) {
  .off__edgrid { grid-template-columns: 1fr; }
}
</style>
