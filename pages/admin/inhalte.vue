<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Website-Inhalte - WOHNFEE Dashboard' })

// Website-Inhalte an EINEM Ort: Partner, Referenzen (Logos), Kundenstimmen, Zahlen & Fakten.
// Alles bleibt auf der Website unsichtbar, bis es hier freigeschaltet wird. Reiter per ?tab=…
const route = useRoute()
const router = useRouter()
const TABS = [
  { key: 'partner', label: 'Partner', icon: 'users' },
  { key: 'referenz', label: 'Referenzen (Logos)', icon: 'diamond' },
  { key: 'stimmen', label: 'Kundenstimmen', icon: 'heart' },
  { key: 'zahlen', label: 'Zahlen & Fakten', icon: 'euro' }
] as const
type TabKey = typeof TABS[number]['key']
const tab = ref<TabKey>((TABS.find(t => t.key === route.query.tab)?.key) || 'partner')
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }))
</script>

<template>
  <div class="inh">
    <section class="inh__head wf-card">
      <p class="wf-eyebrow">Website</p>
      <h1 class="wf-title">Website-Inhalte</h1>
      <p class="wf-subtitle">Partner, Kunden-Logos, Kundenstimmen und Kennzahlen für die Website. Angezeigt wird nur, was hier freigeschaltet ist.</p>
    </section>
    <div class="inh__tabs" role="tablist">
      <button v-for="t in TABS" :key="t.key" role="tab" type="button" class="inh__tab" :class="{ 'is-on': tab === t.key }"
              :aria-selected="tab === t.key" @click="tab = t.key">
        <WfIcon :name="t.icon" :size="14" /> {{ t.label }}
      </button>
    </div>
    <AdminPartners v-if="tab === 'partner'" key="partner" kind="partner" />
    <AdminPartners v-else-if="tab === 'referenz'" key="referenz" kind="referenz" />
    <AdminTestimonials v-else-if="tab === 'stimmen'" />
    <AdminSiteFacts v-else />
  </div>
</template>

<style scoped>
.inh__head { padding: 1.6em 1.8em; margin-bottom: 1em; }
.inh__head .wf-title { text-align: left; margin: 0; }
.inh__tabs { display: flex; gap: .4em; flex-wrap: wrap; margin-bottom: 1.1em; }
.inh__tab { display: inline-flex; align-items: center; gap: .4em; border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .5em 1.05em; font: inherit; font-size: .88em; cursor: pointer; }
.inh__tab.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
</style>
