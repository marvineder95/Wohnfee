<script setup lang="ts">
const props = defineProps<{ el: any }>()
const root = ref<HTMLElement | null>(null)

// full-viewport hero images: one variant per screen breakpoint
const heroSizes = 'xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:100vw 2xl:100vw'

onMounted(() => {
  const w = window as any
  if (root.value && w.Swiper) {
    new w.Swiper(root.value.querySelector('.swiper-container'), {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: props.el.items?.length > 1,
      pagination: { el: root.value.querySelector('.swiper-pagination'), clickable: true },
      navigation: {
        nextEl: root.value.querySelector('.swiper-button-next'),
        prevEl: root.value.querySelector('.swiper-button-prev')
      }
    })
  }
})
</script>

<template>
  <div ref="root" class="ce_swiperStart notext has-buttons slides-per-view-1 block">
    <div class="swiper-container">
      <div class="swiper-wrapper">
        <div v-for="(item, i) in el.items" :key="i" class="content-image swiper-slide">
          <figure>
            <NuxtImg :src="asset(item.src)" :alt="item.alt || ''"
                     :loading="i === 0 ? 'eager' : 'lazy'"
                     :fetchpriority="i === 0 ? 'high' : undefined"
                     :preload="i === 0 ? { fetchPriority: 'high' } : false"
                     :sizes="heroSizes" />
            <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
          </figure>
        </div>
      </div>
      <div class="swiper-pagination"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
    </div>
  </div>
</template>
