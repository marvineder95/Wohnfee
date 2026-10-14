<script setup lang="ts">
// Website-Inhalte → Reiter „Zahlen & Fakten“: Kennzahlen-Leiste (Startseite) und Fakten für Bauträger
// (Seite „Für Bauträger“). Je Block ein Schalter „auf der Website zeigen“; Beispielwerte sind markiert.
import { DEFAULT_SITE_CONTENT, type SiteContent, type FactItem } from '~~/shared/site-content'
const perms = usePermissions()
const canEdit = computed(() => perms.canEdit('partner'))
const content = ref<SiteContent>(JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT)))
const catalogCount = ref('')
const loading = ref(true)
const saving = ref(false)
const msg = ref('')
const error = ref('')
onMounted(async () => {
  try {
    const r = await $fetch<{ content: SiteContent; catalogCount: string }>('/api/admin/site-content')
    content.value = r.content
    catalogCount.value = r.catalogCount
  } catch (e: any) { error.value = e?.data?.statusMessage || 'Inhalte konnten nicht geladen werden.' }
  finally { loading.value = false }
})
const BLOCKS: Array<{ key: keyof SiteContent; title: string; where: string; icon: string }> = [
  { key: 'stats', title: 'Kennzahlen', where: 'Startseite – Leiste mit großen Zahlen', icon: 'diamond' },
  { key: 'developer', title: 'Fakten für Bauträger', where: 'Seite „Für Bauträger“', icon: 'folder' }
]
const hasExamples = (k: keyof SiteContent) => content.value[k].items.some(i => i.example)
function add(k: keyof SiteContent) { content.value[k].items.push({ value: '', label: '', labelEn: '', valueEn: '' }) }
function del(k: keyof SiteContent, i: number) { content.value[k].items.splice(i, 1) }
function confirmItem(it: FactItem) { it.example = false }
async function save() {
  saving.value = true
  msg.value = ''
  error.value = ''
  try {
    content.value = (await $fetch<{ content: SiteContent }>('/api/admin/site-content', { method: 'PUT', body: { content: content.value } })).content
    msg.value = 'Gespeichert – die Website zeigt die Änderungen innerhalb einer Minute.'
  } catch (e: any) { error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.' }
  finally { saving.value = false }
}
</script>

<template>
  <div class="sf">
    <p v-if="loading" class="sf__muted">Wird geladen …</p>
    <template v-else>
      <fieldset :disabled="!canEdit" class="sf__fs">
        <section v-for="b in BLOCKS" :key="b.key" class="sf__card wf-card">
          <header class="sf__head">
            <div>
              <h2><WfIcon :name="b.icon" :size="16" /> {{ b.title }}</h2>
              <small>{{ b.where }}</small>
            </div>
            <label class="sf__switch" :class="{ 'is-on': content[b.key].visible }">
              <input v-model="content[b.key].visible" type="checkbox">
              <span>{{ content[b.key].visible ? 'Auf der Website sichtbar' : 'Ausgeblendet' }}</span>
            </label>
          </header>
          <p v-if="hasExamples(b.key)" class="sf__warn"><WfIcon name="alert" :size="14" /> Enthält Beispielwerte – bitte prüfen und mit „Stimmt“ bestätigen, bevor ihr den Block sichtbar schaltet.</p>
          <div class="sf__rows">
            <div v-for="(it, i) in content[b.key].items" :key="i" class="sf__row" :class="{ 'is-example': it.example }">
              <label class="sf__fld sf__fld--val"><span>Wert</span>
                <input v-if="it.auto !== 'catalog'" v-model="it.value" type="text" maxlength="24" placeholder="z. B. 800+">
                <input v-else :value="catalogCount" type="text" disabled title="Wird automatisch aus dem Inventar gezählt"></label>
              <label class="sf__fld"><span>Text</span><input v-model="it.label" type="text" maxlength="120" placeholder="z. B. eingerichtete Wohnungen"></label>
              <label class="sf__fld sf__fld--en"><span>Englisch (optional)</span>
                <span class="sf__en">
                  <input v-if="it.auto !== 'catalog'" v-model="it.valueEn" type="text" maxlength="24" placeholder="Wert EN">
                  <input v-model="it.labelEn" type="text" maxlength="120" placeholder="Text EN">
                </span></label>
              <div class="sf__acts">
                <span v-if="it.auto === 'catalog'" class="wf-pill wf-pill--green" title="Zählt Möbel im Bestand (ohne verkauft/außer Dienst)">automatisch</span>
                <button v-if="it.example" type="button" class="wf-btn wf-btn--sm" title="Wert ist geprüft" @click="confirmItem(it)">Beispiel – Stimmt ✓</button>
                <button type="button" class="sf__x" :aria-label="`Zeile ${i + 1} entfernen`" @click="del(b.key, i)">×</button>
              </div>
            </div>
          </div>
          <button type="button" class="wf-btn wf-btn--sm" @click="add(b.key)"><WfIcon name="plus" :size="13" /> Zeile hinzufügen</button>
        </section>
      </fieldset>
      <p v-if="error" class="sf__error">{{ error }}</p>
      <p v-if="msg" class="sf__ok">{{ msg }}</p>
      <div v-if="canEdit" class="sf__save"><button type="button" class="wf-btn wf-btn--primary" :disabled="saving" @click="save">{{ saving ? 'Speichert …' : 'Zahlen & Fakten speichern' }}</button></div>
    </template>
  </div>
</template>

<style scoped>
.sf__fs { border: 0; margin: 0; padding: 0; display: grid; gap: 1em; min-width: 0; }
.sf__card { padding: 1.2em 1.4em; display: grid; gap: .8em; }
.sf__head { display: flex; justify-content: space-between; align-items: flex-start; gap: .8em; flex-wrap: wrap; }
.sf__head h2 { display: flex; align-items: center; gap: .5em; margin: 0; font-size: 1em; font-weight: 600; text-align: left; }
.sf__head h2 svg { color: var(--wf-green); }
.sf__head small { color: var(--wf-muted); font-size: .8em; }
.sf__switch { display: inline-flex; align-items: center; gap: .5em; padding: .5em .8em; border: 1px solid var(--wf-line); border-radius: 10px; font-size: .86em; font-weight: 600; cursor: pointer; }
.sf__switch.is-on { border-color: var(--wf-green); color: var(--wf-green); background: #f3f7f3; }
.sf__switch input { accent-color: var(--wf-green); }
.sf__warn { display: flex; align-items: center; gap: .5em; margin: 0; padding: .55em .8em; border-radius: 10px; background: #fff6e6; color: #8a5a12; font-size: .84em; }
.sf__rows { display: grid; gap: .6em; }
.sf__row { display: grid; grid-template-columns: 8em minmax(0, 1.4fr) minmax(0, 1.2fr) auto; gap: .6em; align-items: end; padding: .6em; border-radius: 12px; border: 1px solid transparent; }
.sf__row.is-example { border-color: #ecd5a8; background: #fffbf3; }
.sf__fld { display: grid; gap: .25em; font-size: .82em; min-width: 0; }
.sf__fld > span { color: var(--wf-muted); }
.sf__fld input { width: 100%; box-sizing: border-box; font: inherit; font-size: 1.05em; padding: .55em .7em; border: 1px solid var(--wf-line); border-radius: 9px; background: #fff; }
.sf__fld input:disabled { background: #f6f3ec; }
.sf__en { display: grid; grid-template-columns: 5.5em minmax(0, 1fr); gap: .4em; }
.sf__acts { display: flex; gap: .4em; align-items: center; padding-bottom: .2em; }
.sf__x { border: 0; background: none; font-size: 1.3em; color: var(--wf-muted); cursor: pointer; }
.sf__x:hover { color: var(--wf-red); }
.sf__muted { color: var(--wf-muted); }
.sf__error { color: var(--wf-red); }
.sf__ok { color: var(--wf-green); background: var(--wf-green-soft); border-radius: 10px; padding: .6em .9em; font-size: .88em; }
.sf__save { display: flex; justify-content: flex-end; margin-top: 1em; }
@media (max-width: 900px) { .sf__row { grid-template-columns: 1fr; } }
</style>
