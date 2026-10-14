<script setup lang="ts">
import { PARTNER_KINDS, PARTNER_CATEGORIES, type PartnerKind } from '~~/shared/partners'
// Website-Inhalte → Reiter „Partner“ bzw. „Referenzen“ (prop kind).
// Partner: Seite /partner.html; Referenzen: Logo-Leiste Startseite / Für Bauträger.
// Auf der Website erscheint nur, was hier „Auf der Website zeigen“ hat.
const props = defineProps<{ kind: PartnerKind }>()
interface Partner {
  id: number; kind: PartnerKind; name: string; category: string | null
  description: string | null; descriptionEn: string | null; website: string | null
  logo: string | null; visible: boolean; sortOrder: number; note: string | null
}
const perms = usePermissions()
const canEdit = computed(() => perms.canEdit('partner'))
const items = ref<Partner[]>([])
const loading = ref(true)
const error = ref('')
const tab = computed(() => props.kind)

async function load() {
  loading.value = true
  error.value = ''
  try { items.value = (await $fetch<{ items: Partner[] }>('/api/admin/partners')).items }
  catch (e: any) { error.value = e?.data?.statusMessage || 'Partner konnten nicht geladen werden.' }
  finally { loading.value = false }
}
onMounted(load)

const list = computed(() => items.value.filter(i => i.kind === tab.value))
const count = (k: PartnerKind) => items.value.filter(i => i.kind === k).length
const visibleCount = (k: PartnerKind) => items.value.filter(i => i.kind === k && i.visible).length
const hostOf = (u: string | null) => { try { return u ? new URL(u).host.replace(/^www\./, '') : '' } catch { return u || '' } }

// ---------- Dialog ----------
const open = ref(false)
const editing = ref<Partner | null>(null)
const saving = ref(false)
const saveError = ref('')
const uploading = ref(false)
const empty = () => ({
  kind: tab.value as PartnerKind, name: '', category: '', description: '', descriptionEn: '',
  website: '', logo: '' as string, visible: false, sortOrder: 0, note: ''
})
const form = reactive(empty())

function openNew() {
  editing.value = null
  Object.assign(form, empty())
  saveError.value = ''
  open.value = true
}
function openEdit(p: Partner) {
  editing.value = p
  Object.assign(form, {
    kind: p.kind, name: p.name, category: p.category || '', description: p.description || '',
    descriptionEn: p.descriptionEn || '', website: p.website || '', logo: p.logo || '',
    visible: p.visible, sortOrder: p.sortOrder, note: p.note || ''
  })
  saveError.value = ''
  open.value = true
}
async function onLogo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploading.value = true
  saveError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', f)
    form.logo = (await $fetch<{ path: string }>('/api/admin/partners/upload', { method: 'POST', body: fd })).path
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage || 'Logo konnte nicht hochgeladen werden.'
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
async function save() {
  if (!form.name.trim()) { saveError.value = 'Bitte einen Namen angeben.'; return }
  saving.value = true
  saveError.value = ''
  try {
    if (editing.value) await $fetch(`/api/admin/partners/${editing.value.id}`, { method: 'PUT', body: form })
    else await $fetch('/api/admin/partners', { method: 'POST', body: form })
    open.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}
async function toggleVisible(p: Partner) {
  if (!canEdit.value) return
  const next = !p.visible
  p.visible = next
  try { await $fetch(`/api/admin/partners/${p.id}`, { method: 'PUT', body: { ...p, visible: next } }) }
  catch { p.visible = !next; error.value = 'Sichtbarkeit konnte nicht geändert werden.' }
}
async function remove() {
  if (!editing.value) return
  if (!window.confirm(`„${editing.value.name}“ wirklich löschen?`)) return
  await $fetch(`/api/admin/partners/${editing.value.id}`, { method: 'DELETE' })
  open.value = false
  await load()
}
</script>

<template>
  <div class="prt">
    <div class="prt__bar">
      <p class="prt__where" :class="{ 'is-live': visibleCount(tab) > 0 }">
        <WfIcon :name="visibleCount(tab) ? 'globe' : 'eye'" :size="14" />
        <template v-if="visibleCount(tab)">
          Auf der Website sichtbar: {{ visibleCount(tab) }} {{ visibleCount(tab) === 1 ? 'Eintrag' : 'Einträge' }} – {{ PARTNER_KINDS[tab].where }}.
        </template>
        <template v-else>
          Derzeit nichts auf der Website. Sobald ein Eintrag „Auf der Website zeigen“ hat, erscheint die {{ PARTNER_KINDS[tab].where }}.
        </template>
      </p>
      <button v-if="canEdit" class="wf-btn wf-btn--sm wf-btn--primary" @click="openNew">
        <WfIcon name="plus" :size="14" /> {{ tab === 'partner' ? 'Neuer Partner' : 'Neue Referenz' }}
      </button>
    </div>
    <p v-if="error" class="prt__error">{{ error }}</p>
    <p v-if="loading" class="prt__muted">Wird geladen …</p>
    <div v-else-if="!list.length" class="prt__empty wf-card">
      <WfIcon :name="tab === 'partner' ? 'users' : 'diamond'" :size="28" />
      <p>{{ tab === 'partner' ? 'Noch keine Partner angelegt.' : 'Noch keine Referenzen angelegt.' }}</p>
      <button v-if="canEdit" class="wf-btn wf-btn--primary" @click="openNew">{{ tab === 'partner' ? 'Ersten Partner anlegen' : 'Erste Referenz anlegen' }}</button>
    </div>

    <ul v-else class="prt__grid">
      <li v-for="p in list" :key="p.id" class="prt__card wf-card">
        <button type="button" class="prt__open" :aria-label="`${p.name} bearbeiten`" @click="openEdit(p)">
          <span class="prt__logo">
            <img v-if="p.logo" :src="p.logo" alt="">
            <span v-else class="prt__initial">{{ p.name.slice(0, 1) }}</span>
          </span>
          <span class="prt__body">
            <strong>{{ p.name }}</strong>
            <small>{{ [p.category, hostOf(p.website)].filter(Boolean).join(' · ') || '—' }}</small>
            <span v-if="p.kind === 'partner' && !p.description" class="prt__warn">Beschreibung fehlt</span>
            <span v-if="!p.logo" class="prt__warn">Logo fehlt</span>
          </span>
        </button>
        <label class="prt__vis" :class="{ 'is-on': p.visible }">
          <input type="checkbox" :checked="p.visible" :disabled="!canEdit" @change="toggleVisible(p)">
          <span>{{ p.visible ? 'Sichtbar' : 'Ausgeblendet' }}</span>
        </label>
      </li>
    </ul>

    <!-- Dialog -->
    <div v-if="open" class="wf-modal-overlay" @click.self="open = false">
      <div class="wf-modal prt__modal" role="dialog" aria-modal="true" :aria-label="editing ? 'Eintrag bearbeiten' : 'Neuer Eintrag'">
        <h2>{{ editing ? editing.name : (form.kind === 'partner' ? 'Neuer Partner' : 'Neue Referenz') }}</h2>
        <fieldset :disabled="!canEdit" class="prt__form">
          <div class="prt__kind">
            <label v-for="(k, key) in PARTNER_KINDS" :key="key" :class="{ 'is-on': form.kind === key }">
              <input v-model="form.kind" type="radio" name="kind" :value="key">
              <strong>{{ k.label }}</strong><small>{{ k.where }}</small>
            </label>
          </div>

          <div class="prt__row">
            <label class="prt__field"><span>Name *</span>
              <input id="prt-name" v-model="form.name" type="text" maxlength="190" placeholder="z. B. Studio Lichtblick Fotografie"></label>
            <label class="prt__field"><span>Kategorie</span>
              <input id="prt-cat" v-model="form.category" type="text" list="prt-cats" maxlength="64" placeholder="z. B. Fotografie">
              <datalist id="prt-cats"><option v-for="c in PARTNER_CATEGORIES" :key="c" :value="c" /></datalist></label>
          </div>
          <label class="prt__field"><span>Website</span>
            <input id="prt-web" v-model="form.website" type="url" inputmode="url" maxlength="255" placeholder="www.beispiel.at"></label>

          <div class="prt__logoedit">
            <span class="prt__logo prt__logo--lg">
              <img v-if="form.logo" :src="form.logo" alt="Logo-Vorschau">
              <span v-else class="prt__initial">{{ form.name.slice(0, 1) || '?' }}</span>
            </span>
            <div>
              <label class="wf-btn wf-btn--sm prt__upload">
                <input type="file" accept="image/png,image/jpeg,image/webp" @change="onLogo">
                {{ uploading ? 'Wird hochgeladen …' : (form.logo ? 'Logo ersetzen' : 'Logo hochladen') }}
              </label>
              <button v-if="form.logo" type="button" class="prt__link" @click="form.logo = ''">Logo entfernen</button>
              <p class="prt__muted">Am besten PNG mit transparentem Hintergrund, mind. 400 px breit.</p>
            </div>
          </div>

          <template v-if="form.kind === 'partner'">
            <label class="prt__field"><span>Beschreibung (Website)</span>
              <textarea id="prt-desc" v-model="form.description" rows="3" maxlength="2000" placeholder="Was macht ihr gemeinsam? Zwei Sätze reichen." /></label>
            <label class="prt__field"><span>Beschreibung Englisch (optional)</span>
              <textarea id="prt-desc-en" v-model="form.descriptionEn" rows="2" maxlength="2000" /></label>
          </template>

          <div class="prt__row">
            <label class="prt__field"><span>Reihenfolge</span>
              <input id="prt-sort" v-model.number="form.sortOrder" type="number" step="1"></label>
            <label class="prt__switch" :class="{ 'is-on': form.visible }">
              <input id="prt-vis" v-model="form.visible" type="checkbox">
              <span>Auf der Website zeigen</span>
            </label>
          </div>
          <p class="prt__muted">Kleinere Zahl = weiter vorne. Bei Referenzen nur mit Zustimmung der Firma sichtbar schalten.</p>

          <label class="prt__field"><span><WfIcon name="lock" :size="12" /> Interne Notiz (nur Dashboard)</span>
            <textarea id="prt-note" v-model="form.note" rows="2" maxlength="2000" placeholder="z. B. Ansprechpartner, Zustimmung zur Logo-Nutzung am …" /></label>
        </fieldset>

        <p v-if="saveError" class="prt__error">{{ saveError }}</p>
        <div class="prt__actions">
          <button v-if="editing && canEdit" type="button" class="wf-btn wf-btn--danger wf-btn--sm" @click="remove">Löschen</button>
          <span class="prt__spacer" />
          <button type="button" class="wf-btn" @click="open = false">Abbrechen</button>
          <button v-if="canEdit" type="button" class="wf-btn wf-btn--primary" :disabled="saving || uploading" @click="save">
            {{ saving ? 'Speichert …' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prt__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1em; }
.prt__head .wf-title { text-align: left; margin: 0; }
.prt__tabs { display: flex; gap: .4em; flex-wrap: wrap; margin-bottom: .8em; }
.prt__tab { border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .45em 1em; font: inherit; font-size: .88em; cursor: pointer; }
.prt__tab small { color: var(--wf-muted); margin-left: .2em; }
.prt__tab.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.prt__tab.is-on small { color: rgba(255, 255, 255, .8); }
.prt__bar { display: flex; justify-content: space-between; align-items: center; gap: .8em; flex-wrap: wrap; margin: 0 0 1em; }
.prt__where { display: flex; align-items: center; gap: .5em; margin: 0; font-size: .86em; color: var(--wf-muted); }
.prt__where.is-live { color: var(--wf-green); font-weight: 600; }
.prt__muted { color: var(--wf-muted); font-size: .84em; margin: .3em 0 0; line-height: 1.5; }
.prt__error { color: var(--wf-red); }
.prt__empty { padding: 2.4em; display: grid; justify-items: center; gap: .8em; color: var(--wf-muted); text-align: center; }

.prt__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 1em; }
.prt__card { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.prt__open { display: flex; gap: 1em; align-items: center; padding: 1em 1.1em; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; min-width: 0; }
.prt__open:hover strong { color: var(--wf-green); }
.prt__logo { flex: none; width: 4.2em; height: 4.2em; border-radius: 12px; background: #f6f3ec; display: grid; place-items: center; overflow: hidden; border: 1px solid var(--wf-line); }
.prt__logo img { max-width: 86%; max-height: 86%; object-fit: contain; }
.prt__logo--lg { width: 6em; height: 6em; }
.prt__initial { font-family: var(--wf-serif); font-size: 1.6em; color: var(--wf-muted); }
.prt__body { display: grid; gap: .2em; min-width: 0; }
.prt__body strong { overflow-wrap: anywhere; }
.prt__body small { color: var(--wf-muted); font-size: .8em; overflow-wrap: anywhere; }
.prt__warn { font-size: .74em; color: #a8741f; }
.prt__vis { display: flex; align-items: center; gap: .5em; padding: .6em 1.1em; border-top: 1px solid var(--wf-line); font-size: .84em; color: var(--wf-muted); cursor: pointer; }
.prt__vis.is-on { color: var(--wf-green); font-weight: 600; background: #f3f7f3; }
.prt__vis input { accent-color: var(--wf-green); }

.prt__modal { max-width: 40em; }
.prt__modal h2 { margin: 0 0 .8em; text-align: left; }
.prt__form { border: 0; margin: 0; padding: 0; display: grid; gap: .8em; min-width: 0; }
.prt__kind { display: grid; grid-template-columns: 1fr 1fr; gap: .6em; }
.prt__kind label { display: grid; gap: .15em; padding: .7em .9em; border: 1px solid var(--wf-line); border-radius: 12px; cursor: pointer; }
.prt__kind label.is-on { border-color: var(--wf-green); background: #f3f7f3; }
.prt__kind input { position: absolute; opacity: 0; pointer-events: none; }
.prt__kind small { color: var(--wf-muted); font-size: .78em; line-height: 1.35; }
.prt__row { display: grid; grid-template-columns: 1fr 1fr; gap: .8em; align-items: end; }
.prt__field { display: grid; gap: .3em; font-size: .86em; min-width: 0; }
.prt__field > span { color: var(--wf-muted); display: inline-flex; align-items: center; gap: .3em; }
.prt__field input, .prt__field textarea {
  width: 100%; box-sizing: border-box; font: inherit; font-size: 1.05em; padding: .6em .75em;
  border: 1px solid var(--wf-line); border-radius: 10px; background: #fff;
}
.prt__field input:focus, .prt__field textarea:focus { outline: 0; border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.prt__logoedit { display: flex; gap: 1em; align-items: center; }
.prt__upload { position: relative; overflow: hidden; cursor: pointer; }
.prt__upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.prt__link { border: 0; background: none; color: var(--wf-red); font: inherit; font-size: .84em; cursor: pointer; margin-left: .6em; }
.prt__switch { display: inline-flex; align-items: center; gap: .5em; padding: .6em .8em; border: 1px solid var(--wf-line); border-radius: 10px; font-size: .9em; font-weight: 600; cursor: pointer; }
.prt__switch.is-on { border-color: var(--wf-green); color: var(--wf-green); background: #f3f7f3; }
.prt__switch input { accent-color: var(--wf-green); width: 1.1em; height: 1.1em; }
.prt__actions { display: flex; gap: .5em; align-items: center; margin-top: 1.2em; flex-wrap: wrap; }
.prt__spacer { flex: 1; }
@media (max-width: 560px) {
  .prt__kind, .prt__row { grid-template-columns: 1fr; }
}
</style>
