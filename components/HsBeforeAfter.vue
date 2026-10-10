<script setup lang="ts">
// Vorher/Nachher-Vergleich: Regler ziehen (Maus, Touch, Tastatur über das Range-Feld).
// „Nachher" liegt vollflächig, „Vorher" wird links bis zur Reglerposition eingeblendet.
const props = defineProps<{ before: string, after: string, alt?: string, caption?: string }>()
const { t } = useLang()
const pos = ref(50)
</script>

<template>
  <figure class="hsba">
    <div class="hsba__stage" :style="{ '--pos': pos + '%' }">
      <HsImg :src="after" :alt="t('Nachher', 'After') + (alt ? ': ' + alt : '')" class="hsba__img"
             sizes="xs:100vw sm:100vw md:100vw lg:1100px xl:1100px xxl:1100px 2xl:1100px" />
      <div class="hsba__before" aria-hidden="true">
        <HsImg :src="before" :alt="t('Vorher', 'Before') + (alt ? ': ' + alt : '')" class="hsba__img"
               sizes="xs:100vw sm:100vw md:100vw lg:1100px xl:1100px xxl:1100px 2xl:1100px" />
      </div>
      <span class="hsba__tag hsba__tag--before">{{ t('Vorher', 'Before') }}</span>
      <span class="hsba__tag hsba__tag--after">{{ t('Nachher', 'After') }}</span>
      <span class="hsba__line" aria-hidden="true"><span class="hsba__knob">‹ ›</span></span>
      <input v-model.number="pos" class="hsba__range" type="range" min="0" max="100" step="1"
             :aria-label="t('Vorher/Nachher vergleichen', 'Compare before and after')">
    </div>
    <figcaption v-if="caption" class="hsba__cap">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.hsba { margin: 0; }
.hsba__stage { position: relative; overflow: hidden; border-radius: 22px; aspect-ratio: 3 / 2; background: #ece6da; user-select: none; }
.hsba__stage :deep(.hsba__img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.hsba__before { position: absolute; inset: 0; clip-path: inset(0 calc(100% - var(--pos)) 0 0); }
.hsba__line { position: absolute; top: 0; bottom: 0; left: var(--pos); width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, .25); pointer-events: none; }
.hsba__knob {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 46px; height: 46px; border-radius: 50%;
  background: #fff; color: #2f5d40; display: grid; place-items: center; font-weight: 700; font-size: 15px; letter-spacing: .1em;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .2);
}
.hsba__tag {
  position: absolute; top: 14px; padding: .3em .8em; border-radius: 999px; font-size: .74rem; letter-spacing: .12em; text-transform: uppercase;
  background: rgba(255, 255, 255, .88); color: #26492f; pointer-events: none;
}
.hsba__tag--before { left: 14px; }
.hsba__tag--after { right: 14px; }
/* unsichtbares Range-Feld über der ganzen Fläche → Ziehen überall, Tastatur, Screenreader */
.hsba__range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; -webkit-appearance: none; appearance: none; }
.hsba__range:focus-visible + * { outline: none; }
.hsba__stage:focus-within .hsba__knob { outline: 3px solid #7fa07a; outline-offset: 2px; }
.hsba__cap { margin-top: .7em; font-size: .85rem; color: #8a857a; text-align: center; }
</style>
