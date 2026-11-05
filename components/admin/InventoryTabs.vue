<script setup lang="ts">
// Reiter für den Bereich Inventar: Bestand · Mietpakete · Foto-Modus (eigene Seiten, gemeinsamer Menüpunkt)
const TABS = [
  { to: '/admin/inventar', label: 'Bestand', icon: 'box' },
  { to: '/admin/pakete', label: 'Mietpakete', icon: 'bag' },
  { to: '/admin/fotos', label: 'Foto-Modus', icon: 'camera' }
]
const route = useRoute()
</script>

<template>
  <nav class="invtabs" aria-label="Inventar-Bereiche">
    <NuxtLink v-for="t in TABS" :key="t.to" :to="t.to" class="invtabs__tab"
              :class="{ 'is-on': route.path.startsWith(t.to) }" :aria-current="route.path.startsWith(t.to) ? 'page' : undefined">
      <WfIcon :name="t.icon" :size="14" /> {{ t.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.invtabs { display: flex; gap: .4em; flex-wrap: wrap; margin: 0 0 1em; padding: 0; border: 0; background: none; }
.invtabs__tab {
  display: inline-flex; align-items: center; gap: .45em; height: 38px; padding: 0 1.05em;
  border: 1px solid var(--wf-line); background: var(--wf-card); border-radius: 999px;
  font-size: .88em; color: var(--wf-ink); text-decoration: none; transition: border-color .15s, background .15s, color .15s;
}
.invtabs__tab:hover { border-color: var(--wf-green); color: var(--wf-green); }
.invtabs__tab.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
</style>
