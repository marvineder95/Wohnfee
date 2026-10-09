<script setup lang="ts">
defineProps<{ el: any }>()
const openIdx = ref<number>(0)
</script>

<template>
  <div class="content-accordion ce_accordion block">
    <template v-for="(child, i) in el.children" :key="child.id">
      <h2 class="handorgel__header" :class="{ 'is-open': openIdx === i }">
        <button class="handorgel__header__button" type="button"
                :aria-expanded="openIdx === i" @click="openIdx = openIdx === i ? -1 : i">
          {{ child.headline }}
        </button>
      </h2>
      <div v-show="openIdx === i" class="handorgel__content">
        <div class="handorgel__content__inner">
          <div class="content-text">
            <div class="rte" v-html="child.html" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
