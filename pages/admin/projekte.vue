<script setup lang="ts">
import { categoryLabel } from '~~/shared/inventory-categories'

definePageMeta({ layout: 'admin' })

useHead({ title: 'Projekte - WOHNFEE Dashboard' })
const newParam = useNewParam()

interface Project {
  id: number
  category: 'staging' | 'leasing' | 'showroom'
  section: string | null
  customer: string | null
  title: string | null
  art: string | null
  team: string | null
  statusInfo: string | null
  deadlineText: string | null
  deadlineDate: string | null
  note: string | null
  nextStep: string | null
  who: string | null
  dateInfo: string | null
  sortOrder: number
}

const TABS = [
  { value: 'staging', label: 'Staging' },
  { value: 'leasing', label: 'Furniture Leasing' },
  { value: 'showroom', label: 'Showroom' }
] as const

// Art: Kurzcode bleibt in der Datenbank, Anzeige wird ausgeschrieben
const ART_LABELS: Record<string, string> = { HS: 'Home Staging', RD: 'Redesign', FL: 'Furniture Leasing' }
function artLabel(code: string | null) {
  return (code && ART_LABELS[code]) || code || ''
}

const projects = ref<Project[]>([])
const counts = ref<Record<string, number>>({})
const tab = ref<string>('staging')
const search = ref('')
const loading = ref(true)
const error = ref('')
const searchTimer = ref<any>(null)

const editOpen = ref(false)
const editing = ref<Project | null>(null)
const form = reactive({
  category: 'staging', section: '', customer: '', title: '', art: '', team: '',
  statusInfo: '', deadlineText: '', deadlineDate: '', note: '',
  nextStep: '', who: '', dateInfo: ''
})
const saving = ref(false)
const saveError = ref('')

// Möbelzuweisungen des geöffneten Projekts
interface ProjectItem {
  assignment_id: number
  item_id: number
  quantity: number
  return_date: string | null
  note: string | null
  title: string
  status: string
  warehouse: string | null
  itemCategory: string | null
}
const projectItems = ref<ProjectItem[]>([])
const itemsLoading = ref(false)
const itemListFilter = ref('')
const itemSort = ref<'name' | 'category'>('name')
const showAddItem = ref(false)
const itemSearch = ref('')
const itemResults = ref<Array<{ id: number; title: string; warehouse: string | null; status: string }>>([])
const itemPick = ref<number | null>(null)
const itemQty = ref(1)
const itemReturn = ref('')
const itemNote = ref('')
const itemSearchTimer = ref<any>(null)
const itemBusy = ref(false)
const itemError = ref('')

// Gefilterte + sortierte Möbelliste im Bearbeiten-Dialog
const sortedProjectItems = computed(() => {
  const q = itemListFilter.value.trim().toLowerCase()
  const list = q
    ? projectItems.value.filter((it) => it.title.toLowerCase().includes(q))
    : [...projectItems.value]
  if (itemSort.value === 'category') {
    list.sort((a, b) =>
      categoryLabel(a.itemCategory).localeCompare(categoryLabel(b.itemCategory), 'de')
      || a.title.localeCompare(b.title, 'de'))
  } else {
    list.sort((a, b) => a.title.localeCompare(b.title, 'de'))
  }
  return list
})

async function loadProjectItems(projectId: number) {
  itemsLoading.value = true
  projectItems.value = []
  try {
    const res = await $fetch<{ items: ProjectItem[] }>(`/api/admin/projects/${projectId}/items`)
    projectItems.value = res.items
  } catch {
    /* Möbel sind optional */
  } finally {
    itemsLoading.value = false
  }
}

function onItemSearch() {
  clearTimeout(itemSearchTimer.value)
  itemSearchTimer.value = setTimeout(async () => {
    const q = itemSearch.value.trim()
    itemResults.value = []
    itemPick.value = null
    if (q.length < 2) return
    try {
      const res = await $fetch<{ items: any[] }>(`/api/admin/inventory?q=${encodeURIComponent(q)}&pagelen=8`)
      itemResults.value = (res.items || []).map((i: any) => ({ id: i.id, title: i.title, warehouse: i.warehouse, status: i.status }))
    } catch { /* ignorieren */ }
  }, 300)
}

async function addItem() {
  if (!editing.value || !itemPick.value) return
  itemBusy.value = true
  itemError.value = ''
  try {
    await $fetch(`/api/admin/projects/${editing.value.id}/items`, {
      method: 'POST',
      body: {
        item_id: itemPick.value,
        quantity: itemQty.value,
        return_date: itemReturn.value || null,
        note: itemNote.value || null
      }
    })
    itemSearch.value = ''
    itemResults.value = []
    itemPick.value = null
    itemQty.value = 1
    itemReturn.value = ''
    itemNote.value = ''
    await loadProjectItems(editing.value.id)
  } catch (e: any) {
    itemError.value = e?.data?.statusMessage || 'Hinzufügen fehlgeschlagen.'
  } finally {
    itemBusy.value = false
  }
}

async function removeItem(itemId: number) {
  if (!editing.value) return
  const it = projectItems.value.find((x) => x.item_id === itemId)
  if (!confirm(`„${it?.title || 'Objekt'}" aus diesem Projekt entfernen?\n\nDas Möbelstück gilt danach wieder als im Lager verfügbar.`)) return
  try {
    await $fetch(`/api/admin/projects/${editing.value.id}/items/${itemId}`, { method: 'DELETE' })
    await loadProjectItems(editing.value.id)
  } catch (e: any) {
    itemError.value = e?.data?.statusMessage || 'Entfernen fehlgeschlagen.'
  }
}

// Angebot „Mietverlängerung" aus den Möbeln des geöffneten Projekts
const extBusy = ref(false)
async function offerExtension() {
  if (!editing.value) return
  if (!confirm(`Angebot „Mietverlängerung" für ${editing.value.customer || editing.value.title} erstellen?\n\nAlle Möbel des Projekts werden mit ihrem Monatspreis übernommen.`)) return
  extBusy.value = true
  try {
    const res = await $fetch<{ offerId: number }>(`/api/admin/projects/${editing.value.id}/extension-offer`, { method: 'POST' })
    await navigateTo(`/admin/angebote?open=${res.offerId}`)
  } catch (e: any) {
    itemError.value = e?.data?.statusMessage || 'Angebot konnte nicht erstellt werden.'
  } finally {
    extBusy.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ category: tab.value })
    if (search.value) params.set('q', search.value)
    const res = await $fetch<{ projects: Project[]; counts: Record<string, number> }>(`/api/admin/projects?${params}`)
    projects.value = res.projects
    counts.value = res.counts
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Projekte konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

watch(tab, load)
function onSearch() {
  clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(load, 300)
}

// Staging: nach Abschnitten gruppiert (Originalstruktur der Excel)
const grouped = computed(() => {
  if (tab.value !== 'staging') return [{ section: null, items: projects.value }]
  const map = new Map<string | null, Project[]>()
  for (const p of projects.value) {
    const key = p.section
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return [...map.entries()].map(([section, items]) => ({ section, items }))
})

function deadlineClass(p: Project) {
  if (!p.deadlineDate) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(String(p.deadlineDate).slice(0, 10) + 'T00:00:00')
  const diff = (d.getTime() - today.getTime()) / 86400000
  if (diff < 0) return 'is-overdue'
  if (diff <= 14) return 'is-soon'
  return ''
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function openNew() {
  editing.value = null
  projectItems.value = []
  itemSearch.value = ''
  itemResults.value = []
  itemPick.value = null
  Object.assign(form, {
    category: tab.value, section: '', customer: '', title: '', art: tab.value === 'staging' ? 'HS' : '',
    team: '', statusInfo: '', deadlineText: '', deadlineDate: '', note: '',
    nextStep: '', who: '', dateInfo: ''
  })
  saveError.value = ''
  itemListFilter.value = ''
  itemSort.value = 'name'
  showAddItem.value = false
  editOpen.value = true
}

function openEdit(p: Project) {
  editing.value = p
  Object.assign(form, {
    category: p.category, section: p.section || '', customer: p.customer || '',
    title: p.title || '', art: p.art || '', team: p.team || '',
    statusInfo: p.statusInfo || '', deadlineText: p.deadlineText || '',
    deadlineDate: p.deadlineDate ? String(p.deadlineDate).slice(0, 10) : '', note: p.note || '',
    nextStep: p.nextStep || '', who: p.who || '', dateInfo: p.dateInfo || ''
  })
  itemError.value = ''
  saveError.value = ''
  itemListFilter.value = ''
  itemSort.value = 'name'
  showAddItem.value = false
  editOpen.value = true
  loadProjectItems(p.id)
}

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/admin/projects/${editing.value.id}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/api/admin/projects', { method: 'POST', body: form })
    }
    editOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function remove(p: Project) {
  error.value = ''
  if (!confirm(`Projekt von „${p.customer || p.title}" wirklich löschen?`)) return
  try {
    await $fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

onMounted(async () => {
  const route = useRoute()
  const openId = Number(route.query.open)
  const cat = String(route.query.cat || '')
  if (['staging', 'leasing', 'showroom'].includes(cat)) tab.value = cat
  await load()
  newParam.consume(openNew)
  if (Number.isInteger(openId) && openId > 0) {
    const target = projects.value.find((p) => p.id === openId)
    if (target) openEdit(target)
    // Query-Parameter entfernen, damit ein Reload den Dialog nicht erneut öffnet
    await useRouter().replace({ query: {} })
  }
})
</script>

<template>
  <div class="proj">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Projekte</p>
        <h1 class="wf-title">Projekte</h1>
        <p class="wf-subtitle">Alle Staging, Furniture Leasing und Showroom Projekte auf einen Blick.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-projekte.jpg" alt="Home-staged Schlafzimmer in warmen Tönen">
        <button class="wf-btn wf-btn--primary wf-hero-cta" @click="openNew">
          <WfIcon name="plus" :size="15" /> Neues Projekt
        </button>
      </div>
    </section>

    <div class="proj__tabs" role="tablist">
      <button v-for="t in TABS" :key="t.value" class="proj__tab"
              :class="{ 'is-active': tab === t.value }" role="tab"
              :aria-selected="tab === t.value" @click="tab = t.value">
        {{ t.label }}
        <span v-if="counts[t.value]" class="proj__tabcount">{{ counts[t.value] }}</span>
      </button>
    </div>

    <div class="proj__filters">
      <input v-model="search" type="search" class="proj__search" placeholder="Suchen …" @input="onSearch">
    </div>

    <p v-if="error" class="proj__error" role="alert">{{ error }}</p>
    <p v-if="loading" class="proj__loading">Projekte werden geladen …</p>
    <p v-else-if="!projects.length" class="proj__empty">Keine Projekte in dieser Ansicht.</p>

    <template v-else>
      <section v-for="g in grouped" :key="g.section || 'all'" class="proj__group">
        <h2 v-if="g.section" class="proj__section">{{ g.section }}</h2>
        <ul class="proj__list">
          <li v-for="p in g.items" :key="p.id" class="proj__item">
            <div class="proj__row" @click="openEdit(p)">
              <span class="wf-thumb"><WfIcon name="home" :size="18" /></span>
              <div class="proj__main">
                <div class="proj__line1">
                  <strong>{{ p.customer || '—' }}</strong>
                  <span v-if="p.art" class="proj__art">{{ artLabel(p.art) }}</span>
                  <span v-if="p.team" class="proj__team">{{ p.team }}</span>
                  <span v-if="p.who" class="proj__team">{{ p.who }}</span>
                </div>
                <div class="proj__line2">{{ p.title }}</div>
                <div v-if="p.statusInfo" class="proj__info">{{ p.statusInfo }}</div>
                <div v-if="tab !== 'staging' && p.nextStep" class="proj__info">
                  <strong>Next:</strong> {{ p.nextStep }}
                </div>
              </div>
              <div class="proj__side">
                <span v-if="p.deadlineDate" class="proj__deadline" :class="deadlineClass(p)">
                  <WfIcon name="calendar" :size="12" /> {{ formatDate(p.deadlineDate) }}
                </span>
                <span v-else-if="p.deadlineText" class="proj__deadlinetext">{{ p.deadlineText }}</span>
                <span v-else-if="p.dateInfo" class="proj__deadlinetext">{{ p.dateInfo }}</span>
                <span v-if="p.note" class="proj__note">⚑ {{ p.note }}</span>
              </div>
              <div class="proj__actions">
                <button class="wf-btn wf-btn--sm" @click.stop="openEdit(p)">Bearbeiten</button>
                <button class="wf-btn wf-btn--sm wf-btn--danger" @click.stop="remove(p)">Löschen</button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Dialog -->
    <div v-if="editOpen" class="wf-modal-overlay" @click.self="editOpen = false">
      <div class="wf-modal proj__edmodal">
        <header class="proj__edhead">
          <div>
            <h2 class="proj__edtitle">{{ editing ? 'Projekt bearbeiten' : 'Neues Projekt' }}</h2>
            <p class="proj__edsub">Bearbeite die Projektdaten und verwalte die zugehörigen Möbel im Einsatz.</p>
          </div>
          <button class="proj__edclose" aria-label="Schließen" @click="editOpen = false">×</button>
        </header>

        <div class="proj__edgrid" :class="{ 'proj__edgrid--solo': !editing }">
          <!-- Links: Projektdaten -->
          <div class="proj__edleft">
            <section class="proj__edsect">
              <h3 class="proj__edsectitle">Allgemeine Informationen</h3>
              <div class="proj__edrow">
                <label class="proj__field">
                  <span>Bereich</span>
                  <select v-model="form.category">
                    <option v-for="t in TABS" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </label>
                <label v-if="form.category === 'staging'" class="proj__field">
                  <span>Abschnitt</span>
                  <select v-model="form.section">
                    <option value="">—</option>
                    <option>HOME STAGING</option>
                    <option>RE-DESIGN</option>
                    <option>FURNITURE LEASING</option>
                    <option>NEBENSCHAU PLÄTZE</option>
                  </select>
                </label>
              </div>
              <div class="proj__edrow">
                <label class="proj__field">
                  <span>Kunde</span>
                  <span class="proj__clearwrap">
                    <input v-model="form.customer" type="text" placeholder="z. B. Wabitsch Immobilien, Anna Weck">
                    <button v-if="form.customer" type="button" class="proj__clear" aria-label="Kunde leeren" @click="form.customer = ''">×</button>
                  </span>
                </label>
                <label class="proj__field">
                  <span>Projekt / Wo</span>
                  <input v-model="form.title" type="text" placeholder="z. B. 9., Rossauer Lände 17 Top 7">
                </label>
              </div>
              <div v-if="form.category === 'staging'" class="proj__edrow">
                <label class="proj__field">
                  <span>Art</span>
                  <select v-model="form.art">
                    <option value="">—</option>
                    <option value="HS">Home Staging</option>
                    <option value="RD">Redesign</option>
                    <option value="FL">Furniture Leasing</option>
                  </select>
                </label>
                <label class="proj__field">
                  <span>Deadline (Text)</span>
                  <input v-model="form.deadlineText" type="text" placeholder="Leihmöbel bis 12.10.26">
                </label>
                <label class="proj__field">
                  <span>Deadline (Datum)</span>
                  <input v-model="form.deadlineDate" type="date">
                </label>
              </div>
              <div v-else class="proj__edrow">
                <label class="proj__field">
                  <span>Next Step</span>
                  <input v-model="form.nextStep" type="text">
                </label>
                <label class="proj__field proj__field--small">
                  <span>Wer</span>
                  <input v-model="form.who" type="text">
                </label>
                <label class="proj__field">
                  <span>Datum</span>
                  <input v-model="form.dateInfo" type="text" placeholder="06.11.–09.11.">
                </label>
              </div>
            </section>

            <section class="proj__edsect">
              <h3 class="proj__edsectitle">Status &amp; Beschreibung</h3>
              <label class="proj__field">
                <span>{{ form.category === 'staging' ? 'Status / Info' : 'Status' }}</span>
                <textarea v-model="form.statusInfo" rows="3" />
              </label>
              <label v-if="form.category === 'staging'" class="proj__field">
                <span>Notiz</span>
                <textarea v-model="form.note" rows="2" placeholder="z. B. RECHNUNG!!" />
              </label>
            </section>

            <section v-if="form.category === 'staging'" class="proj__edsect">
              <h3 class="proj__edsectitle">Weitere Details</h3>
              <div class="proj__edrow">
                <label class="proj__field proj__field--small">
                  <span>Wer</span>
                  <input v-model="form.who" type="text">
                </label>
                <label class="proj__field">
                  <span>Nächster Schritt</span>
                  <input v-model="form.nextStep" type="text">
                </label>
                <label class="proj__field">
                  <span>Zeitraum</span>
                  <input v-model="form.dateInfo" type="text" placeholder="06.11.–09.11.">
                </label>
              </div>
            </section>
          </div>

          <!-- Rechts: Möbel im Einsatz -->
          <div v-if="editing" class="proj__edright">
            <section class="proj__posbox">
              <div class="proj__poshead">
                <div>
                  <h3 class="proj__posh">Möbel im Einsatz</h3>
                  <p class="proj__possub">Alle diesem Projekt zugeordneten Möbel und Accessoires.</p>
                </div>
                <span class="proj__posbtns">
                  <NuxtLink v-if="projectItems.length" :to="`/admin/packliste/${editing.id}`" class="wf-btn wf-btn--sm" title="Druckbare Packliste">
                    <WfIcon name="list" :size="14" /> Packliste
                  </NuxtLink>
                  <button v-if="projectItems.length" class="wf-btn wf-btn--sm" :disabled="extBusy" title="Angebot für die Verlängerung der Leihdauer" @click="offerExtension">
                    <WfIcon name="file" :size="14" /> Verlängerung
                  </button>
                  <button class="wf-btn wf-btn--sm wf-btn--primary" @click="showAddItem = !showAddItem">
                    <WfIcon name="plus" :size="14" /> Möbel hinzufügen
                  </button>
                </span>
              </div>

              <div class="proj__postools">
                <input v-model="itemListFilter" type="search" class="proj__possearch" placeholder="Möbel suchen (z. B. Sofa, Sessel …)">
                <select v-model="itemSort" class="proj__possort">
                  <option value="name">Sortieren: Name A–Z</option>
                  <option value="category">Sortieren: Kategorie</option>
                </select>
              </div>

              <p v-if="itemsLoading" class="proj__posempty">Möbel werden geladen …</p>
              <ul v-else-if="sortedProjectItems.length" class="proj__poslist">
                <li v-for="it in sortedProjectItems" :key="it.assignment_id" class="proj__posrow">
                  <span class="proj__posthumb"><WfIcon name="box" :size="18" /></span>
                  <span class="proj__posmain">
                    <strong class="proj__postitle">{{ it.title }}</strong>
                    <span class="proj__poscat">Kategorie: {{ categoryLabel(it.itemCategory) }}</span>
                  </span>
                  <span class="proj__posqty">× {{ it.quantity }}</span>
                  <span v-if="it.return_date" class="proj__posret" :class="{ 'is-overdue': it.return_date < localToday() }">
                    <WfIcon name="calendar" :size="12" /> Rückgabe {{ formatDate(it.return_date) }}
                  </span>
                  <span v-if="it.note" class="proj__posnote">{{ it.note }}</span>
                  <button class="proj__iconbtn proj__iconbtn--danger" title="Entfernen" @click="removeItem(it.item_id)">
                    <WfIcon name="trash" :size="15" />
                  </button>
                </li>
              </ul>
              <p v-else class="proj__posempty">
                {{ itemListFilter ? 'Keine Möbel passen zur Suche.' : 'Noch keine Möbel zugewiesen.' }}
              </p>

              <div v-if="showAddItem" class="proj__additem">
                <input v-model="itemSearch" type="search" placeholder="Möbel suchen (z. B. Sofa) …" @input="onItemSearch">
                <select v-if="itemResults.length" v-model="itemPick">
                  <option :value="null" disabled>Objekt wählen …</option>
                  <option v-for="r in itemResults" :key="r.id" :value="r.id">
                    {{ r.title }} ({{ r.warehouse || '—' }})
                  </option>
                </select>
                <input v-model.number="itemQty" type="number" min="1" class="proj__qty" title="Menge">
                <input v-model="itemReturn" type="date" class="proj__ret" title="Rückgabedatum">
                <input v-model="itemNote" type="text" class="proj__inote" placeholder="Notiz" maxlength="120">
                <button class="wf-btn wf-btn--sm wf-btn--primary" :disabled="!itemPick || itemBusy" @click="addItem">
                  {{ itemBusy ? 'Füge hinzu …' : 'Hinzufügen' }}
                </button>
              </div>
              <p v-if="itemError" class="proj__error" role="alert">{{ itemError }}</p>
            </section>
          </div>
        </div>

        <p v-if="saveError" class="proj__error" role="alert">{{ saveError }}</p>
        <footer class="proj__edfoot">
          <button class="wf-btn" @click="editOpen = false">Abbrechen</button>
          <button class="wf-btn wf-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Speichere …' : 'Speichern' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proj__tabs { display: flex; gap: .5em; margin-bottom: 1em; flex-wrap: wrap; }
.proj__tab {
  display: inline-flex; align-items: center; gap: .5em;
  border: 1px solid var(--wf-line); background: var(--wf-card); border-radius: 999px;
  font-family: inherit; font-size: .88em; color: var(--wf-muted);
  padding: .5em 1.1em; cursor: pointer; transition: border-color .15s, color .15s, background .15s;
}
.proj__tab:hover { border-color: var(--wf-green); color: var(--wf-green); }
.proj__tab.is-active { background: var(--wf-green-soft); border-color: var(--wf-green-soft); color: var(--wf-green); font-weight: 600; }
.proj__tabcount {
  background: #fff; color: var(--wf-muted); border-radius: 999px;
  font-size: .78em; padding: .05em .55em;
}
.proj__tab.is-active .proj__tabcount { background: var(--wf-green); color: #fff; }
.proj__filters { margin-bottom: 1em; }
.proj__search {
  width: 100%; max-width: 24em; padding: .6em .9em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 999px; box-sizing: border-box; outline: none;
  background: #fff url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238d8674" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-5.2-5.2"/></svg>') no-repeat .9em center;
  padding-left: 2.4em;
}
.proj__search:focus { border-color: var(--wf-green); }
.proj__group { margin-bottom: 1.4em; }
.proj__section {
  font-family: var(--wf-serif); font-weight: 400;
  font-size: 1.02em; color: var(--wf-muted);
  margin: 0 0 .5em; padding-bottom: .25em; border-bottom: 1px solid var(--wf-line);
  letter-spacing: .08em; text-transform: uppercase;
}
.proj__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .55em; }
.proj__item { background: var(--wf-card); border-radius: var(--wf-radius); box-shadow: var(--wf-shadow); border: 1px solid rgba(74, 62, 40, .04); transition: transform .12s; }
.proj__item:hover { transform: translateY(-1px); }
.proj__row { display: flex; gap: .9em; padding: .75em .9em; cursor: pointer; align-items: center; }
.proj__main { flex: 1; min-width: 0; }
.proj__line1 { display: flex; align-items: center; gap: .5em; flex-wrap: wrap; font-size: .95em; }
.proj__art, .proj__team {
  font-size: .7em; background: var(--wf-green-soft); color: var(--wf-green);
  border-radius: 6px; padding: .15em .5em; letter-spacing: .05em; font-weight: 700;
}
.proj__line2 { font-size: .84em; color: var(--wf-muted); margin-top: .15em; }
.proj__info { font-size: .83em; color: var(--wf-muted); margin-top: .3em; line-height: 1.45; }
.proj__side { flex-shrink: 0; display: flex; flex-direction: column; gap: .3em; align-items: flex-end; max-width: 15em; }
.proj__deadline { display: inline-flex; align-items: center; gap: .3em; font-size: .8em; font-weight: 600; border-radius: 999px; padding: .25em .7em; background: var(--wf-green-soft); color: var(--wf-green); }
.proj__deadline.is-soon { background: var(--wf-amber-soft); color: var(--wf-amber); }
.proj__deadline.is-overdue { background: var(--wf-red-soft); color: var(--wf-red); }
.proj__deadlinetext { font-size: .8em; color: var(--wf-muted); }
.proj__note { font-size: .78em; color: var(--wf-red); font-weight: 600; }
.proj__actions { flex-shrink: 0; display: flex; gap: .35em; }
.proj__error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .6em .9em; font-size: .88em; }
.proj__loading, .proj__empty { color: var(--wf-muted); padding: 2em 0; text-align: center; }
/* ---------- Bearbeiten-Dialog ---------- */
.proj__edmodal { max-width: 74em; }
.proj__edhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 1em; margin-bottom: 1.2em; }
.proj__edtitle { margin: 0; font-size: 1.5em; }
.proj__edsub { margin: .3em 0 0; color: var(--wf-muted); font-size: .9em; }
.proj__edclose {
  flex-shrink: 0; width: 2em; height: 2em; border-radius: 50%;
  border: 1px solid var(--wf-line); background: #fff; color: var(--wf-muted);
  font-size: 1.15em; line-height: 1; cursor: pointer; transition: color .15s, border-color .15s;
}
.proj__edclose:hover { color: var(--wf-red); border-color: var(--wf-red); }
.proj__posbtns { display: flex; gap: .4em; flex-wrap: wrap; justify-content: flex-end; }
.proj__edgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6em; align-items: start; }
.proj__edgrid--solo { grid-template-columns: 1fr; }
.proj__edsect { margin-bottom: 1.3em; }
.proj__edsectitle {
  font-family: var(--wf-serif); font-weight: 400; font-size: 1.05em;
  margin: 0 0 .7em; padding-bottom: .3em; border-bottom: 1px solid var(--wf-line);
}
.proj__edrow { display: flex; gap: .7em; flex-wrap: wrap; }
.proj__field { display: block; flex: 1; margin-bottom: .8em; min-width: 8em; }
.proj__field--small { flex: 0 0 7em; }
.proj__field--xs { flex: 0 0 4.8em; min-width: 4em; }
.proj__field > span:first-child { display: block; font-size: .78em; margin-bottom: .25em; color: var(--wf-muted); }
.proj__field input, .proj__field select, .proj__field textarea {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 10px; outline: none; background: #fff;
}
.proj__field input:focus, .proj__field select:focus, .proj__field textarea:focus { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.proj__clearwrap { position: relative; display: block; font-size: 1rem; }
.proj__clearwrap input { padding-right: 2em; }
.proj__clear {
  position: absolute; right: .35em; top: 50%; transform: translateY(-50%);
  width: 1.5em; height: 1.5em; border: 0; border-radius: 50%;
  background: var(--wf-line); color: var(--wf-muted); font-size: .95em; line-height: 1;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.proj__clear:hover { background: var(--wf-red-soft); color: var(--wf-red); }
.proj__edfoot { display: flex; justify-content: space-between; gap: .6em; margin-top: .6em; }

/* Möbel-Spalte (rechts) */
.proj__posbox { background: #fbf9f4; border: 1px solid var(--wf-line); border-radius: 12px; padding: 1.1em 1.2em; }
.proj__poshead { display: flex; justify-content: space-between; align-items: flex-start; gap: .8em; margin-bottom: .9em; }
.proj__posh { margin: 0; font-size: 1.15em; }
.proj__possub { margin: .25em 0 0; font-size: .82em; color: var(--wf-muted); }
.proj__postools { display: flex; gap: .6em; margin-bottom: .8em; flex-wrap: wrap; }
.proj__possearch {
  flex: 1; min-width: 11em; padding: .55em .9em .55em 2.3em; font-size: .88em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 999px; outline: none; box-sizing: border-box;
  background: #fff url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238d8674" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-5.2-5.2"/></svg>') no-repeat .8em center;
}
.proj__possearch:focus { border-color: var(--wf-green); }
.proj__possort { padding: .5em .7em; font-size: .85em; font-family: inherit; color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; outline: none; }
.proj__poslist { list-style: none; margin: 0; padding: 0; max-height: 24em; overflow-y: auto; }
.proj__posrow {
  display: flex; align-items: center; gap: .7em; flex-wrap: wrap;
  padding: .55em .4em; border-bottom: 1px solid #f0ebdf; font-size: .86em;
}
.proj__posrow:last-child { border-bottom: 0; }
.proj__posthumb {
  flex-shrink: 0; width: 2.6em; height: 2.6em; border-radius: 10px;
  background: var(--wf-green-soft); color: var(--wf-green);
  display: inline-flex; align-items: center; justify-content: center;
}
.proj__posmain { flex: 1; min-width: 9em; display: flex; flex-direction: column; gap: .1em; }
.proj__postitle { font-size: .95em; overflow-wrap: anywhere; }
.proj__poscat { font-size: .78em; color: var(--wf-muted); }
.proj__posqty { color: var(--wf-muted); font-weight: 600; }
.proj__posret { display: inline-flex; align-items: center; gap: .3em; font-size: .78em; background: var(--wf-green-soft); color: var(--wf-green); border-radius: 999px; padding: .2em .6em; font-weight: 600; }
.proj__posret.is-overdue { background: var(--wf-red-soft); color: var(--wf-red); }
.proj__posnote { font-size: .78em; color: var(--wf-muted); }
.proj__posempty { color: var(--wf-muted); font-size: .85em; margin: .3em 0 .6em; }
.proj__iconbtn {
  flex-shrink: 0; width: 2em; height: 2em; border-radius: 8px;
  border: 1px solid var(--wf-line); background: #fff; color: var(--wf-muted);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
}
.proj__iconbtn--danger:hover { color: var(--wf-red); border-color: var(--wf-red); background: var(--wf-red-soft); }
.proj__additem { display: flex; flex-wrap: wrap; gap: .5em; align-items: center; margin-top: .8em; padding-top: .9em; border-top: 1px dashed var(--wf-line); }
.proj__additem input[type="search"] { flex: 2; min-width: 12em; padding: .55em .8em; font-size: .88em; font-family: inherit; color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 10px; outline: none; background: #fff; }
.proj__additem select { flex: 2; min-width: 12em; padding: .55em .5em; font-size: .86em; font-family: inherit; color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 10px; }
.proj__qty { width: 4.5em; padding: .55em .4em; font-size: .88em; font-family: inherit; border: 1px solid var(--wf-line); border-radius: 10px; }
.proj__ret { padding: .5em .4em; font-size: .85em; font-family: inherit; border: 1px solid var(--wf-line); border-radius: 10px; }
.proj__inote { flex: 1; min-width: 8em; padding: .55em .8em; font-size: .88em; font-family: inherit; border: 1px solid var(--wf-line); border-radius: 10px; }

@media (max-width: 980px) {
  .proj__edgrid { grid-template-columns: 1fr; }
  .proj__edhead { margin-bottom: .9em; }
}

@media (max-width: 720px) {
  .proj__hero { flex-direction: column; }
  .proj__hero-text { padding: 1.3em 1.2em .3em; }
  .proj__hero-img { flex-basis: auto; height: 130px; }
  .proj__row { flex-wrap: wrap; }
  .proj__side { align-items: flex-start; max-width: none; }
}
</style>
