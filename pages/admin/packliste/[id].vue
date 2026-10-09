<script setup lang="ts">
import { categoryLabel } from '~~/shared/inventory-categories'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Packliste - WOHNFEE Dashboard', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

// Druckbare Packliste eines Projekts für die eigene Spedition.
// Modus „lieferung": was raus muss (nach Lager sortiert, zum Zusammenstellen)
// Modus „abholung":  was beim Kunden wieder eingesammelt werden muss.
const route = useRoute()
const projectId = Number(route.params.id)
const mode = ref<'lieferung' | 'abholung'>(route.query.modus === 'abholung' ? 'abholung' : 'lieferung')

interface Project { id: number; category: string; customer: string | null; title: string | null; team: string | null; who: string | null; deadlineDate: string | null; deadlineText: string | null; statusInfo: string | null }
interface Item { assignment_id: number; item_id: number; quantity: number; return_date: string | null; note: string | null; title: string; warehouse: string | null; itemCategory: string | null }

const project = ref<Project | null>(null)
const items = ref<Item[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const [p, it] = await Promise.all([
      $fetch<{ projects: Project[] }>('/api/admin/projects'),
      $fetch<{ items: Item[] }>(`/api/admin/projects/${projectId}/items`)
    ])
    project.value = p.projects.find((x) => x.id === projectId) || null
    if (!project.value) error.value = 'Projekt nicht gefunden.'
    items.value = it.items
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Packliste konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
})

// Lieferung: nach Lager gruppiert; Abholung: nach Kategorie (Raum für Raum einsammeln)
const groups = computed(() => {
  const keyOf = (i: Item) => mode.value === 'lieferung' ? (i.warehouse || 'Ohne Lagerangabe') : categoryLabel(i.itemCategory)
  const map = new Map<string, Item[]>()
  for (const i of items.value) {
    const k = keyOf(i)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(i)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'de'))
    .map(([name, list]) => ({ name, list: list.sort((a, b) => categoryLabel(a.itemCategory).localeCompare(categoryLabel(b.itemCategory), 'de') || a.title.localeCompare(b.title, 'de')) }))
})
const totalPieces = computed(() => items.value.reduce((s, i) => s + (Number(i.quantity) || 1), 0))
const fmtDate = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('.') : '—')
function printSheet() { window.print() }
const printedAt = ref('')
onMounted(() => { printedAt.value = new Date().toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' }) })
</script>

<template>
  <div class="pack">
    <div class="pack__bar no-print">
      <NuxtLink to="/admin/touren" class="wf-btn wf-btn--sm">‹ Touren</NuxtLink>
      <div class="pack__modes" role="tablist">
        <button :class="{ 'is-active': mode === 'lieferung' }" @click="mode = 'lieferung'">Auslieferung</button>
        <button :class="{ 'is-active': mode === 'abholung' }" @click="mode = 'abholung'">Abholung</button>
      </div>
      <button class="wf-btn wf-btn--sm wf-btn--primary" :disabled="!items.length" @click="printSheet">
        <WfIcon name="print" :size="14" /> Drucken
      </button>
    </div>

    <p v-if="loading" class="pack__muted">Packliste wird geladen …</p>
    <p v-else-if="error" class="pack__error">{{ error }}</p>

    <article v-else-if="project" class="pack__sheet wf-card">
      <header class="pack__head">
        <div>
          <p class="pack__kind">Packliste · {{ mode === 'lieferung' ? 'Auslieferung' : 'Abholung' }}</p>
          <h1 class="pack__title">{{ project.customer || project.title }}</h1>
          <p v-if="project.customer && project.title" class="pack__addr"><WfIcon name="pin" :size="13" /> {{ project.title }}</p>
        </div>
        <dl class="pack__facts">
          <div><dt>Stück gesamt</dt><dd>{{ totalPieces }} ({{ items.length }} Positionen)</dd></div>
          <div v-if="project.deadlineDate || project.deadlineText"><dt>Leihmöbel bis</dt><dd>{{ project.deadlineDate ? fmtDate(project.deadlineDate) : project.deadlineText }}</dd></div>
          <div v-if="project.team || project.who"><dt>Team</dt><dd>{{ [project.team, project.who].filter(Boolean).join(' · ') }}</dd></div>
          <div><dt>Gedruckt</dt><dd>{{ printedAt }}</dd></div>
        </dl>
      </header>

      <p v-if="!items.length" class="pack__muted">Diesem Projekt sind noch keine Möbel zugewiesen.</p>

      <section v-for="g in groups" :key="g.name" class="pack__group">
        <h2 class="pack__grouph">{{ mode === 'lieferung' ? 'Lager: ' : '' }}{{ g.name }} <small>{{ g.list.reduce((s, i) => s + (Number(i.quantity) || 1), 0) }} Stück</small></h2>
        <table class="pack__table">
          <thead>
            <tr>
              <th class="pack__chk">{{ mode === 'lieferung' ? 'Gepackt' : 'Eingesammelt' }}</th>
              <th class="pack__chk">{{ mode === 'lieferung' ? 'Aufgebaut' : 'Im Lager' }}</th>
              <th class="pack__qty">Menge</th>
              <th>Objekt</th>
              <th>{{ mode === 'lieferung' ? 'Kategorie' : 'Lager' }}</th>
              <th>Notiz</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in g.list" :key="i.assignment_id">
              <td class="pack__chk"><span class="pack__box" /></td>
              <td class="pack__chk"><span class="pack__box" /></td>
              <td class="pack__qty">{{ i.quantity }}×</td>
              <td><strong>{{ i.title }}</strong> <span class="pack__id">#{{ i.item_id }}</span></td>
              <td>{{ mode === 'lieferung' ? categoryLabel(i.itemCategory) : (i.warehouse || '—') }}</td>
              <td>{{ i.note || '' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer class="pack__sign">
        <div><span>{{ mode === 'lieferung' ? 'Gepackt von' : 'Abgeholt von' }}</span></div>
        <div><span>Datum / Uhrzeit</span></div>
        <div><span>{{ mode === 'lieferung' ? 'Übernahme Kunde' : 'Übergabe Kunde' }}</span></div>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.pack__bar { display: flex; gap: .6em; align-items: center; flex-wrap: wrap; margin-bottom: 1em; }
.pack__modes { display: inline-flex; padding: 3px; border: 1px solid var(--wf-line); border-radius: 999px; background: #fff; }
.pack__modes button { border: 0; background: none; font: inherit; font-size: .84em; padding: .35em .9em; border-radius: 999px; cursor: pointer; }
.pack__modes button.is-active { background: var(--wf-green); color: #fff; }
.pack__muted { color: var(--wf-muted); }
.pack__error { color: var(--wf-red); }

.pack__sheet { padding: 1.8em 2em; }
.pack__head { display: flex; justify-content: space-between; gap: 1.5em; flex-wrap: wrap; padding-bottom: 1em; border-bottom: 2px solid var(--wf-ink); margin-bottom: 1.2em; }
.pack__kind { margin: 0 0 .3em; font-size: .72em; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--wf-green); }
.pack__title { margin: 0; font-family: var(--wf-serif); font-size: 1.6em; font-weight: 500; }
.pack__addr { margin: .3em 0 0; display: flex; align-items: center; gap: .3em; color: var(--wf-muted); }
.pack__facts { margin: 0; display: grid; grid-template-columns: auto auto; gap: .2em 1em; font-size: .85em; align-content: start; }
.pack__facts div { display: contents; }
.pack__facts dt { color: var(--wf-muted); }
.pack__facts dd { margin: 0; font-weight: 600; }

.pack__group { margin-bottom: 1.3em; break-inside: avoid-page; }
.pack__grouph { font-size: 1em; margin: 0 0 .4em; display: flex; gap: .6em; align-items: baseline; }
.pack__grouph small { font-weight: 400; color: var(--wf-muted); font-size: .8em; }
.pack__table { width: 100%; border-collapse: collapse; font-size: .86em; }
.pack__table th { text-align: left; font-size: .78em; color: var(--wf-muted); font-weight: 600; border-bottom: 1px solid var(--wf-line); padding: .35em .4em; }
.pack__table td { border-bottom: 1px solid #efebe1; padding: .45em .4em; vertical-align: top; }
.pack__table tr { break-inside: avoid; }
.pack__chk { width: 5.5em; text-align: center !important; }
.pack__qty { width: 3.5em; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pack__box { display: inline-block; width: 15px; height: 15px; border: 1.5px solid var(--wf-ink); border-radius: 3px; }
.pack__id { color: var(--wf-muted); font-size: .85em; }

.pack__sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5em; margin-top: 2.5em; }
.pack__sign div { border-top: 1px solid var(--wf-ink); padding-top: .3em; font-size: .78em; color: var(--wf-muted); }

@media print {
  .no-print { display: none !important; }
  .pack__sheet { box-shadow: none; padding: 0; border: 0; }
}
</style>

<style>
@media print {
  .admin-shell__side, .admin-shell__top { display: none !important; }
  .admin-shell__content { padding: 0 !important; max-width: none !important; }
  @page { margin: 14mm; }
}
</style>
