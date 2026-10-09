<script setup lang="ts">
defineProps<{ el: any }>()
</script>

<template>
  <div class="ce_list block">
    <component :is="el.headlineUnit || 'h2'" v-if="el.headline">{{ el.headline }}</component>
    <ul v-if="el.listType !== 'ordered'">
      <li v-for="(item, i) in el.items" :key="i" v-html="item" />
    </ul>
    <ol v-else>
      <li v-for="(item, i) in el.items" :key="i" v-html="item" />
    </ol>
  </div>
</template>
