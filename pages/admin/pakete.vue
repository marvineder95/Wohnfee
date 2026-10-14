<script setup lang="ts">
import { packageBase, priceForMonths, DEFAULT_TIERS, type DiscountTier } from '~~/shared/rental-pricing'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Mietpakete - WOHNFEE Dashboard' })

// Möbelpakete für den Mietshop: Stücke aus dem Inventar, Preis = Summe − Paketrabatt (oder fester Preis),
// die Rabattstaffel nach Mietdauer kommt obendrauf. Im Shop nur sichtbar + buchbar, wenn alle Stücke frei sind.
interface PkgItem { id: number; title: string; imagePath: string | null; quantity: number; price: number | null; free?: number }
interface Pkg {
  id: number; title: string; titleEn: string | null; description: string | null; descriptionEn: string | null
  imagePath: string | null; discountPct: number; priceOverride: number | null; visible: boolean; sortOrder: number
  items: PkgItem[]; sum: number | null; base: number | null; available: boolean
}
const perms = usePermissions()
const canEdit = computed(() => perms.canEdit('inventar'))
const list = ref<Pkg[]>([])
const loading = ref(true)
const error = ref('')
const tiers = ref<DiscountTier[]>(DEFAULT_TIERS)

async function load() {
  loading.value = true
  error.value = ''
  try { list.value = (await $fetch<{ items: Pkg[] }>('/api/admin/packages')).items }
  catch (e: any) { error.value = e?.data?.statusMessage || 'Pakete konnten nicht geladen werden.' }
  finally { loading.value = false }
}
onMounted(async () => {
  load()
  try { tiers.value = (await $fetch<{ tiers: DiscountTier[] }>('/api/rental-catalog')).tiers } catch { /* Standard */ }
})
const eur = (v: number | null | undefined) => v === null || v === undefined ? '–' : Number(v).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })

// ---------- Editor ----------
const open = ref(false)
const editing = ref<Pkg | null>(null)
const saving = ref(false)
const saveError = ref('')
const uploading = ref(false)
const form = reactive({
  title: '', titleEn: '', description: '', descriptionEn: '', imagePath: '',
  discountPct: 10, priceOverride: '' as string | number, visible: false, sortOrder: 0,
  items: [] as PkgItem[]
})
function openNew() {
  editing.value = null
  Object.assign(form, { title: '', titleEn: '', description: '', descriptionEn: '', imagePath: '', discountPct: 10, priceOverride: '', visible: false, sortOrder: 0, items: [] })
  saveError.value = ''
  search.value = ''
  results.value = []
  open.value = true
}
function openEdit(p: Pkg) {
  editing.value = p
  Object.assign(form, {
    title: p.title, titleEn: p.titleEn || '', description: p.description || '', descriptionEn: p.descriptionEn || '',
    imagePath: p.imagePath && p.imagePath.startsWith('/uploads/pakete/') ? p.imagePath : '',
    discountPct: p.discountPct, priceOverride: p.priceOverride ?? '', visible: p.visible, sortOrder: p.sortOrder,
    items: p.items.map(i => ({ ...i }))
  })
  saveError.value = ''
  search.value = ''
  results.value = []
  open.value = true
}

// Preisberechnung live im Editor
const sum = computed(() => form.items.every(i => i.price !== null) && form.items.length
  ? Math.round(form.items.reduce((s, i) => s + (i.price as number) * i.quantity, 0) * 100) / 100 : null)
const base = computed(() => packageBase(form.items, Number(form.discountPct) || 0, Number(String(form.priceOverride).replace(',', '.')) || null))
const missingPrice = computed(() => form.items.filter(i => i.price === null))
const examples = computed(() => [1, 3, 6, 12, 24, 36].map(m => ({ m, price: priceForMonths(base.value, m, tiers.value) })))
const pieces = (items: PkgItem[]) => items.reduce((s, i) => s + i.quantity, 0)

// Möbel suchen (nur vermietbare)
const search = ref('')
const results = ref<any[]>([])
let timer: any = null
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const q = search.value.trim()
    if (q.length < 2) { results.value = []; return }
    try {
      const res = await $fetch<{ items: any[] }>(`/api/admin/inventory?q=${encodeURIComponent(q)}&rentable=1&pagelen=10`)
      results.value = res.items.filter((i: any) => !form.items.some(x => x.id === i.id))
    } catch { results.value = [] }
  }, 250)
}
function addItem(i: any) {
  const p = Number(i.rentPrice1m)
  form.items.push({ id: i.id, title: i.title, imagePath: i.imagePath || null, quantity: 1, price: p > 0 ? p : null })
  results.value = results.value.filter(r => r.id !== i.id)
}
function setQty(it: PkgItem, q: number) {
  if (q < 1) form.items = form.items.filter(x => x !== it)
  else it.quantity = Math.min(99, q)
}
async function onImage(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', f)
    form.imagePath = (await $fetch<{ path: string }>('/api/admin/packages/upload', { method: 'POST', body: fd })).path
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage || 'Foto konnte nicht hochgeladen werden.'
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
async function save() {
  if (!form.title.trim()) { saveError.value = 'Bitte einen Paketnamen angeben.'; return }
  if (!form.items.length) { saveError.value = 'Bitte mindestens ein Möbelstück hinzufügen.'; return }
  saving.value = true
  saveError.value = ''
  try {
    const body = { ...form, items: form.items.map(i => ({ id: i.id, quantity: i.quantity })) }
    if (editing.value) await $fetch(`/api/admin/packages/${editing.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/admin/packages', { method: 'POST', body })
    open.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}
async function toggleVisible(p: Pkg) {
  if (!canEdit.value) return
  const next = !p.visible
  p.visible = next
  try {
    await $fetch(`/api/admin/packages/${p.id}`, { method: 'PUT', body: { ...p, visible: next, items: p.items.map(i => ({ id: i.id, quantity: i.quantity })) } })
  } catch { p.visible = !next; error.value = 'Sichtbarkeit konnte nicht geändert werden.' }
}
async function remove() {
  if (!editing.value || !window.confirm(`Paket „${editing.value.title}“ löschen? Die Möbel bleiben im Inventar.`)) return
  await $fetch(`/api/admin/packages/${editing.value.id}`, { method: 'DELETE' })
  open.value = false
  await load()
}
</script>

<template>
  <div class="pk">
    <section class="pk__head wf-card">
      <div>
        <p class="wf-eyebrow">Furniture Leasing</p>
        <h1 class="wf-title">Mietpakete</h1>
        <p class="wf-subtitle">Fertige Raum-Pakete für den Mietshop – ein Preis, alles passt zusammen. Die Rabattstaffel nach Mietdauer (Konditionen) kommt obendrauf.</p>
      </div>
      <button v-if="canEdit" class="wf-btn wf-btn--sm wf-btn--primary" @click="openNew"><WfIcon name="plus" :size="14" /> Neues Paket</button>
    </section>

    <p v-if="error" class="pk__error">{{ error }}</p>
    <p v-if="loading" class="pk__muted">Wird geladen …</p>
    <div v-else-if="!list.length" class="pk__empty wf-card">
      <WfIcon name="box" :size="28" />
      <p>Noch keine Pakete. Stellt z. B. „Wohnzimmer komplett“ oder „Musterwohnung 2 Zimmer“ aus dem Inventar zusammen.</p>
      <button v-if="canEdit" class="wf-btn wf-btn--primary" @click="openNew">Erstes Paket anlegen</button>
    </div>

    <ul v-else class="pk__grid">
      <li v-for="p in list" :key="p.id" class="pk__card wf-card">
        <button type="button" class="pk__open" :aria-label="`${p.title} bearbeiten`" @click="openEdit(p)">
          <span class="pk__img">
            <img v-if="p.imagePath" :src="p.imagePath" alt="">
            <WfIcon v-else name="box" :size="26" />
            <span class="wf-pill pk__state" :class="p.available ? 'wf-pill--green' : 'wf-pill--amber'">{{ p.available ? 'Alle Stücke frei' : 'Teilweise vermietet' }}</span>
          </span>
          <span class="pk__body">
            <strong>{{ p.title }}</strong>
            <small>{{ pieces(p.items) }} Teile · Paketrabatt {{ p.discountPct }} %{{ p.priceOverride ? ' · fester Preis' : '' }}</small>
            <span class="pk__price"><b>{{ eur(p.base) }}</b> / Monat <s v-if="p.sum && p.base && p.sum > p.base">{{ eur(p.sum) }}</s></span>
            <span v-if="p.base === null" class="pk__warn">Preis fehlt bei mind. einem Stück – Paket wird im Shop nicht gezeigt</span>
          </span>
        </button>
        <label class="pk__vis" :class="{ 'is-on': p.visible }">
          <input type="checkbox" :checked="p.visible" :disabled="!canEdit" @change="toggleVisible(p)">
          <span>{{ p.visible ? 'Im Shop sichtbar' : 'Ausgeblendet' }}</span>
        </label>
      </li>
    </ul>

    <div v-if="open" class="wf-modal-overlay" @click.self="open = false">
      <div class="wf-modal pk__modal" role="dialog" aria-modal="true" :aria-label="editing ? 'Paket bearbeiten' : 'Neues Paket'">
        <h2>{{ editing ? editing.title : 'Neues Paket' }}</h2>
        <fieldset :disabled="!canEdit" class="pk__form">
          <div class="pk__cols">
            <div class="pk__col">
              <label class="pk__field"><span>Paketname *</span><input id="pk-title" v-model="form.title" type="text" maxlength="190" placeholder="z. B. Wohnzimmer komplett „Salbei“"></label>
              <label class="pk__field"><span>Beschreibung (Shop)</span><textarea id="pk-desc" v-model="form.description" rows="3" maxlength="2000" placeholder="Was macht das Paket aus? Für welchen Raum?" /></label>
              <details class="pk__en">
                <summary>Englisch (optional)</summary>
                <label class="pk__field"><span>Name EN</span><input id="pk-title-en" v-model="form.titleEn" type="text" maxlength="190"></label>
                <label class="pk__field"><span>Beschreibung EN</span><textarea id="pk-desc-en" v-model="form.descriptionEn" rows="2" maxlength="2000" /></label>
              </details>
              <div class="pk__photo">
                <span class="pk__img pk__img--sm"><img v-if="form.imagePath" :src="form.imagePath" alt=""><WfIcon v-else name="camera" :size="20" /></span>
                <div>
                  <label class="wf-btn wf-btn--sm pk__upload"><input type="file" accept="image/png,image/jpeg,image/webp" @change="onImage">{{ uploading ? 'Lädt …' : (form.imagePath ? 'Foto ersetzen' : 'Paketfoto hochladen') }}</label>
                  <p class="pk__muted">Ohne eigenes Foto wird das erste Möbelfoto verwendet.</p>
                </div>
              </div>
              <div class="pk__row">
                <label class="pk__field"><span>Paketrabatt</span><span class="pk__unit"><input id="pk-disc" v-model.number="form.discountPct" type="number" min="0" max="90" step="0.5"><em>%</em></span></label>
                <label class="pk__field"><span>Fester Preis (optional)</span><span class="pk__unit"><input id="pk-override" v-model="form.priceOverride" type="text" inputmode="decimal" placeholder="leer = automatisch"><em>€ / Mon.</em></span></label>
              </div>
              <div class="pk__row">
                <label class="pk__field"><span>Reihenfolge</span><input id="pk-sort" v-model.number="form.sortOrder" type="number"></label>
                <label class="pk__switch" :class="{ 'is-on': form.visible }"><input id="pk-vis" v-model="form.visible" type="checkbox"><span>Im Shop zeigen</span></label>
              </div>
            </div>

            <div class="pk__col">
              <span class="pk__label">Möbel im Paket ({{ pieces(form.items) }} Teile)</span>
              <div class="pk__search">
                <input id="pk-search" v-model="search" type="search" placeholder="Vermietbares Möbel suchen …" @input="onSearch">
                <ul v-if="results.length" class="pk__results">
                  <li v-for="r in results" :key="r.id">
                    <button type="button" @click="addItem(r)">
                      <span>{{ r.title }}</span>
                      <small>{{ Number(r.rentPrice1m) > 0 ? eur(r.rentPrice1m) + ' / Mon.' : 'ohne Mietpreis' }}</small>
                    </button>
                  </li>
                </ul>
              </div>
              <ul v-if="form.items.length" class="pk__items">
                <li v-for="it in form.items" :key="it.id" :class="{ 'is-warn': it.price === null || (it.free !== undefined && it.free < it.quantity) }">
                  <span class="pk__ithumb"><img v-if="it.imagePath" :src="it.imagePath" alt=""><WfIcon v-else name="bag" :size="14" /></span>
                  <span class="pk__itext">
                    <strong>{{ it.title }}</strong>
                    <small>
                      {{ it.price !== null ? eur(it.price) + ' / Mon.' : 'Mietpreis fehlt' }}
                      <template v-if="it.free !== undefined && it.free < it.quantity"> · derzeit nur {{ it.free }} frei</template>
                    </small>
                  </span>
                  <span class="pk__stepper">
                    <button type="button" aria-label="Weniger" @click="setQty(it, it.quantity - 1)">−</button>
                    <span>{{ it.quantity }}</span>
                    <button type="button" aria-label="Mehr" @click="setQty(it, it.quantity + 1)">+</button>
                  </span>
                </li>
              </ul>
              <p v-else class="pk__muted">Noch keine Möbel – oben suchen und hinzufügen.</p>

              <div class="pk__calc">
                <p><span>Summe Einzelpreise</span><b>{{ eur(sum) }} / Mon.</b></p>
                <p class="is-main"><span>Paketpreis (1 Monat)</span><b>{{ eur(base) }} / Mon.</b></p>
                <p v-if="missingPrice.length && !Number(form.priceOverride)" class="pk__warn">{{ missingPrice.length }} Stück{{ missingPrice.length > 1 ? 'e' : '' }} ohne Mietpreis – im Inventar ergänzen oder festen Preis eintragen.</p>
                <div v-if="base" class="pk__ex">
                  <span v-for="e in examples" :key="e.m">{{ e.m }} Mon.: <b>{{ eur(e.price) }}</b></span>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
        <p v-if="saveError" class="pk__error">{{ saveError }}</p>
        <div class="pk__actions">
          <button v-if="editing && canEdit" type="button" class="wf-btn wf-btn--danger wf-btn--sm" @click="remove">Löschen</button>
          <span class="pk__spacer" />
          <button type="button" class="wf-btn" @click="open = false">Abbrechen</button>
          <button v-if="canEdit" type="button" class="wf-btn wf-btn--primary" :disabled="saving || uploading" @click="save">{{ saving ? 'Speichert …' : 'Speichern' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1em; }
.pk__head .wf-title { text-align: left; margin: 0; }
.pk__muted { color: var(--wf-muted); font-size: .84em; margin: .3em 0 0; line-height: 1.5; }
.pk__error { color: var(--wf-red); }
.pk__warn { color: #a8741f; font-size: .78em; }
.pk__empty { padding: 2.4em; display: grid; justify-items: center; gap: .8em; color: var(--wf-muted); text-align: center; }
.pk__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr)); gap: 1em; }
.pk__card { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.pk__open { display: flex; flex-direction: column; border: 0; background: none; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.pk__img { position: relative; aspect-ratio: 16 / 9; background: #ece6da; display: grid; place-items: center; color: #9b9483; overflow: hidden; width: 100%; }
.pk__img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pk__img--sm { width: 5em; aspect-ratio: 1; border-radius: 10px; flex: none; }
.pk__state { position: absolute; top: .7em; left: .7em; }
.pk__body { display: grid; gap: .25em; padding: .9em 1.1em 1em; min-width: 0; }
.pk__body small { color: var(--wf-muted); font-size: .8em; }
.pk__price { font-size: .92em; }
.pk__price s { color: var(--wf-muted); margin-left: .4em; font-size: .9em; }
.pk__vis { display: flex; align-items: center; gap: .5em; padding: .6em 1.1em; border-top: 1px solid var(--wf-line); font-size: .84em; color: var(--wf-muted); cursor: pointer; margin-top: auto; }
.pk__vis.is-on { color: var(--wf-green); font-weight: 600; background: #f3f7f3; }
.pk__vis input, .pk__switch input { accent-color: var(--wf-green); }

.pk__modal { max-width: 62em; }
.pk__modal h2 { margin: 0 0 .8em; text-align: left; }
.pk__form { border: 0; margin: 0; padding: 0; min-width: 0; }
.pk__cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 1.4em; }
.pk__col { display: grid; gap: .75em; align-content: start; min-width: 0; }
.pk__field { display: grid; gap: .3em; font-size: .86em; min-width: 0; }
.pk__field > span:first-child, .pk__label { color: var(--wf-muted); font-size: .86em; }
.pk__field input, .pk__field textarea, .pk__search input {
  width: 100%; box-sizing: border-box; font: inherit; font-size: 1.02em; padding: .6em .75em;
  border: 1px solid var(--wf-line); border-radius: 10px; background: #fff;
}
.pk__field input:focus, .pk__field textarea:focus, .pk__search input:focus { outline: 0; border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.pk__en summary { cursor: pointer; font-size: .84em; color: var(--wf-green); margin-bottom: .5em; }
.pk__en { display: grid; gap: .6em; }
.pk__photo { display: flex; gap: .9em; align-items: center; }
.pk__upload { position: relative; overflow: hidden; cursor: pointer; }
.pk__upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.pk__row { display: grid; grid-template-columns: 1fr 1fr; gap: .8em; align-items: end; }
.pk__unit { position: relative; display: block; }
.pk__unit input { padding-right: 4.8em; }
.pk__unit em { position: absolute; right: .7em; top: 50%; transform: translateY(-50%); font-style: normal; font-size: .8em; color: var(--wf-muted); pointer-events: none; }
.pk__switch { display: inline-flex; align-items: center; gap: .5em; padding: .6em .8em; border: 1px solid var(--wf-line); border-radius: 10px; font-size: .88em; font-weight: 600; cursor: pointer; }
.pk__switch.is-on { border-color: var(--wf-green); color: var(--wf-green); background: #f3f7f3; }
.pk__search { position: relative; }
.pk__results { position: absolute; z-index: 5; left: 0; right: 0; top: calc(100% + 4px); margin: 0; padding: .3em; list-style: none; background: #fff; border: 1px solid #e7e1d6; border-radius: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, .08); max-height: 18em; overflow: auto; }
.pk__results button { display: flex; justify-content: space-between; gap: 1em; width: 100%; text-align: left; border: 0; background: none; padding: .5em .6em; border-radius: 7px; font: inherit; font-size: .88em; cursor: pointer; }
.pk__results button:hover { background: #f3f7f3; }
.pk__results small { color: var(--wf-muted); white-space: nowrap; }
.pk__items { list-style: none; margin: 0; padding: 0; display: grid; gap: .4em; max-height: 20em; overflow: auto; }
.pk__items li { display: flex; align-items: center; gap: .6em; padding: .45em .55em; border: 1px solid var(--wf-line); border-radius: 10px; background: #fff; }
.pk__items li.is-warn { border-color: #e9c98f; background: #fffaf0; }
.pk__ithumb { flex: none; width: 2.4em; height: 2.4em; border-radius: 7px; background: #f6f3ec; display: grid; place-items: center; overflow: hidden; }
.pk__ithumb img { width: 100%; height: 100%; object-fit: cover; }
.pk__itext { flex: 1; min-width: 0; display: grid; }
.pk__itext strong { font-size: .86em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pk__itext small { font-size: .76em; color: var(--wf-muted); }
.pk__stepper { display: inline-flex; align-items: center; gap: .3em; }
.pk__stepper button { width: 1.8em; height: 1.8em; border: 1px solid var(--wf-line); border-radius: 50%; background: #fff; cursor: pointer; font: inherit; line-height: 1; }
.pk__stepper span { min-width: 1.4em; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
.pk__calc { display: grid; gap: .3em; padding: .8em 1em; border-radius: 12px; background: #f6f3ec; font-size: .88em; }
.pk__calc p { display: flex; justify-content: space-between; margin: 0; }
.pk__calc p.is-main { font-size: 1.05em; color: var(--wf-green); }
.pk__ex { display: flex; flex-wrap: wrap; gap: .3em .9em; margin-top: .3em; font-size: .86em; color: var(--wf-muted); }
.pk__ex b { color: var(--wf-ink); font-variant-numeric: tabular-nums; }
.pk__actions { display: flex; gap: .5em; align-items: center; margin-top: 1.2em; flex-wrap: wrap; }
.pk__spacer { flex: 1; }
@media (max-width: 760px) { .pk__cols, .pk__row { grid-template-columns: 1fr; } }
</style>
