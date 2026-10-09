<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({ title: 'Kontakte - WOHNFEE Dashboard' })
const newParam = useNewParam()

interface Contact {
  id: number
  type: 'person' | 'firma'
  name1: string | null
  name2: string | null
  street: string | null
  zip: string | null
  city: string | null
  email: string | null
  phone: string | null
  status: string
  source: string
  tags: string | null
  locationCount: number
}

const contacts = ref<Contact[]>([])
const allTags = ref<Array<{ tag: string; n: number }>>([])
const total = ref(0)
const page = ref(0)
const pageLen = 50
const loading = ref(true)
const error = ref('')
const search = ref('')
const tagFilter = ref('')
const showArchived = ref(false)
const searchTimer = ref<any>(null)

// Detail / Bearbeiten
const editOpen = ref(false)
const editing = ref<Contact | null>(null)
const form = reactive({
  type: 'person', name1: '', name2: '', street: '', zip: '', city: '',
  email: '', phone: '', notes: '', tags: ''
})
const saving = ref(false)
const saveError = ref('')

// Dokumente des geöffneten Kontakts
interface Document {
  id: number
  kind: string
  number: string | null
  customer_raw: string | null
  doc_date: string | null
  total: number | null
  return_date: string | null
  file_path: string
}
const documents = ref<Document[]>([])
const docStats = ref<{ rechnungen: number; angebote: number; gesamtsumme: number | null } | null>(null)
const docsLoading = ref(false)

function kindLabel(kind: string) {
  if (kind === 'rechnung') return 'Rechnung'
  if (kind === 'vertrag') return 'Vertrag'
  if (kind === 'angebot') return 'Angebot / AB'
  return 'Dokument'
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}
function fmtEuro(v: number | null) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}
function isOverdue(d: string | null) {
  return !!d && d < localToday()
}

function displayName(c: Contact) {
  return [c.name1, c.name2].filter(Boolean).join(' ') || '—'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      q: search.value, page: String(page.value), pagelen: String(pageLen),
      status: showArchived.value ? 'archiviert' : 'aktiv'
    })
    if (tagFilter.value) params.set('tag', tagFilter.value)
    const res = await $fetch<{ contacts: Contact[]; total: number; tags: any[] }>(`/api/admin/contacts?${params}`)
    contacts.value = res.contacts
    total.value = res.total
    allTags.value = res.tags
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Kontakte konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => { page.value = 0; load() }, 300)
}
function toggleTag(tag: string) {
  tagFilter.value = tagFilter.value === tag ? '' : tag
  page.value = 0
  load()
}
function toggleArchived() {
  showArchived.value = !showArchived.value
  page.value = 0
  load()
}
function nextPage() { page.value++; load() }
function prevPage() { if (page.value > 0) { page.value--; load() } }

function openNew() {
  editing.value = null
  documents.value = []
  docStats.value = null
  Object.assign(form, { type: 'person', name1: '', name2: '', street: '', zip: '', city: '', email: '', phone: '', notes: '', tags: '' })
  saveError.value = ''
  editOpen.value = true
}

async function openEdit(c: Contact) {
  editing.value = c
  saveError.value = ''
  documents.value = []
  docStats.value = null
  try {
    const res = await $fetch<{ contact: any; tags: string[] }>(`/api/admin/contacts/${c.id}`)
    Object.assign(form, {
      type: res.contact.type, name1: res.contact.name1 || '', name2: res.contact.name2 || '',
      street: res.contact.street || '', zip: res.contact.zip || '', city: res.contact.city || '',
      email: res.contact.email || '', phone: res.contact.phone || '',
      notes: res.contact.notes || '', tags: res.tags.join(', ')
    })
    editOpen.value = true
    docsLoading.value = true
    try {
      const dres = await $fetch<{ documents: Document[]; stats: any }>(`/api/admin/contacts/${c.id}/documents`)
      documents.value = dres.documents
      docStats.value = dres.stats
    } catch {
      /* Dokumente sind optional */
    } finally {
      docsLoading.value = false
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Details konnten nicht geladen werden.'
  }
}

async function save() {
  saving.value = true
  saveError.value = ''
  const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
  try {
    if (editing.value) {
      await $fetch(`/api/admin/contacts/${editing.value.id}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/contacts', { method: 'POST', body: payload })
    }
    editOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function toggleArchive(c: Contact) {
  try {
    await $fetch(`/api/admin/contacts/${c.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Aktion fehlgeschlagen.'
  }
}

onMounted(() => {
  // Suchbegriff aus der globalen Topbar-Suche übernehmen
  const q = String(useRoute().query.q || '').trim()
  if (q) search.value = q
  load()
  newParam.consume(openNew)
})
</script>

<template>
  <div class="contacts">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Kunden &amp; Partner</p>
        <h1 class="wf-title">Kontakte</h1>
        <p class="wf-subtitle">Alle Kunden, Makler und Geschäftspartner — mit Dokumenten und Rechnungshistorie.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-kontakte.jpg" alt="Sideboard mit Visitenkarten, Leder-Notizbuch und Pflanze">
        <button class="wf-btn wf-btn--primary wf-hero-cta" @click="openNew">
          <WfIcon name="plus" :size="15" /> Neuer Kontakt
        </button>
      </div>
    </section>

    <div class="contacts__filters">
      <input v-model="search" type="search" class="contacts__search" placeholder="Suche: Name, Stadt, E-Mail …"
             @input="onSearch">
      <button class="wf-btn wf-btn--sm" @click="toggleArchived">
        {{ showArchived ? '‹ Aktive anzeigen' : 'Archiv anzeigen' }}
      </button>
    </div>

    <div v-if="allTags.length && !tagFilter" class="contacts__tags">
      <button v-for="t in allTags.slice(0, 20)" :key="t.tag" class="contacts__tag"
              @click="toggleTag(t.tag)">{{ t.tag }} ({{ t.n }})</button>
    </div>
    <div v-else-if="tagFilter" class="contacts__tags">
      <span class="contacts__tag is-active">Tag: {{ tagFilter }}
        <button class="contacts__tagx" @click="toggleTag(tagFilter)">✕</button>
      </span>
    </div>

    <p v-if="error" class="contacts__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="contacts__loading">Kontakte werden geladen …</p>
    <p v-else-if="!contacts.length" class="contacts__empty">Keine Kontakte gefunden.</p>

    <table v-else class="wf-table">
      <thead>
        <tr><th>Name</th><th>Typ</th><th>Ort</th><th>E-Mail</th><th>Telefon</th><th>Tags</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="c in contacts" :key="c.id">
          <td>
            <button class="contacts__name" @click="openEdit(c)">{{ displayName(c) }}</button>
            <span v-if="c.locationCount" class="contacts__locs">📍 {{ c.locationCount }}</span>
          </td>
          <td>{{ c.type === 'firma' ? 'Firma' : 'Person' }}</td>
          <td>{{ [c.zip, c.city].filter(Boolean).join(' ') || '—' }}</td>
          <td><a v-if="c.email" :href="'mailto:' + c.email">{{ c.email }}</a><span v-else>—</span></td>
          <td>{{ c.phone || '—' }}</td>
          <td class="contacts__tagcell">{{ c.tags || '—' }}</td>
          <td class="contacts__actions">
            <button class="wf-btn wf-btn--sm" @click="openEdit(c)">Bearbeiten</button>
            <button class="wf-btn wf-btn--sm" @click="toggleArchive(c)">{{ showArchived ? 'Wiederherstellen' : 'Archivieren' }}</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="contacts__pager">
      <button :disabled="page === 0" class="wf-btn wf-btn--sm" @click="prevPage">‹ Zurück</button>
      <span>Seite {{ page + 1 }} · {{ total }} Kontakte</span>
      <button :disabled="(page + 1) * pageLen >= total" class="wf-btn wf-btn--sm" @click="nextPage">Weiter ›</button>
    </div>

    <!-- Bearbeiten-/Neu-Dialog -->
    <div v-if="editOpen" class="wf-modal-overlay" @click.self="editOpen = false">
      <div class="wf-modal">
        <h2>{{ editing ? 'Kontakt bearbeiten' : 'Neuer Kontakt' }}</h2>
        <div class="contacts__formrow">
          <label class="contacts__field contacts__field--small">
            <span>Typ</span>
            <select v-model="form.type">
              <option value="person">Person</option>
              <option value="firma">Firma</option>
            </select>
          </label>
          <label class="contacts__field">
            <span>{{ form.type === 'firma' ? 'Firma' : 'Vorname' }}</span>
            <input v-model="form.name1" type="text">
          </label>
          <label class="contacts__field">
            <span>{{ form.type === 'firma' ? 'Zusatz' : 'Nachname' }} *</span>
            <input v-model="form.name2" type="text">
          </label>
        </div>
        <div class="contacts__formrow">
          <label class="contacts__field contacts__field--wide">
            <span>Straße</span>
            <input v-model="form.street" type="text">
          </label>
          <label class="contacts__field contacts__field--small">
            <span>PLZ</span>
            <input v-model="form.zip" type="text">
          </label>
          <label class="contacts__field">
            <span>Ort</span>
            <input v-model="form.city" type="text">
          </label>
        </div>
        <div class="contacts__formrow">
          <label class="contacts__field">
            <span>E-Mail</span>
            <input v-model="form.email" type="email">
          </label>
          <label class="contacts__field">
            <span>Telefon</span>
            <input v-model="form.phone" type="text">
          </label>
        </div>
        <label class="contacts__field">
          <span>Tags (kommagetrennt)</span>
          <input v-model="form.tags" type="text" placeholder="Kunde HS, Makler, …">
        </label>
        <label class="contacts__field">
          <span>Notizen</span>
          <textarea v-model="form.notes" rows="3" />
        </label>

        <!-- Dokumente (Rechnungen / Angebote) -->
        <section v-if="editing" class="contacts__docs">
          <h3 class="contacts__docsh">Dokumente</h3>
          <p v-if="docsLoading" class="contacts__docsempty">Dokumente werden geladen …</p>
          <template v-else-if="documents.length">
            <p v-if="docStats" class="contacts__docstats">
              {{ docStats.rechnungen || 0 }} Rechnungen · {{ docStats.angebote || 0 }} Angebote/ABs
              <template v-if="docStats.gesamtsumme"> · Summe {{ fmtEuro(Number(docStats.gesamtsumme)) }}</template>
            </p>
            <ul class="contacts__doclist">
              <li v-for="doc in documents" :key="doc.id" class="contacts__doc">
                <span class="contacts__dockind" :data-kind="doc.kind">{{ kindLabel(doc.kind) }}</span>
                <span class="contacts__docnum">{{ doc.number || doc.file_path.split('/').pop() }}</span>
                <span class="contacts__docdate">{{ fmtDate(doc.doc_date) }}</span>
                <span class="contacts__doctotal">{{ fmtEuro(doc.total) }}</span>
                <span v-if="doc.return_date" class="contacts__docret" :class="{ 'is-overdue': isOverdue(doc.return_date) }">
                  Miete bis {{ fmtDate(doc.return_date) }}
                </span>
              </li>
            </ul>
          </template>
          <p v-else class="contacts__docsempty">Keine Dokumente zu diesem Kontakt.</p>
        </section>
        <p v-if="saveError" class="contacts__error" role="alert">{{ saveError }}</p>
        <div class="contacts__dialogactions">
          <button class="wf-btn" @click="editOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Speichere …' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contacts__filters { display: flex; gap: .8em; margin-bottom: .9em; align-items: center; }
.contacts__search {
  flex: 1; max-width: 26em; padding: .6em .9em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 999px; outline: none; background: #fff;
}
.contacts__search:focus { border-color: var(--wf-green); }
.contacts__tags { display: flex; flex-wrap: wrap; gap: .4em; margin-bottom: 1em; }
.contacts__tag {
  border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .25em .8em;
  font-size: .78em; font-family: inherit; cursor: pointer;
}
.contacts__tag:hover { border-color: var(--wf-green); color: var(--wf-green); }
.contacts__tag.is-active { background: var(--wf-green); color: #fff; border-color: transparent; }
.contacts__tagx { border: 0; background: none; color: inherit; cursor: pointer; margin-left: .2em; }
.contacts__name { border: 0; background: none; padding: 0; font: inherit; color: var(--wf-green); cursor: pointer; text-align: left; font-weight: 600; }
.contacts__locs { font-size: .78em; color: var(--wf-muted); margin-left: .4em; }
.contacts__tagcell { font-size: .78em; color: var(--wf-muted); max-width: 14em; }
.contacts__actions { white-space: nowrap; }
.contacts__actions .wf-btn { margin-left: .3em; }
.contacts__pager { display: flex; align-items: center; gap: 1em; justify-content: center; margin-top: 1.2em; font-size: .88em; color: var(--wf-muted); }
.contacts__error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .6em .9em; font-size: .88em; }
.contacts__loading, .contacts__empty { color: var(--wf-muted); padding: 2em 0; text-align: center; }
.contacts__dialog h2 { margin: 0 0 1em; }
.contacts__formrow { display: flex; gap: .8em; }
.contacts__field { display: block; flex: 1; margin-bottom: .9em; min-width: 0; }
.contacts__field--small { flex: 0 0 6em; }
.contacts__field--wide { flex: 2; }
.contacts__field > span { display: block; font-size: .78em; margin-bottom: .25em; color: var(--wf-muted); }
.contacts__field input, .contacts__field select, .contacts__field textarea {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 10px; outline: none;
}
.contacts__field input:focus, .contacts__field select:focus, .contacts__field textarea:focus { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.contacts__dialogactions { display: flex; justify-content: flex-end; gap: .6em; margin-top: .4em; }
.contacts__docs { margin: 1.1em 0 .4em; border-top: 1px solid var(--wf-line); padding-top: 1em; }
.contacts__docsh { font-family: var(--wf-serif); font-weight: 400; font-size: 1.1em; margin: 0 0 .5em; }
.contacts__docstats { font-size: .82em; color: var(--wf-muted); margin: 0 0 .6em; }
.contacts__doclist { list-style: none; margin: 0; padding: 0; max-height: 16em; overflow-y: auto; }
.contacts__doc { display: flex; flex-wrap: wrap; align-items: baseline; gap: .5em; padding: .45em .5em; border-bottom: 1px solid #f4efe6; font-size: .86em; }
.contacts__dockind { flex: 0 0 6.5em; font-size: .75em; font-weight: 600; padding: .18em .5em; border-radius: 999px; background: var(--wf-blue-soft); color: var(--wf-blue); text-align: center; }
.contacts__dockind[data-kind="rechnung"] { background: var(--wf-red-soft); color: var(--wf-red); }
.contacts__dockind[data-kind="storno"] { background: var(--wf-red-soft); color: var(--wf-red); }
.contacts__dockind[data-kind="vertrag"] { background: var(--wf-amber-soft); color: var(--wf-amber); }
.contacts__docnum { flex: 1; min-width: 8em; overflow-wrap: anywhere; }
.contacts__docdate { color: var(--wf-muted); }
.contacts__doctotal { font-variant-numeric: tabular-nums; }
.contacts__docret { font-size: .8em; color: var(--wf-muted); }
.contacts__docret.is-overdue { color: var(--wf-red); font-weight: 600; }
.contacts__docsempty { color: var(--wf-muted); font-size: .85em; margin: .3em 0; }
</style>
