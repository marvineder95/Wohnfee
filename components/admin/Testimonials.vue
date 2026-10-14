<script setup lang="ts">
// Website-Inhalte → Reiter „Kundenstimmen“: Zitate mit Name/Firma. Sichtbare Stimmen erscheinen auf der
// Startseite (alle) und auf der passenden Zielgruppen-Seite (Bauträger / Makler / Privat).
interface T { id: number; quote: string; quoteEn: string | null; name: string; role: string | null; audience: string; rating: number | null; visible: boolean; sortOrder: number; note: string | null }
const AUD: Record<string, string> = { alle: 'Alle Seiten', bautraeger: 'Für Bauträger', makler: 'Für Makler', privat: 'Für Privatpersonen' }
const perms = usePermissions()
const canEdit = computed(() => perms.canEdit('partner'))
const list = ref<T[]>([])
const loading = ref(true)
const error = ref('')
async function load() {
  loading.value = true
  try { list.value = (await $fetch<{ items: T[] }>('/api/admin/testimonials')).items }
  catch (e: any) { error.value = e?.data?.statusMessage || 'Kundenstimmen konnten nicht geladen werden.' }
  finally { loading.value = false }
}
onMounted(load)
const visibleCount = computed(() => list.value.filter(t => t.visible).length)

const open = ref(false)
const editing = ref<T | null>(null)
const saving = ref(false)
const saveError = ref('')
const empty = () => ({ quote: '', quoteEn: '', name: '', role: '', audience: 'alle', rating: 0 as number | null, visible: false, sortOrder: 0, note: '' })
const form = reactive(empty())
function openNew() { editing.value = null; Object.assign(form, empty()); saveError.value = ''; open.value = true }
function openEdit(t: T) {
  editing.value = t
  Object.assign(form, { quote: t.quote, quoteEn: t.quoteEn || '', name: t.name, role: t.role || '', audience: t.audience, rating: t.rating || 0, visible: t.visible, sortOrder: t.sortOrder, note: t.note || '' })
  saveError.value = ''
  open.value = true
}
async function save() {
  if (!form.quote.trim() || !form.name.trim()) { saveError.value = 'Bitte Zitat und Namen angeben.'; return }
  saving.value = true
  saveError.value = ''
  try {
    if (editing.value) await $fetch(`/api/admin/testimonials/${editing.value.id}`, { method: 'PUT', body: form })
    else await $fetch('/api/admin/testimonials', { method: 'POST', body: form })
    open.value = false
    await load()
  } catch (e: any) { saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.' }
  finally { saving.value = false }
}
async function toggleVisible(t: T) {
  if (!canEdit.value) return
  t.visible = !t.visible
  try { await $fetch(`/api/admin/testimonials/${t.id}`, { method: 'PUT', body: t }) }
  catch { t.visible = !t.visible; error.value = 'Sichtbarkeit konnte nicht geändert werden.' }
}
async function remove() {
  if (!editing.value || !window.confirm(`Kundenstimme von „${editing.value.name}“ löschen?`)) return
  await $fetch(`/api/admin/testimonials/${editing.value.id}`, { method: 'DELETE' })
  open.value = false
  await load()
}
</script>

<template>
  <div class="tst">
    <div class="tst__bar">
      <p class="tst__where" :class="{ 'is-live': visibleCount }">
        <WfIcon :name="visibleCount ? 'globe' : 'eye'" :size="14" />
        <template v-if="visibleCount">Auf der Website sichtbar: {{ visibleCount }} Kundenstimme{{ visibleCount === 1 ? '' : 'n' }} – Startseite und passende Zielgruppen-Seite.</template>
        <template v-else>Derzeit nichts auf der Website. Sobald eine Stimme sichtbar ist, erscheint der Bereich „Das sagen unsere Kunden“.</template>
      </p>
      <button v-if="canEdit" class="wf-btn wf-btn--sm wf-btn--primary" @click="openNew"><WfIcon name="plus" :size="14" /> Neue Kundenstimme</button>
    </div>
    <p v-if="error" class="tst__error">{{ error }}</p>
    <p v-if="loading" class="tst__muted">Wird geladen …</p>
    <div v-else-if="!list.length" class="tst__empty wf-card">
      <WfIcon name="heart" :size="28" />
      <p>Noch keine Kundenstimmen. Tipp: Nach einem gelungenen Projekt kurz um zwei, drei Sätze bitten – und ob Name und Firma genannt werden dürfen.</p>
      <button v-if="canEdit" class="wf-btn wf-btn--primary" @click="openNew">Erste Kundenstimme eintragen</button>
    </div>
    <ul v-else class="tst__list">
      <li v-for="t in list" :key="t.id" class="tst__card wf-card">
        <button type="button" class="tst__open" @click="openEdit(t)">
          <q>{{ t.quote }}</q>
          <span><strong>{{ t.name }}</strong><template v-if="t.role"> · {{ t.role }}</template></span>
          <small>{{ AUD[t.audience] }}<template v-if="t.rating"> · {{ '★'.repeat(t.rating) }}</template></small>
        </button>
        <label class="tst__vis" :class="{ 'is-on': t.visible }">
          <input type="checkbox" :checked="t.visible" :disabled="!canEdit" @change="toggleVisible(t)">
          <span>{{ t.visible ? 'Sichtbar' : 'Ausgeblendet' }}</span>
        </label>
      </li>
    </ul>

    <div v-if="open" class="wf-modal-overlay" @click.self="open = false">
      <div class="wf-modal tst__modal" role="dialog" aria-modal="true" aria-label="Kundenstimme">
        <h2>{{ editing ? 'Kundenstimme bearbeiten' : 'Neue Kundenstimme' }}</h2>
        <fieldset :disabled="!canEdit" class="tst__form">
          <label class="tst__field"><span>Zitat *</span><textarea id="tst-quote" v-model="form.quote" rows="4" maxlength="2000" placeholder="Was hat der Kunde gesagt? Am besten wörtlich und freigegeben." /></label>
          <div class="tst__row">
            <label class="tst__field"><span>Name *</span><input id="tst-name" v-model="form.name" type="text" maxlength="128" placeholder="z. B. Mag. Anna Muster"></label>
            <label class="tst__field"><span>Funktion / Firma</span><input id="tst-role" v-model="form.role" type="text" maxlength="190" placeholder="z. B. Projektleitung, Muster Bauträger GmbH"></label>
          </div>
          <div class="tst__row">
            <label class="tst__field"><span>Zeigen auf</span>
              <select id="tst-aud" v-model="form.audience"><option v-for="(l, k) in AUD" :key="k" :value="k">{{ l }}</option></select></label>
            <label class="tst__field"><span>Sterne (optional)</span>
              <select id="tst-rating" v-model.number="form.rating"><option :value="0">keine</option><option v-for="n in 5" :key="n" :value="n">{{ '★'.repeat(n) }}</option></select></label>
          </div>
          <label class="tst__field"><span>Zitat Englisch (optional)</span><textarea id="tst-quote-en" v-model="form.quoteEn" rows="2" maxlength="2000" /></label>
          <div class="tst__row">
            <label class="tst__field"><span>Reihenfolge</span><input id="tst-sort" v-model.number="form.sortOrder" type="number"></label>
            <label class="tst__switch" :class="{ 'is-on': form.visible }"><input id="tst-vis" v-model="form.visible" type="checkbox"><span>Auf der Website zeigen</span></label>
          </div>
          <label class="tst__field"><span><WfIcon name="lock" :size="12" /> Interne Notiz</span><textarea id="tst-note" v-model="form.note" rows="2" maxlength="2000" placeholder="z. B. Freigabe per Mail am …" /></label>
        </fieldset>
        <p v-if="saveError" class="tst__error">{{ saveError }}</p>
        <div class="tst__actions">
          <button v-if="editing && canEdit" type="button" class="wf-btn wf-btn--danger wf-btn--sm" @click="remove">Löschen</button>
          <span class="tst__spacer" />
          <button type="button" class="wf-btn" @click="open = false">Abbrechen</button>
          <button v-if="canEdit" type="button" class="wf-btn wf-btn--primary" :disabled="saving" @click="save">{{ saving ? 'Speichert …' : 'Speichern' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tst__bar { display: flex; justify-content: space-between; align-items: center; gap: .8em; flex-wrap: wrap; margin: 0 0 1em; }
.tst__where { display: flex; align-items: center; gap: .5em; margin: 0; font-size: .86em; color: var(--wf-muted); }
.tst__where.is-live { color: var(--wf-green); font-weight: 600; }
.tst__muted { color: var(--wf-muted); font-size: .86em; }
.tst__error { color: var(--wf-red); }
.tst__empty { padding: 2.4em; display: grid; justify-items: center; gap: .8em; color: var(--wf-muted); text-align: center; max-width: 100%; }
.tst__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 1em; }
.tst__card { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.tst__open { display: grid; gap: .5em; padding: 1.1em 1.2em; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.tst__open q { font-family: var(--wf-serif); font-size: 1.02em; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.tst__open small { color: var(--wf-muted); font-size: .78em; }
.tst__vis { display: flex; align-items: center; gap: .5em; padding: .6em 1.2em; border-top: 1px solid var(--wf-line); font-size: .84em; color: var(--wf-muted); cursor: pointer; margin-top: auto; }
.tst__vis.is-on { color: var(--wf-green); font-weight: 600; background: #f3f7f3; }
.tst__vis input, .tst__switch input { accent-color: var(--wf-green); }
.tst__modal { max-width: 40em; }
.tst__modal h2 { margin: 0 0 .8em; text-align: left; }
.tst__form { border: 0; margin: 0; padding: 0; display: grid; gap: .8em; min-width: 0; }
.tst__row { display: grid; grid-template-columns: 1fr 1fr; gap: .8em; align-items: end; }
.tst__field { display: grid; gap: .3em; font-size: .86em; min-width: 0; }
.tst__field > span { color: var(--wf-muted); display: inline-flex; gap: .3em; align-items: center; }
.tst__field input, .tst__field textarea, .tst__field select { width: 100%; box-sizing: border-box; font: inherit; font-size: 1.04em; padding: .6em .75em; border: 1px solid var(--wf-line); border-radius: 10px; background-color: #fff; }
.tst__switch { display: inline-flex; align-items: center; gap: .5em; padding: .6em .8em; border: 1px solid var(--wf-line); border-radius: 10px; font-size: .88em; font-weight: 600; cursor: pointer; }
.tst__switch.is-on { border-color: var(--wf-green); color: var(--wf-green); background: #f3f7f3; }
.tst__actions { display: flex; gap: .5em; align-items: center; margin-top: 1.2em; flex-wrap: wrap; }
.tst__spacer { flex: 1; }
@media (max-width: 560px) { .tst__row { grid-template-columns: 1fr; } }
</style>
