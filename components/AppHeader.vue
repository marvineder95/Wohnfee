<script setup lang="ts">
const { nav, pages, pagesEn, news, newsEn, routes } = useSiteData()
const route = useRoute()
const open = ref(false)

// Sprachpaare aus den Seitendaten (Feld „alternate" kennzeichnet die jeweils
// andere Sprachversion einer Seite)
const langPairs = computed(() => {
  const m: Record<string, string> = {}
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
  if (!entry) return 'de'
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

// lock body scroll while the mobile menu is open
watch(open, (v) => {
  if (import.meta.client) {
    document.body.style.overflow = v ? 'hidden' : ''
  }
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
const openCart = () => {
  const fl = currentLang.value === 'en' ? '/en/furniture-leasing.html' : '/furniture-leasing.html'
  if (route.path === fl) {
    // Bereits im Shop: Warenkorb-Overlay direkt öffnen
    window.dispatchEvent(new CustomEvent('wf:open-cart'))
  } else {
    navigateTo(fl + '#warenkorb')
  }
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
  <header id="header">
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
      <nav class="mod_navigation block" :aria-label="currentLang === 'en' ? 'Main navigation' : 'Hauptnavigation'">
        <a href="#skipNavigation1" class="invisible">Navigation überspringen</a>
        <ul class="level_1">
          <li v-for="item in (nav as any).main" :key="item.route" :class="liClass(item, false)">
            <strong v-if="item.route === dePath(route.path)" :class="liClass(item, false)">{{ titleFor(item) }}</strong>
            <NuxtLink v-else :to="linkFor(item.route)" :title="titleFor(item)" :class="liClass(item, false)">{{ titleFor(item) }}</NuxtLink>
          </li>
        </ul>
        <span id="skipNavigation1" class="invisible"></span>
      </nav>
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
      <div class="langswitch" role="navigation" :aria-label="currentLang === 'en' ? 'Choose language' : 'Sprache wählen'">
        <NuxtLink v-if="deTarget" :to="deTarget" hreflang="de" :class="{ 'is-active': currentLang === 'de' }" @click="setLangPref('de')">DE</NuxtLink>
        <span v-else class="is-active is-current" aria-current="true">DE</span>
        <span class="langswitch__sep" aria-hidden="true">|</span>
        <NuxtLink v-if="enTarget" :to="enTarget" hreflang="en" lang="en" :class="{ 'is-active': currentLang === 'en' }" @click="setLangPref('en')">EN</NuxtLink>
        <span v-else class="is-active is-current" aria-current="true" lang="en">EN</span>
      </div>
      <div class="mod_mobile_menu block">
        <div id="mobile-menu-22-trigger" class="mobile_menu_trigger" :class="{ active: open }"
             @click="open = !open">
          <span></span><span></span><span></span><span class="text">{{ currentLang === 'en' ? 'Menu' : 'Menü' }}</span>
        </div>
        <div id="mobile-menu-22" class="mobile_menu position_left" :class="{ active: open }">
          <div class="inner">
            <p class="logo">
              <NuxtLink :to="linkFor('/start.html')" @click="open = false">
                <img src="/files/wohnfee/layout/img/wohnfee_logo_neu.png" alt="WOHNFEE Home Staging">
              </NuxtLink><br><span class="subtag">since 2011</span>
            </p>
            <nav class="mod_navigation block">
              <a href="#skipNavigation23" class="invisible">Navigation überspringen</a>
              <ul class="level_1">
                <li v-for="item in (nav as any).main" :key="item.route" :class="liClass(item)">
                  <NuxtLink :to="linkFor(item.route)" :title="titleFor(item)" :class="liClass(item)"
                            :aria-haspopup="item.children?.length ? 'true' : undefined"
                            @click="open = false">{{ titleFor(item) }}</NuxtLink>
                  <ul v-if="item.children?.length" class="level_2">
                    <li v-for="child in item.children" :key="child.route" :class="pageClass(child.route)">
                      <NuxtLink :to="linkFor(child.route)" :title="titleFor(child)" :class="pageClass(child.route)"
                                @click="open = false">{{ titleFor(child) }}</NuxtLink>
                    </li>
                  </ul>
                </li>
              </ul>
              <span id="skipNavigation23" class="invisible"></span>
            </nav>
            <div class="langswitch langswitch--mobile" role="navigation" :aria-label="currentLang === 'en' ? 'Choose language' : 'Sprache wählen'">
              <NuxtLink v-if="deTarget" :to="deTarget" hreflang="de" :class="{ 'is-active': currentLang === 'de' }" @click="setLangPref('de'); open = false">DE</NuxtLink>
              <span v-else class="is-active is-current" aria-current="true">DE</span>
              <span class="langswitch__sep" aria-hidden="true">|</span>
              <NuxtLink v-if="enTarget" :to="enTarget" hreflang="en" lang="en" :class="{ 'is-active': currentLang === 'en' }" @click="setLangPref('en'); open = false">EN</NuxtLink>
              <span v-else class="is-active is-current" aria-current="true" lang="en">EN</span>
            </div>
            <nav class="mod_customnav block">
              <ul class="level_1">
                <li v-for="item in (nav as any).footer" :key="item.route">
                  <NuxtLink :to="linkFor(item.route)" :title="titleFor(item)" @click="open = false">{{ titleFor(item) }}</NuxtLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>
        <div v-if="open" id="mobile-menu-22-overlay" class="mobile_menu_overlay background"
             @click="open = false" />
      </div>
    </div>
  </header>
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

#header .mod_mobile_menu {
  margin: 0;
  align-self: center;
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

/* Variante im mobilen Menü: ohne Pill-Rahmen */
#header .langswitch--mobile {
  margin: 1.4em 0 .6em;
  padding: 0;
  border: 0;
  background: none;
  border-radius: 0;
  font-size: 1em;
}

@media (max-width: 767px) {
  #header .langswitch:not(.langswitch--mobile) { display: none; }
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

/* Nav-Unterstreichung: dünne 1px-Linie in Dunkelgrün, die beim Hover
   langsam von links nach rechts einfährt (scaleX). Der aktive Menüpunkt
   (strong) und Trail-Einträge tragen sie permanent. Überschreibt die
   dicke 0.35em-Border aus navigation.css. Gilt nur für die Desktop-Hauptnav
   (.inside > nav), nicht für das mobile Aufklappmenü. */
#header .inside > nav.mod_navigation > ul.level_1 > li > a,
#header .inside > nav.mod_navigation > ul.level_1 > li > strong {
  position: relative;
  border-bottom: 0;
  /* symmetrisches Padding: Textzeile sitzt exakt auf der gemeinsamen
     Mittelachse von Warenkorb-Icon und Language-Switch */
  padding-top: .42em;
  padding-bottom: .42em;
}
/* der 0.5em-Bottom-Margin aus navigation.css würde die Zeile nach oben
   schieben – alle Header-Elemente teilen sich eine Mittelachse */
#header .inside > nav.mod_navigation > ul.level_1 { margin-bottom: 0; }
#header .inside > nav.mod_navigation > ul.level_1 > li > a::after,
#header .inside > nav.mod_navigation > ul.level_1 > li > strong::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: .12em;
  height: 1px;
  background: #26492f;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform .35s ease;
  pointer-events: none;
}
#header .inside > nav.mod_navigation > ul.level_1 > li:hover > a::after,
#header .inside > nav.mod_navigation > ul.level_1 > li:active > a::after,
#header .inside > nav.mod_navigation > ul.level_1 > li.active > strong::after,
#header .inside > nav.mod_navigation > ul.level_1 > li.trail > a::after {
  transform: scaleX(1);
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
  #header .cartbtn { display: none; }
  #header #logo img { width: 160px; }
}
</style>
