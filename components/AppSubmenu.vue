<script setup lang="ts">
import { HS_AUDIENCE_ROUTES } from '~~/shared/home-staging-audiences'
// Section submenu bar (#submenu), mirrors the Contao navigation module:
// rendered for pages that are a nav item with children or a child of such an item.
const { nav, pages, routes } = useSiteData()
const route = useRoute()

const isEn = computed(() => route.path.startsWith('/en/'))
// Vergleichspfad ohne EN-Präfix (Nav-Einträge sind DE-Routen)
const dePath = computed(() =>
  isEn.value ? route.path.slice(3) : route.path)

// Interne Ziel-URL im EN-Modus aufs EN-Gegenstück umschreiben (falls vorhanden)
const linkFor = (r?: string) => {
  if (!r) return r
  if (!isEn.value) return r
  const key = r.endsWith('.html') ? r : r + '.html'
  return (routes as Record<string, any>)['/en' + key] ? '/en' + key : r
}

const EN_TITLES: Record<string, string> = {
  '/fuer-bautraeger-2.html': 'For Property Developers',
  '/fuer-makler.html': 'For Estate Agents',
  '/fuer-privatpersonen-2.html': 'For Private Individuals',
  '/home-staging/preise.html': 'Prices',
  '/faq.html': 'FAQ',
  '/aktuelles.html': 'Current',
  '/projekte.html': 'Projects',
  '/trends-tipps.html': 'Trends & Tips',
  '/events.html': 'Events',
  '/team.html': 'Team',
  '/presse.html': 'Press',
  '/kontakt.html': 'Contact',
  '/impressum.html': 'Legal Notice'
}
const titleFor = (item: any) =>
  isEn.value ? (EN_TITLES[item.route] || item.title) : item.title

const classByRoute = computed(() => {
  const m: Record<string, string> = {}
  for (const p of Object.values(pages as Record<string, any>)) {
    if (p.route && p.cssClass) m[p.route] = p.cssClass
  }
  return m
})
const pageClass = (r?: string) => (r ? classByRoute.value[r] || '' : '')

const section = computed(() => {
  for (const item of (nav as any).main) {
    if (item.route === dePath.value) return { item, child: false }
    if (item.children?.some((c: any) => c.route === dePath.value)) return { item, child: true }
  }
  return null
})

// the parent page of the current section shows its items without states (live behaviour)
const plain = computed(() => section.value && !section.value.child && section.value.item.route === '/home-staging.html')

// Home-Staging-Übersicht, Preise, FAQ, Blog-Übersichten, Team, Presse, Kontakt, Impressum und Zielgruppen-Seiten: Hero-Karten bzw. Header-Dropdown
// ersetzen das Untermenü
const hidden = computed(() =>
  dePath.value === '/home-staging.html' || dePath.value === '/home-staging/preise.html'
  || dePath.value === '/faq.html' || dePath.value === '/team.html'
  || ['/aktuelles.html', '/projekte.html', '/trends-tipps.html', '/events.html'].includes(dePath.value)
  || dePath.value.startsWith('/projekte/category/')
  || dePath.value === '/kontakt.html' || dePath.value === '/impressum.html' || dePath.value === '/datenschutz.html' || dePath.value === '/presse.html' || dePath.value.startsWith('/presse/category/')
  || HS_AUDIENCE_ROUTES.includes(dePath.value))

const liClass = (r: string) => plain.value ? '' : [
  r === dePath.value ? 'active' : 'sibling',
  pageClass(r)
].filter(Boolean).join(' ')
</script>

<template>
  <div v-if="section && !hidden" id="submenu">
    <div class="inside">
      <nav class="mod_navigation block">
        <a :href="`${route.path}#skipNavigation2`" class="invisible">Navigation überspringen</a>
        <ul class="level_1">
          <li v-for="child in section.item.children" :key="child.route" :class="liClass(child.route)">
            <strong v-if="child.route === dePath && !plain" :class="liClass(child.route)">{{ titleFor(child) }}</strong>
            <NuxtLink v-else :to="linkFor(child.route)" :title="titleFor(child)" :class="liClass(child.route)">{{ titleFor(child) }}</NuxtLink>
          </li>
        </ul>
        <span id="skipNavigation2" class="invisible"></span>
      </nav>
    </div>
  </div>
</template>
