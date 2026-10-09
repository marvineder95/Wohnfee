<script setup lang="ts">
// Bild für Inhalte, die aus statischen Dateien ODER aus Dashboard-Uploads kommen:
// /uploads/… existiert erst zur Laufzeit und wird daher nicht über IPX optimiert.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ src: string, alt?: string, sizes?: string, loading?: 'lazy' | 'eager', fetchpriority?: string }>()
const isUpload = computed(() => props.src.startsWith('/uploads/'))
</script>

<template>
  <img v-if="isUpload" v-bind="$attrs" :src="src" :alt="alt || ''" :loading="loading || 'lazy'" decoding="async">
  <NuxtImg v-else v-bind="$attrs" :src="src" :alt="alt || ''" :sizes="sizes" :loading="loading || 'lazy'"
           :fetchpriority="fetchpriority" />
</template>
