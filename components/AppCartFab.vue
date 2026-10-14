<script setup lang="ts">
// Warenkorb als runder Button unten rechts (seitenweit, ersetzt das Icon im Header).
// Anzahl aus dem localStorage des RentalShops ('wf_rental_cart'); der Shop feuert bei
// Änderungen 'wf:cart-changed'. Klick öffnet den Warenkorb an Ort und Stelle
// (im Shop dessen Drawer, sonst AppCartDrawer) – keine Weiterleitung.
const route = useRoute()
const { lang } = useLang()
const count = ref(0)
const bump = ref(false)

const refresh = () => {
  try {
    const lines = JSON.parse(window.localStorage.getItem('wf_rental_cart') || '[]')
    const n = lines.reduce((s: number, l: any) => s + (Number(l.quantity) || 0), 0)
    if (n > count.value) { bump.value = false; requestAnimationFrame(() => { bump.value = true }) }
    count.value = n
  } catch { count.value = 0 }
}
// Im Checkout und auf der Angebotsseite stört der Button nur
const hidden = computed(() => /\/checkout|^\/angebot\//.test(route.path))
const en = computed(() => lang.value === 'en')
const openCart = () => window.dispatchEvent(new CustomEvent('wf:open-cart'))

onMounted(() => {
  refresh()
  window.addEventListener('wf:cart-changed', refresh)
  window.addEventListener('storage', refresh)
})
onBeforeUnmount(() => {
  window.removeEventListener('wf:cart-changed', refresh)
  window.removeEventListener('storage', refresh)
})
</script>

<template>
  <ClientOnly>
    <button v-if="!hidden" type="button" class="cartfab" :class="{ 'has-items': count > 0, 'is-bump': bump }"
            :aria-label="(en ? 'Open cart' : 'Warenkorb öffnen') + (count ? ` (${count})` : '')"
            @click="openCart" @animationend="bump = false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H6" />
      </svg>
      <span v-if="count > 0" class="cartfab__n">{{ count }}</span>
    </button>
  </ClientOnly>
</template>

<style scoped>
.cartfab {
  position: fixed; right: 24px; bottom: 24px; z-index: 10001;
  width: 60px; height: 60px; padding: 0; border: 0; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: #2f5d40; color: #fff;
  box-shadow: 0 10px 26px rgba(38, 73, 47, .38), 0 2px 6px rgba(0, 0, 0, .08);
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
}
.cartfab:hover { background: #26492f; transform: translateY(-2px); box-shadow: 0 14px 30px rgba(38, 73, 47, .45); }
.cartfab:focus-visible { outline: 3px solid rgba(47, 93, 64, .35); outline-offset: 3px; }
.cartfab svg { width: 26px; height: 26px; }
.cartfab__n {
  position: absolute; top: -4px; right: -4px; min-width: 24px; height: 24px; padding: 0 6px;
  border-radius: 999px; background: #fff; color: #2f5d40; border: 2px solid #2f5d40;
  font: 700 12px/20px var(--font-family-01, 'Open Sans', sans-serif); text-align: center; box-sizing: border-box;
}
.cartfab.is-bump { animation: cartfab-bump .45s ease; }
@keyframes cartfab-bump { 30% { transform: scale(1.14); } 60% { transform: scale(.96); } }
@media (max-width: 640px) {
  .cartfab { right: 16px; bottom: 16px; width: 56px; height: 56px; }
}
@media (prefers-reduced-motion: reduce) { .cartfab, .cartfab.is-bump { transition: none; animation: none; } }
</style>
