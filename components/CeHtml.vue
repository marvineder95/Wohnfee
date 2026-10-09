<script setup lang="ts">
const props = defineProps<{ el: any }>()
const html = computed(() => props.el.html || '')
</script>

<template>
  <div class="ce_html block" v-html="html" />
</template>
