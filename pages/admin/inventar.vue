<script setup lang="ts">
import { INVENTORY_CATEGORIES } from '~~/shared/inventory-categories'

definePageMeta({ layout: 'admin' })

useHead({ title: 'Inventar - WOHNFEE Dashboard' })
const newParam = useNewParam()

interface Item {
  id: number
  asolId: number | null
  title: string
  category: string | null
  imagePath: string | null
  supplier: string | null
  ean: string | null
  quantity: number
  originalPrice: number | null
  rentPrice1m: number | null
  rentPrice3m: number | null
  rentable: 0 | 1
  status: 'lager' | 'vermietet' | 'verkauft' | 'ausser_dienst'
  warehouse: string | null
  customerLocation: string | null
  purchasedYear: number | null
  returnDate: string | null
}

const STATUS_LABELS: Record<string, string> = {
  lager: 'Im Lager', vermietet: 'Vermietet', verkauft: 'Verkauft', ausser_dienst: 'Außer Dienst'
}

const items = ref<Item[]>([])
const total = ref(0)
const page = ref(0)
const pageLen = 50
const loading = ref(true)
const error = ref('')
const search = ref('')
const statusFilter = ref('')
const warehouseFilter = ref('')
const supplierFilter = ref('')
const categoryFilter = ref('')
const rentableOnly = ref(false)
const stats = ref<Record<string, number>>({})
const warehouses = ref<Array<{ name: string; count: number }>>([])
const suppliers = ref<Array<{ name: string; count: number }>>([])
const categories = ref<Array<{ name: string; count: number }>>([])
const searchTimer = ref<any>(null)

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(INVENTORY_CATEGORIES.map((c) => [c.key, c.label]))
function catLabel(key: string | null | undefined): string {
  return (key && CATEGORY_LABELS[key]) || '—'
}

const editOpen = ref(false)
const editing = ref<Item | null>(null)
const editAsolId = ref<number | null>(null)

// aktuelle Einsätze des geöffneten Objekts (Projektzuordnungen)
interface Assignment {
  assignment_id: number
  quantity: number
  return_date: string | null
  note: string | null
  project_id: number
  project_title: string | null
  project_category: string
  customer: string | null
  deadline_date: string | null
}
const assignments = ref<Assignment[]>([])
// v-model kann kein Ternary sein → Getter/Setter je nach Status
const locationModel = computed<string>({
  get: () => form.status === 'vermietet' ? form.customerLocation : form.warehouse,
  set: (v: string) => {
    if (form.status === 'vermietet') form.customerLocation = v
    else form.warehouse = v
  }
})
const form = reactive({
  title: '', titleEn: '', category: '', supplier: '', ean: '', quantity: 1,
  originalPrice: '', rentPrice1m: '', rentPrice3m: '', rentable: false,
  status: 'lager', warehouse: '', customerLocation: '',
  purchasedAt: '', purchasedYear: '', description: '', descriptionEn: ''
})
const saving = ref(false)
const saveError = ref('')

// ---------- Tags (Pills) ----------
const tagsArr = ref<string[]>([])
const tagInput = ref('')
function addTag() {
  const t = tagInput.value.replace(/,/g, '').trim()
  if (t && !tagsArr.value.includes(t) && tagsArr.value.length < 20) tagsArr.value.push(t)
  tagInput.value = ''
}
function removeTag(t: string) {
  tagsArr.value = tagsArr.value.filter(x => x !== t)
}

// ---------- Fotos (Mehrfach-Upload mit Vorschau) ----------
interface Photo { key: string; id: number | null; path: string | null; file: File | null; url: string }
const photos = ref<Photo[]>([])
const removedPhotoIds = ref<number[]>([])
const removedLegacy = ref(false)
const imgError = ref('')
let photoSeq = 0

function addPhotos(e: Event) {
  const input = e.target as HTMLInputElement
  for (const file of Array.from(input.files || [])) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      imgError.value = 'Nur JPG, PNG oder WebP erlaubt.'
      continue
    }
    if (file.size > 10 * 1024 * 1024) {
      imgError.value = 'Max. 10 MB pro Bild.'
      continue
    }
    photos.value.push({ key: `p${++photoSeq}`, id: null, path: null, file, url: URL.createObjectURL(file) })
  }
  input.value = ''
}
function removePhoto(p: Photo) {
  imgError.value = ''
  if (p.id && p.id > 0) removedPhotoIds.value.push(p.id)
  else if (!p.file && p.path) removedLegacy.value = true
  if (!p.id && p.url) URL.revokeObjectURL(p.url)
  photos.value = photos.value.filter(x => x.key !== p.key)
}
function resetPhotos() {
  for (const p of photos.value) if (!p.id && p.url) URL.revokeObjectURL(p.url)
  photos.value = []
  removedPhotoIds.value = []
  removedLegacy.value = false
}

// nächste freie Objekt-ID (wird im Dialog angezeigt, vergeben wird sie beim Speichern)
const nextId = ref<number | null>(null)

const sumOriginal = computed(() =>
  items.value.reduce((s, i) => s + (Number(i.originalPrice) || 0) * (i.quantity || 1), 0)
)

function eur(v: number | null | undefined) {
  return v === null || v === undefined ? '—'
    : v.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ q: search.value, page: String(page.value), pagelen: String(pageLen) })
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (warehouseFilter.value) params.set('warehouse', warehouseFilter.value)
    if (supplierFilter.value) params.set('supplier', supplierFilter.value)
    if (categoryFilter.value) params.set('category', categoryFilter.value)
    if (rentableOnly.value) params.set('rentable', '1')
    const res = await $fetch<{
      items: Item[]; total: number; stats: Record<string, number>
      warehouses: any[]; suppliers: any[]; categories: any[]
    }>(`/api/admin/inventory?${params}`)
    items.value = res.items
    total.value = res.total
    stats.value = res.stats
    warehouses.value = res.warehouses
    suppliers.value = res.suppliers
    categories.value = res.categories
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Inventar konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => { page.value = 0; load() }, 300)
}
function setFilter(kind: 'status' | 'warehouse' | 'supplier' | 'category', value: string) {
  if (kind === 'status') statusFilter.value = statusFilter.value === value ? '' : value
  if (kind === 'warehouse') warehouseFilter.value = warehouseFilter.value === value ? '' : value
  if (kind === 'supplier') supplierFilter.value = supplierFilter.value === value ? '' : value
  if (kind === 'category') categoryFilter.value = categoryFilter.value === value ? '' : value
  page.value = 0
  load()
}
function nextPage() { page.value++; load() }
function prevPage() { if (page.value > 0) { page.value--; load() } }

async function openNew() {
  editing.value = null
  editAsolId.value = null
  Object.assign(form, {
    title: '', titleEn: '', category: '', supplier: '', ean: '', quantity: 1,
    originalPrice: '', rentPrice1m: '', rentPrice3m: '', rentable: false,
    status: 'lager', warehouse: '', customerLocation: '',
    purchasedAt: '', purchasedYear: '', description: '', descriptionEn: ''
  })
  tagsArr.value = []
  tagInput.value = ''
  resetPhotos()
  imgError.value = ''
  saveError.value = ''
  editOpen.value = true
  nextId.value = null
  $fetch<{ nextId: number }>('/api/admin/inventory/next-id')
    .then((res) => { nextId.value = res.nextId })
    .catch(() => { nextId.value = null })
}

async function openEdit(item: Item) {
  editing.value = item
  saveError.value = ''
  try {
    const res = await $fetch<{ item: any; tags: string[]; images: Array<{ id: number; path: string }> }>(`/api/admin/inventory/${item.id}`)
    Object.assign(form, {
      title: res.item.title, titleEn: res.item.titleEn || '', category: res.item.category || '', supplier: res.item.supplier || '', ean: res.item.ean || '',
      quantity: res.item.quantity,
      originalPrice: res.item.originalPrice ?? '', rentPrice1m: res.item.rentPrice1m ?? '',
      rentPrice3m: res.item.rentPrice3m ?? '', rentable: !!res.item.rentable,
      status: res.item.status, warehouse: res.item.warehouse || '',
      customerLocation: res.item.customerLocation || '',
      purchasedAt: res.item.purchasedAt || '', purchasedYear: res.item.purchasedYear || '',
      description: res.item.description || '', descriptionEn: res.item.descriptionEn || ''
    })
    tagsArr.value = res.tags
    tagInput.value = ''
    resetPhotos()
    imgError.value = ''
    // Fotos: aus item_images, Fallback: bisheriges Einzelfoto (image_path)
    const imgs = res.images?.length
      ? res.images
      : (res.item.imagePath ? [{ id: 0, path: res.item.imagePath }] : [])
    photos.value = imgs.map(im => ({ key: `e${im.id}-${im.path}`, id: im.id || null, path: im.path, file: null, url: im.path }))
    editing.value.imagePath = res.item.imagePath || null
    editAsolId.value = res.item.asolId || null
    editOpen.value = true
    assignments.value = []
    try {
      const ares = await $fetch<{ assignments: Assignment[] }>(`/api/admin/inventory/assignments?item_id=${item.id}`)
      assignments.value = ares.assignments
    } catch { /* Einsätze sind optional */ }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Details konnten nicht geladen werden.'
  }
}

async function save() {
  saving.value = true
  saveError.value = ''
  const payload = { ...form, tags: tagsArr.value }
  try {
    let itemId: number
    if (editing.value) {
      await $fetch(`/api/admin/inventory/${editing.value.id}`, { method: 'PUT', body: payload })
      itemId = editing.value.id
    } else {
      const res = await $fetch<{ ok: boolean; id: number }>('/api/admin/inventory', { method: 'POST', body: payload })
      itemId = res.id
    }
    // neue Fotos hochladen, entfernte löschen
    for (const p of photos.value.filter(x => x.file)) {
      const fd = new FormData()
      fd.append('file', p.file!)
      await $fetch(`/api/admin/inventory/${itemId}/images`, { method: 'POST', body: fd })
    }
    for (const imageId of removedPhotoIds.value) {
      await $fetch(`/api/admin/inventory/${itemId}/images/${imageId}`, { method: 'DELETE' })
    }
    if (removedLegacy.value) {
      await $fetch(`/api/admin/inventory/${itemId}/image`, { method: 'DELETE' })
    }
    editOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function remove(item: Item) {
  error.value = ''
  if (!confirm(`„${item.title}" endgültig löschen?`)) return
  try {
    await $fetch(`/api/admin/inventory/${item.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

onMounted(async () => { await load(); newParam.consume(openNew) })
</script>

<template>
  <div class="inv">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Möbel &amp; Objekte</p>
        <h1 class="wf-title">Inventar</h1>
        <p class="wf-subtitle">Alle Möbel, deren Lagerort und aktuelle Projekteinsätze.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-inventar.jpg" alt="Showroom mit Möbeln und Textilien in warmen Tönen">
        <button class="wf-btn wf-btn--primary wf-hero-cta" @click="openNew">
          <WfIcon name="plus" :size="15" /> Neues Objekt
        </button>
      </div>
    </section>

    <div class="inv__stats">
      <button v-for="(label, key) in STATUS_LABELS" :key="key" class="inv__stat"
              :class="{ 'is-active': statusFilter === key }" @click="setFilter('status', key)">
        <span class="inv__statn">{{ stats[key] || 0 }}</span>
        <span class="inv__statlabel">{{ label }}</span>
      </button>
      <span class="inv__sum">Seitenwert: {{ eur(sumOriginal) }}</span>
    </div>

    <div class="inv__filters">
      <input v-model="search" type="search" class="inv__search" placeholder="Suche: Bezeichnung, Anbieter, EAN, ID, ASOL-Nr. …"
             @input="onSearch">
      <select class="inv__select" @change="setFilter('category', ($event.target as HTMLSelectElement).value)">
        <option value="">Alle Kategorien</option>
        <option v-for="c in INVENTORY_CATEGORIES" :key="c.key" :value="c.key"
                :selected="categoryFilter === c.key">{{ c.label }} ({{ categories.find(x => x.name === c.key)?.count ?? 0 }})</option>
      </select>
      <select class="inv__select" @change="setFilter('warehouse', ($event.target as HTMLSelectElement).value)">
        <option value="">Alle Lager</option>
        <option v-for="w in warehouses" :key="w.name" :value="w.name"
                :selected="warehouseFilter === w.name">{{ w.name }} ({{ w.count }})</option>
      </select>
      <select class="inv__select" @change="setFilter('supplier', ($event.target as HTMLSelectElement).value)">
        <option value="">Alle Anbieter</option>
        <option v-for="s in suppliers" :key="s.name" :value="s.name"
                :selected="supplierFilter === s.name">{{ s.name }} ({{ s.count }})</option>
      </select>
      <label class="inv__rentfilter" :class="{ 'is-active': rentableOnly }">
        <input v-model="rentableOnly" type="checkbox" class="inv__checkbox" @change="page = 0; load()">
        <span class="inv__checkui" :class="{ 'is-on': rentableOnly }" aria-hidden="true">
          <WfIcon v-if="rentableOnly" name="check" :size="11" />
        </span>
        <span class="inv__rentfiltertext">Nur vermietbare Objekte</span>
      </label>
    </div>

    <p v-if="error" class="inv__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="inv__loading">Inventar wird geladen …</p>
    <p v-else-if="!items.length" class="inv__empty">Keine Objekte gefunden.</p>

    <table v-else class="wf-table">
      <thead>
        <tr>
          <th class="inv__thimg" /><th class="inv__thid">ID</th><th>Bezeichnung</th><th>Anbieter</th><th>Menge</th><th>Originalpreis</th>
          <th>Miete 3 Mon.</th><th>Status / Standort</th><th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in items" :key="i.id">
          <td>
            <img v-if="i.imagePath" :src="i.imagePath" alt="" class="inv__thumb">
            <span v-else class="inv__thumb inv__thumb--ph" aria-hidden="true"><WfIcon name="box" :size="18" /></span>
          </td>
          <td class="inv__idcell">
            <span class="inv__id">#{{ i.id }}</span>
            <span v-if="i.asolId" class="inv__asolid" title="Alte ASOL-Nummer">ASOL {{ i.asolId }}</span>
          </td>
          <td>
            <button class="inv__name" @click="openEdit(i)">{{ i.title }}</button>
            <span class="inv__catpill">{{ catLabel(i.category) }}</span>
            <span v-if="i.rentable" class="inv__rentpill" title="Für Miete verfügbar">Miete</span>
          </td>
          <td>{{ i.supplier || '—' }}</td>
          <td>{{ i.quantity }}</td>
          <td>{{ eur(i.originalPrice) }}</td>
          <td>{{ eur(i.rentPrice3m) }}</td>
          <td>
            <span class="wf-pill" :class="i.status === 'vermietet' ? 'wf-pill--blue' : i.status === 'verkauft' ? 'wf-pill--gray' : i.status === 'ausser_dienst' ? 'wf-pill--red' : ''">{{ STATUS_LABELS[i.status] }}</span>
            <span class="inv__loc">{{ i.status === 'vermietet' ? (i.customerLocation || '—') : (i.warehouse || '—') }}</span>
            <span v-if="i.status === 'vermietet' && i.returnDate" class="inv__ret"
                  :class="{ 'is-overdue': String(i.returnDate).slice(0, 10) < localToday() }">
              Rückgabe {{ String(i.returnDate).slice(0, 10).split('-').reverse().join('.') }}
            </span>
            <span v-else-if="i.status === 'vermietet'" class="inv__ret inv__ret--open">Rückgabe offen</span>
          </td>
          <td class="inv__actions">
            <button class="wf-btn wf-btn--sm" @click="openEdit(i)">Bearbeiten</button>
            <button class="wf-btn wf-btn--sm wf-btn--danger" @click="remove(i)">Löschen</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="inv__pager">
      <button :disabled="page === 0" class="wf-btn wf-btn--sm" @click="prevPage">‹ Zurück</button>
      <span>Seite {{ page + 1 }} · {{ total }} Objekte</span>
      <button :disabled="(page + 1) * pageLen >= total" class="wf-btn wf-btn--sm" @click="nextPage">Weiter ›</button>
    </div>

    <!-- Dialog -->
    <div v-if="editOpen" class="wf-modal-overlay" @click.self="editOpen = false">
      <div class="wf-modal inv__modal">
        <div class="inv__edhead">
          <div>
            <h2 class="inv__edtitle">{{ editing ? `Objekt bearbeiten — #${editing.id}` : 'Neues Objekt' }}</h2>
            <p class="inv__edsub">
              {{ editing
                ? 'Erfasse alle wichtigen Informationen an einem Ort.'
                : `Die Objekt-ID ${nextId ?? '…'} wird automatisch vergeben — fortlaufend oberhalb des bisherigen Nummernkreises.` }}
            </p>
          </div>
          <button class="inv__edclose" title="Schließen" @click="editOpen = false">×</button>
        </div>

        <div class="inv__edgrid">
          <!-- Linke Spalte: Grunddaten -->
          <div class="inv__edmain">
            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="box" :size="15" /> Grunddaten</h3>
              <div class="inv__formrow">
                <label class="inv__field">
                  <span>Kategorie *</span>
                  <select v-model="form.category">
                    <option value="">— keine —</option>
                    <option v-for="c in INVENTORY_CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
                  </select>
                </label>
                <label class="inv__field inv__field--wide">
                  <span>Bezeichnung *</span>
                  <input v-model="form.title" type="text" placeholder="z. B. Sessel Mira">
                </label>
                <label class="inv__field">
                  <span>Anbieter</span>
                  <input v-model="form.supplier" type="text" placeholder="z. B. IKEA, Westwing …">
                </label>
                <label v-if="editAsolId" class="inv__field inv__field--small" title="Alte ASOL-Nummer aus dem Vorsystem — schreibgeschützt">
                  <span>ASOL-ID (Altnummer)</span>
                  <input :value="editAsolId" type="text" disabled>
                </label>
              </div>
            </section>

            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="euro" :size="15" /> Preise &amp; Bestand</h3>
              <div class="inv__formrow">
                <label class="inv__field inv__field--small">
                  <span>Menge *</span>
                  <input v-model="form.quantity" type="number" min="1">
                </label>
                <label class="inv__field inv__field--small">
                  <span>Originalpreis €</span>
                  <input v-model="form.originalPrice" type="text" placeholder="0,00">
                </label>
                <label class="inv__field inv__field--small">
                  <span>Miete 1 Mon. €</span>
                  <input v-model="form.rentPrice1m" type="text" placeholder="0,00">
                </label>
                <label class="inv__field inv__field--small">
                  <span>Miete 3 Mon. €</span>
                  <input v-model="form.rentPrice3m" type="text" placeholder="0,00">
                </label>
              </div>
              <label class="inv__check">
                <input v-model="form.rentable" type="checkbox" class="inv__checkbox">
                <span class="inv__checkui" :class="{ 'is-on': form.rentable }" aria-hidden="true">
                  <WfIcon v-if="form.rentable" name="check" :size="11" />
                </span>
                <span class="inv__checktext">
                  <strong>Für Miete verfügbar</strong>
                  <small>Dieses Möbelstück wird über die Möbelvermietung angeboten.</small>
                </span>
              </label>
            </section>

            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="pin" :size="15" /> Standort &amp; Status</h3>
              <div class="inv__formrow">
                <label class="inv__field">
                  <span>Status</span>
                  <select v-model="form.status">
                    <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </label>
                <label class="inv__field">
                  <span>{{ form.status === 'vermietet' ? 'Kundeneinsatzort' : 'Lager' }}</span>
                  <input v-model="locationModel"
                         type="text" :placeholder="form.status === 'vermietet' ? 'z. B. HS - KANTOR' : 'z. B. Graz'">
                </label>
                <label class="inv__field inv__field--small">
                  <span>EAN (optional)</span>
                  <input v-model="form.ean" type="text" placeholder="z. B. 9012345678901">
                </label>
                <label class="inv__field inv__field--small">
                  <span>Kaufdatum/Jahr</span>
                  <input v-model="form.purchasedYear" type="text" placeholder="2023">
                </label>
              </div>
            </section>

            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="file" :size="15" /> Beschreibung</h3>
              <label class="inv__field">
                <span class="inv__labelrow">Beschreibung (optional)<em class="inv__charcount">{{ form.description.length }}/500</em></span>
                <textarea v-model="form.description" rows="3" maxlength="500" placeholder="z. B. Farbe, Maße, Besonderheiten …" />
              </label>
            </section>

            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="globe" :size="15" /> Übersetzung (Englisch)</h3>
              <label class="inv__field">
                <span>Bezeichnung (EN, optional)</span>
                <input v-model="form.titleEn" type="text" maxlength="190" placeholder="z. B. Velvet sofa, petrol">
              </label>
              <label class="inv__field">
                <span class="inv__labelrow">Beschreibung (EN, optional)<em class="inv__charcount">{{ form.descriptionEn.length }}/500</em></span>
                <textarea v-model="form.descriptionEn" rows="3" maxlength="500" placeholder="English description for the rental shop …" />
              </label>
              <p class="inv__hint">Wenn leer, wird im englischen Shop die deutsche Bezeichnung angezeigt.</p>
            </section>

            <!-- aktuelle Einsätze -->
            <section v-if="editing" class="inv__assign">
              <h3 class="inv__assignh">Aktuell im Einsatz</h3>
              <ul v-if="assignments.length" class="inv__assignlist">
                <li v-for="a in assignments" :key="a.assignment_id" class="inv__assignrow">
                  <span class="inv__assignproj">{{ a.customer || a.project_title || 'Projekt #' + a.project_id }}</span>
                  <span class="inv__assigncat">{{ a.project_category === 'staging' ? 'Staging' : a.project_category === 'leasing' ? 'Leasing' : 'Showroom' }}</span>
                  <span class="inv__assignqty">× {{ a.quantity }}</span>
                  <span v-if="a.return_date" class="inv__assignret"
                        :class="{ 'is-overdue': a.return_date < localToday() }">
                    Rückgabe {{ a.return_date.split('-').reverse().join('.') }}
                  </span>
                  <span v-else-if="a.deadline_date" class="inv__assigndead">
                    Deadline {{ a.deadline_date.split('-').reverse().join('.') }}
                  </span>
                  <span v-if="a.note" class="inv__assignnote">{{ a.note }}</span>
                </li>
              </ul>
              <p v-else class="inv__assignempty">Derzeit keinem Projekt zugewiesen.</p>
            </section>
          </div>

          <!-- Rechte Spalte: Fotos & Tags -->
          <aside class="inv__edside">
            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="camera" :size="15" /> Fotos</h3>
              <label class="inv__photoupload">
                <WfIcon name="camera" :size="22" />
                <strong>Fotos hinzufügen</strong>
                <span>Bilder hier auswählen — mehrere sind möglich</span>
                <em class="inv__photobtn">+ Dateien auswählen</em>
                <small>JPG, PNG oder WebP (max. 10 MB pro Bild)</small>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="inv__fileinput" @change="addPhotos">
              </label>
              <p v-if="imgError" class="inv__error" role="alert">{{ imgError }}</p>
              <div v-if="photos.length" class="inv__photogrid">
                <div v-for="p in photos" :key="p.key" class="inv__photocell">
                  <img :src="p.url" alt="" class="inv__photothumb">
                  <button class="inv__photox" title="Entfernen" @click="removePhoto(p)">×</button>
                </div>
                <label class="inv__photocell inv__photoadd" title="Weiteres Foto hinzufügen">
                  + Foto
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="inv__fileinput" @change="addPhotos">
                </label>
              </div>
            </section>

            <section class="inv__sec">
              <h3 class="inv__sech"><WfIcon name="tag" :size="15" /> Tags <small>(optional)</small></h3>
              <div class="inv__tagbox">
                <span v-for="t in tagsArr" :key="t" class="inv__tagpill">
                  {{ t }}<button type="button" title="Tag entfernen" @click="removeTag(t)">×</button>
                </span>
                <input v-model="tagInput" class="inv__taginput" placeholder="Tags hinzufügen"
                       @keydown.enter.prevent="addTag" @keydown.comma.prevent="addTag" @blur="addTag">
              </div>
            </section>
          </aside>
        </div>

        <p v-if="saveError" class="inv__error" role="alert">{{ saveError }}</p>
        <div class="inv__dialogactions">
          <button class="wf-btn" @click="editOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Speichere …' : (editing ? 'Speichern' : 'Objekt speichern →') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv__stats { display: flex; gap: .6em; margin-bottom: 1em; flex-wrap: wrap; align-items: center; }
.inv__stat {
  display: flex; flex-direction: column; align-items: center; gap: .1em;
  border: 1px solid var(--wf-line); background: var(--wf-card); border-radius: 12px; padding: .55em 1.3em;
  font-family: inherit; cursor: pointer; box-shadow: var(--wf-shadow);
  transition: border-color .15s, background .15s;
}
.inv__stat:hover { border-color: var(--wf-green); }
.inv__stat.is-active { border-color: var(--wf-green); background: var(--wf-green-soft); }
.inv__statn { font-family: var(--wf-serif); font-size: 1.3em; font-weight: 700; color: var(--wf-green); }
.inv__statlabel { font-size: .74em; color: var(--wf-muted); }
.inv__sum { margin-left: auto; font-size: .85em; color: var(--wf-muted); }
.inv__filters { display: flex; gap: .8em; margin-bottom: .9em; flex-wrap: wrap; }
.inv__search {
  flex: 1; min-width: 14em; max-width: 26em; padding: .6em .9em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 999px; outline: none; background: #fff;
}
.inv__search:focus { border-color: var(--wf-green); }
.inv__select { padding: .55em .8em; font-size: .88em; font-family: inherit; color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; }
.inv__thumb {
  width: 46px; height: 46px; border-radius: 10px; object-fit: cover; display: block;
  border: 1px solid var(--wf-line); background: var(--wf-bg); color: var(--wf-muted);
}
.inv__thumb--ph { display: inline-flex; align-items: center; justify-content: center; }
.inv__thimg { width: 46px; }
.inv__thid { width: 4.5em; }
.inv__idcell { vertical-align: middle; }
.inv__id {
  font-size: .78em; font-weight: 600; color: var(--wf-green);
  background: var(--wf-green-soft); border-radius: 6px; padding: .15em .5em;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.inv__asolid {
  display: block; margin-top: .25em; font-size: .68em; color: var(--wf-muted);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.inv__catpill {
  display: inline-block; margin-left: .5em; font-size: .7em; color: var(--wf-muted);
  border: 1px solid var(--wf-line); border-radius: 999px; padding: .1em .6em; vertical-align: middle;
}
.inv__rentpill {
  display: inline-block; margin-left: .4em; font-size: .7em; font-weight: 600;
  color: var(--wf-green); background: var(--wf-green-soft);
  border-radius: 999px; padding: .12em .6em; vertical-align: middle;
}
.inv__rentfilter {
  display: inline-flex; align-items: center; gap: .45em; cursor: pointer;
  border: 1px solid var(--wf-line); border-radius: 999px; padding: .45em .9em;
  background: #fff; font-size: .85em; color: var(--wf-muted);
  transition: border-color .15s, background .15s, color .15s;
}
.inv__rentfilter:hover { border-color: var(--wf-green); }
.inv__rentfilter.is-active { border-color: var(--wf-green); background: var(--wf-green-soft); color: var(--wf-green); }
.inv__rentfilter .inv__checkui { width: 16px; height: 16px; margin-top: 0; border-radius: 5px; }
.inv__rentfiltertext { white-space: nowrap; }
.inv__ret {
  display: inline-block; margin-left: .4em; font-size: .72em; color: var(--wf-green);
  background: var(--wf-green-soft); border-radius: 6px; padding: .15em .5em; white-space: nowrap;
}
.inv__ret.is-overdue { color: var(--wf-red); background: var(--wf-red-soft); font-weight: 600; }
.inv__ret--open { color: var(--wf-muted); background: transparent; border: 1px dashed var(--wf-line); }
.inv__photo {
  display: flex; gap: 1em; align-items: flex-start; margin-bottom: 1.1em;
  padding-bottom: 1.1em; border-bottom: 1px solid var(--wf-line);
}
.inv__photoimg {
  width: 96px; height: 96px; border-radius: 14px; object-fit: cover; flex: 0 0 auto;
  border: 1px solid var(--wf-line); background: var(--wf-bg); color: var(--wf-muted);
}
.inv__photoinfo { flex: 1; min-width: 12em; }
.inv__photolabel { margin: 0 0 .15em; font-family: var(--wf-serif); font-size: 1.05em; }
.inv__photohint { margin: 0 0 .6em; font-size: .82em; color: var(--wf-muted); }
.inv__photohint--new { margin: -.2em 0 1em; }
.inv__photoactions { display: flex; gap: .5em; flex-wrap: wrap; }
.inv__fileinput { display: none; }
.inv__name { border: 0; background: none; padding: 0; font: inherit; color: var(--wf-green); cursor: pointer; text-align: left; font-weight: 600; }
.inv__loc { font-size: .82em; color: var(--wf-muted); margin-left: .4em; }
.inv__actions { white-space: nowrap; }
.inv__actions .wf-btn { margin-left: .3em; }
.inv__pager { display: flex; align-items: center; gap: 1em; justify-content: center; margin-top: 1.2em; font-size: .88em; color: var(--wf-muted); }
.inv__error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .6em .9em; font-size: .88em; }
.inv__loading, .inv__empty { color: var(--wf-muted); padding: 2em 0; text-align: center; }
.inv__dialog h2 { margin: 0 0 1em; }
/* Neues-Objekt-Dialog (Vorlage) */
.inv__modal { max-width: 66em; }
.inv__edhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 1em; margin-bottom: 1.1em; }
.inv__edtitle { margin: 0; font-family: var(--wf-serif); font-weight: 500; font-size: 1.5em; color: var(--wf-ink); }
.inv__edsub { margin: .25em 0 0; font-size: .88em; color: var(--wf-muted); }
.inv__edclose { border: 0; background: none; font-size: 1.4em; line-height: 1; cursor: pointer; color: var(--wf-muted); padding: .1em .2em; }
.inv__edclose:hover { color: var(--wf-ink); }
.inv__edgrid { display: grid; grid-template-columns: 1.9fr 1fr; gap: 1.4em; align-items: start; }
.inv__edmain { min-width: 0; }
.inv__sec { margin-bottom: 1.2em; }
.inv__sech {
  display: flex; align-items: center; gap: .45em; font-family: var(--wf-serif); font-weight: 500;
  font-size: 1.05em; margin: 0 0 .6em; color: var(--wf-ink);
}
.inv__sech svg { color: var(--wf-green); }
.inv__sech small { font-weight: 400; font-size: .72em; color: var(--wf-muted); }
.inv__labelrow { display: flex; justify-content: space-between; align-items: baseline; font-size: .78em; margin-bottom: .25em; color: var(--wf-muted); }
.inv__charcount { font-style: normal; font-variant-numeric: tabular-nums; }
/* Miet-Checkbox */
.inv__check { display: flex; align-items: flex-start; gap: .6em; cursor: pointer; margin-top: .1em; }
.inv__checkbox { position: absolute; opacity: 0; pointer-events: none; }
.inv__checkui {
  flex: 0 0 auto; width: 20px; height: 20px; border-radius: 6px; margin-top: .1em;
  border: 1.5px solid var(--wf-line); background: #fff; color: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, border-color .15s;
}
.inv__checkui.is-on { background: var(--wf-green); border-color: var(--wf-green); }
.inv__check:hover .inv__checkui { border-color: var(--wf-green); }
.inv__checktext strong { display: block; font-size: .88em; color: var(--wf-ink); }
.inv__checktext small { display: block; font-size: .76em; color: var(--wf-muted); margin-top: .1em; }
/* Foto-Upload */
.inv__photoupload {
  display: flex; flex-direction: column; align-items: center; gap: .2em; text-align: center;
  border: 1.5px dashed var(--wf-line); border-radius: 12px; padding: 1em .8em; cursor: pointer;
  color: var(--wf-muted); margin-bottom: .7em; transition: border-color .15s, color .15s;
}
.inv__photoupload:hover { border-color: var(--wf-green); color: var(--wf-green); }
.inv__photoupload strong { color: var(--wf-ink); font-size: .92em; }
.inv__photoupload span { font-size: .78em; }
.inv__photoupload small { font-size: .68em; opacity: .85; }
.inv__photobtn {
  font-style: normal; font-size: .82em; color: var(--wf-green);
  border: 1px solid var(--wf-green); border-radius: 999px; padding: .3em .9em; margin: .25em 0;
}
.inv__photogrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5em; }
.inv__photocell { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid var(--wf-line); }
.inv__photothumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.inv__photox {
  position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%;
  border: 0; background: rgba(0, 0, 0, .55); color: #fff; cursor: pointer;
  font-size: .8em; line-height: 1; display: flex; align-items: center; justify-content: center;
}
.inv__photox:hover { background: var(--wf-red); }
.inv__photoadd {
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  color: var(--wf-muted); font-size: .78em; background: var(--wf-bg);
}
.inv__photoadd:hover { color: var(--wf-green); border-color: var(--wf-green); }
/* Tags */
.inv__tagbox {
  display: flex; flex-wrap: wrap; gap: .35em; border: 1px solid var(--wf-line);
  border-radius: 10px; padding: .4em .5em; background: #fff;
}
.inv__tagbox:focus-within { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.inv__tagpill {
  display: inline-flex; align-items: center; gap: .3em;
  background: var(--wf-green-soft); color: var(--wf-green); border-radius: 999px;
  padding: .2em .55em; font-size: .78em; white-space: nowrap;
}
.inv__tagpill button { border: 0; background: none; cursor: pointer; color: inherit; font-size: .95em; line-height: 1; padding: 0; }
.inv__tagpill button:hover { color: var(--wf-red); }
.inv__taginput { flex: 1; min-width: 8em; border: 0; outline: none; font: inherit; font-size: .85em; padding: .2em; color: var(--wf-ink); background: transparent; }
@media (max-width: 900px) {
  .inv__edgrid { grid-template-columns: 1fr; }
}
.inv__formrow { display: flex; gap: .8em; flex-wrap: wrap; }
.inv__field { display: block; flex: 1; margin-bottom: .9em; min-width: 8em; }
.inv__field--small { flex: 0 0 8em; }
.inv__field--wide { flex: 2; }
.inv__field > span { display: block; font-size: .78em; margin-bottom: .25em; color: var(--wf-muted); }
.inv__field input, .inv__field select, .inv__field textarea {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 10px; outline: none;
}
.inv__field input:focus, .inv__field select:focus, .inv__field textarea:focus { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.inv__hint { margin: -.3em 0 .4em; font-size: .78em; color: var(--wf-muted); }
.inv__dialogactions { display: flex; justify-content: flex-end; gap: .6em; margin-top: .4em; }
.inv__assign { margin: 1.1em 0 .4em; border-top: 1px solid var(--wf-line); padding-top: 1em; }
.inv__assignh { font-family: var(--wf-serif); font-weight: 400; font-size: 1.1em; margin: 0 0 .5em; }
.inv__assignlist { list-style: none; margin: 0; padding: 0; }
.inv__assignrow { display: flex; flex-wrap: wrap; align-items: baseline; gap: .5em; padding: .45em .5em; border-bottom: 1px solid #f4efe6; font-size: .86em; }
.inv__assignproj { flex: 1; min-width: 10em; overflow-wrap: anywhere; }
.inv__assigncat { font-size: .75em; font-weight: 600; background: var(--wf-green-soft); color: var(--wf-green); border-radius: 999px; padding: .18em .6em; }
.inv__assignqty { color: var(--wf-muted); }
.inv__assignret { font-size: .8em; font-weight: 600; background: var(--wf-green-soft); color: var(--wf-green); border-radius: 999px; padding: .18em .6em; }
.inv__assignret.is-overdue { background: var(--wf-red-soft); color: var(--wf-red); }
.inv__assigndead { font-size: .8em; color: var(--wf-muted); }
.inv__assignnote { font-size: .8em; color: var(--wf-muted); }
.inv__assignempty { color: var(--wf-muted); font-size: .85em; margin: .3em 0; }
@media (max-width: 900px) {
  .wf-table { display: block; overflow-x: auto; }
}
</style>
