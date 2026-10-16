<script setup lang="ts">
// Großansicht für Fotos im Dashboard: Klick auf ein Vorschaubild öffnet es groß.
// Blättern mit Pfeilen (Buttons, ← / → oder Wischen), schließen mit ×, Esc oder Klick daneben.
export interface LightboxImage { src: string; title?: string; meta?: string; itemId?: number }
const props = defineProps<{ images: LightboxImage[]; index: number }>()
const emit = defineEmits<{ close: []; 'update:index': [i: number]; open: [itemId: number] }>()

const cur = computed(() => props.images[props.index])
const go = (d: number) => {
  if (props.images.length < 2) return
  emit('update:index', (props.index + d + props.images.length) % props.images.length)
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
}
let touchX = 0
const onTouchStart = (e: TouchEvent) => { touchX = e.touches[0].clientX }
const onTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
}
onMounted(() => { window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' })
</script>

<template>
  <div v-if="cur" class="lb" role="dialog" aria-modal="true" :aria-label="cur.title || 'Foto'" @click.self="emit('close')"
       @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <button type="button" class="lb__x" aria-label="Schließen" @click="emit('close')">×</button>
    <button v-if="images.length > 1" type="button" class="lb__nav lb__nav--prev" aria-label="Vorheriges Foto" @click="go(-1)">‹</button>
    <figure class="lb__fig" @click.self="emit('close')">
      <img :key="cur.src" :src="cur.src" :alt="cur.title || ''">
      <figcaption v-if="cur.title || cur.meta">
        <span>
          <strong v-if="cur.title">{{ cur.title }}</strong>
          <small v-if="cur.meta">{{ cur.meta }}</small>
        </span>
        <span class="lb__acts">
          <em v-if="images.length > 1">{{ index + 1 }} / {{ images.length }}</em>
          <button v-if="cur.itemId" type="button" class="lb__open" @click="emit('open', cur.itemId)">Objekt öffnen</button>
        </span>
      </figcaption>
    </figure>
    <button v-if="images.length > 1" type="button" class="lb__nav lb__nav--next" aria-label="Nächstes Foto" @click="go(1)">›</button>
  </div>
</template>

<style scoped>
.lb { position: fixed; inset: 0; z-index: 2000; background: rgba(24, 24, 20, .9); display: flex; align-items: center; justify-content: center; padding: 3.5em 4.5em; box-sizing: border-box; }
.lb__fig { margin: 0; display: flex; flex-direction: column; align-items: center; gap: .8em; max-width: 100%; max-height: 100%; min-width: 0; }
.lb__fig img { max-width: 100%; max-height: calc(100vh - 11em); object-fit: contain; border-radius: 10px; background: #fff; box-shadow: 0 20px 60px rgba(0, 0, 0, .4); }
.lb__fig figcaption { display: flex; justify-content: space-between; align-items: center; gap: 1em; width: 100%; color: #fff; flex-wrap: wrap; }
.lb__fig figcaption > span:first-child { display: grid; gap: .1em; min-width: 0; }
.lb__fig strong { font-size: .98em; }
.lb__fig small { color: rgba(255, 255, 255, .7); font-size: .8em; }
.lb__acts { display: flex; align-items: center; gap: .8em; }
.lb__acts em { font-style: normal; color: rgba(255, 255, 255, .7); font-size: .82em; font-variant-numeric: tabular-nums; }
.lb__open { border: 1px solid rgba(255, 255, 255, .5); background: none; color: #fff; border-radius: 999px; padding: .4em 1em; font: inherit; font-size: .84em; cursor: pointer; }
.lb__open:hover { background: rgba(255, 255, 255, .12); }
.lb__x { position: absolute; top: .5em; right: .7em; border: 0; background: none; color: #fff; font-size: 2.2em; line-height: 1; cursor: pointer; padding: .1em .3em; }
.lb__nav { position: absolute; top: 50%; transform: translateY(-50%); width: 2.6em; height: 2.6em; border-radius: 50%; border: 0; background: rgba(255, 255, 255, .14); color: #fff; font-size: 1.6em; line-height: 1; cursor: pointer; }
.lb__nav:hover { background: rgba(255, 255, 255, .26); }
.lb__nav--prev { left: .6em; }
.lb__nav--next { right: .6em; }
.lb button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@media (max-width: 640px) { .lb { padding: 3.5em .8em 1.5em; } .lb__nav { top: auto; bottom: 1em; transform: none; } }
</style>
