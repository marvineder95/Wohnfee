<script setup lang="ts">
// Einheitlicher Seitenkopf: Eyebrow + Serif-Titel + Untertitel + Aktions-Slot
defineProps<{
  eyebrow: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="wf-pagehead">
    <div class="wf-pagehead__text">
      <p class="wf-eyebrow">{{ eyebrow }}</p>
      <h1 class="wf-title">{{ title }}</h1>
      <p v-if="subtitle" class="wf-subtitle">{{ subtitle }}</p>
      <slot name="under" />
    </div>
    <div v-if="$slots.default" class="wf-pagehead__actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
.wf-pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5em;
  margin-bottom: 1.6em;
  flex-wrap: wrap;
}
.wf-pagehead__actions { display: flex; gap: .6em; align-items: center; padding-bottom: .2em; }
</style>
