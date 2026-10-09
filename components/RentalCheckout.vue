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
  shipTitle: 'Lieferung & Abholung durch unsere eigene Spedition',
  shipText: 'Wir bringen deine Möbel mit unserem eigenen Team – sorgfältig verpackt, pünktlich geliefert und auf Wunsch fertig aufgebaut. Nach Mietende holen wir alles wieder ab.',
  shipPoints: ['Eigenes, geschultes Team', 'Schonender Transport', 'Aufbau inklusive'],
  pickDate: 'Datum wählen', durHint: 'Wähle, wie lange du die Möbel mieten möchtest.', year: 'Jahr', years: 'Jahre',
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
  backToProducts: 'Zurück zu den Produkten', trust: ['Lieferung & Abholung', 'Flexible Mietdauer', 'Persönliche Beratung'],
  eyebrow: 'Furniture Leasing · Mietanfrage', heroTitle: 'Fast geschafft.',
  heroText: 'Noch ein paar Angaben – dann erstellen wir dir ein persönliches, unverbindliches Angebot.',
  contactHint: 'Wie erreichen wir dich?', addressHint: 'Wohin dürfen wir liefern?', periodHint: 'Ab wann und wie lange?',
  yourPick: 'Deine Auswahl', edit: 'Ändern', nonBinding: 'Unverbindlich – du zahlst erst nach Annahme des Angebots.',
  nextTitle: 'So geht es weiter',
  next: [['Prüfung', 'Wir prüfen Verfügbarkeit und Liefertermin.'], ['Angebot', 'Du erhältst dein persönliches Angebot per E-Mail.'], ['Lieferung', 'Unser Team liefert und richtet alles für dich ein.']] as [string, string][],
  toHome: 'Zur Startseite'
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
  shipTitle: 'Delivery & pick-up by our own logistics team',
  shipText: 'Our own team brings your furniture – carefully packed, delivered on time and set up on request. When the rental ends, we collect everything again.',
  shipPoints: ['Our own trained team', 'Careful transport', 'Set-up included'],
  pickDate: 'Choose a date', durHint: 'Choose how long you would like to rent the furniture.', year: 'year', years: 'years',
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
  backToProducts: 'Back to the products', trust: ['Delivery & pick-up', 'Flexible rental period', 'Personal consultation'],
  eyebrow: 'Furniture Leasing · Rental request', heroTitle: 'Almost there.',
  heroText: 'Just a few details – then we will prepare a personal, non-binding offer for you.',
  contactHint: 'How can we reach you?', addressHint: 'Where should we deliver?', periodHint: 'From when and for how long?',
  yourPick: 'Your selection', edit: 'Edit', nonBinding: 'Non-binding – you only pay once you accept the offer.',
  nextTitle: 'What happens next',
  next: [['Check', 'We check availability and the delivery date.'], ['Offer', 'You receive your personal offer by e-mail.'], ['Delivery', 'Our team delivers and sets everything up for you.']] as [string, string][],
  toHome: 'Back to home'
}
const t = computed(() => (isEn.value ? EN : DE))

const shopUrl = computed(() => isEn.value ? '/en/furniture-leasing.html' : '/furniture-leasing.html')
const homeUrl = computed(() => isEn.value ? '/en/start.html' : '/start.html')

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
// ---------- Mietbeginn (frühestens morgen) & Mietdauer 1–48 Monate ----------
const minStart = (() => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const dateInput = ref<HTMLInputElement | null>(null)
function openDatePicker() {
  const el = dateInput.value
  if (!el) return
  try { (el as any).showPicker ? (el as any).showPicker() : el.focus() } catch { el.focus() }
}
const startLabel = computed(() => {
  if (!form.startDate) return ''
  return new Date(form.startDate + 'T12:00:00').toLocaleDateString(isEn.value ? 'en-GB' : 'de-AT', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
})

const DURATIONS = Array.from({ length: 48 }, (_, i) => i + 1)
const durOpen = ref(false)
const durWrap = ref<HTMLElement | null>(null)
const durList = ref<HTMLElement | null>(null)
function durText(m: number) {
  const base = `${m} ${m > 1 ? t.value.months : t.value.month1}`
  if (m % 12 === 0) return `${base} · ${m / 12} ${m === 12 ? t.value.year : t.value.years}`
  return base
}
function toggleDur() {
  durOpen.value = !durOpen.value
  if (durOpen.value) nextTick(() => durList.value?.querySelector<HTMLElement>('.is-sel')?.scrollIntoView({ block: 'center' }))
}
function pickDur(m: number) {
  form.durationMonths = m
  durOpen.value = false
}
function durKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    form.durationMonths = Math.min(48, Math.max(1, form.durationMonths + (e.key === 'ArrowDown' ? 1 : -1)))
    nextTick(() => durList.value?.querySelector<HTMLElement>('.is-sel')?.scrollIntoView({ block: 'nearest' }))
  } else if (e.key === 'Escape' || e.key === 'Enter') {
    if (durOpen.value) { e.preventDefault(); durOpen.value = false }
  }
}
const onDocClick = (e: MouseEvent) => {
  if (durOpen.value && durWrap.value && !durWrap.value.contains(e.target as Node)) durOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

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
    <!-- Kopf: Eyebrow, Titel und Fortschritt (Warenkorb → Daten → Fertig) -->
    <div class="co__head">
      <div class="co__wrap">
        <p class="co__eyebrow">{{ t.eyebrow }}</p>
        <div class="co__headrow">
          <div>
            <h1 class="co__h1">{{ step === 'success' ? t.thanks : (cart.length ? t.heroTitle : t.emptyTitle) }}</h1>
            <p v-if="step === 'form' && cart.length" class="co__lead">{{ t.heroText }}</p>
          </div>
          <ol class="co__progress" :aria-label="isEn ? 'Checkout steps' : 'Checkout-Schritte'">
            <li class="is-done">
              <NuxtLink :to="shopUrl"><span class="co__dot"><WfIcon name="check" :size="12" /></span>{{ t.stepCart }}</NuxtLink>
            </li>
            <li :class="step === 'success' ? 'is-done' : 'is-active'">
              <span class="co__dot"><WfIcon v-if="step === 'success'" name="check" :size="12" /><template v-else>2</template></span>{{ t.stepData }}
            </li>
            <li :class="{ 'is-active': step === 'success' }">
              <span class="co__dot">3</span>{{ t.stepDone }}
            </li>
          </ol>
        </div>
      </div>
    </div>

    <div class="co__wrap">
      <!-- Leerer Warenkorb -->
      <div v-if="step === 'form' && !cart.length" class="co__empty">
        <span class="co__emptyicon"><WfIcon name="bag" :size="30" /></span>
        <p>{{ t.emptyText }}</p>
        <NuxtLink :to="shopUrl" class="co__btn">{{ t.toShop }} <WfIcon name="arrow" :size="16" /></NuxtLink>
      </div>

      <!-- Kundendaten + Übersicht -->
      <div v-else-if="step === 'form'" class="co__grid">
        <form class="co__main" @submit.prevent="submit" novalidate>
          <section class="co__card">
            <div class="co__cardhead">
              <span class="co__num">01</span>
              <div><h2 class="co__h2">{{ t.contact }}</h2><p class="co__hint">{{ t.contactHint }}</p></div>
            </div>
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

          <section class="co__card">
            <div class="co__cardhead">
              <span class="co__num">02</span>
              <div><h2 class="co__h2">{{ t.address }}</h2><p class="co__hint">{{ t.addressHint }}</p></div>
            </div>
            <label class="co__fld"><span>{{ t.fStreet }}</span><input v-model="form.street" type="text" autocomplete="street-address" required></label>
            <div class="co__row co__row--zip">
              <label class="co__fld"><span>{{ t.fZip }}</span><input v-model="form.zip" type="text" inputmode="numeric" autocomplete="postal-code" required></label>
              <label class="co__fld"><span>{{ t.fCity }}</span><input v-model="form.city" type="text" autocomplete="address-level2" required></label>
            </div>
            <label class="co__fld co__fld--last"><span>{{ t.fCountry }}</span><input v-model="form.country" type="text" autocomplete="country-name"></label>
          </section>

          <section class="co__card">
            <div class="co__cardhead">
              <span class="co__num">03</span>
              <div><h2 class="co__h2">{{ t.period }}</h2><p class="co__hint">{{ t.periodHint }}</p></div>
            </div>
            <div class="co__row">
              <div class="co__fld">
                <span>{{ t.startDate }}</span>
                <label class="co__pick" :class="{ 'is-empty': !form.startDate }" @click.prevent="openDatePicker">
                  <span class="co__pickicon"><WfIcon name="calendar" :size="18" /></span>
                  <span class="co__picktext">{{ startLabel || t.pickDate }}</span>
                  <WfIcon name="chevron" :size="14" class="co__pickchev" />
                  <input ref="dateInput" v-model="form.startDate" type="date" class="co__pickinput" :min="minStart" required :aria-label="t.startDate">
                </label>
              </div>
              <div ref="durWrap" class="co__fld co__dur">
                <span id="co-dur-label">{{ t.duration }}</span>
                <button type="button" class="co__pick" :class="{ 'is-open': durOpen }" aria-haspopup="listbox" :aria-expanded="durOpen"
                        aria-labelledby="co-dur-label" @click="toggleDur" @keydown="durKey">
                  <span class="co__pickicon"><WfIcon name="clock" :size="18" /></span>
                  <span class="co__picktext">{{ durText(form.durationMonths) }}</span>
                  <WfIcon name="chevron" :size="14" class="co__pickchev" />
                </button>
                <Transition name="co-pop">
                  <ul v-if="durOpen" ref="durList" class="co__durlist" role="listbox" aria-labelledby="co-dur-label">
                    <li v-for="m in DURATIONS" :key="m" role="option" :aria-selected="form.durationMonths === m"
                        :class="{ 'is-sel': form.durationMonths === m, 'is-year': m % 12 === 0 }" @click="pickDur(m)">
                      <span>{{ m }} {{ m > 1 ? t.months : t.month1 }}</span>
                      <em v-if="m % 12 === 0">{{ m / 12 }} {{ m === 12 ? t.year : t.years }}</em>
                      <WfIcon v-if="form.durationMonths === m" name="check" :size="14" />
                    </li>
                  </ul>
                </Transition>
                <small v-if="endDateStr" class="co__durend">{{ isEn ? 'until' : 'bis' }} {{ endDateStr }}</small>
              </div>
            </div>

            <div class="co__ship">
              <span class="co__shipicon"><WfIcon name="truck" :size="24" /></span>
              <div>
                <strong>{{ t.shipTitle }}</strong>
                <p>{{ t.shipText }}</p>
                <ul>
                  <li v-for="pt in t.shipPoints" :key="pt"><WfIcon name="check" :size="13" /> {{ pt }}</li>
                </ul>
              </div>
            </div>

            <label class="co__fld co__fld--last"><span>{{ t.deliveryNotes }}</span>
              <textarea v-model="form.deliveryNotes" rows="3" :placeholder="t.deliveryPh" />
            </label>
          </section>

          <p v-if="error" class="co__error" role="alert">{{ error }}</p>

          <!-- Mobil: Absende-Button unter dem Formular -->
          <button type="submit" class="co__btn co__btn--block co__submit--mobile" :disabled="loading || !perks.minReached">
            {{ loading ? t.sending : t.submit }} <WfIcon v-if="!loading" name="arrow" :size="16" />
          </button>
        </form>

        <aside class="co__side">
          <div class="co__summary">
            <div class="co__sumtop">
              <h2 class="co__sumh">{{ t.yourPick }}</h2>
              <NuxtLink :to="shopUrl" class="co__edit">{{ t.edit }}</NuxtLink>
            </div>
            <ul class="co__lines">
              <li v-for="l in cart" :key="l.id + '-' + l.durationMonths" class="co__line">
                <span class="co__limg">
                  <img v-if="l.imagePath" :src="l.imagePath" alt="">
                  <WfIcon v-else name="bag" :size="18" />
                  <em v-if="l.quantity > 1" class="co__lqty">{{ l.quantity }}</em>
                </span>
                <span class="co__lmain">
                  <strong>{{ l.title }}</strong>
                  <small>{{ durLabel(l.durationMonths) }}</small>
                </span>
                <span class="co__lprice">{{ l.price !== null ? eur(l.price * l.quantity) : t.onRequest }}<small v-if="l.price !== null">/{{ isEn ? 'mo.' : 'Mon.' }}</small></span>
              </li>
            </ul>

            <RentalPerks :lines="cart" />

            <div class="co__sums">
              <p class="co__transport" :class="{ 'is-free': transport === 'free' || transport === 'discount' || transport === 'unlocked' }">
                <span>{{ isEn ? 'Delivery & pick-up' : 'Lieferung & Abholung' }}</span><strong>{{ transportText }}</strong>
              </p>
              <p class="co__total"><span>{{ t.totalMonthly }}</span><strong>{{ eur(cartMonthly) }}</strong></p>
              <p v-if="transport === 'none'" class="co__note">{{ t.feeNote }}</p>
              <p v-else-if="transport === 'discount'" class="co__note">{{ isEn ? 'Delivery address outside Vienna – the discounted fee is shown in your offer.' : 'Lieferadresse außerhalb Wiens – die reduzierte Gebühr steht in deinem Angebot.' }}</p>
            </div>

            <button type="button" class="co__btn co__btn--block" :disabled="loading || !perks.minReached" @click="submit">
              {{ loading ? t.sending : t.submit }} <WfIcon v-if="!loading" name="arrow" :size="16" />
            </button>
            <p class="co__secure"><WfIcon name="lock" :size="13" /> {{ t.nonBinding }}</p>

            <ul class="co__trust">
              <li v-for="(x, i) in t.trust" :key="x"><WfIcon :name="['truck', 'calendar', 'users'][i]" :size="15" /> {{ x }}</li>
            </ul>
          </div>
        </aside>
      </div>

      <!-- Bestätigung -->
      <div v-else class="co__success">
        <span class="co__check"><WfIcon name="check" :size="32" /></span>
        <p class="co__successtext">{{ t.thanksText }}</p>
        <dl class="co__recap">
          <div><dt>{{ t.inquiryNo }}</dt><dd>{{ inquiryResult?.number }}</dd></div>
          <div><dt>{{ t.periodLabel }}</dt><dd>{{ form.startDate.split('-').reverse().join('.') }} – {{ endDateStr }}</dd></div>
          <div><dt>{{ t.monthlyRent }}</dt><dd>{{ eur(inquiryResult?.monthlyTotal ?? null) }}</dd></div>
        </dl>
        <h2 class="co__nexth">{{ t.nextTitle }}</h2>
        <ol class="co__next">
          <li v-for="(n, i) in t.next" :key="n[0]">
            <span class="co__nextno">0{{ i + 1 }}</span>
            <strong>{{ n[0] }}</strong>
            <small>{{ n[1] }}</small>
          </li>
        </ol>
        <div class="co__successbtns">
          <NuxtLink :to="shopUrl" class="co__btn">{{ t.backToProducts }} <WfIcon name="arrow" :size="16" /></NuxtLink>
          <NuxtLink :to="homeUrl" class="co__btn co__btn--ghost">{{ t.toHome }}</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.co {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee; --ink: #2b2b28; --muted: #6f6a5e;
  --line: #e6e0d2; --cream: #f8f5ef; --field: #fbfaf6;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink); padding-bottom: 5em;
  /* füllt den Viewport, damit bei kurzem Inhalt kein grauer Streifen vor dem Footer bleibt */
  min-height: calc(100vh - var(--hs-head, 108px));
  box-sizing: border-box;
}
.co__wrap { max-width: 1180px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.co h1, .co h2 { font-family: var(--serif); font-weight: 500; color: var(--ink); text-align: left; text-transform: none; border: 0; padding: 0; letter-spacing: 0; }

/* ── Kopf ─────────────────────────────── */
.co__head { padding: 3.2em 0 2.4em; background: radial-gradient(circle at 88% 0%, #efe9dc 0%, var(--cream) 62%); }
.co__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
}
.co__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.co__headrow { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.5em 3em; flex-wrap: wrap; }
.co__h1 { font-size: clamp(2.2em, 4.6vw, 3.3em) !important; line-height: 1.06; margin: 0 0 .3em; }
.co__lead { margin: 0; max-width: 34em; color: var(--muted); line-height: 1.65; }

.co__progress { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; gap: .4em; }
.co__progress li { display: flex; align-items: center; gap: .5em; font-size: .84em; font-weight: 600; color: #a39c89; white-space: nowrap; }
.co__progress li + li::before { content: ""; width: 2.4em; height: 1px; background: #d9d2c1; margin-right: .4em; }
.co__progress a { display: flex; align-items: center; gap: .5em; color: inherit; text-decoration: none; }
.co__dot {
  width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1.5px solid #d3cbb9; background: #fff; font-size: .82em; color: #a39c89;
}
.co__progress .is-done { color: var(--green); }
.co__progress .is-done .co__dot { background: var(--green); border-color: var(--green); color: #fff; }
.co__progress .is-active { color: var(--ink); }
.co__progress .is-active .co__dot { border-color: var(--green); color: var(--green); box-shadow: 0 0 0 4px rgba(47, 93, 64, .12); }

/* ── Layout ──────────────────────────── */
.co__grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 2em; align-items: start; }
.co__main { min-width: 0; display: grid; gap: 1.2em; }

.co__card { background: #fff; border: 1px solid var(--line); border-radius: 24px; padding: 1.8em 1.9em .9em; }
.co__cardhead { display: flex; align-items: center; gap: 1em; margin-bottom: 1.4em; }
.co__num {
  font-family: var(--serif); font-size: 2.2em; line-height: 1; color: transparent;
  -webkit-text-stroke: 1px #b9c9bc; flex: none;
}
.co__h2 { font-size: 1.35em !important; margin: 0; line-height: 1.2; }
.co__hint { margin: .15em 0 0; font-size: .85em; color: var(--muted); }

.co__row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1em; }
.co__row--zip { grid-template-columns: 9em 1fr; }
.co__fld { display: flex; flex-direction: column; gap: .4em; margin-bottom: 1.1em; min-width: 0; }
.co__fld > span, .co__flabel { font-size: .74em; font-weight: 700; letter-spacing: .04em; color: var(--muted); }
.co__fld input, .co__fld textarea {
  width: 100%; box-sizing: border-box; padding: .85em 1em; font: inherit; font-size: .95em;
  color: var(--ink); background: var(--field); border: 1px solid var(--line); border-radius: 14px; outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.co__fld textarea { resize: vertical; min-height: 5.5em; }
.co__fld input:hover, .co__fld textarea:hover { border-color: #d6cfbd; }
.co__fld input:focus, .co__fld textarea:focus { background: #fff; border-color: var(--green); box-shadow: 0 0 0 4px rgba(47, 93, 64, .1); }

.co__pick {
  position: relative; display: flex; align-items: center; gap: .7em; width: 100%; box-sizing: border-box;
  padding: .6em .9em .6em .6em; font: inherit; font-size: .95em; text-align: left; color: var(--ink); cursor: pointer;
  background: #fff; border: 1.5px solid var(--line); border-radius: 14px;
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.co__pick:hover { border-color: #b9c9bc; }
.co__pick:focus-within, .co__pick:focus-visible, .co__pick.is-open { outline: none; border-color: var(--green); box-shadow: 0 0 0 4px rgba(47, 93, 64, .1); }
.co__pickicon {
  flex: none; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}
.co__picktext { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.co__pick.is-empty .co__picktext { color: var(--green); }
.co__pickchev { flex: none; color: var(--muted); transform: rotate(90deg); transition: transform .2s; }
.co__pick.is-open .co__pickchev { transform: rotate(-90deg); }
/* natives Datumsfeld liegt unsichtbar darunter – öffnet den Kalender des Browsers */
.co__pickinput { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; border: 0; padding: 0; cursor: pointer; }
.co__pickinput::-webkit-calendar-picker-indicator { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }

.co__dur { position: relative; }
.co__durlist {
  position: absolute; z-index: 20; top: calc(100% - .6em); left: 0; right: 0; margin: 0; padding: .4em;
  list-style: none; max-height: 18em; overflow-y: auto; background: #fff; border: 1px solid var(--line);
  border-radius: 16px; box-shadow: 0 18px 40px rgba(43, 43, 40, .14); scrollbar-width: thin;
}
.co__durlist li {
  display: flex; align-items: center; gap: .6em; padding: .55em .8em; border-radius: 10px; cursor: pointer;
  font-size: .9em; color: var(--ink);
}
.co__durlist li span { flex: 1; }
.co__durlist li em { font-style: normal; font-size: .78em; font-weight: 700; color: var(--green); background: var(--green-soft); border-radius: 999px; padding: .15em .6em; }
.co__durlist li:hover { background: var(--cream); }
.co__durlist li.is-sel { background: var(--green); color: #fff; font-weight: 700; }
.co__durlist li.is-sel em { background: rgba(255, 255, 255, .18); color: #fff; }
.co__durlist li.is-year + li { margin-top: .2em; }
.co__durend { font-size: .76em; color: var(--muted); margin-top: -.1em; }
.co-pop-enter-active, .co-pop-leave-active { transition: opacity .15s, transform .15s; }
.co-pop-enter-from, .co-pop-leave-to { opacity: 0; transform: translateY(-6px); }

.co__ship {
  display: flex; gap: 1em; align-items: flex-start; margin: .3em 0 1.3em; padding: 1.2em 1.3em;
  border-radius: 18px; background: var(--green-soft); border: 1px solid #d4e1d6;
}
.co__shipicon {
  flex: none; width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
  background: var(--green); color: #fff;
}
.co__ship strong { display: block; font-size: .96em; margin-bottom: .3em; }
.co__ship p { margin: 0 0 .7em; font-size: .85em; line-height: 1.6; color: var(--muted); }
.co__ship ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4em; }
.co__ship li {
  display: inline-flex; align-items: center; gap: .35em; padding: .3em .75em; border-radius: 999px;
  background: #fff; font-size: .76em; font-weight: 600; color: var(--green);
}

.co__error { margin: 0; background: #fbeaea; color: #a33; border-radius: 14px; padding: .85em 1.1em; font-size: .9em; }

/* Buttons */
.co__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .55em;
  padding: .95em 1.8em; border: 0; border-radius: 999px; cursor: pointer;
  background: var(--green); color: #fff; font: inherit; font-size: 1em; font-weight: 700; text-decoration: none;
  box-shadow: 0 10px 24px rgba(47, 93, 64, .25); transition: background .15s, transform .15s, opacity .15s;
}
.co__btn:hover:not(:disabled) { background: var(--green-dark); transform: translateY(-1px); color: #fff; }
.co__btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.co__btn--block { width: 100%; }
.co__btn--ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--ink); box-shadow: none; }
.co__btn--ghost:hover:not(:disabled) { background: var(--ink); color: #fff; }
.co__submit--mobile { display: none; }

/* ── Übersicht ───────────────────────── */
/* klebt mit Abstand unter dem Header; ist sie höher als der freie Platz, scrollt sie in sich */
.co__side {
  position: sticky; top: calc(var(--hs-head, 108px) + 1.2em);
  max-height: calc(100vh - var(--hs-head, 108px) - 2.4em); overflow-y: auto; scrollbar-width: thin;
  border-radius: 24px;
}
.co__summary { background: #fff; border: 1px solid var(--line); border-radius: 24px; padding: 1.5em 1.5em 1.3em; }
.co__sumtop { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .6em; }
.co__sumh { font-size: 1.3em !important; margin: 0; }
.co__edit { font-size: .82em; font-weight: 600; color: var(--green); text-decoration: none; border-bottom: 1px solid #b9c9bc; }
.co__lines { list-style: none; margin: 0 0 1.1em; padding: 0; }
.co__line { display: flex; gap: .85em; padding: .75em 0; border-bottom: 1px solid #f0ebe0; align-items: center; }
.co__limg {
  position: relative; flex: 0 0 52px; height: 52px; border-radius: 14px; background: var(--cream); color: #b4ab97;
  display: flex; align-items: center; justify-content: center;
}
.co__limg img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.co__lqty {
  position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; border-radius: 999px; padding: 0 5px; box-sizing: border-box;
  background: var(--green); color: #fff; font-style: normal; font-size: .7em; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.co__lmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .15em; }
.co__lmain strong { font-size: .86em; font-weight: 600; line-height: 1.3; }
.co__lmain small { font-size: .76em; color: var(--muted); }
.co__lprice { font-size: .88em; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; text-align: right; }
.co__lprice small { font-weight: 400; color: var(--muted); font-size: .82em; }

.co__sums { border-top: 1px solid var(--line); padding-top: .9em; margin: 1em 0 1.1em; }
.co__transport { display: flex; justify-content: space-between; gap: 1em; margin: 0 0 .5em; font-size: .86em; color: var(--muted); }
.co__transport strong { color: var(--ink); font-weight: 600; text-align: right; }
.co__transport.is-free strong { color: var(--green); }
.co__total { display: flex; justify-content: space-between; align-items: baseline; margin: 0; font-size: .95em; }
.co__total strong { font-family: var(--serif); font-size: 1.7em; font-weight: 500; }
.co__note { font-size: .74em; color: var(--muted); margin: .5em 0 0; line-height: 1.5; }
.co__secure { display: flex; align-items: center; justify-content: center; gap: .4em; margin: .8em 0 0; font-size: .76em; color: var(--muted); text-align: center; }
.co__trust { list-style: none; margin: 1.1em 0 0; padding: 1em 0 0; border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, 1fr); gap: .5em; }
.co__trust li { display: flex; flex-direction: column; align-items: center; gap: .35em; font-size: .7em; font-weight: 600; color: var(--muted); text-align: center; line-height: 1.3; }
.co__trust svg { color: var(--green); }

/* ── Leer & Erfolg ───────────────────── */
.co__empty, .co__success {
  max-width: 40em; margin: 0 auto; text-align: center; background: #fff; border: 1px solid var(--line);
  border-radius: 28px; padding: 2.6em 2em;
}
.co__empty p, .co__successtext { color: var(--muted); line-height: 1.65; margin: 0 auto 1.6em; max-width: 30em; }
.co__emptyicon {
  width: 72px; height: 72px; border-radius: 50%; background: var(--cream); color: var(--green);
  display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1em;
}
.co__check {
  width: 84px; height: 84px; border-radius: 50%; background: var(--green); color: #fff;
  display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1.2em;
  box-shadow: 0 0 0 10px var(--green-soft); animation: co-pop .5s cubic-bezier(.2, .9, .3, 1.3) both;
}
@keyframes co-pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
.co__recap { margin: 0 0 2em; text-align: left; background: var(--cream); border-radius: 18px; padding: .3em 1.3em; }
.co__recap div { display: flex; justify-content: space-between; gap: 1em; padding: .75em 0; border-bottom: 1px solid var(--line); font-size: .9em; }
.co__recap div:last-child { border-bottom: 0; }
.co__recap dt { color: var(--muted); }
.co__recap dd { margin: 0; font-weight: 700; }
.co__nexth { font-size: 1.3em !important; text-align: center !important; margin: 0 0 1em; }
.co__next { list-style: none; margin: 0 0 2em; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: .8em; text-align: left; }
.co__next li { display: flex; flex-direction: column; gap: .25em; padding: 1em; border: 1px solid var(--line); border-radius: 16px; }
.co__nextno { font-family: var(--serif); font-size: 1.6em; color: transparent; -webkit-text-stroke: 1px #b9c9bc; line-height: 1; margin-bottom: .2em; }
.co__next strong { font-size: .92em; }
.co__next small { font-size: .78em; color: var(--muted); line-height: 1.45; }
.co__successbtns { display: flex; gap: .7em; justify-content: center; flex-wrap: wrap; }

/* ── Responsive ──────────────────────── */
@media (max-width: 960px) {
  .co__grid { grid-template-columns: 1fr; }
  .co__side { position: static; order: -1; max-height: none; overflow: visible; }
  .co__side .co__btn, .co__side .co__secure, .co__trust { display: none; }
  .co__submit--mobile { display: inline-flex; }
}
@media (max-width: 640px) {
  .co__wrap { padding: 0 16px; }
  .co__head { padding: 2em 0 1.6em; }
  .co__progress li { font-size: .76em; }
  .co__progress li + li::before { width: 1.2em; }
  .co__card { padding: 1.4em 1.2em .6em; border-radius: 20px; }
  .co__num { font-size: 1.8em; }
  .co__row, .co__row--zip, .co__next { grid-template-columns: 1fr; }
  .co__ship { flex-direction: column; }
  .co__empty, .co__success { padding: 2em 1.2em; }
}
</style>
