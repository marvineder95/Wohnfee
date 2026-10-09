<script setup lang="ts">
defineProps<{ el: any }>()
</script>

<template>
  <div class="ce_headline block">
    <component :is="el.headlineUnit || 'h2'">{{ el.headline }}</component>
  </div>
</template>
