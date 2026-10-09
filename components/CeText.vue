<script setup lang="ts">
const props = defineProps<{ el: any }>()
const html = computed(() => props.el.html || '')
const src = computed(() => asset(props.el.src))
const hasImage = computed(() => !!props.el.src)
const isFloated = computed(() => props.el.floating && props.el.floating !== 'above')
const sizes = computed(() =>
  isFloated.value
    ? 'xs:100vw sm:50vw md:570px lg:570px xl:570px xxl:570px 2xl:570px'
    : 'xs:100vw sm:100vw md:100vw lg:1140px xl:1140px xxl:1140px 2xl:1140px'
)
</script>

<template>
  <div class="content-text" :class="[el.cssClass, hasImage ? `media media--${el.floating || 'above'}` : '']">
    <component :is="el.headlineUnit || 'h2'" v-if="el.headline">{{ el.headline }}</component>
    <figure v-if="hasImage" class="image_container" :class="el.floating ? `float_${el.floating}` : ''">
      <a v-if="el.link" :href="el.link" :title="el.title || el.alt || ''">
        <NuxtImg :src="src" :alt="el.alt || ''" loading="lazy" :sizes="sizes" />
      </a>
      <NuxtImg v-else :src="src" :alt="el.alt || ''" loading="lazy" :sizes="sizes" />
      <figcaption v-if="el.caption">{{ el.caption }}</figcaption>
    </figure>
    <div class="rte" v-html="html" />
  </div>
</template>
