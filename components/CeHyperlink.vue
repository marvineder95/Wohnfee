<script setup lang="ts">
defineProps<{ el: any }>()
</script>

<template>
  <p class="ce_hyperlink block">
    <a :href="el.url" :title="el.text">{{ el.text }}</a>
  </p>
</template>
