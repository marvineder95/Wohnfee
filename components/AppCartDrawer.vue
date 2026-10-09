<script setup lang="ts">
import { rentalPerks } from '~~/shared/rental-perks'
// Seitenweiter Warenkorb-Drawer: Das Header-Icon feuert 'wf:open-cart'; auf allen
// Seiten außer dem Shop selbst öffnet sich dieser Drawer an Ort und Stelle (keine
// Weiterleitung). Auf der Furniture-Leasing-Seite übernimmt der Drawer von RentalShop.
// Daten: localStorage 'wf_rental_cart' (gleiches Format wie RentalShop).
interface CartLine {
  id: number
  title: string
  imagePath: string | null
  durationMonths: number
  quantity: number
  price: number | null
}

const route = useRoute()
const { isEn, t } = useLang()
const SHOP_ROUTES = ['/furniture-leasing.html', '/en/furniture-leasing.html']

const open = ref(false)
const cart = ref<CartLine[]>([])

function loadCart() {
  try { cart.value = JSON.parse(localStorage.getItem('wf_rental_cart') || '[]') } catch { cart.value = [] }
}
function persistCart() {
  localStorage.setItem('wf_rental_cart', JSON.stringify(cart.value))
  window.dispatchEvent(new CustomEvent('wf:cart-changed'))
}
const perks = computed(() => rentalPerks(cart.value))
const count = computed(() => cart.value.reduce((s, l) => s + l.quantity, 0))
const monthly = computed(() =>
  Math.round(cart.value.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0) * 100) / 100
)
function setQty(line: CartLine, qty: number) {
  if (qty < 1) cart.value = cart.value.filter((l) => l !== line)
  else line.quantity = qty
  persistCart()
}
function removeLine(line: CartLine) {
  cart.value = cart.value.filter((l) => l !== line)
  persistCart()
}
function eur(v: number | null | undefined) {
  return v === null || v === undefined ? ''
    : Number(v).toLocaleString(isEn.value ? 'en-IE' : 'de-AT', { style: 'currency', currency: 'EUR' })
}

function goCheckout() {
  if (!perks.value.minReached) return
  open.value = false
  navigateTo(isEn.value ? '/en/furniture-leasing/checkout' : '/furniture-leasing/checkout')
}
function goShop() {
  open.value = false
  navigateTo(isEn.value ? '/en/furniture-leasing.html' : '/furniture-leasing.html')
}

const onOpen = () => {
  if (SHOP_ROUTES.includes(route.path)) return
  loadCart()
  open.value = true
}
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
watch(() => route.path, () => { open.value = false })

onMounted(() => {
  window.addEventListener('wf:open-cart', onOpen)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('wf:open-cart', onOpen)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="open" class="wcd" @click.self="open = false">
    <aside class="wcd__drawer" role="dialog" aria-modal="true" :aria-label="t('Warenkorb', 'Cart')">
      <div class="wcd__head">
        <h3>{{ t('Warenkorb', 'Cart') }} ({{ count }})</h3>
        <button class="wcd__close" :title="t('Schließen', 'Close')" @click="open = false">×</button>
      </div>

      <div v-if="!cart.length" class="wcd__empty">
        <p>{{ t('Dein Warenkorb ist leer.', 'Your cart is empty.') }}</p>
        <button class="wcd__btn" @click="goShop">{{ t('Produkte entdecken →', 'Discover products →') }}</button>
      </div>
      <ul v-else class="wcd__lines">
        <li v-for="l in cart" :key="l.id + '-' + l.durationMonths" class="wcd__line">
          <span class="wcd__thumb">
            <img v-if="l.imagePath" :src="l.imagePath" alt="">
            <WfIcon v-else name="bag" :size="18" />
          </span>
          <div class="wcd__main">
            <strong class="wcd__name">{{ l.title }}</strong>
            <span class="wcd__meta">{{ l.durationMonths }} {{ l.durationMonths > 1 ? t('Monate', 'months') : t('Monat', 'month') }}</span>
            <span class="wcd__meta">{{ l.price !== null ? eur(l.price) + ' / ' + t('Monat', 'month') : t('Auf Anfrage', 'On request') }}</span>
            <div class="wcd__stepper">
              <button :title="t('Weniger', 'Less')" @click="setQty(l, l.quantity - 1)"><WfIcon name="minus" :size="11" /></button>
              <span>{{ l.quantity }}</span>
              <button :title="t('Mehr', 'More')" @click="setQty(l, l.quantity + 1)"><WfIcon name="plus" :size="11" /></button>
            </div>
          </div>
          <button class="wcd__remove" :title="t('Entfernen', 'Remove')" @click="removeLine(l)"><WfIcon name="trash" :size="14" /></button>
        </li>
      </ul>

      <div v-if="cart.length" class="wcd__foot">
        <RentalPerks :lines="cart" />
        <p class="wcd__total"><span>{{ t('Gesamt (monatlich)', 'Total (monthly)') }}</span><strong>{{ eur(monthly) }}</strong></p>
        <p class="wcd__note">{{ t('zzgl. einmaliger Liefer-/Abholgebühr — wird im Angebot ausgewiesen.', 'plus a one-off delivery/collection fee — shown in the quote.') }}</p>
        <button class="wcd__btn" :disabled="!perks.minReached" @click="goCheckout">{{ t('Zum Checkout →', 'To checkout →') }}</button>
        <button class="wcd__link" @click="goShop">{{ t('Weiter einkaufen', 'Continue shopping') }}</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Über allem (Cookiebar 9999, Header 10000) – wie der Drawer im Shop */
.wcd {
  --green: #2f5d40; --ink: #2b2b28; --muted: #7a7568; --line: #e6e0d2; --cream: #f7f4ec;
  position: fixed; inset: 0; z-index: 11000; background: rgba(30, 28, 22, .5);
  display: flex; justify-content: flex-end; color: var(--ink);
}
.wcd__drawer {
  background: #fff; width: min(430px, 100%); height: 100%; overflow: hidden;
  padding: 1.4em 1.5em; display: flex; flex-direction: column; box-sizing: border-box;
  box-shadow: -14px 0 40px rgba(30, 28, 22, .25);
}
.wcd__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1em; }
.wcd__head h3 { margin: 0; font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500; font-size: 1.3em; text-align: left; }
.wcd__close { border: 0; background: none; font-size: 1.6em; line-height: 1; color: var(--muted); cursor: pointer; }
.wcd__close:hover { color: var(--ink); }
.wcd__empty p { color: var(--muted); font-style: italic; padding: 1.5em 0 1em; margin: 0; }
.wcd__lines { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; }
.wcd__line { display: flex; gap: .8em; padding: .9em 0; border-bottom: 1px solid var(--line); margin: 0; }
.wcd__thumb {
  flex: 0 0 58px; height: 58px; border-radius: 10px; overflow: hidden;
  background: var(--cream); color: #b4ab97; display: flex; align-items: center; justify-content: center;
}
.wcd__thumb img { width: 100%; height: 100%; object-fit: cover; }
.wcd__main { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: .15em; }
.wcd__name { font-size: .88em; line-height: 1.3; }
.wcd__meta { font-size: .76em; color: var(--muted); }
.wcd__stepper {
  display: inline-flex; align-items: center; gap: .15em; margin-top: .3em;
  border: 1px solid var(--line); border-radius: 999px; padding: .2em;
}
.wcd__stepper button {
  width: 22px; height: 22px; border-radius: 50%; border: 0; background: var(--cream);
  cursor: pointer; color: var(--ink); display: flex; align-items: center; justify-content: center; padding: 0;
}
.wcd__stepper span { min-width: 2em; text-align: center; font-size: .9em; font-variant-numeric: tabular-nums; }
.wcd__remove { border: 0; background: none; color: #b9b2a2; cursor: pointer; align-self: flex-start; padding: .2em; }
.wcd__remove:hover { color: #a33; }
.wcd__foot { padding-top: 1em; flex-shrink: 0; margin-top: auto; }
.wcd__total { display: flex; justify-content: space-between; align-items: baseline; margin: 0 0 .3em; font-size: .92em; }
.wcd__total strong { font-size: 1.3em; }
.wcd__note { font-size: .74em; color: var(--muted); margin: 0 0 1em; }
.wcd__btn {
  display: flex; align-items: center; justify-content: center; width: 100%; box-sizing: border-box;
  border: 0; cursor: pointer; font: inherit; font-size: .95em; font-weight: 600;
  background: var(--green); color: #fff; border-radius: 999px; padding: .8em 1.2em; transition: background .15s;
}
.wcd__btn:hover:not(:disabled) { background: #26492f; }
.wcd__btn:disabled { background: #cfc9ba; cursor: not-allowed; }
.wcd__link {
  display: block; width: 100%; margin-top: .6em; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: .85em; color: var(--muted); padding: .4em;
}
.wcd__link:hover { color: var(--green); }
</style>
