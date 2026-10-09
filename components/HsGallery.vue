<script setup lang="ts">
// Bildgalerie für Artikel (Projekte, Events …): großes Leitbild + Raster,
// Klick öffnet eine Lightbox mit Pfeiltasten, Wischgesten und Esc.
// Alle Bilder bleiben im DOM (SEO), nur die Lightbox ist clientseitig.
const props = defineProps<{ images: Array<{ src: string, alt?: string, caption?: string }>, title?: string }>()

const MAX = 7
const visible = computed(() => props.images.slice(0, MAX))
const hidden = computed(() => Math.max(0, props.images.length - MAX))

const open = ref<number | null>(null)
const current = computed(() => open.value === null ? null : props.images[open.value])
const show = (i: number) => { open.value = i }
const close = () => { open.value = null }
const step = (d: number) => {
  if (open.value === null) return
  const n = props.images.length
  open.value = (open.value + d + n) % n
}

function onKey(e: KeyboardEvent) {
  if (open.value === null) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}
let touchX = 0
const onTouchStart = (e: TouchEvent) => { touchX = e.touches[0].clientX }
const onTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
}

watch(open, (v) => { if (import.meta.client) document.body.style.overflow = v === null ? '' : 'hidden' })
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="hsg" :class="`hsg--n${Math.min(visible.length, 4)}`">
    <button v-for="(img, i) in visible" :key="img.src" type="button" class="hsg__tile"
            :class="{ 'hsg__tile--lead': i === 0 }" :aria-label="`Bild ${i + 1} von ${images.length} vergrößern`" @click="show(i)">
      <HsImg :src="img.src" :alt="img.alt || title || ''" loading="lazy"
             :sizes="i === 0 ? 'xs:100vw sm:100vw md:100vw lg:900px xl:900px xxl:900px 2xl:900px' : 'xs:50vw sm:50vw md:33vw lg:300px xl:300px xxl:300px 2xl:300px'" />
      <span v-if="i === visible.length - 1 && hidden" class="hsg__more">+{{ hidden }}</span>
      <span class="hsg__zoom" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm10 3-5.2-5.2M11 8v6M8 11h6" /></svg>
      </span>
    </button>
    <!-- weitere Bilder für Suchmaschinen/ohne JS im DOM, visuell über die Lightbox erreichbar -->
    <div v-if="hidden" class="hsg__rest" aria-hidden="true">
      <HsImg v-for="img in images.slice(MAX)" :key="img.src" :src="img.src" :alt="img.alt || title || ''" loading="lazy"
             sizes="xs:10vw sm:10vw md:10vw lg:120px xl:120px xxl:120px 2xl:120px" />
    </div>

    <Teleport to="body">
      <div v-if="current" class="hsg-lb" role="dialog" aria-modal="true" aria-label="Bildergalerie"
           @click.self="close" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
        <button type="button" class="hsg-lb__close" aria-label="Schließen" @click="close">×</button>
        <button v-if="images.length > 1" type="button" class="hsg-lb__nav hsg-lb__nav--prev" aria-label="Vorheriges Bild" @click="step(-1)">
          <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <figure class="hsg-lb__fig">
          <HsImg :key="current.src" :src="current.src" :alt="current.alt || title || ''" loading="eager"
                 sizes="xs:100vw sm:100vw md:100vw lg:1400px xl:1400px xxl:1600px 2xl:1600px" />
          <figcaption>
            <span v-if="current.caption">{{ current.caption }}</span>
            <em>{{ (open ?? 0) + 1 }} / {{ images.length }}</em>
          </figcaption>
        </figure>
        <button v-if="images.length > 1" type="button" class="hsg-lb__nav hsg-lb__nav--next" aria-label="Nächstes Bild" @click="step(1)">
          <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.hsg { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7em; margin: 2em 0; }
.hsg--n1 { grid-template-columns: 1fr; }
.hsg--n2 { grid-template-columns: 1fr 1fr; }
.hsg__tile {
  position: relative; display: block; padding: 0; border: 0; border-radius: 14px; overflow: hidden; cursor: zoom-in;
  background: #ece6d8; aspect-ratio: 4 / 3;
}
.hsg__tile--lead { grid-column: 1 / -1; aspect-ratio: 16 / 9; }
.hsg--n2 .hsg__tile--lead { grid-column: auto; aspect-ratio: 4 / 3; }
.hsg__tile :deep(img) { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
.hsg__tile:hover :deep(img) { transform: scale(1.04); }
.hsg__zoom {
  position: absolute; right: .7em; bottom: .7em; width: 2.3em; height: 2.3em; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, .9); color: #2f5d40;
  opacity: 0; transform: translateY(4px); transition: opacity .2s, transform .2s;
}
.hsg__zoom svg { width: 1.1em; height: 1.1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.hsg__tile:hover .hsg__zoom, .hsg__tile:focus-visible .hsg__zoom { opacity: 1; transform: none; }
.hsg__more {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(38, 73, 47, .62); color: #fff; font-family: var(--font-family-02, Georgia, serif); font-size: 2em;
}
.hsg__rest { display: none; }

.hsg-lb {
  position: fixed; inset: 0; z-index: 2000; background: rgba(20, 22, 18, .94);
  display: flex; align-items: center; justify-content: center; padding: 3em 4.5em;
}
.hsg-lb__fig { margin: 0; max-width: 100%; max-height: 100%; display: flex; flex-direction: column; align-items: center; gap: .8em; }
.hsg-lb__fig :deep(img) { max-width: min(1400px, 100%); max-height: calc(100vh - 9em); width: auto; height: auto; object-fit: contain; border-radius: 8px; display: block; }
.hsg-lb__fig figcaption { display: flex; gap: 1em; align-items: center; color: rgba(255, 255, 255, .85); font-size: .9em; }
.hsg-lb__fig figcaption em { font-style: normal; color: rgba(255, 255, 255, .55); letter-spacing: .08em; }
.hsg-lb__close {
  position: absolute; top: .6em; right: .8em; width: 1.6em; height: 1.6em; border: 0; background: none;
  color: #fff; font-size: 2.2em; line-height: 1; cursor: pointer; opacity: .8;
}
.hsg-lb__close:hover { opacity: 1; }
.hsg-lb__nav {
  position: absolute; top: 50%; transform: translateY(-50%); width: 3em; height: 3em; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, .35); background: rgba(255, 255, 255, .08); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: background .15s;
}
.hsg-lb__nav:hover { background: rgba(255, 255, 255, .2); }
.hsg-lb__nav svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hsg-lb__nav--prev { left: 1em; }
.hsg-lb__nav--next { right: 1em; }

@media (max-width: 640px) {
  .hsg { grid-template-columns: 1fr 1fr; gap: .5em; }
  .hsg-lb { padding: 3em .5em; }
  .hsg-lb__nav { top: auto; bottom: 1em; transform: none; }
}
</style>
