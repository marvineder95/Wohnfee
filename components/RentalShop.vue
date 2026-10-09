<script setup lang="ts">
// WOHNFEE Furniture-Leasing-Shop — Hero, Kategorien, Filter, Produktgrid,
// Produktdetail (Overlay), Warenkorb (Slide-over) und Mietanfrage-Checkout.
// SEO-Hinweis: H1, Titel und Texte werden serverseitig gerendert; nur die
// Produktdaten laden clientseitig nach (bestehende SEO-Struktur bleibt).
import { INVENTORY_CATEGORIES } from '~~/shared/inventory-categories'
import { rentalPerks } from '~~/shared/rental-perks'

interface RentalItem {
  id: number
  title: string
  titleEn?: string | null
  category: string | null
  imagePath: string | null
  description: string | null
  descriptionEn?: string | null
  rentPrice1m: number | null
  rentPrice3m: number | null
  quantity: number
}

interface CartLine {
  id: number
  title: string
  imagePath: string | null
  durationMonths: number
  quantity: number
  price: number | null
}

// ---------- Sprache (DE/EN) ----------
const props = withDefaults(defineProps<{ lang?: string }>(), { lang: 'de' })
const isEn = computed(() => props.lang === 'en')

const DE = {
  loadError: 'Das Sortiment konnte gerade nicht geladen werden.',
  furniture: 'Möbel', availOk: 'Verfügbar', onRequest: 'Auf Anfrage', fromPrefix: 'ab ',
  month: 'Monat', months: 'Monate', month1: 'Monat', monAbbr: 'Mon.',
  headline: 'Stilvolle Möbel für zeitlich flexible Wohnkonzepte.',
  sub: 'Hochwertige Möbel & Accessoires zur Miete – für Home Staging, temporäre Wohnlösungen und mehr.',
  cta: 'Produkte entdecken', all: 'Alle', allProducts: 'Alle Produkte',
  howItWorks: 'So funktioniert’s', heroAlt: 'Elegant eingerichteter Wohnraum mit Mietmöbeln von WOHNFEE', toProducts: 'Zum Sortiment',
  searchPh: 'Produkte suchen …', availFilter: 'Verfügbarkeit', availLow: 'Nur noch wenige',
  sortRel: 'Sortieren: Relevanz', sortAsc: 'Preis aufsteigend', sortDesc: 'Preis absteigend', sortName: 'Name A–Z',
  loading: 'Sortiment wird geladen …',
  empty: 'Keine Produkte für diese Auswahl — Filter anpassen oder alle anzeigen.',
  favAdd: 'Merken', favRemove: 'Von der Merkliste entfernen', photoSoon: 'Foto folgt',
  addToCart: 'In den Warenkorb', home: 'Startseite',
  filter: 'Filter', category: 'Kategorie', priceMonth: 'Preis / Monat',
  apply: 'Filter anwenden', resetAll: 'Alle Filter zurücksetzen', results: 'Ergebnisse',
  sortBy: 'Sortieren nach', minDur: 'Mindestmietdauer', availNow: 'Sofort verfügbar', close: 'Schließen',
  duration: 'Mietdauer', qty: 'Menge', less: 'Weniger', more: 'Mehr',
  m3: '3 Monate', m1: '1 Monat', m612: '6 / 12 Monate',
  trust: ['Lieferung & Abholung', 'Flexible Mietdauer', 'Hochwertige Möbel', 'Persönliche Beratung'],
  description: 'Beschreibung',
  descSoon: 'Ausführliche Beschreibung folgt in Kürze.',
  descHint: 'Details zu Maßen, Material und Pflege erhältst du persönlich von unserem Team.',
  openCart: 'Warenkorb öffnen', cart: 'Warenkorb', cartEmpty: 'Dein Warenkorb ist leer.',
  remove: 'Entfernen', totalMonthly: 'Gesamt (monatlich)',
  feeNoteLong: 'zzgl. einmaliger Liefer-/Abholgebühr — wird im Angebot ausgewiesen.',
  feeNote: 'zzgl. einmaliger Liefer-/Abholgebühr.', checkout: 'Zum Checkout →',
  yourRequest: 'Deine Mietanfrage', yourRequestShort: 'Deine Anfrage',
  fFirst: 'Vorname (optional)', fLast: 'Nachname *', fCompany: 'Firma (optional)', fEmail: 'E-Mail *', fPhone: 'Telefon (optional)',
  fStreet: 'Straße *', fZip: 'PLZ *', fCity: 'Ort *', fCountry: 'Land (optional)',
  rentalPeriod: 'Mietzeitraum', startDate: 'Startdatum *',
  deliveryNotes: 'Lieferhinweise (optional)',
  deliveryPh: 'z. B. Stockwerk, Aufzug, gewünschter Lieferzeitraum …',
  formNote: 'Lieferung & Abholung durch WOHNFEE · Abrechnung monatlich per Rechnung.',
  monthlyRent: 'Monatlicher Mietpreis',
  errName: 'Bitte Nachname und eine gültige E-Mail-Adresse angeben.',
  errAddr: 'Bitte Lieferadresse vervollständigen (Straße, PLZ, Ort).',
  errDate: 'Bitte ein Mietstartdatum wählen.',
  errSend: 'Die Anfrage konnte nicht gesendet werden.',
  sending: 'Sendet …', send: 'Mietanfrage senden', backToCart: '‹ Zurück zum Warenkorb',
  thanks: 'Vielen Dank für deine Anfrage!',
  thanksText: 'Wir haben deine Mietanfrage erfolgreich erhalten und melden uns in Kürze persönlich bei dir.',
  inquiryNo: 'Anfragenummer', backToProducts: 'Zurück zu den Produkten'
}

const EN: typeof DE = {
  loadError: 'The catalogue could not be loaded right now.',
  furniture: 'Furniture', availOk: 'Available', onRequest: 'On request', fromPrefix: 'from ',
  month: 'month', months: 'months', month1: 'month', monAbbr: 'mo.',
  headline: 'Stylish furniture for flexible living — on your terms.',
  sub: 'High-quality furniture & accessories for rent – for home staging, temporary homes and more.',
  cta: 'Discover products', all: 'All', allProducts: 'All products',
  howItWorks: 'How it works', heroAlt: 'Elegantly furnished living room with rental furniture by WOHNFEE', toProducts: 'To the products',
  searchPh: 'Search products …', availFilter: 'Availability', availLow: 'Only a few left',
  sortRel: 'Sort: Relevance', sortAsc: 'Price (low to high)', sortDesc: 'Price (high to low)', sortName: 'Name A–Z',
  loading: 'Loading the catalogue …',
  empty: 'No products match this selection — adjust the filters or show all.',
  favAdd: 'Save', favRemove: 'Remove from wishlist', photoSoon: 'Photo coming soon',
  addToCart: 'Add to cart', home: 'Home',
  filter: 'Filters', category: 'Category', priceMonth: 'Price / month',
  apply: 'Apply filters', resetAll: 'Reset all filters', results: 'Results',
  sortBy: 'Sort by', minDur: 'Minimum rental period', availNow: 'Available now', close: 'Close',
  duration: 'Rental period', qty: 'Quantity', less: 'Less', more: 'More',
  m3: '3 months', m1: '1 month', m612: '6 / 12 months',
  trust: ['Delivery & pick-up', 'Flexible rental period', 'High-quality furniture', 'Personal consultation'],
  description: 'Description',
  descSoon: 'A detailed description will follow shortly.',
  descHint: 'For details on dimensions, materials and care, our team will gladly advise you in person.',
  openCart: 'Open cart', cart: 'Cart', cartEmpty: 'Your cart is empty.',
  remove: 'Remove', totalMonthly: 'Total (monthly)',
  feeNoteLong: 'plus a one-time delivery / pick-up fee — shown in your personal offer.',
  feeNote: 'plus a one-time delivery / pick-up fee.', checkout: 'Checkout →',
  yourRequest: 'Your rental request', yourRequestShort: 'Your request',
  fFirst: 'First name (optional)', fLast: 'Last name *', fCompany: 'Company (optional)', fEmail: 'E-mail *', fPhone: 'Phone (optional)',
  fStreet: 'Street *', fZip: 'Postal code *', fCity: 'City *', fCountry: 'Country (optional)',
  rentalPeriod: 'Rental period', startDate: 'Start date *',
  deliveryNotes: 'Delivery notes (optional)',
  deliveryPh: 'e.g. floor, elevator, preferred delivery time …',
  formNote: 'Delivery & pick-up by WOHNFEE · billed monthly by invoice.',
  monthlyRent: 'Monthly rental price',
  errName: 'Please enter your last name and a valid e-mail address.',
  errAddr: 'Please complete the delivery address (street, postal code, city).',
  errDate: 'Please choose a rental start date.',
  errSend: 'Your request could not be sent.',
  sending: 'Sending …', send: 'Send rental request', backToCart: '‹ Back to cart',
  thanks: 'Thank you for your request!',
  thanksText: 'We have received your rental request and will get back to you personally shortly.',
  inquiryNo: 'Inquiry no.', backToProducts: 'Back to the products'
}

const t = computed(() => (isEn.value ? EN : DE))

const CAT_EN: Record<string, string> = {
  sofa: 'Sofas & Armchairs', bett: 'Beds', teppiche: 'Rugs', stuehle: 'Chairs & Benches',
  spiegel: 'Mirrors', tische: 'Tables', lampen: 'Lamps', deko: 'Decor', textilien: 'Textiles',
  schrank: 'Cabinets & Storage', pflanzen: 'Plants', kueche: 'Kitchen & Household',
  bad: 'Bathroom', technik: 'Tech & Appliances'
}


const items = ref<RentalItem[]>([])
const loading = ref(true)
const loadError = ref('')

// Lokalisierte Sicht auf das Sortiment: im EN-Modus werden title/description
// durch die englischen DB-Felder ersetzt (Fallback: Deutsch, falls leer).
const litems = computed<RentalItem[]>(() => isEn.value
  ? items.value.map((i) => ({
      ...i,
      title: i.titleEn || i.title,
      description: i.descriptionEn || i.description
    }))
  : items.value)

const search = ref('')
const sortBy = ref('relevanz')

// ---------- Filterzustand (Sidebar / Toolbar) ----------
const activeCats = ref<string[]>([])
const activeAvail = ref<string[]>([]) // 'ok' | 'low' | 'none'
const activeDurs = ref<number[]>([])  // 1 | 3
const priceMin = ref(0)
const priceMax = ref(0)
const priceTouched = ref(false)
const sideOpen = ref(false)
const openGroups = ref<string[]>(['kat', 'avail', 'dur', 'price'])

// ---------- Daten ----------
const openCartOverlay = () => { cartOpen.value = true }
onBeforeUnmount(() => window.removeEventListener('wf:open-cart', openCartOverlay))
onMounted(async () => {
  // Header-Warenkorb-Icon: Overlay direkt öffnen (Event oder #warenkorb-Hash)
  window.addEventListener('wf:open-cart', openCartOverlay)
  if (window.location.hash === '#warenkorb') {
    history.replaceState(null, '', window.location.pathname)
    openCartOverlay()
  }
  try {
    const res = await $fetch<{ items: RentalItem[] }>('/api/rental-catalog')
    items.value = res.items
    syncPriceBounds()
  } catch {
    loadError.value = t.value.loadError
  } finally {
    loading.value = false
  }
})

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  INVENTORY_CATEGORIES.map((c) => [c.key, c.label])
)
function catLabel(key: string | null | undefined): string {
  if (!key) return t.value.furniture
  return (isEn.value ? CAT_EN[key] : CATEGORY_LABELS[key]) || t.value.furniture
}
const presentCats = computed(() => {
  const set = new Set(items.value.map((i) => i.category).filter(Boolean) as string[])
  return INVENTORY_CATEGORIES.filter((c) => set.has(c.key))
})

// ---------- Preise & Verfügbarkeit ----------
function priceFor(i: RentalItem, dur: number): number | null {
  return dur === 1 ? i.rentPrice1m : i.rentPrice3m
}
function priceFrom(i: RentalItem): number | null {
  const ps = [i.rentPrice1m, i.rentPrice3m].filter((p): p is number => p !== null && p > 0)
  return ps.length ? Math.min(...ps) : null
}
function eur(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null
    : Number(v).toLocaleString(isEn.value ? 'en-IE' : 'de-AT', { style: 'currency', currency: 'EUR' })
}
function avail(i: RentalItem): 'ok' | 'low' | 'none' {
  const s = Number(i.quantity) || 0
  if (s < 1) return 'none'
  if (s <= 2) return 'low'
  return 'ok'
}
function availLabel(a: 'ok' | 'low' | 'none'): string {
  return a === 'ok' ? t.value.availOk : a === 'none' ? t.value.onRequest : ''
}
function onlyLeft(n: number): string {
  return isEn.value ? `Only ${n} left` : `Nur noch ${n} verfügbar`
}

function teaser(text: string | null | undefined): string {
  if (!text) return ''
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.length > 110 ? plain.slice(0, 110).trim() + ' …' : plain
}

// ---------- Filterung & Sortierung ----------
// Im Template werden Refs auto-unwrapped → Wrapper je Filterliste.
function toggleRef(arr: Ref<unknown[]>, v: unknown) {
  arr.value = arr.value.includes(v) ? arr.value.filter((x) => x !== v) : [...arr.value, v]
}
const toggleCat = (v: string) => toggleRef(activeCats, v)
const toggleAvail = (v: string) => toggleRef(activeAvail, v)
const toggleDur = (v: number) => toggleRef(activeDurs, v)
function toggleGroup(g: string) {
  openGroups.value = openGroups.value.includes(g)
    ? openGroups.value.filter((x) => x !== g)
    : [...openGroups.value, g]
}

const maxPrice = computed(() =>
  Math.ceil(Math.max(1, ...items.value.map((i) => priceFrom(i) ?? 0))))
function syncPriceBounds() {
  priceMin.value = 0
  priceMax.value = maxPrice.value
  priceTouched.value = false
}
function onMinPrice() {
  if (priceMin.value > priceMax.value) priceMax.value = priceMin.value
  priceTouched.value = true
}
function onMaxPrice() {
  if (priceMax.value < priceMin.value) priceMin.value = priceMax.value
  priceTouched.value = true
}

// Anzahl-Pro-Kategorie / -Verfügbarkeit / -Dauer (immer über ALLE Produkte)
const catCounts = computed(() => {
  const m: Record<string, number> = {}
  for (const i of items.value) if (i.category) m[i.category] = (m[i.category] || 0) + 1
  return m
})
const availCounts = computed(() => {
  const m = { ok: 0, low: 0, none: 0 }
  for (const i of items.value) m[avail(i)]++
  return m
})
const durCounts = computed(() => ({
  1: items.value.filter((i) => i.rentPrice1m !== null).length,
  3: items.value.filter((i) => i.rentPrice3m !== null).length
}))
const AVAIL_OPTS = computed(() => [
  { v: 'ok', l: t.value.availNow },
  { v: 'low', l: t.value.availLow },
  { v: 'none', l: t.value.onRequest }
])
const DUR_OPTS = computed(() => [
  { v: 1, l: `1 ${t.value.month1}` },
  { v: 3, l: `3 ${t.value.months}` }
])

// Aktive Filter als Chips (Sidebar + Toolbar)
const chips = computed(() => [
  ...activeCats.value.map((k) => ({ key: 'cat:' + k, label: catLabel(k) })),
  ...activeAvail.value.map((a) => ({ key: 'av:' + a, label: AVAIL_OPTS.value.find((o) => o.v === a)?.l || a })),
  ...activeDurs.value.map((d) => ({ key: 'dur:' + d, label: `${d} ${t.value.months}` })),
  ...(priceTouched.value
    ? [{ key: 'price', label: `${eur(priceMin.value)} – ${eur(priceMax.value)}` }]
    : [])
])
function removeChip(key: string) {
  const [kind, val] = key.split(':')
  if (kind === 'cat') activeCats.value = activeCats.value.filter((x) => x !== val)
  else if (kind === 'av') activeAvail.value = activeAvail.value.filter((x) => x !== val)
  else if (kind === 'dur') activeDurs.value = activeDurs.value.filter((x) => String(x) !== val)
  else if (kind === 'price') syncPriceBounds()
}
function resetFilters() {
  activeCats.value = []
  activeAvail.value = []
  activeDurs.value = []
  search.value = ''
  syncPriceBounds()
}

const filtered = computed(() => {
  let list = litems.value.slice()
  if (activeCats.value.length) {
    list = list.filter((i) => i.category !== null && activeCats.value.includes(i.category))
  }
  if (activeAvail.value.length) list = list.filter((i) => activeAvail.value.includes(avail(i)))
  if (activeDurs.value.length) {
    list = list.filter((i) => activeDurs.value.some((d) => priceFor(i, d) !== null))
  }
  if (priceTouched.value) {
    list = list.filter((i) => {
      const p = priceFrom(i)
      return p !== null && p >= priceMin.value && p <= priceMax.value
    })
  }
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter((i) =>
      i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
  }
  switch (sortBy.value) {
    case 'preis-auf':
      list.sort((a, b) => (priceFrom(a) ?? Infinity) - (priceFrom(b) ?? Infinity)); break
    case 'preis-ab':
      list.sort((a, b) => (priceFrom(b) ?? -1) - (priceFrom(a) ?? -1)); break
    case 'name':
      list.sort((a, b) => a.title.localeCompare(b.title, 'de')); break
  }
  return list
})

// ---------- Merkliste (Herz) ----------
const favs = ref<number[]>([])
function loadFavs() {
  try { favs.value = JSON.parse(localStorage.getItem('wf_rental_favs') || '[]') } catch { favs.value = [] }
}
function toggleFav(id: number) {
  favs.value = favs.value.includes(id) ? favs.value.filter((f) => f !== id) : [...favs.value, id]
  localStorage.setItem('wf_rental_favs', JSON.stringify(favs.value))
}

// ---------- Warenkorb ----------
const cart = ref<CartLine[]>([])
const cartOpen = ref(false)

function loadCart() {
  try { cart.value = JSON.parse(localStorage.getItem('wf_rental_cart') || '[]') } catch { cart.value = [] }
}
function persistCart() {
  localStorage.setItem('wf_rental_cart', JSON.stringify(cart.value))
  window.dispatchEvent(new CustomEvent('wf:cart-changed'))
}
const cartCount = computed(() => cart.value.reduce((s, l) => s + l.quantity, 0))
const perks = computed(() => rentalPerks(cart.value))
const cartMonthly = computed(() =>
  Math.round(cart.value.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0) * 100) / 100
)

function addToCart(i: RentalItem, dur: number, qty: number) {
  const price = priceFor(i, dur)
  const existing = cart.value.find((l) => l.id === i.id && l.durationMonths === dur)
  const stock = Number(i.quantity) || 0
  if (existing) {
    existing.quantity = Math.min(stock > 0 ? stock : 99, existing.quantity + qty)
  } else {
    cart.value.push({ id: i.id, title: i.title, imagePath: i.imagePath, durationMonths: dur, quantity: qty, price })
  }
  persistCart()
  cartOpen.value = true
}
function setQty(line: CartLine, qty: number) {
  if (qty < 1) cart.value = cart.value.filter((l) => l !== line)
  else line.quantity = Math.min(99, qty)
  persistCart()
}
function removeLine(line: CartLine) {
  cart.value = cart.value.filter((l) => l !== line)
  persistCart()
}

// ---------- Produktdetail ----------
const detail = ref<RentalItem | null>(null)
const detailDur = ref(3)
const detailQty = ref(1)
function openDetail(i: RentalItem) {
  detail.value = i
  detailDur.value = i.rentPrice3m !== null ? 3 : 1
  detailQty.value = 1
}

// ---------- Checkout ----------
// Der Drawer zeigt nur noch den Warenkorb; die Dateneingabe passiert auf der
// eigenen Checkout-Seite (/furniture-leasing/checkout, EN: /en/…).
const checkoutUrl = computed(() => isEn.value ? '/en/furniture-leasing/checkout' : '/furniture-leasing/checkout')
function goCheckout() {
  if (!perks.value.minReached) return
  cartOpen.value = false
  navigateTo(checkoutUrl.value)
}

function scrollToHowItWorks() {
  const el = document.querySelector('.hiw')
  if (!el) return
  const header = document.querySelector('.headerwrap')
  const offset = (header?.getBoundingClientRect().height || 0) + 14
  smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - offset)
}

// Hero füllt den Viewport unter dem Sticky-Header (wie auf den übrigen Seiten)
const flRoot = ref<HTMLElement | null>(null)
function syncHeroHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && flRoot.value) flRoot.value.style.setProperty('--hs-head', `${h}px`)
}
onMounted(() => { syncHeroHeight(); window.addEventListener('resize', syncHeroHeight) })
onUnmounted(() => window.removeEventListener('resize', syncHeroHeight))

const heroUsps = computed(() => [
  { icon: 'truck', text: t.value.trust[0] },
  { icon: 'calendar', text: t.value.trust[1] },
  { icon: 'diamond', text: t.value.trust[2] },
  { icon: 'users', text: t.value.trust[3] }
])

function scrollToProducts() {
  // Ziel: „Alle Produkte"-Titel landet direkt unter dem Sticky-Header,
  // darunter Toolbar + erste Produktkarten. Sanftes Custom-Scrolling.
  const title = document.querySelector('.fl__shoptitle')
  if (!title) return
  const header = document.querySelector('.headerwrap')
  const offset = (header?.getBoundingClientRect().height || 0) + 14
  const targetY = title.getBoundingClientRect().top + window.scrollY - offset
  smoothScrollTo(targetY)
}

// Sanftes Scrollen mit easeInOutCubic — Dauer abhängig von der Distanz,
// damit kurze Strecken zügig und lange nicht zu schnell sind.
function smoothScrollTo(targetY: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, targetY)
    return
  }
  const startY = window.scrollY
  const dist = targetY - startY
  if (!dist) return
  const dur = Math.min(1600, Math.max(750, Math.abs(dist) * 0.55))
  let start: number | null = null
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const step = (ts: number) => {
    if (start === null) start = ts
    const p = Math.min(1, (ts - start) / dur)
    window.scrollTo(0, Math.round(startY + dist * ease(p)))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => { loadFavs(); loadCart() })

// CTA-Link „…direkt Möbel im Sortiment entdecken" (aus den Content-Elementen)
// zeigt per href="#fl-produkte" – Klicks abfangen und sanft scrollen statt Sprung.
function onFlAnchorClick(e: Event) {
  const a = (e.target as HTMLElement).closest('a[href="#fl-produkte"]')
  if (!a) return
  e.preventDefault()
  scrollToProducts()
}
onMounted(() => document.addEventListener('click', onFlAnchorClick))
onUnmounted(() => document.removeEventListener('click', onFlAnchorClick))
</script>

<template>
  <div ref="flRoot" class="fl">
    <!-- ── HERO ─────────────────────────────────────────── -->
    <section class="fl__hero">
      <img class="fl__herobg" src="/files/wohnfee/bilder/furniture-leasing/Furniture_Leasing_2.jpg"
           :alt="t.heroAlt" loading="eager" fetchpriority="high">
      <div class="fl__heroinside">
        <h1 class="fl__kicker">Furniture Leasing</h1>
        <p class="fl__headline">{{ t.headline }}</p>
        <p class="fl__sub">{{ t.sub }}</p>
        <div class="fl__heroactions">
          <button type="button" class="fl__cta" @click="scrollToProducts">{{ t.cta }} <span aria-hidden="true">→</span></button>
          <button type="button" class="fl__cta fl__cta--ghost" @click="scrollToHowItWorks">{{ t.howItWorks }}</button>
        </div>
        <ul class="fl__usps">
          <li v-for="u in heroUsps" :key="u.text">
            <span class="fl__uspicon"><WfIcon :name="u.icon" :size="18" /></span>
            <span>{{ u.text }}</span>
          </li>
        </ul>
      </div>
      <button type="button" class="fl__cue" @click="scrollToProducts">
        {{ t.toProducts }}
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </button>
    </section>

    <!-- ── SHOP: SIDEBAR + PRODUKTGRID ──────────────────── -->
    <!-- (Kategorie-Schnellwahl wurde entfernt – Auswahl läuft über die Filter-Sidebar) -->
    <section id="fl-produkte" class="fl__shop">
      <div class="fl__layout">
        <!-- Filter-Sidebar (Desktop: Spalte, Mobil: Drawer) -->
        <aside class="fl__side" :class="{ 'is-open': sideOpen }" :aria-label="t.filter">
          <header class="fl__sidehead">
            <h3>{{ t.filter }}</h3>
            <button type="button" class="fl__sidex" :aria-label="t.close" @click="sideOpen = false">×</button>
          </header>

          <div class="fl__group">
            <button type="button" class="fl__ghead" :aria-expanded="openGroups.includes('kat')" @click="toggleGroup('kat')">
              {{ t.category }}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'is-flip': !openGroups.includes('kat') }"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-show="openGroups.includes('kat')" class="fl__gbody">
              <label v-for="c in presentCats" :key="c.key" class="fl__opt">
                <input type="checkbox" :checked="activeCats.includes(c.key)" @change="toggleCat(c.key)">
                <span>{{ isEn ? (CAT_EN[c.key] || c.label) : c.label }}</span>
                <em>{{ catCounts[c.key] || 0 }}</em>
              </label>
            </div>
          </div>

          <div class="fl__group">
            <button type="button" class="fl__ghead" :aria-expanded="openGroups.includes('avail')" @click="toggleGroup('avail')">
              {{ t.availFilter }}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'is-flip': !openGroups.includes('avail') }"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-show="openGroups.includes('avail')" class="fl__gbody">
              <label v-for="o in AVAIL_OPTS" :key="o.v" class="fl__opt">
                <input type="checkbox" :checked="activeAvail.includes(o.v)" @change="toggleAvail(o.v)">
                <span>{{ o.l }}</span>
                <em>{{ availCounts[o.v as 'ok' | 'low' | 'none'] }}</em>
              </label>
            </div>
          </div>

          <div class="fl__group">
            <button type="button" class="fl__ghead" :aria-expanded="openGroups.includes('dur')" @click="toggleGroup('dur')">
              {{ t.duration }}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'is-flip': !openGroups.includes('dur') }"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-show="openGroups.includes('dur')" class="fl__gbody">
              <label v-for="o in DUR_OPTS" :key="o.v" class="fl__opt">
                <input type="checkbox" :checked="activeDurs.includes(o.v)" @change="toggleDur(o.v)">
                <span>{{ o.l }}</span>
                <em>{{ durCounts[o.v as 1 | 3] }}</em>
              </label>
            </div>
          </div>

          <div class="fl__group">
            <button type="button" class="fl__ghead" :aria-expanded="openGroups.includes('price')" @click="toggleGroup('price')">
              {{ t.priceMonth }}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'is-flip': !openGroups.includes('price') }"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-show="openGroups.includes('price')" class="fl__gbody">
              <div class="fl__range">
                <div class="fl__rtrack" aria-hidden="true"
                     :style="{ background: `linear-gradient(to right, var(--line) 0%, var(--line) ${(priceMin / maxPrice) * 100}%, var(--green) ${(priceMin / maxPrice) * 100}%, var(--green) ${(priceMax / maxPrice) * 100}%, var(--line) ${(priceMax / maxPrice) * 100}%, var(--line) 100%)` }" />
                <input v-model.number="priceMin" type="range" :min="0" :max="maxPrice" :step="5"
                       :aria-label="t.priceMonth + ' min'" @input="onMinPrice">
                <input v-model.number="priceMax" type="range" :min="0" :max="maxPrice" :step="5"
                       :aria-label="t.priceMonth + ' max'" @input="onMaxPrice">
              </div>
              <div class="fl__rinputs">
                <label>€<input :value="priceMin" type="number" :min="0" :max="maxPrice"
                              @change="priceMin = Math.min(Math.max(0, parseInt(($event.target as HTMLInputElement).value) || 0), priceMax); priceTouched = true"></label>
                <span>–</span>
                <label>€<input :value="priceMax" type="number" :min="0" :max="maxPrice"
                              @change="priceMax = Math.max(Math.min(maxPrice, parseInt(($event.target as HTMLInputElement).value) || 0), priceMin); priceTouched = true"></label>
              </div>
            </div>
          </div>

          <button type="button" class="fl__apply" @click="sideOpen = false">{{ t.apply }}</button>
          <button type="button" class="fl__reset" @click="resetFilters">{{ t.resetAll }}</button>
        </aside>
        <div v-if="sideOpen" class="fl__backdrop" @click="sideOpen = false" />

        <!-- Inhaltsspalte -->
        <div class="fl__main">
          <h2 class="fl__shoptitle">{{ t.allProducts }} <span class="fl__count">({{ filtered.length }})</span></h2>
          <div class="fl__shophead">
            <div class="fl__toolbar">
              <div class="fl__searchwrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input v-model="search" type="search" class="fl__search" :placeholder="t.searchPh" :aria-label="t.searchPh">
              </div>
              <button type="button" class="fl__filterbtn" :aria-expanded="sideOpen" @click="sideOpen = !sideOpen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                {{ t.filter }}
                <span v-if="chips.length" class="fl__fcount">{{ chips.length }}</span>
              </button>
              <label class="fl__sort">
                <span>{{ t.sortBy }}</span>
                <select v-model="sortBy" class="fl__select" :aria-label="t.sortBy">
                  <option value="relevanz">{{ t.sortRel }}</option>
                  <option value="preis-auf">{{ t.sortAsc }}</option>
                  <option value="preis-ab">{{ t.sortDesc }}</option>
                  <option value="name">{{ t.sortName }}</option>
                </select>
              </label>
            </div>
            <p class="fl__results">{{ filtered.length }} {{ t.results }}</p>

            <div v-if="chips.length" class="fl__chips">
              <span v-for="c in chips" :key="c.key" class="fl__chip">
                {{ c.label }}
                <button type="button" :aria-label="t.close" @click="removeChip(c.key)">×</button>
              </span>
              <button type="button" class="fl__chipall" @click="resetFilters">{{ t.resetAll }}</button>
            </div>
          </div>

          <p v-if="loading" class="fl__hint">{{ t.loading }}</p>
          <p v-else-if="loadError" class="fl__hint">{{ loadError }}</p>
          <p v-else-if="!filtered.length" class="fl__hint">
            {{ t.empty }}
          </p>

          <div v-else class="fl__grid">
            <article v-for="i in filtered" :key="i.id" class="fl__card">
              <button class="fl__heart" :class="{ 'is-on': favs.includes(i.id) }"
                      :title="favs.includes(i.id) ? t.favRemove : t.favAdd"
                      :aria-pressed="favs.includes(i.id)" @click="toggleFav(i.id)">
                <WfIcon name="heart" :size="16" />
              </button>
              <button class="fl__media" @click="openDetail(i)">
                <img v-if="i.imagePath" :src="i.imagePath" :alt="i.title" class="fl__img" loading="lazy">
                <span v-else class="fl__ph" aria-hidden="true">
                  <WfIcon name="bag" :size="30" />
                  <em>{{ t.photoSoon }}</em>
                </span>
                <span class="fl__catchip" :class="'is-' + avail(i)">
                  <span class="fl__dot" />{{ avail(i) === 'low' ? onlyLeft(i.quantity) : availLabel(avail(i)) }}
                </span>
              </button>
              <div class="fl__body">
                <h3 class="fl__name" @click="openDetail(i)">{{ i.title }}</h3>
                <p class="fl__meta">{{ catLabel(i.category) }}</p>
                <p class="fl__price">
                  <template v-if="priceFrom(i)"><span v-if="priceFrom(i) !== (priceFor(i, 1) ?? priceFor(i, 3))" class="fl__from">{{ t.fromPrefix }}</span><strong>{{ eur(priceFrom(i)) }}</strong><span class="fl__per"> / {{ t.month }}</span></template>
                  <template v-else>{{ t.onRequest }}</template>
                </p>
                <p class="fl__mindur">{{ t.minDur }}: {{ i.rentPrice3m !== null ? '3' : '1' }} {{ t.months }}</p>
                <button class="fl__add" :disabled="avail(i) === 'none'" @click="addToCart(i, i.rentPrice3m !== null ? 3 : 1, 1)">
                  <WfIcon name="bag" :size="14" /> {{ t.addToCart }}
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- ── PRODUKTDETAIL (Overlay) ──────────────────────── -->
    <div v-if="detail" class="fl__overlay" @click.self="detail = null">
      <div class="fl__detail" role="dialog" aria-modal="true" :aria-label="detail.title">
        <button class="fl__dclose" title="Schließen" @click="detail = null">×</button>
        <nav class="fl__crumbs" aria-label="Breadcrumb">
          <span>{{ t.home }}</span> / <span>Furniture Leasing</span> / <strong>{{ detail.title }}</strong>
        </nav>
        <div class="fl__dgrid">
          <div class="fl__dmedia">
            <img v-if="detail.imagePath" :src="detail.imagePath" :alt="detail.title" class="fl__dimg">
            <div v-else class="fl__ph fl__ph--lg" aria-hidden="true">
              <WfIcon name="bag" :size="44" /><em>{{ t.photoSoon }}</em>
            </div>
          </div>
          <div class="fl__dinfo">
            <h3 class="fl__dname">{{ detail.title }}</h3>
            <p class="fl__dprice">
              <strong>{{ eur(priceFor(detail, detailDur)) || t.onRequest }}</strong>
              <span v-if="priceFor(detail, detailDur)"> / {{ t.month }}</span>
            </p>
            <p class="fl__avail" :class="'is-' + avail(detail)">
              <span class="fl__dot" />{{ avail(detail) === 'low' ? onlyLeft(detail.quantity) : availLabel(avail(detail)) }}
            </p>
            <p v-if="teaser(detail.description)" class="fl__ddesc">{{ teaser(detail.description) }}</p>

            <div class="fl__durgroup" role="group" :aria-label="t.duration">
              <span class="fl__flabel">{{ t.duration }}</span>
              <button class="fl__dur" :class="{ 'is-active': detailDur === 3 }"
                      :disabled="detail.rentPrice3m === null"
                      @click="detailDur = 3">
                <strong>{{ t.m3 }}</strong>
                <span v-if="detail.rentPrice3m !== null">{{ eur(detail.rentPrice3m) }} / {{ t.month }}</span>
                <span v-else>{{ t.onRequest }}</span>
              </button>
              <button class="fl__dur" :class="{ 'is-active': detailDur === 1 }"
                      :disabled="detail.rentPrice1m === null"
                      @click="detailDur = 1">
                <strong>{{ t.m1 }}</strong>
                <span v-if="detail.rentPrice1m !== null">{{ eur(detail.rentPrice1m) }} / {{ t.month }}</span>
                <span v-else>{{ t.onRequest }}</span>
              </button>
              <button class="fl__dur" disabled>
                <strong>{{ t.m612 }}</strong><span>{{ t.onRequest }}</span>
              </button>
            </div>

            <div class="fl__qtyrow">
              <span class="fl__flabel">{{ t.qty }}</span>
              <div class="fl__stepper">
                <button :disabled="detailQty <= 1" :title="t.less" @click="detailQty--"><WfIcon name="minus" :size="13" /></button>
                <span>{{ detailQty }}</span>
                <button :disabled="detailQty >= (Number(detail.quantity) || 99)" :title="t.more" @click="detailQty++"><WfIcon name="plus" :size="13" /></button>
              </div>
            </div>

            <button class="fl__add fl__add--lg" :disabled="avail(detail) === 'none'"
                    @click="addToCart(detail, detailDur, detailQty); detail = null">
              <WfIcon name="bag" :size="15" /> {{ t.addToCart }}
            </button>

            <ul class="fl__trust">
              <li v-for="x in t.trust" :key="x"><WfIcon name="check" :size="13" /> {{ x }}</li>
            </ul>
          </div>
        </div>
        <div class="fl__dtabs">
          <section>
            <h4>{{ t.description }}</h4>
            <p v-if="detail.description" class="fl__tabtext">{{ detail.description }}</p>
            <p v-else class="fl__tabtext fl__hint">{{ t.descSoon }}</p>
            <p class="fl__tabhint">{{ t.descHint }}</p>
          </section>
        </div>
      </div>
    </div>

    <!-- ── WARENKORB (Slide-over) ───────────────────────── -->
    <button class="fl__cartbtn" :title="t.openCart" @click="cartOpen = true">
      <WfIcon name="bag" :size="20" />
      <span v-if="cartCount" class="fl__cartn">{{ cartCount }}</span>
    </button>

    <div v-if="cartOpen" class="fl__drawerwrap" @click.self="cartOpen = false">
      <aside class="fl__drawer" role="dialog" aria-modal="true" :aria-label="t.cart">
        <header class="fl__drhead">
          <h3>{{ t.cart }} ({{ cartCount }})</h3>
          <button class="fl__dclose" title="Schließen" @click="cartOpen = false">×</button>
        </header>
        <p v-if="!cart.length" class="fl__hint">{{ t.cartEmpty }}</p>
        <ul v-else class="fl__lines">
          <li v-for="l in cart" :key="l.id + '-' + l.durationMonths" class="fl__line">
            <span class="fl__lthumb">
              <img v-if="l.imagePath" :src="l.imagePath" alt="">
              <WfIcon v-else name="bag" :size="18" />
            </span>
            <div class="fl__lmain">
              <strong class="fl__lname">{{ l.title }}</strong>
              <span class="fl__lmeta">{{ l.durationMonths }} {{ l.durationMonths > 1 ? t.months : t.month1 }}</span>
              <span class="fl__lprice">{{ l.price !== null ? eur(l.price) + ' / ' + t.month : t.onRequest }}</span>
              <div class="fl__stepper fl__stepper--sm">
                <button :title="t.less" @click="setQty(l, l.quantity - 1)"><WfIcon name="minus" :size="11" /></button>
                <span>{{ l.quantity }}</span>
                <button :title="t.more" @click="setQty(l, l.quantity + 1)"><WfIcon name="plus" :size="11" /></button>
              </div>
            </div>
            <button class="fl__lremove" :title="t.remove" @click="removeLine(l)"><WfIcon name="trash" :size="14" /></button>
          </li>
        </ul>
        <footer v-if="cart.length" class="fl__drfoot">
          <RentalPerks :lines="cart" />
          <p class="fl__total"><span>{{ t.totalMonthly }}</span><strong>{{ eur(cartMonthly) }}</strong></p>
          <p class="fl__note">{{ t.feeNoteLong }}</p>
          <button class="fl__add fl__add--lg" :disabled="!perks.minReached" @click="goCheckout">{{ t.checkout }}</button>
        </footer>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ── Grundgerüst & Farbwelt ─────────────────────────── */
.fl { --green: #2f5d40; --green-soft: #eef3ee; --ink: #2b2b28; --muted: #7a7568; --line: #e6e0d2; --cream: #f7f4ec; }

/* Hero im Stil der übrigen Seiten: Vollbild-Foto mit hellem Verlauf, Inhalt links */
.fl__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(600px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(600px, calc(100svh - var(--hs-head, 108px)));
  background: var(--cream);
}
.fl__herobg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 70% 55%; }
.fl__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(247, 244, 236, .97) 0%, rgba(247, 244, 236, .9) 33%,
      rgba(247, 244, 236, .45) 52%, rgba(247, 244, 236, 0) 68%),
    linear-gradient(0deg, var(--cream) 0%, rgba(247, 244, 236, 0) 16%);
}
.fl__heroinside {
  position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto;
  padding: 3em 1.5em 5em; box-sizing: border-box; text-align: left;
}
.fl__heroinside > * { max-width: 34rem; }
.fl__kicker {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.3em !important; padding: 0 !important; border: 0 !important;
  font-family: var(--font-family-01, 'Open Sans', sans-serif) !important; font-size: .72em !important; letter-spacing: .22em;
  text-transform: uppercase; font-weight: 600 !important; color: var(--ink) !important; text-align: left !important;
}
.fl__kicker::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.fl__headline {
  font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500;
  font-size: clamp(2.3em, 4.6vw, 3.5em); line-height: 1.08; letter-spacing: -.01em; color: var(--ink); margin: 0 0 .5em;
}
.fl__sub { font-size: 1.05em; line-height: 1.7; color: #5f5b52; margin: 0 0 1.8em; }
.fl__heroactions { display: flex; flex-wrap: wrap; gap: .8em; margin-bottom: 2.4em; }
.fl__cta {
  display: inline-flex; align-items: center; gap: .45em; border: 1px solid var(--green); cursor: pointer;
  font: inherit; font-weight: 600; font-size: .9em; background: var(--green); color: #fff;
  border-radius: 999px; padding: .85em 1.9em; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.fl__cta:hover { background: #26492f; transform: translateY(-1px); }
.fl__cta--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border-color: var(--ink); }
.fl__cta--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.fl__usps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: .8em 1.4em; }
.fl__usps li { display: flex; align-items: center; gap: .7em; font-size: .88em; color: var(--ink); }
.fl__uspicon {
  flex: none; width: 2.5em; height: 2.5em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, .75); border: 1px solid #d9d3c4; color: var(--green);
}
.fl__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.fl__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.fl__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: fl-bob 1.8s ease-in-out infinite; }
.fl__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes fl-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }
@media (prefers-reduced-motion: reduce) { .fl__cue svg { animation: none; } }

/* Shop-Layout: Sidebar + Inhalt */
.fl__shop { max-width: 1240px; margin: 0 auto; padding: 2em 1.5em 3em; }
.fl__shoptitle {
  font-family: Georgia, serif; font-weight: 500; font-size: 1.7em;
  margin: 0 0 1em; color: var(--ink); text-align: center;
}
.fl__count { color: var(--muted); font-size: .75em; font-weight: 400; }
.fl__layout { display: grid; grid-template-columns: 248px 1fr; gap: 2.2em; align-items: start; }

/* Filter-Sidebar: scrollt unabhängig, bleibt am Header kleben */
.fl__side {
  background: #fff; border: 1px solid var(--line); border-radius: 16px;
  padding: 1.2em 1.3em 1.4em;
  position: sticky; top: 130px;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cfc9ba transparent;
}
.fl__side::-webkit-scrollbar { width: 6px; }
.fl__side::-webkit-scrollbar-thumb { background: #d8d2c4; border-radius: 999px; }
.fl__side::-webkit-scrollbar-track { background: transparent; }
.fl__sidehead { display: flex; align-items: center; justify-content: space-between; margin-bottom: .4em; }
.fl__sidehead h3 { margin: 0; font-family: Georgia, serif; font-weight: 500; font-size: 1.15em; color: var(--ink); }
.fl__sidex {
  display: none; border: 0; background: none; cursor: pointer;
  font-size: 1.5em; line-height: 1; color: var(--muted);
}
.fl__group { border-bottom: 1px solid var(--line); padding: .55em 0; }
.fl__group:last-of-type { border-bottom: 0; }
.fl__ghead {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; border: 0; background: none; cursor: pointer; font: inherit;
  font-weight: 600; font-size: .92em; color: var(--ink); padding: .35em 0;
}
.fl__ghead svg { color: var(--muted); transition: transform .2s; }
.fl__ghead svg.is-flip { transform: rotate(-90deg); }
.fl__gbody { padding: .35em 0 .55em; display: flex; flex-direction: column; gap: .45em; }
.fl__opt { display: flex; align-items: center; gap: .5em; font-size: .86em; color: var(--ink); cursor: pointer; }
.fl__opt input { accent-color: var(--green); width: 15px; height: 15px; margin: 0; flex: 0 0 auto; }
.fl__opt span { flex: 1; }
.fl__opt em { font-style: normal; color: var(--muted); font-size: .85em; }

/* Preis-Doppel-Slider */
.fl__range { position: relative; height: 26px; margin: .35em 0 .3em; }
.fl__rtrack { position: absolute; top: 50%; left: 0; right: 0; height: 4px; transform: translateY(-50%); border-radius: 999px; }
.fl__range input[type="range"] {
  position: absolute; inset: 0; width: 100%; margin: 0; padding: 0;
  -webkit-appearance: none; appearance: none; background: none; pointer-events: none; height: 26px;
}
.fl__range input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; pointer-events: auto;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--green); cursor: grab;
  margin-top: 4px; box-shadow: 0 1px 4px rgba(31, 28, 23, .25);
}
.fl__range input[type="range"]::-moz-range-thumb {
  pointer-events: auto; width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--green); cursor: grab;
  box-shadow: 0 1px 4px rgba(31, 28, 23, .25);
}
.fl__rinputs { display: flex; align-items: center; gap: .5em; }
.fl__rinputs span { color: var(--muted); }
.fl__rinputs label {
  flex: 1; display: flex; align-items: center; gap: .25em;
  border: 1px solid var(--line); border-radius: 10px; padding: .3em .5em;
  font-size: .85em; color: var(--muted);
}
.fl__rinputs input {
  width: 100%; min-width: 0; border: 0; outline: none;
  font: inherit; font-size: .95em; color: var(--ink); background: none;
  -moz-appearance: textfield; appearance: textfield;
}
.fl__rinputs input::-webkit-outer-spin-button, .fl__rinputs input::-webkit-inner-spin-button { -webkit-appearance: none; }

.fl__apply {
  width: 100%; margin-top: 1em; border: 0; cursor: pointer; font: inherit;
  font-weight: 600; font-size: .9em; background: var(--green); color: #fff;
  border-radius: 999px; padding: .7em 1em; transition: background .15s;
}
.fl__apply:hover { background: #26492f; }
.fl__reset {
  width: 100%; margin-top: .6em; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: .82em; color: var(--muted); text-decoration: underline;
  padding: .3em 0;
}
.fl__reset:hover { color: var(--green); }
.fl__backdrop { display: none; }

/* Toolbar (Suche / Filter-Button / Sortierung) */
.fl__shophead { margin-bottom: 1.2em; }
.fl__toolbar { display: flex; align-items: center; gap: .7em; flex-wrap: wrap; }
.fl__searchwrap {
  position: relative; flex: 1; min-width: 14em; max-width: 26em;
  display: flex; align-items: center;
}
.fl__searchwrap svg { position: absolute; left: .9em; color: var(--muted); pointer-events: none; }
.fl__search, .fl__select {
  font: inherit; font-size: .88em; color: var(--ink);
  border: 1px solid var(--line); border-radius: 999px; background: #fff;
  padding: .55em 1em; outline: none;
}
.fl__search { width: 100%; padding-left: 2.4em; }
.fl__search:focus, .fl__select:focus { border-color: var(--green); }
.fl__filterbtn {
  display: inline-flex; align-items: center; gap: .45em;
  border: 1px solid var(--line); border-radius: 999px; background: #fff;
  font: inherit; font-size: .86em; font-weight: 600; color: var(--green);
  padding: .55em 1em; cursor: pointer; transition: border-color .15s, background .15s;
}
.fl__filterbtn:hover { border-color: var(--green); background: var(--green-soft); }
.fl__fcount {
  min-width: 19px; height: 19px; border-radius: 999px;
  background: var(--green); color: #fff;
  font-size: .72em; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; padding: 0 .3em;
}
.fl__sort { display: inline-flex; align-items: center; gap: .5em; margin-left: auto; font-size: .84em; color: var(--muted); }
.fl__results { margin: .55em 0 0; font-size: .8em; color: var(--muted); text-align: right; }

/* Aktive Filter-Chips */
.fl__chips { display: flex; align-items: center; flex-wrap: wrap; gap: .5em; margin-top: .8em; }
.fl__chip {
  display: inline-flex; align-items: center; gap: .4em;
  background: var(--green-soft); color: var(--green);
  border-radius: 999px; padding: .32em .5em .32em .85em;
  font-size: .8em; font-weight: 600;
}
.fl__chip button {
  border: 0; background: none; cursor: pointer; color: inherit;
  font-size: 1.05em; line-height: 1; padding: .1em .25em; border-radius: 50%;
}
.fl__chip button:hover { color: #a33; }
.fl__chipall { border: 0; background: none; cursor: pointer; font: inherit; font-size: .8em; color: var(--muted); text-decoration: underline; }
.fl__chipall:hover { color: var(--green); }

/* Produktgrid */
.fl__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(225px, 1fr)); gap: 1.3em; }
.fl__card {
  position: relative; background: #fff; border: 1px solid var(--line); border-radius: 16px;
  overflow: hidden; display: flex; flex-direction: column;
  transition: box-shadow .2s, transform .2s;
}
.fl__card:hover { box-shadow: 0 10px 28px rgba(60, 50, 30, .12); transform: translateY(-2px); }
.fl__heart {
  position: absolute; top: .6em; right: .6em; z-index: 2;
  width: 32px; height: 32px; border-radius: 50%; border: 0; cursor: pointer;
  background: rgba(255, 255, 255, .92); color: #b9b2a2;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s;
}
.fl__heart.is-on { color: var(--green); }
.fl__media { position: relative; display: block; width: 100%; border: 0; padding: 0; cursor: pointer; background: var(--cream); aspect-ratio: 4 / 3; }
.fl__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fl__ph {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: .5em;
  color: #b4ab97; background: repeating-linear-gradient(45deg, #f4f0e6 0 16px, #ede8da 16px 32px);
  font-style: normal;
}
.fl__ph em { font-size: .72em; letter-spacing: .1em; text-transform: uppercase; }
.fl__ph--lg { aspect-ratio: 4 / 3.2; border-radius: 14px; }
.fl__catchip {
  position: absolute; left: .7em; bottom: .7em;
  display: inline-flex; align-items: center; gap: .35em;
  font-size: .68em; font-weight: 600;
  background: rgba(255, 255, 255, .94); color: #2e7a44;
  border-radius: 999px; padding: .35em .8em;
  box-shadow: 0 2px 8px rgba(31, 28, 23, .12);
}
.fl__catchip.is-low { color: #a57614; }
.fl__catchip.is-none { color: var(--muted); }
.fl__body { display: flex; flex-direction: column; flex: 1; padding: .9em 1em 1em; }
.fl__name { margin: 0 0 .2em; font-size: .98em; line-height: 1.35; cursor: pointer; }
.fl__name:hover { color: var(--green); }
.fl__meta { margin: 0 0 .45em; font-size: .74em; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
.fl__avail { display: flex; align-items: center; gap: .4em; font-size: .76em; margin: 0 0 .5em; color: var(--muted); }
.fl__dot { width: 7px; height: 7px; border-radius: 50%; background: #4c9a63; flex: 0 0 auto; }
.fl__avail.is-low .fl__dot { background: #d9a441; }
.fl__avail.is-low { color: #a57614; }
.fl__avail.is-none .fl__dot { background: #b9b2a2; }
.fl__price { margin: auto 0 .15em; font-size: .85em; color: var(--muted); display: flex; align-items: baseline; flex-wrap: wrap; }
.fl__price strong { color: var(--ink); font-size: 1.3em; font-weight: 700; }
.fl__from { font-size: .9em; margin-right: .55em; }
.fl__per { font-size: .9em; }
.fl__mindur { margin: 0 0 .8em; font-size: .74em; color: var(--muted); }
.fl__add {
  display: flex; align-items: center; justify-content: center; gap: .45em;
  width: 100%; box-sizing: border-box;
  border: 0; cursor: pointer; font: inherit; font-size: .85em; font-weight: 600;
  background: var(--green); color: #fff; border-radius: 999px; padding: .65em 1em;
  transition: background .15s;
}
.fl__add:hover:not(:disabled) { background: #26492f; }
.fl__add:disabled { background: #cfc9ba; cursor: not-allowed; }
.fl__add--lg { padding: .8em 1.2em; font-size: .95em; width: 100%; }
.fl__hint { color: var(--muted); font-style: italic; padding: 1.5em 0; }
.fl__error { background: #fbeaea; color: #a33; border-radius: 10px; padding: .6em .9em; font-size: .85em; }

/* Produktdetail-Overlay — muss über Cookiebar (9999) und Header (10000)
   liegen, aber unter dem Warenkorb-Drawer */
.fl__overlay {
  position: fixed; inset: 0; z-index: 10900; background: rgba(30, 28, 22, .5);
  display: flex; align-items: center; justify-content: center; padding: 1.5em;
}
.fl__detail {
  position: relative; background: #fff; border-radius: 20px; width: min(960px, 100%);
  max-height: 90vh; overflow-y: auto; padding: 1.8em 2em;
}
.fl__dclose {
  position: absolute; top: .7em; right: .9em; border: 0; background: none;
  font-size: 1.6em; line-height: 1; color: var(--muted); cursor: pointer;
}
.fl__dclose:hover { color: var(--ink); }
.fl__crumbs { font-size: .76em; color: var(--muted); margin-bottom: 1.2em; }
.fl__dgrid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 2em; }
.fl__dimg { width: 100%; aspect-ratio: 4 / 3.2; object-fit: cover; border-radius: 14px; display: block; }
.fl__dname { font-family: Georgia, serif; font-weight: 500; font-size: 1.5em; margin: 0 0 .3em; color: var(--ink); }
.fl__dprice { font-size: 1em; color: var(--muted); margin: 0 0 .4em; }
.fl__dprice strong { color: var(--ink); font-size: 1.6em; }
.fl__ddesc { font-size: .9em; line-height: 1.6; color: var(--muted); margin: .6em 0 1em; }
.fl__flabel { display: block; font-size: .76em; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin: 0 0 .5em; }
.fl__durgroup { display: flex; gap: .5em; margin-bottom: 1em; flex-wrap: wrap; }
.fl__dur {
  flex: 1; min-width: 6.5em; display: flex; flex-direction: column; gap: .15em;
  border: 1px solid var(--line); border-radius: 12px; background: #fff;
  padding: .55em .7em; cursor: pointer; font: inherit; text-align: left;
}
.fl__dur strong { font-size: .82em; color: var(--ink); }
.fl__dur span { font-size: .74em; color: var(--muted); }
.fl__dur.is-active { border-color: var(--green); background: var(--green-soft); }
.fl__dur:disabled { opacity: .55; cursor: not-allowed; }
.fl__qtyrow { margin-bottom: 1.1em; }
.fl__stepper {
  display: inline-flex; align-items: center; gap: .15em;
  border: 1px solid var(--line); border-radius: 999px; padding: .2em;
}
.fl__stepper button {
  width: 26px; height: 26px; border-radius: 50%; border: 0; background: var(--cream);
  cursor: pointer; color: var(--ink); display: flex; align-items: center; justify-content: center;
}
.fl__stepper button:disabled { opacity: .4; cursor: not-allowed; }
.fl__stepper span { min-width: 2em; text-align: center; font-size: .9em; font-variant-numeric: tabular-nums; }
.fl__stepper--sm button { width: 20px; height: 20px; }
.fl__trust { list-style: none; margin: 1.1em 0 0; padding: .9em 0 0; border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr 1fr; gap: .4em .8em; }
.fl__trust li { display: flex; align-items: center; gap: .4em; font-size: .78em; color: var(--muted); }
.fl__trust svg { color: var(--green); flex: 0 0 auto; }
.fl__dtabs { margin-top: 1.6em; border-top: 1px solid var(--line); padding-top: 1.1em; }
.fl__dtabs h4 { margin: 0 0 .4em; font-size: .85em; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
.fl__tabtext { font-size: .9em; line-height: 1.65; color: var(--ink); margin: 0; }
.fl__tabhint { font-size: .78em; color: var(--muted); margin: .6em 0 0; }

/* Warenkorb-Drawer */
.fl__cartbtn {
  position: fixed; right: 1.4em; bottom: 1.4em; z-index: 10001;
  width: 54px; height: 54px; border-radius: 50%; border: 0; cursor: pointer;
  background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 22px rgba(38, 73, 47, .4);
}
.fl__cartn {
  position: absolute; top: -3px; right: -3px; min-width: 20px; height: 20px;
  border-radius: 999px; background: #fff; color: var(--green);
  font-size: .72em; font-weight: 700; display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--green);
}
/* Höchster z-index der Website: Der Warenkorb-Drawer liegt über allem —
   inkl. Cookiebar (9999) und Sticky-Header samt Sprachswitch (10000) */
.fl__drawerwrap { position: fixed; inset: 0; z-index: 11000; background: rgba(30, 28, 22, .5); display: flex; justify-content: flex-end; }
.fl__drawer {
  background: #fff; width: min(430px, 100%); height: 100%; overflow: hidden;
  padding: 1.4em 1.5em; display: flex; flex-direction: column;
  box-sizing: border-box;
  box-shadow: -14px 0 40px rgba(30, 28, 22, .25);
}
.fl__drhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1em; }
.fl__drhead h3 { margin: 0; font-family: Georgia, serif; font-weight: 500; font-size: 1.3em; }
.fl__drhead .fl__dclose { position: static; }
/* scrollt intern; wächst, sodass der Footer unten gepinnt bleibt */
.fl__lines { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; }
.fl__line { display: flex; gap: .8em; padding: .9em 0; border-bottom: 1px solid var(--line); }
.fl__lthumb {
  flex: 0 0 58px; height: 58px; border-radius: 10px; overflow: hidden;
  background: var(--cream); color: #b4ab97; display: flex; align-items: center; justify-content: center;
}
.fl__lthumb img { width: 100%; height: 100%; object-fit: cover; }
.fl__lmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .15em; }
.fl__lname { font-size: .88em; line-height: 1.3; }
.fl__lmeta, .fl__lprice { font-size: .76em; color: var(--muted); }
.fl__lremove { border: 0; background: none; color: #b9b2a2; cursor: pointer; align-self: flex-start; padding: .2em; }
.fl__lremove:hover { color: #a33; }
.fl__drfoot { padding-top: 1em; flex-shrink: 0; }
.fl__total { display: flex; justify-content: space-between; align-items: baseline; margin: 0 0 .3em; font-size: .92em; }
.fl__total strong { font-size: 1.3em; color: var(--ink); }
.fl__note { font-size: .74em; color: var(--muted); margin: 0 0 1em; }

/* Checkout-Formular */
/* scrollt intern, damit nichts über den Drawer hinausragt */
.fl__form { display: flex; flex-direction: column; gap: .8em; flex: 1; min-height: 0; overflow-y: auto; }
.fl__frow { display: grid; grid-template-columns: 1fr 1fr; gap: .7em; }
.fl__frow--3 { grid-template-columns: 5em 1fr 7em; }
.fl__fld { display: flex; flex-direction: column; gap: .25em; }
.fl__fld > span { font-size: .72em; font-weight: 600; color: var(--muted); }
.fl__fld input, .fl__fld textarea {
  font: inherit; font-size: .88em; color: var(--ink); width: 100%;
  border: 1px solid var(--line); border-radius: 10px; padding: .55em .7em; outline: none;
  box-sizing: border-box; background: #fff;
}
.fl__fld input:focus, .fl__fld textarea:focus { border-color: var(--green); }
.fl__summary { border: 1px solid var(--line); border-radius: 12px; padding: .9em 1em; }
.fl__summary ul { list-style: none; margin: 0 0 .6em; padding: 0; }
.fl__summary li { display: flex; justify-content: space-between; gap: 1em; font-size: .8em; color: var(--muted); padding: .2em 0; }
.fl__back { border: 0; background: none; cursor: pointer; font: inherit; font-size: .82em; color: var(--muted); padding: .4em 0; }
.fl__back:hover { color: var(--green); }

/* Bestätigung */
.fl__success { text-align: center; padding: 2em 0; display: flex; flex-direction: column; align-items: center; flex: 1; min-height: 0; overflow-y: auto; }
.fl__check {
  width: 64px; height: 64px; border-radius: 50%; background: var(--green); color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 1em;
}
.fl__success h3 { font-family: Georgia, serif; font-weight: 500; font-size: 1.4em; margin: 0 0 .4em; }
.fl__success p { color: var(--muted); font-size: .9em; margin: 0 0 1.2em; }
.fl__recap { width: 100%; margin: 0 0 1.4em; text-align: left; }
.fl__recap div { display: flex; justify-content: space-between; gap: 1em; padding: .5em 0; border-bottom: 1px solid var(--line); font-size: .85em; }
.fl__recap dt { color: var(--muted); }
.fl__recap dd { margin: 0; font-weight: 600; }

/* Responsive */
@media (max-width: 860px) {
  .fl__hero { min-height: 0; align-items: flex-end; }
  .fl__herobg { height: 20em; }
  .fl__hero::after {
    inset: 0 0 auto 0; height: 20em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(247, 244, 236, .85) 30%, rgba(247, 244, 236, 0) 65%);
  }
  .fl__heroinside { padding: 13em 1em 2.5em; }
  .fl__usps { grid-template-columns: 1fr; }
  .fl__cue { display: none; }
  .fl__dgrid { grid-template-columns: 1fr; gap: 1.2em; }
  .fl__detail { padding: 1.2em 1.2em; }
  .fl__grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: .9em; }
  .fl__frow--3 { grid-template-columns: 4.5em 1fr; }
  .fl__trust { grid-template-columns: 1fr; }

  /* Sidebar wird zum einblendbaren Drawer */
  .fl__layout { grid-template-columns: 1fr; }
  .fl__side {
    position: fixed; inset: 0 auto 0 0; z-index: 10500;
    width: min(340px, 88vw); max-height: 100vh; overflow-y: auto;
    border-radius: 0 16px 16px 0;
    transform: translateX(-105%); transition: transform .28s ease;
    box-shadow: 14px 0 40px rgba(30, 28, 22, .25);
  }
  .fl__side.is-open { transform: translateX(0); }
  .fl__sidex { display: block; }
  .fl__backdrop {
    display: block; position: fixed; inset: 0; z-index: 10400;
    background: rgba(30, 28, 22, .45);
  }
  .fl__shoptitle { text-align: left; font-size: 1.4em; }
  .fl__sort { width: 100%; margin-left: 0; justify-content: space-between; }
  .fl__searchwrap { max-width: none; }
}
</style>
