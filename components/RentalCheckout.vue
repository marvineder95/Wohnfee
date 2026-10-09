<script setup lang="ts">
import { rentalPerks, transportPerk, MIN_MONTHLY, OTHER_STATES_DISCOUNT } from '~~/shared/rental-perks'
// WOHNFEE Furniture Leasing — eigene Checkout-Seite (Amazon-inspiriert):
// links Kundendaten in klar getrennten Abschnitten, rechts fixierte
// Bestellübersicht mit Absende-Button. Schritt 3 zeigt die Bestätigung.
// SEO: Checkout ist noindex (verhindert Duplicate-Content/Dünne-Seiten).
interface CartLine {
  id: number
  title: string
  imagePath: string | null
  durationMonths: number
  quantity: number
  price: number | null
}

const props = withDefaults(defineProps<{ lang?: string }>(), { lang: 'de' })
const isEn = computed(() => props.lang === 'en')

const DE = {
  title: 'Kasse', stepCart: 'Warenkorb', stepData: 'Kundendaten', stepDone: 'Fertig',
  backToCart: '‹ Zurück zum Warenkorb',
  contact: 'Kontaktdaten', address: 'Lieferadresse', period: 'Mietzeitraum & Abwicklung',
  notes: 'Lieferhinweise',
  fFirst: 'Vorname (optional)', fLast: 'Nachname *', fCompany: 'Firma (optional)',
  fEmail: 'E-Mail *', fPhone: 'Telefon (optional)',
  fStreet: 'Straße *', fZip: 'PLZ *', fCity: 'Ort *', fCountry: 'Land (optional)',
  startDate: 'Mietbeginn *', duration: 'Mietdauer',
  m3: '3 Monate', m1: '1 Monat',
  deliveryOption: 'Abwicklung',
  dOptFull: 'Lieferung & Abholung durch WOHNFEE',
  dOptFullHint: 'Wir liefern, stellen auf und holen nach Mietende wieder ab.',
  dOptSelf: 'Selbstabholung im Lager',
  dOptSelfHint: 'Du holst die Möbel selbst ab und bringst sie zurück.',
  deliveryNotes: 'Lieferhinweise (optional)',
  deliveryPh: 'z. B. Stockwerk, Aufzug, gewünschter Lieferzeitraum …',
  summary: 'Bestellübersicht', monthlyRent: 'Monatliche Miete',
  totalMonthly: 'Gesamt (monatlich)',
  feeNote: 'zzgl. einmaliger Liefer-/Abholgebühr — wird in deinem persönlichen Angebot ausgewiesen.',
  billingNote: 'Abrechnung monatlich per Rechnung · keine Zahlung jetzt nötig.',
  submit: 'Mietanfrage absenden', sending: 'Sendet …',
  errName: 'Bitte Nachname und eine gültige E-Mail-Adresse angeben.',
  errAddr: 'Bitte Lieferadresse vervollständigen (Straße, PLZ, Ort).',
  errDate: 'Bitte ein Mietstartdatum wählen.',
  errSend: 'Die Anfrage konnte nicht gesendet werden. Bitte versuche es erneut.',
  month1: 'Monat', months: 'Monate', onRequest: 'Auf Anfrage',
  emptyTitle: 'Dein Warenkorb ist leer',
  emptyText: 'Lege zuerst Möbel in den Warenkorb — dann kannst du hier deine Mietanfrage absenden.',
  toShop: 'Zu den Produkten',
  thanks: 'Vielen Dank für deine Anfrage!',
  thanksText: 'Wir haben deine Mietanfrage erfolgreich erhalten und melden uns in Kürze persönlich bei dir.',
  inquiryNo: 'Anfragenummer', periodLabel: 'Mietzeitraum',
  backToProducts: 'Zurück zu den Produkten', trust: ['Lieferung & Abholung', 'Flexible Mietdauer', 'Persönliche Beratung']
}
const EN: typeof DE = {
  title: 'Checkout', stepCart: 'Cart', stepData: 'Your details', stepDone: 'Done',
  backToCart: '‹ Back to cart',
  contact: 'Contact details', address: 'Delivery address', period: 'Rental period & handling',
  notes: 'Delivery notes',
  fFirst: 'First name (optional)', fLast: 'Last name *', fCompany: 'Company (optional)',
  fEmail: 'E-mail *', fPhone: 'Phone (optional)',
  fStreet: 'Street *', fZip: 'Postal code *', fCity: 'City *', fCountry: 'Country (optional)',
  startDate: 'Rental start *', duration: 'Rental period',
  m3: '3 months', m1: '1 month',
  deliveryOption: 'Handling',
  dOptFull: 'Delivery & pick-up by WOHNFEE',
  dOptFullHint: 'We deliver, set everything up and collect it when the rental ends.',
  dOptSelf: 'Self pick-up from our warehouse',
  dOptSelfHint: 'You collect the furniture yourself and return it after the rental.',
  deliveryNotes: 'Delivery notes (optional)',
  deliveryPh: 'e.g. floor, elevator, preferred delivery time …',
  summary: 'Order summary', monthlyRent: 'Monthly rent',
  totalMonthly: 'Total (monthly)',
  feeNote: 'plus a one-time delivery / pick-up fee — shown in your personal offer.',
  billingNote: 'Billed monthly by invoice · no payment due now.',
  submit: 'Send rental request', sending: 'Sending …',
  errName: 'Please enter your last name and a valid e-mail address.',
  errAddr: 'Please complete the delivery address (street, postal code, city).',
  errDate: 'Please choose a rental start date.',
  errSend: 'Your request could not be sent. Please try again.',
  month1: 'month', months: 'months', onRequest: 'On request',
  emptyTitle: 'Your cart is empty',
  emptyText: 'Add some furniture to your cart first — then you can send your rental request here.',
  toShop: 'Browse products',
  thanks: 'Thank you for your request!',
  thanksText: 'We have received your rental request and will get back to you personally shortly.',
  inquiryNo: 'Inquiry no.', periodLabel: 'Rental period',
  backToProducts: 'Back to the products', trust: ['Delivery & pick-up', 'Flexible rental period', 'Personal consultation']
}
const t = computed(() => (isEn.value ? EN : DE))

const shopUrl = computed(() => isEn.value ? '/en/furniture-leasing.html' : '/furniture-leasing.html')

useHead(() => ({
  title: `${t.value.title} - WOHNFEE Furniture Leasing`,
  meta: [{ name: 'robots', content: 'noindex, follow' }]
}))

// ---------- Warenkorb ----------
const cart = ref<CartLine[]>([])
const step = ref<'form' | 'success'>('form')
const loading = ref(false)
const error = ref('')
const inquiryResult = ref<{ number: string; monthlyTotal: number } | null>(null)

function loadCart() {
  try { cart.value = JSON.parse(localStorage.getItem('wf_rental_cart') || '[]') } catch { cart.value = [] }
}
function clearCart() {
  cart.value = []
  localStorage.setItem('wf_rental_cart', '[]')
  window.dispatchEvent(new CustomEvent('wf:cart-changed'))
}

const cartMonthly = computed(() =>
  Math.round(cart.value.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0) * 100) / 100
)
// Mindestmietwert & Transport-Vorteil (abhängig von PLZ und Abwicklung)
const perks = computed(() => rentalPerks(cart.value))
const transport = computed(() => {
  if (form.deliveryOption === 'self') return 'self'
  const tp = transportPerk(cart.value, form.zip)
  // ohne PLZ ist der Ort noch offen: freigeschaltet, aber Wien/Bundesland unklar
  return tp !== 'none' && !form.zip.trim() ? 'unlocked' : tp
})
const transportText = computed(() => {
  const pct = Math.round(OTHER_STATES_DISCOUNT * 100)
  switch (transport.value) {
    case 'free': return isEn.value ? 'Free (Vienna)' : 'Gratis (Wien)'
    case 'discount': return isEn.value ? `−${pct}% on the fee` : `−${pct} % auf die Gebühr`
    case 'unlocked': return isEn.value ? `Free in Vienna / −${pct}%` : `Wien gratis / −${pct} %`
    case 'self': return isEn.value ? 'Self pick-up' : 'Selbstabholung'
    default: return isEn.value ? 'per offer' : 'laut Angebot'
  }
})

function eur(v: number | null | undefined): string {
  return v === null || v === undefined
    ? t.value.onRequest
    : Number(v).toLocaleString(isEn.value ? 'en-IE' : 'de-AT', { style: 'currency', currency: 'EUR' })
}
function durLabel(m: number) {
  return `${m} ${m > 1 ? t.value.months : t.value.month1}`
}

// ---------- Formular ----------
const form = reactive({
  firstName: '', lastName: '', company: '', email: '', phone: '',
  street: '', zip: '', city: '', country: isEn.value ? 'Austria' : 'Österreich',
  startDate: '', durationMonths: 3,
  deliveryOption: 'full',
  deliveryNotes: ''
})

const endDateStr = computed(() => {
  if (!form.startDate) return ''
  const d = new Date(form.startDate + 'T00:00:00')
  d.setMonth(d.getMonth() + Number(form.durationMonths))
  return d.toLocaleDateString(isEn.value ? 'en-GB' : 'de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
})

async function submit() {
  error.value = ''
  if (!perks.value.minReached) {
    error.value = isEn.value
      ? `The minimum rental value is ${eur(MIN_MONTHLY)} per month.`
      : `Der Mindestmietwert beträgt ${eur(MIN_MONTHLY)} pro Monat.`
    return
  }
  if (!form.lastName.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
    error.value = t.value.errName; return
  }
  if (!form.street.trim() || !form.zip.trim() || !form.city.trim()) {
    error.value = t.value.errAddr; return
  }
  if (!form.startDate) {
    error.value = t.value.errDate; return
  }
  loading.value = true
  try {
    const res = await $fetch<{ number: string; monthlyTotal: number }>('/api/rental-inquiry', {
      method: 'POST',
      body: {
        firstName: form.firstName, lastName: form.lastName, company: form.company,
        email: form.email, phone: form.phone,
        street: form.street, zip: form.zip, city: form.city, country: form.country,
        startDate: form.startDate, durationMonths: Number(form.durationMonths),
        deliveryOption: form.deliveryOption === 'self' ? 'Selbstabholung' : 'Lieferung & Abholung durch WOHNFEE',
        deliveryNotes: form.deliveryNotes,
        items: cart.value.map((l) => ({ id: l.id, quantity: l.quantity, durationMonths: l.durationMonths }))
      }
    })
    inquiryResult.value = res
    clearCart()
    step.value = 'success'
    window.scrollTo(0, 0)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t.value.errSend
  } finally {
    loading.value = false
  }
}

onMounted(loadCart)

// Sticky-Übersicht soll unter dem (sticky) Header kleben, nicht dahinter
const coRoot = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && coRoot.value) coRoot.value.style.setProperty('--hs-head', `${h}px`)
}
onMounted(() => { syncHeaderHeight(); window.addEventListener('resize', syncHeaderHeight) })
onUnmounted(() => window.removeEventListener('resize', syncHeaderHeight))
</script>

<template>
  <div ref="coRoot" class="co">
    <!-- Schritt-Anzeige + Zurück-Link in einer Zeile, damit beide Cards
         (Formular links, Übersicht rechts) direkt darauf auf gleicher Höhe beginnen -->
    <div class="co__topbar">
      <nav class="co__steps" :aria-label="isEn ? 'Checkout steps' : 'Checkout-Schritte'">
        <NuxtLink :to="shopUrl" class="co__step is-done">{{ t.stepCart }}</NuxtLink>
        <span class="co__stepsep" aria-hidden="true">›</span>
        <span class="co__step" :class="{ 'is-active': step === 'form' }">{{ t.stepData }}</span>
        <span class="co__stepsep" aria-hidden="true">›</span>
        <span class="co__step" :class="{ 'is-active': step === 'success' }">{{ t.stepDone }}</span>
      </nav>
      <NuxtLink v-if="step === 'form' && cart.length" :to="shopUrl" class="co__back">{{ t.backToCart }}</NuxtLink>
    </div>

    <!-- Leerer Warenkorb -->
    <div v-if="step === 'form' && !cart.length" class="co__empty">
      <h1 class="co__title">{{ t.emptyTitle }}</h1>
      <p class="co__emptytext">{{ t.emptyText }}</p>
      <NuxtLink :to="shopUrl" class="co__cta">{{ t.toShop }}</NuxtLink>
    </div>

    <!-- Schritt 2: Kundendaten + Übersicht -->
    <div v-else-if="step === 'form'" class="co__grid">
      <form class="co__main" @submit.prevent="submit" novalidate>
        <section class="co__sec">
          <h2 class="co__sech"><span class="co__secno">1</span>{{ t.contact }}</h2>
          <div class="co__row">
            <label class="co__fld"><span>{{ t.fFirst }}</span><input v-model="form.firstName" type="text" autocomplete="given-name"></label>
            <label class="co__fld"><span>{{ t.fLast }}</span><input v-model="form.lastName" type="text" autocomplete="family-name" required></label>
          </div>
          <label class="co__fld"><span>{{ t.fCompany }}</span><input v-model="form.company" type="text" autocomplete="organization"></label>
          <div class="co__row">
            <label class="co__fld"><span>{{ t.fEmail }}</span><input v-model="form.email" type="email" autocomplete="email" required></label>
            <label class="co__fld"><span>{{ t.fPhone }}</span><input v-model="form.phone" type="tel" autocomplete="tel"></label>
          </div>
        </section>

        <section class="co__sec">
          <h2 class="co__sech"><span class="co__secno">2</span>{{ t.address }}</h2>
          <label class="co__fld"><span>{{ t.fStreet }}</span><input v-model="form.street" type="text" autocomplete="street-address" required></label>
          <div class="co__row co__row--zip">
            <label class="co__fld co__fld--zip"><span>{{ t.fZip }}</span><input v-model="form.zip" type="text" autocomplete="postal-code" required></label>
            <label class="co__fld"><span>{{ t.fCity }}</span><input v-model="form.city" type="text" autocomplete="address-level2" required></label>
          </div>
          <label class="co__fld"><span>{{ t.fCountry }}</span><input v-model="form.country" type="text" autocomplete="country-name"></label>
        </section>

        <section class="co__sec">
          <h2 class="co__sech"><span class="co__secno">3</span>{{ t.period }}</h2>
          <div class="co__row co__row--zip">
            <label class="co__fld"><span>{{ t.startDate }}</span><input v-model="form.startDate" type="date" required></label>
            <label class="co__fld"><span>{{ t.duration }}</span>
              <select v-model="form.durationMonths">
                <option :value="3">{{ t.m3 }}</option>
                <option :value="1">{{ t.m1 }}</option>
              </select>
            </label>
          </div>

          <p class="co__flabel">{{ t.deliveryOption }}</p>
          <label class="co__opt" :class="{ 'is-active': form.deliveryOption === 'full' }">
            <input v-model="form.deliveryOption" type="radio" value="full">
            <span class="co__optmain"><strong>{{ t.dOptFull }}</strong><small>{{ t.dOptFullHint }}</small></span>
          </label>
          <label class="co__opt" :class="{ 'is-active': form.deliveryOption === 'self' }">
            <input v-model="form.deliveryOption" type="radio" value="self">
            <span class="co__optmain"><strong>{{ t.dOptSelf }}</strong><small>{{ t.dOptSelfHint }}</small></span>
          </label>

          <label class="co__fld"><span>{{ t.deliveryNotes }}</span>
            <textarea v-model="form.deliveryNotes" rows="2" :placeholder="t.deliveryPh" />
          </label>
        </section>

        <p v-if="error" class="co__error" role="alert">{{ error }}</p>

        <!-- Mobil: Absende-Button unter dem Formular -->
        <button type="submit" class="co__submit co__submit--mobile" :disabled="loading || !perks.minReached">
          {{ loading ? t.sending : t.submit }}
        </button>
      </form>

      <aside class="co__side">
        <div class="co__summary">
          <h2 class="co__sumh">{{ t.summary }}</h2>
          <ul class="co__lines">
            <li v-for="l in cart" :key="l.id + '-' + l.durationMonths" class="co__line">
              <span class="co__limg">
                <img v-if="l.imagePath" :src="l.imagePath" alt="">
              </span>
              <span class="co__lmain">
                <strong>{{ l.title }}</strong>
                <small>× {{ l.quantity }} · {{ durLabel(l.durationMonths) }}</small>
              </span>
              <span class="co__lprice">{{ l.price !== null ? eur(l.price * l.quantity) + ' / ' + (isEn ? 'mo.' : 'Mon.') : t.onRequest }}</span>
            </li>
          </ul>
          <RentalPerks :lines="cart" />
          <p class="co__total"><span>{{ t.totalMonthly }}</span><strong>{{ eur(cartMonthly) }}</strong></p>
          <p class="co__transport" :class="{ 'is-free': transport === 'free' || transport === 'discount' || transport === 'unlocked' }">
            <span>{{ isEn ? 'Delivery & pick-up' : 'Lieferung & Abholung' }}</span><strong>{{ transportText }}</strong>
          </p>
          <p v-if="transport === 'none'" class="co__note">{{ t.feeNote }}</p>
          <p v-else-if="transport === 'discount'" class="co__note">{{ isEn ? 'Delivery address outside Vienna – the discounted fee is shown in your offer.' : 'Lieferadresse außerhalb Wiens – die reduzierte Gebühr steht in deinem Angebot.' }}</p>
          <button type="button" class="co__submit" :disabled="loading || !perks.minReached" @click="submit">
            {{ loading ? t.sending : t.submit }}
          </button>
          <p class="co__note co__note--center">{{ t.billingNote }}</p>
          <ul class="co__trust">
            <li v-for="x in t.trust" :key="x"><WfIcon name="check" :size="13" /> {{ x }}</li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Schritt 3: Bestätigung -->
    <div v-else class="co__success">
      <span class="co__check"><WfIcon name="check" :size="30" /></span>
      <h1 class="co__title">{{ t.thanks }}</h1>
      <p class="co__successtext">{{ t.thanksText }}</p>
      <dl class="co__recap">
        <div><dt>{{ t.inquiryNo }}</dt><dd>{{ inquiryResult?.number }}</dd></div>
        <div><dt>{{ t.periodLabel }}</dt><dd>{{ form.startDate }} – {{ endDateStr }}</dd></div>
        <div><dt>{{ t.monthlyRent }}</dt><dd>{{ eur(inquiryResult?.monthlyTotal ?? null) }}</dd></div>
      </dl>
      <NuxtLink :to="shopUrl" class="co__cta">{{ t.backToProducts }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.co {
  --green: #2f5d40; --green-soft: #eef3ee; --ink: #2b2b28; --muted: #7a7568; --line: #e6e0d2; --cream: #f7f4ec;
  max-width: 1100px; margin: 0 auto; padding: 1.4em 1.5em 4em;
}
.co__topbar { display: flex; align-items: center; justify-content: space-between; gap: .6em 1.2em; flex-wrap: wrap; margin-bottom: 1.3em; }
.co__steps { display: flex; align-items: center; gap: .6em; font-size: .85em; color: var(--muted); flex-wrap: wrap; }
.co__step { text-decoration: none; color: var(--muted); font-weight: 500; }
.co__step.is-done { color: var(--green); }
.co__step.is-active { color: var(--ink); font-weight: 700; }
.co__stepsep { color: #c9c2b0; }
.co__grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 2.2em; align-items: start; }
.co__main { min-width: 0; }
.co__back { display: inline-block; font-size: .85em; color: var(--muted); text-decoration: none; white-space: nowrap; }
.co__back:hover { color: var(--green); }
.co__title { font-family: Georgia, 'Times New Roman', serif; font-weight: 500; font-size: 1.7em; margin: 0 0 1em; color: var(--ink); }
.co__sec { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 1.4em 1.5em 1.1em; margin-bottom: 1.3em; }
.co__sech { display: flex; align-items: center; gap: .55em; font-size: .8em; letter-spacing: .14em; text-transform: uppercase; color: var(--ink); margin: 0 0 1.1em; }
.co__secno {
  width: 1.7em; height: 1.7em; border-radius: 50%; background: var(--green); color: #fff;
  display: inline-flex; align-items: center; justify-content: center; font-size: .95em; letter-spacing: 0;
}
.co__row { display: grid; grid-template-columns: 1fr 1fr; gap: .8em; }
.co__row--zip { grid-template-columns: 8em 1fr; }
.co__fld { display: flex; flex-direction: column; gap: .28em; margin-bottom: .9em; min-width: 0; }
.co__fld > span { font-size: .74em; font-weight: 600; color: var(--muted); }
.co__fld input, .co__fld select, .co__fld textarea {
  width: 100%; box-sizing: border-box; padding: .62em .8em; font-size: .95em; font-family: inherit;
  color: var(--ink); background: #fff; border: 1px solid var(--line); border-radius: 10px; outline: none;
}
.co__fld input:focus, .co__fld select:focus, .co__fld textarea:focus {
  border-color: var(--green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12);
}
.co__flabel { font-size: .74em; font-weight: 600; color: var(--muted); margin: .4em 0 .5em; }
.co__opt {
  display: flex; gap: .7em; align-items: flex-start; border: 1px solid var(--line); border-radius: 12px;
  padding: .7em .9em; margin-bottom: .6em; cursor: pointer; transition: border-color .15s, background .15s;
}
.co__opt.is-active { border-color: var(--green); background: var(--green-soft); }
.co__opt input { margin-top: .25em; accent-color: var(--green); }
.co__optmain { display: flex; flex-direction: column; gap: .15em; }
.co__optmain strong { font-size: .9em; color: var(--ink); font-weight: 600; }
.co__optmain small { font-size: .78em; color: var(--muted); }
.co__error { background: #fbeaea; color: #a33; border-radius: 10px; padding: .7em 1em; font-size: .88em; }
.co__submit {
  display: block; width: 100%; padding: .85em 1em; border: 0; border-radius: 12px; cursor: pointer;
  background: var(--green); color: #fff; font-size: 1em; font-weight: 600; font-family: inherit;
  transition: background .15s, opacity .15s;
}
.co__submit:hover:not(:disabled) { background: #26492f; }
.co__submit:disabled { opacity: .6; cursor: default; }
.co__submit--mobile { display: none; margin-top: .4em; }

/* Seitliche Übersicht */
/* klebt mit Abstand unter dem Header; ist sie höher als der freie Platz, scrollt sie in sich */
.co__side {
  position: sticky; top: calc(var(--hs-head, 108px) + 1.2em);
  max-height: calc(100vh - var(--hs-head, 108px) - 2.4em); overflow-y: auto; scrollbar-width: thin;
}
.co__summary { background: var(--cream); border: 1px solid var(--line); border-radius: 14px; padding: 1.3em 1.4em; }
.co__sumh { font-family: Georgia, serif; font-weight: 500; font-size: 1.15em; margin: 0 0 .9em; color: var(--ink); }
.co__lines { list-style: none; margin: 0 0 1em; padding: 0; }
.co__line { display: flex; gap: .7em; padding: .6em 0; border-bottom: 1px solid var(--line); align-items: center; }
.co__limg { flex: 0 0 44px; height: 44px; border-radius: 8px; overflow: hidden; background: #fff; }
.co__limg img { width: 100%; height: 100%; object-fit: cover; display: block; }
.co__lmain { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.co__lmain strong { font-size: .85em; color: var(--ink); font-weight: 600; line-height: 1.3; }
.co__lmain small { font-size: .74em; color: var(--muted); }
.co__lprice { font-size: .8em; color: var(--ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
.co__total { display: flex; justify-content: space-between; align-items: baseline; margin: .4em 0 .3em; font-size: .9em; color: var(--muted); }
.co__total strong { font-size: 1.35em; color: var(--ink); }
.co__note { font-size: .72em; color: var(--muted); margin: .5em 0 .9em; }
.co__transport { display: flex; justify-content: space-between; align-items: baseline; gap: 1em; margin: 0 0 .3em; font-size: .82em; color: var(--muted); }
.co__transport strong { color: var(--ink); font-weight: 600; text-align: right; }
.co__transport.is-free strong { color: var(--green); }
.co__note--center { text-align: center; margin: .7em 0 0; }
.co__trust { list-style: none; margin: 1em 0 0; padding: .8em 0 0; border-top: 1px solid var(--line); display: grid; gap: .35em; }
.co__trust li { display: flex; align-items: center; gap: .45em; font-size: .76em; color: var(--muted); }
.co__trust svg { color: var(--green); flex: 0 0 auto; }

/* Leer & Erfolg */
.co__empty, .co__success { text-align: center; padding: 3em 1em; max-width: 30em; margin: 0 auto; }
.co__emptytext, .co__successtext { color: var(--muted); font-size: .95em; margin: 0 0 1.4em; }
.co__cta {
  display: inline-block; padding: .8em 2.2em; border-radius: 12px; background: var(--green); color: #fff;
  text-decoration: none; font-weight: 600;
}
.co__cta:hover { background: #26492f; }
.co__check {
  width: 72px; height: 72px; border-radius: 50%; background: var(--green); color: #fff;
  display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1.1em;
}
.co__recap { width: 100%; margin: 0 0 1.6em; text-align: left; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: .4em 1.2em; }
.co__recap div { display: flex; justify-content: space-between; gap: 1em; padding: .55em 0; border-bottom: 1px solid var(--line); font-size: .88em; }
.co__recap div:last-child { border-bottom: 0; }
.co__recap dt { color: var(--muted); }
.co__recap dd { margin: 0; font-weight: 600; color: var(--ink); }

@media (max-width: 860px) {
  .co__grid { grid-template-columns: 1fr; }
  .co__side { position: static; order: -1; max-height: none; overflow: visible; }
  .co__summary { padding: 1em 1.1em; }
  .co__submit--mobile { display: block; }
  .co__side .co__submit { display: none; }
  .co__trust { display: none; }
  .co__row, .co__row--zip { grid-template-columns: 1fr; gap: 0; }
}
</style>
