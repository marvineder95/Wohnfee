<script setup lang="ts">
import { referenceSearchUrl } from '~~/shared/reference-search'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Foto-Modus - WOHNFEE Dashboard' })

// Foto-Modus fürs Handy im Lager: Objekte ohne Foto, sortiert nach Lager → Kategorie → Name.
// „Foto aufnehmen“ öffnet direkt die Kamera; das Bild wird beim Hochladen automatisch zugeschnitten
// (server/utils/image-optimize.ts) und ist sofort dem Objekt zugeordnet. Danach ist das nächste Stück dran.
interface Row {
  id: number; asolId: number | null; title: string; category: string | null; supplier: string | null
  status: string; warehouse: string | null; customerLocation: string | null; imagePath: string | null
  referenceUrl?: string | null; quantity: number
}
const perms = usePermissions()
const canEdit = computed(() => perms.canEdit('inventar'))
const STATUS = [
  { key: 'lager', label: 'Im Lager' },
  { key: 'pflege', label: 'Reinigung/Reparatur' },
  { key: 'vermietet', label: 'Vermietet' }
]
const statuses = ref<string[]>(['lager', 'pflege'])
const warehouse = ref('')
const search = ref('')
const rows = ref<Row[]>([])
const total = ref(0)
const page = ref(0)
const PAGE = 50
const loading = ref(false)
const error = ref('')
const warehouses = ref<Array<{ name: string; count: number }>>([])
const done = ref<Record<number, { path: string; count: number }>>({})
const busy = ref<number | null>(null)
const sessionCount = ref(0)

async function load(reset = true) {
  if (reset) { page.value = 0; rows.value = [] }
  loading.value = true
  error.value = ''
  try {
    const p = new URLSearchParams({ q: search.value, page: String(page.value), pagelen: String(PAGE), flags: 'nophoto', sort: 'warehouse' })
    if (statuses.value.length) p.set('status', statuses.value.join(','))
    if (warehouse.value) p.set('warehouse', warehouse.value)
    const res = await $fetch<{ items: Row[]; total: number; warehouses: any[] }>(`/api/admin/inventory?${p}`)
    rows.value = reset ? res.items : [...rows.value, ...res.items]
    total.value = res.total
    warehouses.value = res.warehouses
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Liste konnte nicht geladen werden.'
  } finally { loading.value = false }
}
function more() { page.value++; load(false) }
let timer: any = null
function onSearch() { clearTimeout(timer); timer = setTimeout(() => load(), 300) }
function toggleStatus(k: string) {
  statuses.value = statuses.value.includes(k) ? statuses.value.filter(x => x !== k) : [...statuses.value, k]
  load()
}
onMounted(() => load())

const open = computed(() => rows.value.filter(r => !done.value[r.id]).length)
const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const loc = (r: Row) => r.status === 'vermietet' ? (r.customerLocation || 'beim Kunden') : (r.warehouse || 'Lager offen')

// Ein verstecktes Datei-Feld je Zeile (capture=environment → Rückkamera am Handy)
async function onFile(r: Row, e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files || [])]
  input.value = ''
  if (!files.length) return
  busy.value = r.id
  error.value = ''
  try {
    let last = ''
    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f)
      last = (await $fetch<{ path: string }>(`/api/admin/inventory/${r.id}/images`, { method: 'POST', body: fd })).path
    }
    const prev = done.value[r.id]
    done.value = { ...done.value, [r.id]: { path: prev?.path || last, count: (prev?.count || 0) + files.length } }
    sessionCount.value += files.length
    // nächstes offenes Objekt in den Blick holen
    await nextTick()
    const next = rows.value.find(x => !done.value[x.id] && x.id !== r.id && rows.value.indexOf(x) > rows.value.indexOf(r))
    if (next) document.getElementById(`fm-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Foto konnte nicht hochgeladen werden – bitte nochmal versuchen.'
  } finally { busy.value = null }
}
</script>

<template>
  <div class="fm">
    <section class="fm__head wf-card">
      <div>
        <p class="wf-eyebrow">Inventar</p>
        <h1 class="wf-title">Foto-Modus</h1>
        <p class="wf-subtitle">Objekte ohne Foto – sortiert nach Lager. Antippen, fotografieren, fertig: das Foto wird automatisch zugeschnitten und zugeordnet.</p>
      </div>
      <div class="fm__stats">
        <span><strong>{{ num(total) }}</strong> ohne Foto</span>
        <span v-if="sessionCount" class="is-done"><strong>{{ sessionCount }}</strong> heute fotografiert</span>
      </div>
    </section>

    <div class="fm__filters">
      <input v-model="search" type="search" class="fm__search" placeholder="Suchen: Name, ID, ASOL-Nr. …" aria-label="Suchen" @input="onSearch">
      <select v-model="warehouse" class="fm__select" aria-label="Lager" @change="load()">
        <option value="">Alle Lager</option>
        <option v-for="w in warehouses" :key="w.name" :value="w.name">{{ w.name }}</option>
      </select>
      <div class="fm__chips">
        <button v-for="s in STATUS" :key="s.key" type="button" class="fm__chip" :class="{ 'is-on': statuses.includes(s.key) }" :aria-pressed="statuses.includes(s.key)" @click="toggleStatus(s.key)">{{ s.label }}</button>
      </div>
    </div>

    <p v-if="!canEdit" class="fm__warn">Du kannst die Liste ansehen, aber keine Fotos hochladen (fehlende Berechtigung).</p>
    <p v-if="error" class="fm__error" role="alert">{{ error }}</p>

    <ul class="fm__list">
      <li v-for="r in rows" :id="`fm-${r.id}`" :key="r.id" class="fm__row wf-card" :class="{ 'is-done': done[r.id] }">
        <span class="fm__thumb">
          <img v-if="done[r.id]" :src="done[r.id].path" alt="">
          <WfIcon v-else name="camera" :size="20" />
        </span>
        <span class="fm__info">
          <strong>{{ r.title }}</strong>
          <small>#{{ r.id }}<template v-if="r.asolId"> · ASOL {{ r.asolId }}</template><template v-if="r.supplier"> · {{ r.supplier }}</template></small>
          <small class="fm__loc"><WfIcon name="pin" :size="11" /> {{ loc(r) }}<template v-if="r.quantity > 1"> · {{ r.quantity }} Stück</template></small>
          <a v-if="r.referenceUrl" :href="r.referenceUrl" target="_blank" rel="noopener" class="fm__ref">So sieht das Modell aus ↗</a>
          <a v-else :href="referenceSearchUrl(r.title, r.supplier)" target="_blank" rel="noopener" class="fm__ref fm__ref--search">Im Netz suchen ↗</a>
        </span>
        <label v-if="canEdit" class="fm__shoot" :class="{ 'is-busy': busy === r.id, 'is-again': done[r.id] }">
          <input type="file" accept="image/*" capture="environment" :disabled="busy !== null" @change="onFile(r, $event)">
          <WfIcon :name="done[r.id] ? 'plus' : 'camera'" :size="16" />
          <span>{{ busy === r.id ? 'Lädt …' : done[r.id] ? `${done[r.id].count} ✓ weiteres` : 'Foto aufnehmen' }}</span>
        </label>
      </li>
    </ul>

    <p v-if="loading" class="fm__muted">Wird geladen …</p>
    <p v-else-if="!rows.length" class="fm__muted">Hier fehlen keine Fotos mehr. 🎉</p>
    <button v-else-if="rows.length < total" type="button" class="wf-btn fm__more" @click="more">Weitere {{ Math.min(PAGE, total - rows.length) }} laden ({{ rows.length }} von {{ total }})</button>
    <p v-if="rows.length && !open && rows.length >= total" class="fm__muted">Alles in dieser Auswahl fotografiert – stark!</p>
  </div>
</template>

<style scoped>
.fm__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1em; }
.fm__head .wf-title { text-align: left; margin: 0; }
.fm__stats { display: flex; gap: .6em; flex-wrap: wrap; }
.fm__stats span { padding: .5em .9em; border-radius: 12px; background: #f6f3ec; font-size: .86em; }
.fm__stats span.is-done { background: #eef3ee; color: var(--wf-green); }
.fm__stats strong { font-variant-numeric: tabular-nums; }
.fm__filters { display: flex; flex-wrap: wrap; gap: .6em; align-items: center; margin-bottom: 1em; }
.fm__search { flex: 1 1 14em; min-width: 0; padding: .65em 1em; font: inherit; font-size: .95em; border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; }
.fm__search:focus { outline: 0; border-color: var(--wf-green); }
.fm__select { padding: .6em .9em; font: inherit; font-size: .9em; border: 1px solid var(--wf-line); border-radius: 999px; background-color: #fff; }
.fm__chips { display: flex; gap: .4em; flex-wrap: wrap; }
.fm__chip { padding: .5em .95em; border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; font: inherit; font-size: .85em; cursor: pointer; }
.fm__chip.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.fm__warn { padding: .6em .9em; border-radius: 10px; background: #fff6e6; color: #8a5a12; font-size: .88em; }
.fm__error { color: var(--wf-red); }
.fm__muted { color: var(--wf-muted); text-align: center; margin: 1.5em 0; }
.fm__list { list-style: none; margin: 0; padding: 0; display: grid; gap: .55em; }
.fm__row { display: flex; align-items: center; gap: .9em; padding: .75em .9em; transition: background .2s, opacity .2s; }
.fm__row.is-done { background: #f3f7f3; }
.fm__thumb { flex: none; width: 3.6em; height: 3.6em; border-radius: 12px; background: #f6f3ec; display: grid; place-items: center; color: #a39d8e; overflow: hidden; }
.fm__thumb img { width: 100%; height: 100%; object-fit: cover; }
.fm__info { flex: 1; min-width: 0; display: grid; gap: .15em; }
.fm__info strong { font-size: .95em; line-height: 1.3; overflow-wrap: anywhere; }
.fm__info small { color: var(--wf-muted); font-size: .76em; overflow-wrap: anywhere; }
.fm__loc { display: inline-flex; align-items: center; gap: .25em; }
.fm__ref { font-size: .78em; color: var(--wf-green); text-decoration: none; }
.fm__ref:hover { text-decoration: underline; }
.fm__ref--search { color: var(--wf-muted); }
.fm__shoot {
  position: relative; flex: none; display: inline-flex; align-items: center; gap: .45em; padding: .75em 1.1em; border-radius: 999px;
  background: var(--wf-green); color: #fff; font-weight: 600; font-size: .88em; cursor: pointer; white-space: nowrap; overflow: hidden; box-sizing: border-box; max-width: 100%;
}
.fm__shoot input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.fm__shoot.is-again { background: #fff; color: var(--wf-green); border: 1px solid var(--wf-green); }
.fm__shoot.is-busy { opacity: .6; pointer-events: none; }
.fm__more { display: block; margin: 1.2em auto; }
@media (max-width: 560px) {
  .fm__head { padding: 1.2em; }
  .fm__row { flex-wrap: wrap; }
  .fm__info { flex-basis: calc(100% - 4.6em); }
  .fm__shoot { width: 100%; justify-content: center; padding: .9em 1em; font-size: .95em; }
}
</style>
