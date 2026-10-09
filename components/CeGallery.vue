<script setup lang="ts">
// Impressionen-Karussell (FL-Seiten): Zentrales großes Bild mit seitlich
// rausschauenden Vorschauen, Pfeilen, Punktnavigation und klickbarer
// Vorschaustrip – alle Bilder bleiben SSR im DOM (SEO).
const props = defineProps<{ el: any }>()
const root = ref<HTMLElement | null>(null)

const isEn = computed(() => useRoute().path.startsWith('/en/'))
const altText = (i: number) => isEn.value
  ? `WOHNFEE furniture in a real home – impression ${i + 1}`
  : `WOHNFEE Möbel in echtem Raum – Impression ${i + 1}`

const sizes = 'xs:82vw sm:82vw md:60vw lg:720px xl:760px xxl:760px 2xl:760px'

onMounted(() => {
  const w = window as any
  const items = props.el.items || []
  if (!root.value || !w.Swiper || items.length < 2) return

  const thumbs = new w.Swiper(root.value.querySelector('.imp__thumbs'), {
    slidesPerView: 'auto',
    spaceBetween: 10,
    watchSlidesVisibility: true,
    watchSlidesProgress: true,
    slideToClickedSlide: true
  })

  new w.Swiper(root.value.querySelector('.imp__stage'), {
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 18,
    loop: items.length > 2,
    speed: 550,
    keyboard: { enabled: true },
    pagination: { el: root.value.querySelector('.imp__dots'), clickable: true },
    navigation: {
      nextEl: root.value.querySelector('.imp__next'),
      prevEl: root.value.querySelector('.imp__prev')
    },
    thumbs: { swiper: thumbs },
    breakpoints: {
      0:   { spaceBetween: 12 },
      768: { spaceBetween: 18 }
    }
  })
})
</script>

<template>
  <section ref="root" class="imp block">
    <header class="imp__head">
      <component :is="el.headlineUnit || 'h2'" v-if="el.title" class="imp__title">{{ el.title }}</component>
      <p v-if="el.subtitle" class="imp__subtitle">{{ el.subtitle }}</p>
    </header>

    <!-- Bühne -->
    <div class="imp__stage swiper-container">
      <div class="swiper-wrapper">
        <figure v-for="(src, i) in el.items" :key="i" class="swiper-slide imp__slide">
          <NuxtImg :src="asset(src)" :alt="altText(i)"
                   :loading="i === 0 ? 'eager' : 'lazy'"
                   :fetchpriority="i === 0 ? 'high' : undefined"
                   sizes="xs:82vw sm:82vw md:60vw lg:720px xl:760px xxl:760px 2xl:760px" />
        </figure>
      </div>
      <button type="button" class="imp__arrow imp__prev" :aria-label="isEn ? 'Previous image' : 'Vorheriges Bild'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button type="button" class="imp__arrow imp__next" :aria-label="isEn ? 'Next image' : 'Nächstes Bild'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>

    <!-- Vorschaustrip -->
    <div class="imp__thumbs swiper-container">
      <div class="swiper-wrapper">
        <button v-for="(src, i) in el.items" :key="i" type="button"
                class="swiper-slide imp__thumb" :aria-label="(isEn ? 'Go to image ' : 'Zu Bild ') + (i + 1)">
          <NuxtImg :src="asset(src)" alt="" loading="lazy" sizes="64px" />
        </button>
      </div>
    </div>
    <div class="imp__dots swiper-pagination" />
  </section>
</template>

<style scoped>
.imp {
  margin: 1.5rem auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
  max-width: 1400px;
  box-sizing: border-box;
  min-height: calc(100vh - 120px);
  min-height: calc(100svh - 120px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Kopf */
.imp__head { text-align: center; margin-bottom: 1.1rem; background: none; }
.imp__title {
  margin: 0 0 .8rem;
  font-size: clamp(1.5rem, 3.4vw, 2.3rem);
  line-height: 1.15; font-weight: 600; color: #1f1c17;
}
.imp__subtitle {
  margin: 0 auto; max-width: 640px;
  font-size: .98rem; line-height: 1.65; color: #6f6a5e;
}

/* Bühne */
.imp__stage { overflow: hidden; border-radius: 4px; }
.imp__slide {
  width: 62%;
  margin: 0;
  border-radius: 14px;
  overflow: hidden;
  transition: opacity .45s ease;
  opacity: .55;
}
.imp__slide img {
  display: block; width: 100%;
  height: min(48vh, 520px);
  min-height: 280px;
  object-fit: cover;
}
.imp__stage :deep(.swiper-slide-active) { opacity: 1; }

.imp__arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #fff; color: #26492f;
  border: 1px solid rgba(38, 73, 47, .12);
  box-shadow: 0 4px 14px rgba(31, 28, 23, .14);
  cursor: pointer;
  transition: background .2s ease, color .2s ease, transform .2s ease;
}
.imp__arrow:hover { background: #26492f; color: #fff; }
.imp__prev { left: clamp(6px, 2vw, 28px); }
.imp__next { right: clamp(6px, 2vw, 28px); }

/* Vorschaustrip */
.imp__thumbs { margin-top: 1.1rem; overflow: hidden; width: 100%; }
.imp__thumbs :deep(.swiper-wrapper) {
  justify-content: center;
  transform: none !important;
}
.imp__thumb {
  width: 64px; height: 44px;
  margin: 0; padding: 0;
  border-radius: 8px; overflow: hidden;
  border: 2px solid transparent;
  opacity: .55; cursor: pointer;
  transition: opacity .2s ease, border-color .2s ease;
  background: none;
}
.imp__thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.imp__thumb:hover { opacity: .85; }
.imp__thumbs :deep(.swiper-slide-thumb-active) { opacity: 1; border-color: #26492f; }

/* Punkte */
.imp__dots {
  position: static;
  margin-top: .9rem;
  display: flex; justify-content: center; gap: 6px;
}
.imp__dots :deep(.swiper-pagination-bullet) {
  width: 8px; height: 8px; margin: 0;
  background: #cfc9bc; opacity: 1;
  transition: background .2s ease, transform .2s ease;
}
.imp__dots :deep(.swiper-pagination-bullet-active) { background: #26492f; transform: scale(1.25); }

@media (max-width: 767px) {
  .imp__slide { width: 82%; }
  .imp__slide img { height: min(42vh, 420px); }
  .imp__arrow { width: 38px; height: 38px; }
  .imp__thumb { width: 52px; height: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .imp__slide, .imp__arrow, .imp__thumb { transition: none; }
}
</style>
