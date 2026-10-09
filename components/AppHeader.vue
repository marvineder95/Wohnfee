<script setup lang="ts">
const { nav, pages, pagesEn, news, newsEn, routes } = useSiteData()
const route = useRoute()
const open = ref(false)

// Sprachpaare aus den Seitendaten (Feld „alternate" kennzeichnet die jeweils
// andere Sprachversion einer Seite)
// Eigene App-Seiten (nicht in den Seitendaten) mit festem Sprach-Gegenstück
const APP_PAIRS: Record<string, string> = {
  '/furniture-leasing/checkout': '/en/furniture-leasing/checkout'
}

const langPairs = computed(() => {
  const m: Record<string, string> = {}
  for (const [de, en] of Object.entries(APP_PAIRS)) {
    m[de] = en
    m[en] = de
  }
  for (const p of Object.values(pages as Record<string, any>)) {
    if (p.route && p.alternate) {
      m[p.route] = p.alternate
      m[p.alternate] = p.route
    }
  }
  return m
})

// Sprache der aktuell angezeigten Seite (default: Deutsch) — berücksichtigt
// sowohl Seiten- als auch News-Artikel (DE/EN)
const currentLang = computed(() => {
  const entry = resolveRoute(route.path)
  if (!entry) return route.path.startsWith('/en/') ? 'en' : 'de'
  if (entry.type === 'news') {
    const src: any = route.path.startsWith('/en/') ? newsEn : news
    return (src as Record<string, any>)[entry.id]?.lang === 'en' ? 'en' : 'de'
  }
  const src: any = route.path.startsWith('/en/') ? pagesEn : pages
  const p: any = (src as Record<string, any>)[entry.id]
    || (pages as Record<string, any>)[entry.id]
  return p?.lang === 'en' ? 'en' : 'de'
})

// Ziel des DE-Links: Gegenstück der aktuellen Seite (nur wenn man gerade EN ist)
const deTarget = computed(() =>
  currentLang.value === 'en' ? (langPairs.value[route.path] || '/start.html') : '')

// Ziel des EN-Links: Gegenstück der aktuellen Seite, sonst die englische Leasing-Seite
const enTarget = computed(() =>
  currentLang.value === 'en' ? '' : (langPairs.value[route.path] || '/en/furniture-leasing.html'))

// Sprachwahl merken: nach Klick auf EN bleibt der Besucher im EN-Modus, bis er
// wieder explizit auf DE wechselt (localStorage, clientseitig)
const setLangPref = (lang: string) => {
  if (!import.meta.client) return
  try {
    if (lang === 'en') window.localStorage.setItem('wf_lang', 'en')
    else window.localStorage.removeItem('wf_lang')
  } catch { /* private mode */ }
}

// Beim ersten Besuch (clientseitig): wenn EN als bevorzugte Sprache gespeichert
// ist und die aktuelle Seite ein EN-Gegenstück hat, dorthin weiterleiten
onMounted(() => {
  if (!import.meta.client) return
  try {
    if (window.localStorage.getItem('wf_lang') === 'en'
      && currentLang.value !== 'en') {
      const target = langPairs.value[route.path]
      if (target) navigateTo(target)
    }
  } catch { /* private mode */ }
})

// Navigations-Titel auf Englisch (gemappt über die DE-Route)
const EN_TITLES: Record<string, string> = {
  '/home-staging.html': 'Home Staging',
  '/fuer-bautraeger-2.html': 'For Property Developers',
  '/fuer-makler.html': 'For Estate Agents',
  '/fuer-privatpersonen-2.html': 'For Private Individuals',
  '/home-staging/preise.html': 'Prices',
  '/faq.html': 'FAQ',
  '/redesign.html': 'Redesign',
  '/furniture-leasing.html': 'Furniture Leasing',
  '/aktuelles.html': 'Blog',
  '/projekte.html': 'Projects',
  '/trends-tipps.html': 'Trends & Tips',
  '/events.html': 'Events',
  '/team.html': 'About Us',
  '/presse.html': 'Press',
  '/kontakt.html': 'Contact',
  '/impressum.html': 'Legal Notice',
  '/datenschutz.html': 'Privacy Policy'
}
const titleFor = (item: any) =>
  currentLang.value === 'en' ? (EN_TITLES[item.route] || item.title) : item.title

// Interne Ziel-URL im EN-Modus aufs EN-Gegenstück umschreiben (falls vorhanden)
const linkFor = (r?: string) => {
  if (!r) return r
  if (currentLang.value !== 'en') return r
  const key = r.endsWith('.html') ? r : r + '.html'
  return (routes as Record<string, any>)['/en' + key] ? '/en' + key : r
}

// page cssClasses (e.g. "blog", "hspreise", "no-slider") keyed by route, from tl_page.cssClass
const classByRoute = computed(() => {
  const m: Record<string, string> = {}
  for (const p of Object.values(pages as Record<string, any>)) {
    if (p.route && p.cssClass) m[p.route] = p.cssClass
  }
  return m
})
const pageClass = (r?: string) => (r ? classByRoute.value[r] || '' : '')

const dePath = (p: string) => p.startsWith('/en/') ? p.slice(3) : p

const isActive = (item: any) => {
  if (!item.route) return false
  return item.route === dePath(route.path) || item.children?.some((c: any) => c.route === dePath(route.path))
}

const liClass = (item: any, submenu = true) => [
  isActive(item) ? (item.route === dePath(route.path) ? 'active' : 'trail') : 'sibling',
  submenu && item.children?.length ? 'submenu' : '',
  pageClass(item.route)
].filter(Boolean).join(' ')

// Mobiles Menü: aktiven Bereich aufgeklappt öffnen, Body-Scroll sperren,
// bei Seitenwechsel/Esc schließen
const expanded = ref<string | null>(null)
watch(open, (v) => {
  if (!import.meta.client) return
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) expanded.value = (nav as any).main.find((i: any) => i.children?.length && isActive(i))?.route ?? null
})
watch(() => route.path, () => { open.value = false })
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { if (import.meta.client) window.removeEventListener('keydown', onKey) })

// Header bekommt beim Scrollen nur einen Schatten – Höhe/Größen bleiben konstant
const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 8 }
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('scroll', onScroll)
})

// ---------- Warenkorb-Icon (Furniture Leasing) ----------
// Anzahl aus dem localStorage des RentalShops ('wf_rental_cart'); der Shop
// feuert bei Änderungen das Event 'wf:cart-changed'.
const cartCount = ref(0)
const refreshCart = () => {
  if (!import.meta.client) return
  try {
    const lines = JSON.parse(window.localStorage.getItem('wf_rental_cart') || '[]')
    cartCount.value = lines.reduce((s: number, l: any) => s + (Number(l.quantity) || 0), 0)
  } catch { cartCount.value = 0 }
}
// Öffnet den Warenkorb an Ort und Stelle – im Shop dessen Drawer (RentalShop),
// auf allen anderen Seiten den seitenweiten AppCartDrawer. Keine Weiterleitung.
const openCart = () => {
  window.dispatchEvent(new CustomEvent('wf:open-cart'))
}
onMounted(() => {
  refreshCart()
  window.addEventListener('wf:cart-changed', refreshCart)
  window.addEventListener('storage', refreshCart)
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('wf:cart-changed', refreshCart)
  window.removeEventListener('storage', refreshCart)
})
</script>

<template>
  <header id="header" class="wfh" :class="{ 'is-scrolled': scrolled }">
    <div class="inside">
      <div id="logo" class="content-text media media--above">
        <figure>
          <NuxtLink :to="linkFor('/start.html')">
            <img src="/files/wohnfee/layout/img/wohnfee_logo_neu.png" alt="WOHNFEE Home Staging">
          </NuxtLink>
        </figure>
        <div class="rte">
          <p class="logo"><span class="subtag">since 2011</span></p>
        </div>
      </div>
      <nav class="mod_navigation block wfh-nav" :aria-label="currentLang === 'en' ? 'Main navigation' : 'Hauptnavigation'">
        <a href="#skipNavigation1" class="invisible">Navigation überspringen</a>
        <ul class="level_1">
          <li v-for="item in (nav as any).main" :key="item.route"
              :class="[liClass(item, false), item.children?.length ? 'has-drop' : '']">
            <strong v-if="item.route === dePath(route.path)" :class="liClass(item, false)">
              {{ titleFor(item) }}
              <svg v-if="item.children?.length" class="wfh-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </strong>
            <NuxtLink v-else :to="linkFor(item.route)" :title="titleFor(item)" :class="liClass(item, false)">
              {{ titleFor(item) }}
              <svg v-if="item.children?.length" class="wfh-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </NuxtLink>
            <div v-if="item.children?.length" class="wfh-drop">
              <ul>
                <li v-for="child in item.children" :key="child.route">
                  <NuxtLink :to="linkFor(child.route)" :class="{ 'is-current': child.route === dePath(route.path) }">
                    <span>{{ titleFor(child) }}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </li>
        </ul>
        <span id="skipNavigation1" class="invisible"></span>
      </nav>
      <div class="langswitch" role="navigation" :aria-label="currentLang === 'en' ? 'Choose language' : 'Sprache wählen'">
        <NuxtLink v-if="deTarget" :to="deTarget" hreflang="de" :class="{ 'is-active': currentLang === 'de' }" @click="setLangPref('de')">DE</NuxtLink>
        <span v-else class="is-active is-current" aria-current="true">DE</span>
        <span class="langswitch__sep" aria-hidden="true">|</span>
        <NuxtLink v-if="enTarget" :to="enTarget" hreflang="en" lang="en" :class="{ 'is-active': currentLang === 'en' }" @click="setLangPref('en')">EN</NuxtLink>
        <span v-else class="is-active is-current" aria-current="true" lang="en">EN</span>
      </div>
      <NuxtLink :to="linkFor('/kontakt.html')" class="wfh-cta">
        {{ currentLang === 'en' ? 'Get in touch' : 'Beratung anfragen' }}
      </NuxtLink>
      <!-- Warenkorb ganz rechts am Ende der Navigation -->
      <button type="button" class="cartbtn" :aria-label="currentLang === 'en' ? 'Open cart' : 'Warenkorb öffnen'"
              @click="openCart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
          <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H6" />
        </svg>
        <span v-if="cartCount > 0" class="cartbtn__badge">{{ cartCount }}</span>
      </button>
      <button type="button" class="wfm-trigger" :class="{ 'is-open': open }"
              :aria-label="currentLang === 'en' ? (open ? 'Close menu' : 'Open menu') : (open ? 'Menü schließen' : 'Menü öffnen')"
              :aria-expanded="open" aria-controls="wfm" @click="open = !open">
        <span /><span /><span />
      </button>
    </div>
  </header>

  <!-- Mobiles Menü: per Teleport direkt in <body>, weil der Header (backdrop-filter)
       sonst als Container für position:fixed wirkt und das Panel abschneidet -->
  <Teleport to="body">
    <Transition name="wfm">
      <div v-if="open" id="wfm" class="wfm" role="dialog" aria-modal="true"
           :aria-label="currentLang === 'en' ? 'Menu' : 'Menü'">
        <div class="wfm__top">
          <NuxtLink :to="linkFor('/start.html')" class="wfm__logo" @click="open = false">
            <img src="/files/wohnfee/layout/img/wohnfee_logo_neu.png" alt="WOHNFEE Home Staging">
            <span>since 2011</span>
          </NuxtLink>
          <button type="button" class="wfm__close" :aria-label="currentLang === 'en' ? 'Close menu' : 'Menü schließen'" @click="open = false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div class="wfm__body">
          <div class="wfm__nav" role="navigation" :aria-label="currentLang === 'en' ? 'Main navigation' : 'Hauptnavigation'">
            <div v-for="(item, i) in (nav as any).main" :key="item.route" class="wfm__item"
                 :class="{ 'is-active': isActive(item), 'is-expanded': expanded === item.route }"
                 :style="{ '--i': i }">
              <div class="wfm__row">
                <NuxtLink :to="linkFor(item.route)" class="wfm__link" @click="open = false">
                  <span class="wfm__no">0{{ i + 1 }}</span>{{ titleFor(item) }}
                </NuxtLink>
                <button v-if="item.children?.length" type="button" class="wfm__toggle"
                        :aria-expanded="expanded === item.route"
                        :aria-label="(currentLang === 'en' ? 'Show subpages: ' : 'Unterseiten anzeigen: ') + titleFor(item)"
                        @click="expanded = expanded === item.route ? null : item.route">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </button>
              </div>
              <div v-if="item.children?.length" class="wfm__sub">
                <div class="wfm__subinner">
                  <NuxtLink v-for="child in item.children" :key="child.route" :to="linkFor(child.route)"
                            class="wfm__sublink" :class="{ 'is-current': child.route === dePath(route.path) }"
                            @click="open = false">
                    {{ titleFor(child) }}
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <NuxtLink :to="linkFor('/kontakt.html')" class="wfm__cta" @click="open = false">
            {{ currentLang === 'en' ? 'Get in touch' : 'Beratung anfragen' }}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </NuxtLink>

          <div class="wfm__contact">
            <a href="tel:+436769202236">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
              +43 676 9202236
            </a>
            <a href="mailto:office@wohnfee.at">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              office@wohnfee.at
            </a>
          </div>
        </div>

        <div class="wfm__foot">
          <div class="wfm__lang" role="navigation" :aria-label="currentLang === 'en' ? 'Choose language' : 'Sprache wählen'">
            <NuxtLink v-if="deTarget" :to="deTarget" hreflang="de" @click="setLangPref('de'); open = false">DE</NuxtLink>
            <span v-else class="is-active" aria-current="true">DE</span>
            <NuxtLink v-if="enTarget" :to="enTarget" hreflang="en" lang="en" @click="setLangPref('en'); open = false">EN</NuxtLink>
            <span v-else class="is-active" aria-current="true" lang="en">EN</span>
          </div>
          <div class="wfm__legal">
            <NuxtLink v-for="item in (nav as any).footer.filter((f: any) => f.route !== '/kontakt.html')" :key="item.route"
                      :to="linkFor(item.route)" @click="open = false">{{ titleFor(item) }}</NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* Header hat eine konstante Höhe (Logo-Bild + „since 2011") und klebt über
   position:sticky am Seitenkopf (siehe .headerwrap in app.vue). Beim Scrollen
   ändert sich NICHTS an Größe, Schrift oder Position – kein Resize, kein
   Abschneiden. Die früheren #header.sticky-Overrides (kleineres Logo, andere
   Margins) wurden entfernt; das JS, das die Klasse gesetzt hat, ebenfalls. */

#header .inside {
  /* statt großer Top-Margins auf den Kindern: zentrierte Zeile mit
     kompaktem Padding oben/unten – die Headerhöhe = Logo inkl. Subtag */
  align-items: center;
  padding: 1rem 0 1.2rem;
}

#header nav {
  margin-top: 0;
  margin-bottom: 0;
}

/* DE|EN-Sprachswitch — als dezente Pill rechts neben der Hauptnavigation.
   Vertikal zentriert in der Headerzeile, linkslier Abstand trennt die
   Icon-Gruppe von den Nav-Punkten. */
#header .langswitch {
  position: relative;
  /* über der Cookiebar (z-index 9999), damit der Switch auch vor der
     Einwilligung klickbar bleibt */
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: .35em;
  margin: 0 0 0 1.8rem;
  padding: .4em .85em;
  border: 1px solid #e4ddcb;
  border-radius: 999px;
  background: rgba(255, 255, 255, .9);
  font-size: .92em;
  letter-spacing: .05em;
  align-self: center;
  flex-shrink: 0;
}

#header .langswitch a,
#header .langswitch .is-current {
  color: #a8a396;
  text-decoration: none;
  font-weight: 600;
  padding: .05em .2em;
  line-height: 1.4;
}

#header .langswitch a:hover { color: #2f2f2b; }

#header .langswitch .is-current {
  color: #2f5d40;
  border-bottom: 2px solid #759364;
  cursor: default;
}

#header .langswitch__sep { color: #d8d2c4; }


@media (max-width: 767px) {
  #header .langswitch { display: none; }
}

/* Neues WOHNFEE-Logo: PNG hat keine Eigengröße -> feste Breite */
#header #logo img {
  width: 215px;
  height: auto;
  display: block;
}

/* Logo-Block ohne Top-Margin – die Höhe bestimmt nur Bild + „since 2011",
   die Zeile wird über align-items:center in .inside zentriert. */
#header #logo { margin-top: 0; padding-bottom: 0; }

/* Warenkorb-Icon rechts neben der Navigation (vor DE|EN-Switch) */
#header .cartbtn {
  position: relative;
  z-index: 10000;
  /* Buttons erben browserseitig KEINE Schriftgröße – ohne inherit würden
     alle em-Angaben (Icon, Margins) auf der kleinen UA-Standardgröße
     basieren und das Icon säße zu hoch/klein. */
  font-size: inherit;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  /* größerer linkslier Abstand trennt die Icon-Gruppe deutlich von den Nav-Punkten */
  margin: 0 0 0 2.6rem;
  padding: .35em;
  width: 2.4em;
  height: 2.4em;
  border: 0;
  background: none;
  color: #2f2f2b;
  cursor: pointer;
  transition: color .15s ease;
}
#header .cartbtn:hover { color: #2f5d40; }
#header .cartbtn svg { width: 1.55em; height: 1.55em; }

/* ── Header-Entwurf „wfh" ─────────────────────────────
   Heller, leicht transparenter Header mit Blur, Pill-Navigation in der
   Grundschrift, Dropdowns für Unterseiten und grünem CTA rechts. */
#header.wfh {
  /* backdrop-filter erzeugt einen eigenen Stacking-Context – ohne z-index
     würde das Untermenü (#submenu) über den Dropdowns liegen */
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, .86);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  backdrop-filter: blur(14px) saturate(1.2);
  border-bottom: 1px solid transparent;
  transition: box-shadow .25s ease, border-color .25s ease, background .25s ease;
}
#header.wfh.is-scrolled {
  background: rgba(255, 255, 255, .94);
  border-bottom-color: #ece7da;
  box-shadow: 0 8px 28px rgba(40, 35, 20, .07);
}
#header.wfh .inside { padding: .75rem 0 .85rem; }
#header.wfh #logo img { width: 185px; }

/* Sprachunabhängiges Layout: Logo und rechte Gruppe (DE|EN, CTA, Warenkorb) haben
   feste Breiten, das Menü sitzt zentriert im verbleibenden Platz – beim Wechsel
   DE ⇄ EN verschiebt sich dadurch nur die Schrift im Menü, nicht Logo oder Buttons. */
#header.wfh #logo { flex: none; }
#header.wfh .wfh-nav { flex: 1 1 auto; flex-basis: auto; min-width: 0; margin: 0 1rem; display: flex; justify-content: center; }
#header.wfh .wfh-nav > ul.level_1 { justify-content: center; flex-wrap: nowrap; white-space: nowrap; }
/* Mobil übernimmt das Burger-Menü – die Desktop-Navigation muss (wie im alten
   media-queries.css) ausgeblendet bleiben, das display:flex oben überschreibt das sonst */
@media (max-width: 767px) { #header.wfh .wfh-nav { display: none; } }

#header.wfh .wfh-nav { font-family: var(--font-family-01, 'Open Sans', sans-serif); overflow: visible; }
#header.wfh .wfh-nav > ul.level_1 {
  gap: .25em; margin: 0; padding-left: 0; align-items: center;
}
#header.wfh .wfh-nav > ul.level_1 > li { position: relative; font-size: 1em; word-spacing: 0; }
#header.wfh .wfh-nav > ul.level_1 > li > a,
#header.wfh .wfh-nav > ul.level_1 > li > strong {
  display: inline-flex; align-items: center; gap: .35em;
  padding: .55em 1em; border: 0; border-radius: 999px;
  font-size: .93em; font-weight: 500; letter-spacing: .01em; color: #2b2b28;
  transition: background .2s ease, color .2s ease;
}
#header.wfh .wfh-nav > ul.level_1 > li:hover > a,
#header.wfh .wfh-nav > ul.level_1 > li:hover > strong,
#header.wfh .wfh-nav > ul.level_1 > li:focus-within > a {
  background: #f4f0e7; color: #1f1f1c;
}
#header.wfh .wfh-nav > ul.level_1 > li > strong,
#header.wfh .wfh-nav > ul.level_1 > li.trail > a {
  background: #eef3ee; color: #2f5d40; font-weight: 600;
}
#header.wfh .wfh-chev {
  width: .85em; height: .85em; fill: none; stroke: currentColor; stroke-width: 2.2;
  stroke-linecap: round; stroke-linejoin: round; opacity: .55; transition: transform .25s ease;
}
#header.wfh .wfh-nav li.has-drop:hover .wfh-chev,
#header.wfh .wfh-nav li.has-drop:focus-within .wfh-chev { transform: rotate(180deg); }

/* Dropdown */
#header.wfh .wfh-drop {
  position: absolute; top: 100%; left: 50%; z-index: 50;
  padding-top: .7em; min-width: 250px;
  opacity: 0; visibility: hidden; transform: translate(-50%, 8px);
  transition: opacity .2s ease, transform .2s ease, visibility 0s linear .2s;
}
#header.wfh .wfh-nav li.has-drop:hover > .wfh-drop,
#header.wfh .wfh-nav li.has-drop:focus-within > .wfh-drop {
  opacity: 1; visibility: visible; transform: translate(-50%, 0);
  transition: opacity .2s ease, transform .2s ease, visibility 0s;
}
#header.wfh .wfh-drop ul {
  display: block; margin: 0; padding: .5em; gap: 0;
  background: #fff; border: 1px solid #ece7da; border-radius: 16px;
  box-shadow: 0 20px 44px rgba(40, 35, 20, .14);
}
#header.wfh .wfh-drop li { list-style: none; font-size: 1em; }
#header.wfh .wfh-drop a {
  display: flex; align-items: center; justify-content: space-between; gap: 1em;
  padding: .65em .9em; border: 0; border-radius: 10px;
  font-size: .9em; font-weight: 500; color: #2b2b28; white-space: nowrap;
  transition: background .15s ease, color .15s ease;
}
#header.wfh .wfh-drop a svg {
  width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round;
  opacity: 0; transform: translateX(-4px); transition: opacity .15s ease, transform .15s ease;
}
#header.wfh .wfh-drop a:hover { background: #f6f3ec; color: #2f5d40; }
#header.wfh .wfh-drop a:hover svg { opacity: 1; transform: none; }
#header.wfh .wfh-drop a.is-current { color: #2f5d40; font-weight: 600; background: #eef3ee; }

/* Icon-Gruppe + CTA */
#header.wfh .cartbtn { margin-left: .9rem; }
#header.wfh .langswitch { margin-left: 1.4rem; font-size: .85em; }
#header.wfh .wfh-cta {
  flex-shrink: 0; align-self: center; margin-left: 1rem;
  /* feste Breite für den längsten Text („Beratung anfragen“) – EN ist kürzer */
  min-width: 10.4rem; box-sizing: border-box; justify-content: center;
  display: inline-flex; align-items: center; padding: .7em 1.35em; border-radius: 999px;
  background: #2f5d40; color: #fff; text-decoration: none; white-space: nowrap;
  font-family: var(--font-family-01, 'Open Sans', sans-serif); font-size: .85em; font-weight: 600;
  box-shadow: 0 6px 16px rgba(47, 93, 64, .22);
  transition: background .15s ease, transform .15s ease;
}
#header.wfh .wfh-cta:hover { background: #26492f; transform: translateY(-1px); }
/* Mittlere Breiten: CTA ausblenden (Kontakt bleibt über das Menü erreichbar) und
   Menüabstände verringern, damit die Navigation einzeilig bleibt */
@media (max-width: 1280px) { #header.wfh .wfh-cta { display: none; } }
@media (max-width: 1100px) {
  #header.wfh .wfh-nav { margin: 0 .5rem; }
  #header.wfh .wfh-nav > ul.level_1 > li > a,
  #header.wfh .wfh-nav > ul.level_1 > li > strong { padding: .5em .7em; font-size: .88em; }
  #header.wfh .cartbtn { margin-left: .6rem; }
}

#header .cartbtn__badge {
  position: absolute;
  top: -.15em;
  right: -.45em;
  min-width: 1.35em;
  height: 1.35em;
  padding: 0 .3em;
  border-radius: 999px;
  background: #2f5d40;
  color: #fff;
  font-size: .68em;
  font-weight: 700;
  line-height: 1.35em;
  text-align: center;
}

@media (max-width: 767px) {
  #header #logo img { width: 150px; }
  #header.wfh .cartbtn { margin-left: auto; margin-right: .2rem; }
}

/* ── Mobiles Menü ─────────────────────────────────────── */
.wfm-trigger {
  display: none; position: relative; flex: none; width: 46px; height: 46px; margin-left: .4rem;
  border: 1px solid #e4ddcb; border-radius: 50%; background: rgba(255, 255, 255, .9); cursor: pointer; padding: 0;
}
.wfm-trigger span {
  position: absolute; left: 13px; right: 13px; height: 1.8px; border-radius: 2px; background: #2b2b28;
  transition: transform .25s ease, opacity .2s ease, top .25s ease;
}
.wfm-trigger span:nth-child(1) { top: 16px; }
.wfm-trigger span:nth-child(2) { top: 22px; }
.wfm-trigger span:nth-child(3) { top: 28px; }
@media (max-width: 767px) { .wfm-trigger { display: block; } }

.wfm {
  --green: #2f5d40; --ink: #2b2b28; --muted: #6f6a5e; --line: #e6e0d2; --cream: #f8f5ef;
  position: fixed; inset: 0; z-index: 10500; display: flex; flex-direction: column;
  background: radial-gradient(circle at 100% 0%, #efe9dc 0%, var(--cream) 55%);
  color: var(--ink); overscroll-behavior: contain;
}
.wfm-enter-active, .wfm-leave-active { transition: opacity .28s ease, transform .32s cubic-bezier(.2, .7, .2, 1); }
.wfm-enter-from, .wfm-leave-to { opacity: 0; transform: translateY(-12px); }

.wfm__top {
  display: flex; align-items: center; justify-content: space-between; flex: none;
  padding: 1rem 16px .9rem; border-bottom: 1px solid var(--line);
}
.wfm__logo { display: flex; flex-direction: column; text-decoration: none; color: var(--ink); }
.wfm__logo img { width: 138px; height: auto; display: block; }
.wfm__logo span { font-family: var(--font-family-02, Gelasio, Georgia, serif); font-size: .82rem; margin-top: .15rem; }
.wfm__close {
  width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--line); background: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; color: var(--ink);
}
.wfm__close svg, .wfm__toggle svg, .wfm__sublink svg, .wfm__cta svg, .wfm__contact svg {
  fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}
.wfm__close svg { width: 20px; height: 20px; }

.wfm__body { flex: 1; min-height: 0; overflow-y: auto; padding: .6rem 16px 1.6rem; -webkit-overflow-scrolling: touch; }
.wfm__item { border-bottom: 1px solid var(--line); animation: wfm-in .45s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--i) * 45ms + 60ms); }
@keyframes wfm-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.wfm__row { display: flex; align-items: center; gap: .5rem; }
.wfm .wfm__link {
  flex: 1; display: flex; align-items: baseline; gap: .8rem; padding: 1.05rem 0;
  font-family: var(--font-family-02, Gelasio, Georgia, serif); font-size: 1.6rem; line-height: 1.15;
  color: var(--ink); text-decoration: none; border: 0;
}
.wfm__no { font-family: inherit; font-size: .72rem; letter-spacing: .12em; color: #a59e8d; min-width: 1.6rem; }
.wfm__item.is-active .wfm__link { color: var(--green); }
.wfm__item.is-active .wfm__no { color: var(--green); }
.wfm__toggle {
  flex: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; color: var(--ink);
  transition: background .2s, color .2s, border-color .2s;
}
.wfm__toggle svg { width: 18px; height: 18px; transition: transform .25s ease; }
.wfm__item.is-expanded .wfm__toggle { background: var(--green); border-color: var(--green); color: #fff; }
.wfm__item.is-expanded .wfm__toggle svg { transform: rotate(180deg); }
/* Akkordeon über grid-template-rows (animiert auf auto-Höhe) */
.wfm__sub { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s ease; }
.wfm__item.is-expanded .wfm__sub { grid-template-rows: 1fr; }
.wfm__subinner { overflow: hidden; display: flex; flex-direction: column; padding-left: 2.4rem; }
.wfm__item.is-expanded .wfm__subinner { padding-bottom: .8rem; }
.wfm .wfm__sublink {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .62rem .2rem; font-size: 1rem; font-weight: 600; color: var(--muted); text-decoration: none; border: 0;
}
.wfm__sublink svg { width: 16px; height: 16px; opacity: .45; }
.wfm .wfm__sublink.is-current { color: var(--green); }
.wfm .wfm__sublink.is-current svg { opacity: 1; }

.wfm .wfm__cta {
  display: flex; align-items: center; justify-content: center; gap: .6rem; margin: 1.6rem 0 1rem;
  padding: 1rem 1.2rem; border-radius: 999px; background: var(--green); color: #fff;
  font-weight: 700; font-size: 1rem; text-decoration: none; border: 0;
  box-shadow: 0 10px 24px rgba(47, 93, 64, .25);
}
.wfm__cta svg { width: 18px; height: 18px; }
.wfm__contact { display: grid; gap: .5rem; }
.wfm .wfm__contact a {
  display: flex; align-items: center; gap: .7rem; padding: .8rem 1rem; border-radius: 14px;
  background: #fff; border: 1px solid var(--line); color: var(--ink); font-weight: 600; font-size: .95rem; text-decoration: none;
}
.wfm__contact svg { width: 18px; height: 18px; color: var(--green); flex: none; }

.wfm__foot {
  flex: none; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .9rem 16px calc(.9rem + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: rgba(255, 255, 255, .6);
}
.wfm__lang { display: inline-flex; padding: 3px; border-radius: 999px; border: 1px solid var(--line); background: #fff; }
.wfm__lang a, .wfm__lang span {
  min-width: 42px; padding: .4rem .7rem; border-radius: 999px; text-align: center;
  font-size: .82rem; font-weight: 700; letter-spacing: .06em; color: var(--muted); text-decoration: none; border: 0;
}
.wfm__lang .is-active { background: var(--green); color: #fff; }
.wfm__legal { display: flex; gap: 1rem; }
.wfm .wfm__legal a { font-size: .82rem; color: var(--muted); text-decoration: none; border: 0; }
</style>
