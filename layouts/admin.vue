<script setup lang="ts">
import type { Area } from '~~/shared/permissions'
import { areaForPath, receivesInquiryPush } from '~~/shared/permissions'

const { user, checked, fetchSession, logout } = useAdminAuth()
const perms = usePermissions()
const route = useRoute()
const router = useRouter()

// PWA: Manifest + Icons (nur Admin-Bereich, öffentliche Seite unberührt)
useHead({
  link: [
    { rel: 'manifest', href: '/wf-admin-manifest.webmanifest' },
    { rel: 'apple-touch-icon', href: '/wf-admin-apple-touch.png' }
  ],
  meta: [
    { name: 'theme-color', content: '#2f5d40' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'WOHNFEE' }
  ]
})

// PWA: Service Worker registrieren – im Dev mit ?dev=1 (dann nur Push, kein Caching)
if (import.meta.client && 'serviceWorker' in navigator) {
  onMounted(() => {
    navigator.serviceWorker.register(import.meta.dev ? '/wf-admin-sw.js?dev=1' : '/wf-admin-sw.js', { scope: '/' }).catch(() => {})
  })
}

// Push-Benachrichtigungen (neue Anfragen) – Hinweis in der Topbar, solange nicht aktiv
const push = usePush()
const pushDismissed = ref(false)
onMounted(() => {
  push.refresh()
  try { pushDismissed.value = localStorage.getItem('wf_push_dismissed') === '1' } catch { /* privat */ }
})
const showPushPrompt = computed(() =>
  push.supported.value && !push.subscribed.value && push.permission.value !== 'denied' && !pushDismissed.value
  && receivesInquiryPush(user.value?.role))
async function enablePush() {
  if (await push.enable()) push.test().catch(() => {})
}
function dismissPush() {
  pushDismissed.value = true
  try { localStorage.setItem('wf_push_dismissed', '1') } catch { /* privat */ }
}

// Install-Prompt (Chrome/Edge; iOS hat keins → Anleitung unter Profil → App & Benachrichtigungen)
const installer = useInstallApp()
const canInstall = installer.canPrompt
const installApp = () => installer.install()

onMounted(async () => {
  const sessionUser = await fetchSession()
  if (!sessionUser) {
    await router.replace('/admin')
  }
})

async function doLogout() {
  await logout()
  await router.push('/admin')
}

// Navigation nach Arbeitsbereichen gruppiert (Eingang → Planung → Kunden & Finanzen → Website)
interface NavItem { to: string; label: string; icon: string; exact: boolean; area?: Area; badge?: 'inquiries' | 'rental' | 'overdue' }
const NAV_GROUPS: Array<{ label: string | null; items: NavItem[] }> = [
  { label: null, items: [
    { to: '/admin/dashboard', label: 'Übersicht', icon: 'home', exact: true, area: 'dashboard' }
  ] },
  { label: 'Eingang', items: [
    { to: '/admin/anfragen', label: 'Kontaktanfragen', icon: 'inbox', exact: false, area: 'anfragen', badge: 'inquiries' },
    { to: '/admin/mietanfragen', label: 'Mietanfragen', icon: 'bag', exact: false, area: 'mietanfragen', badge: 'rental' }
  ] },
  { label: 'Planung', items: [
    { to: '/admin/projekte', label: 'Projekte', icon: 'folder', exact: false, area: 'projekte' },
    { to: '/admin/touren', label: 'Touren & Rückgaben', icon: 'truck', exact: false, area: 'touren', badge: 'overdue' },
    { to: '/admin/kalender', label: 'Kalender', icon: 'calendar', exact: false, area: 'kalender' },
    { to: '/admin/inventar', label: 'Inventar', icon: 'box', exact: false, area: 'inventar' },
    { to: '/admin/pakete', label: 'Mietpakete', icon: 'bag', exact: false, area: 'inventar' },
    { to: '/admin/fotos', label: 'Foto-Modus', icon: 'camera', exact: false, area: 'inventar' }
  ] },
  { label: 'Kunden & Finanzen', items: [
    { to: '/admin/kontakte', label: 'Kontakte', icon: 'contacts', exact: false, area: 'kontakte' },
    { to: '/admin/angebote', label: 'Angebote', icon: 'file', exact: false, area: 'angebote' },
    { to: '/admin/rechnungen', label: 'Rechnungen', icon: 'receipt', exact: false, area: 'rechnungen' }
  ] },
  { label: 'Website', items: [
    { to: '/admin/immobilien', label: 'Immobilien', icon: 'pin', exact: false, area: 'immobilien' },
    { to: '/admin/artikel', label: 'Beiträge', icon: 'edit', exact: false, area: 'artikel' },
    { to: '/admin/inhalte', label: 'Website-Inhalte', icon: 'diamond', exact: false, area: 'partner' },
    { to: '/admin/newsletter', label: 'Newsletter', icon: 'mail', exact: false, area: 'newsletter' }
  ] },
  { label: 'Verwaltung', items: [
    { to: '/admin/konditionen', label: 'Konditionen', icon: 'euro', exact: false, area: 'konditionen' },
    { to: '/admin/users', label: 'Benutzer', icon: 'users', exact: false, area: 'users' },
    { to: '/admin/profil', label: 'Mein Profil', icon: 'settings', exact: false }
  ] }
]

const navGroups = computed(() => NAV_GROUPS
  .map(g => ({ ...g, items: g.items.filter(n => !n.area || perms.can(n.area)) }))
  .filter(g => g.items.length))

function badgeCount(item: NavItem) {
  if (item.badge === 'inquiries') return newInquiries.value
  if (item.badge === 'rental') return newRentalInquiries.value
  if (item.badge === 'overdue') return overdueReturns.value
  return 0
}

// Badge: Anzahl neuer Kontaktanfragen
const newInquiries = ref(0)
async function loadInquiryCount() {
  if (!user.value) return
  try {
    const res = await $fetch<{ count: number }>('/api/admin/inquiries/count')
    newInquiries.value = res.count
  } catch { /* Badge optional — Fehler ignorieren */ }
}

// Badge: Anzahl neuer Mietanfragen
const newRentalInquiries = ref(0)
async function loadRentalInquiryCount() {
  if (!user.value) return
  try {
    const res = await $fetch<{ count: number }>('/api/admin/rental-inquiries/count')
    newRentalInquiries.value = res.count
  } catch { /* Badge optional — Fehler ignorieren */ }
}

// Badge: Projekte, deren Leihmöbel überfällig beim Kunden sind
const overdueReturns = ref(0)
async function loadOverdueCount() {
  if (!user.value) return
  try {
    const res = await $fetch<{ overdue: any[] }>('/api/admin/logistics')
    overdueReturns.value = new Set(res.overdue.map((o: any) => o.projectId)).size
  } catch { /* optional */ }
}

async function loadBadges() {
  await Promise.all([loadInquiryCount(), loadRentalInquiryCount(), loadOverdueCount()])
  // Zähler am App-Symbol der installierten PWA
  try {
    const n = newInquiries.value + newRentalInquiries.value
    const nav: any = navigator
    if (n > 0) await nav.setAppBadge?.(n)
    else await nav.clearAppBadge?.()
  } catch { /* nicht unterstützt */ }
}

watch(user, (u) => { if (u) loadBadges() }, { immediate: true })
// Zähler aktuell halten: jede Minute und beim Zurückkehren in den Tab
let badgeTimer: ReturnType<typeof setInterval> | null = null
const onVisible = () => { if (document.visibilityState === 'visible') loadBadges() }
onMounted(() => {
  badgeTimer = setInterval(loadBadges, 60_000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  if (badgeTimer) clearInterval(badgeTimer)
  document.removeEventListener('visibilitychange', onVisible)
})
// Handy: Menü als ausklappbare Leiste (Hamburger in der Kopfzeile)
const navOpen = ref(false)
watch(() => route.fullPath, () => { navOpen.value = false })
watch(navOpen, (v) => { if (import.meta.client) document.documentElement.classList.toggle('wf-nav-open', v) })

watch(() => route.path, (p, prev) => {
  if ((prev === '/admin/anfragen' || prev === '/admin/mietanfragen') && p !== prev) loadBadges()
})

// Seiten ohne Berechtigung (z. B. per Link aufgerufen) → zurück zur Übersicht
const deniedNotice = ref('')
watch([() => route.path, user], () => {
  if (!user.value) return
  const area = areaForPath(route.path)
  if (area && !perms.can(area)) {
    deniedNotice.value = `Als ${perms.roleName.value} hast du auf diesen Bereich keinen Zugriff.`
    router.replace('/admin/dashboard')
    setTimeout(() => { deniedNotice.value = '' }, 6000)
  }
}, { immediate: true })

const isActive = (item: { to: string; exact: boolean }) =>
  item.exact ? route.path === item.to : route.path.startsWith(item.to)

// Globale Suche → Kontakte mit Suchbegriff
const globalSearch = ref('')
function submitSearch() {
  const q = globalSearch.value.trim()
  if (q) router.push({ path: '/admin/kontakte', query: { q } })
}

const initials = computed(() => {
  const n = user.value?.displayName || user.value?.username || ''
  return n.split(/\s+/).map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
})
</script>

<template>
  <div class="wf-admin admin-shell" :class="{ 'is-navopen': navOpen }">
    <div class="admin-shell__scrim" aria-hidden="true" @click="navOpen = false" />
    <aside class="admin-shell__side" :aria-hidden="undefined">
      <NuxtLink to="/admin/dashboard" class="admin-shell__brand">
        <svg class="admin-shell__leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Zm0 0c3-6 7-9 11-11" />
        </svg>
        <span class="admin-shell__wordmark">Wohnfee</span>
      </NuxtLink>
      <button type="button" class="admin-shell__navclose" aria-label="Menü schließen" @click="navOpen = false">×</button>

      <nav class="admin-shell__nav">
        <div v-for="(g, gi) in navGroups" :key="g.label || gi" class="admin-shell__group">
          <p v-if="g.label" class="admin-shell__grouplabel">{{ g.label }}</p>
          <NuxtLink v-for="item in g.items" :key="item.to" :to="item.to"
                    class="admin-shell__navlink" :class="{ 'is-active': isActive(item) }" :title="item.label">
            <WfIcon :name="item.icon" :size="17" />
            <span class="admin-shell__navlabel">{{ item.label }}</span>
            <span v-if="badgeCount(item) > 0" class="admin-shell__badge">
              {{ badgeCount(item) > 99 ? '99+' : badgeCount(item) }}
            </span>
          </NuxtLink>
        </div>
      </nav>

      <div class="admin-shell__sideuser">
        <span class="admin-shell__avatar">{{ initials }}</span>
        <span class="admin-shell__sideuserinfo">
          <strong>{{ user?.displayName || user?.username }}</strong>
          <small>{{ perms.roleName.value }}</small>
        </span>
        <button class="admin-shell__iconbtn" title="Abmelden" @click="doLogout">
          <WfIcon name="logout" :size="17" />
        </button>
      </div>
    </aside>

    <div class="admin-shell__main">
      <header class="admin-shell__top">
        <button type="button" class="admin-shell__burger" aria-label="Menü öffnen" :aria-expanded="navOpen" @click="navOpen = true">
          <WfIcon name="menu" :size="20" />
          <span v-if="newInquiries + newRentalInquiries > 0" class="admin-shell__burgerdot" />
        </button>
        <form class="admin-shell__search" role="search" @submit.prevent="submitSearch">
          <WfIcon name="search" :size="16" />
          <input v-model="globalSearch" type="search" placeholder="Kunden, Adressen oder Stichwörter suchen …" aria-label="Suchen">
        </form>
        <div class="admin-shell__topright">
          <button v-if="canInstall" class="wf-btn wf-btn--sm" @click="installApp">
            <WfIcon name="download" :size="14" /> App installieren
          </button>
          <span v-if="showPushPrompt" class="admin-shell__pushprompt">
            <button type="button" class="wf-btn wf-btn--sm wf-btn--primary" :disabled="push.busy.value" @click="enablePush">
              <WfIcon name="bell" :size="14" /> Benachrichtigungen aktivieren
            </button>
            <button type="button" class="admin-shell__pushx" title="Später" @click="dismissPush">×</button>
          </span>
          <NuxtLink :to="newInquiries > 0 || !newRentalInquiries ? '/admin/anfragen' : '/admin/mietanfragen'"
                    class="admin-shell__iconbtn admin-shell__bell"
                    :title="`${newInquiries} neue Kontaktanfrage(n), ${newRentalInquiries} neue Mietanfrage(n)`">
            <WfIcon name="bell" :size="19" />
            <span v-if="newInquiries + newRentalInquiries > 0" class="admin-shell__bellbadge">{{ newInquiries + newRentalInquiries > 9 ? '9+' : newInquiries + newRentalInquiries }}</span>
          </NuxtLink>
          <span class="admin-shell__userchip">
            {{ user?.displayName || user?.username }}
            <em>{{ perms.roleName.value.toUpperCase() }}</em>
          </span>
        </div>
      </header>

      <main class="admin-shell__content">
        <p v-if="deniedNotice" class="admin-shell__denied" @click="deniedNotice = ''">{{ deniedNotice }}</p>
        <p v-if="!checked" class="admin-shell__loading">Sitzung wird geprüft …</p>
        <slot v-else-if="user" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ---------- Sidebar ---------- */
.admin-shell__side {
  width: 15em;
  flex-shrink: 0;
  background: #fdfbf6;
  border-right: 1px solid var(--wf-line);
  display: flex;
  flex-direction: column;
  padding: 1.3em .9em 1em;
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
}

.admin-shell__brand {
  display: flex;
  align-items: center;
  gap: .5em;
  text-decoration: none;
  color: var(--wf-ink);
  padding: .2em .5em 1.1em;
  border-bottom: 1px solid var(--wf-line);
  margin-bottom: 1em;
}
.admin-shell__leaf { width: 26px; height: 26px; color: var(--wf-green); flex-shrink: 0; }
.admin-shell__wordmark {
  font-family: var(--wf-serif);
  font-size: 1.45em;
  letter-spacing: .01em;
}

.admin-shell__nav {
  display: flex;
  flex-direction: column;
  gap: .15em;
  flex: 1;
  overflow-y: auto;
}

.admin-shell__group { display: flex; flex-direction: column; gap: .15em; }
.admin-shell__group + .admin-shell__group { margin-top: .9em; }
.admin-shell__grouplabel {
  margin: 0 0 .25em; padding: 0 .9em;
  font-size: .66em; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #a39c89;
}

.admin-shell__navlink {
  display: flex;
  align-items: center;
  gap: .7em;
  color: #6e6858;
  text-decoration: none;
  padding: .6em .8em;
  font-size: .92em;
  border-radius: 10px;
  transition: background .15s, color .15s;
}
.admin-shell__navlink:hover { background: #f3eee2; color: var(--wf-ink); }
.admin-shell__navlink.is-active {
  background: var(--wf-green-soft);
  color: var(--wf-green);
  font-weight: 600;
}
.admin-shell__navlabel { flex: 1; }

.admin-shell__badge {
  background: var(--wf-green);
  color: #fff;
  font-size: .7em;
  font-weight: 700;
  border-radius: 999px;
  padding: .1em .5em;
}

.admin-shell__sideuser {
  display: flex;
  align-items: center;
  gap: .6em;
  border-top: 1px solid var(--wf-line);
  padding-top: .9em;
  margin-top: .9em;
}
.admin-shell__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--wf-green);
  color: #fff;
  font-size: .8em;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.admin-shell__sideuserinfo { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; flex: 1; }
.admin-shell__sideuserinfo strong { font-size: .85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-shell__sideuserinfo small { color: var(--wf-muted); font-size: .72em; }

.admin-shell__iconbtn {
  border: 0;
  background: none;
  color: #6e6858;
  cursor: pointer;
  padding: .4em;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  text-decoration: none;
}
.admin-shell__iconbtn:hover { background: #f3eee2; color: var(--wf-green); }

/* ---------- Topbar ---------- */
.admin-shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-shell__top {
  display: flex;
  align-items: center;
  gap: 1em;
  padding: .85em 1.8em;
  background: rgba(250, 246, 239, .92);
  backdrop-filter: blur(6px);
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid var(--wf-line);
}

.admin-shell__search {
  flex: 1;
  max-width: 30em;
  display: flex;
  align-items: center;
  gap: .5em;
  background: #fff;
  border: 1px solid var(--wf-line);
  border-radius: 999px;
  padding: .45em 1em;
  color: var(--wf-muted);
}
.admin-shell__search:focus-within { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .1); }
.admin-shell__search input {
  border: 0;
  outline: 0;
  background: none;
  font-family: inherit;
  font-size: .9em;
  color: var(--wf-ink);
  width: 100%;
}
.admin-shell__search input::-webkit-search-cancel-button { -webkit-appearance: none; }

.admin-shell__topright { display: flex; align-items: center; gap: .8em; margin-left: auto; }

.admin-shell__pushprompt { display: inline-flex; align-items: center; gap: .2em; }
.admin-shell__pushx { border: 0; background: none; color: var(--wf-muted); font-size: 1.2em; cursor: pointer; padding: 0 .3em; line-height: 1; }
.admin-shell__pushx:hover { color: var(--wf-ink); }
@media (max-width: 520px) { .admin-shell__pushprompt .wf-btn { font-size: .78em; } }

.admin-shell__bellbadge {
  position: absolute;
  top: 0;
  right: -2px;
  background: var(--wf-red);
  color: #fff;
  font-size: .62em;
  font-weight: 700;
  border-radius: 999px;
  padding: .1em .38em;
  border: 2px solid var(--wf-bg);
}

.admin-shell__userchip {
  display: flex;
  align-items: center;
  gap: .55em;
  font-size: .88em;
  color: var(--wf-ink);
}
.admin-shell__userchip em {
  font-style: normal;
  font-size: .68em;
  font-weight: 700;
  letter-spacing: .06em;
  background: var(--wf-green-soft);
  color: var(--wf-green);
  border-radius: 6px;
  padding: .25em .5em;
}

/* ---------- Content ---------- */
.admin-shell__content {
  flex: 1;
  padding: 1.8em 1.8em 3em;
  max-width: 84em;
  width: 100%;
  box-sizing: border-box;
  margin: 0 auto;
}

.admin-shell__denied { margin: 0 0 1em; padding: .7em 1em; border-radius: 10px; background: var(--wf-amber-soft); color: var(--wf-amber); font-size: .9em; cursor: pointer; }
.admin-shell__loading { color: var(--wf-muted); }

@media (max-width: 860px) {
  .admin-shell__side { width: 4.6em; padding: 1.2em .5em .9em; }
  .admin-shell__brand { justify-content: center; padding: .2em 0 1em; }
  .admin-shell__wordmark, .admin-shell__navlabel, .admin-shell__sideuserinfo, .admin-shell__grouplabel { display: none; }
  .admin-shell__group + .admin-shell__group { margin-top: .5em; padding-top: .5em; border-top: 1px solid var(--wf-line); }
  .admin-shell__navlink { justify-content: center; padding: .7em .4em; }
  .admin-shell__badge { position: absolute; transform: translate(10px, -8px); }
  .admin-shell__navlink { position: relative; }
  .admin-shell__sideuser { justify-content: center; }
  .admin-shell__iconbtn[title="Abmelden"] { display: inline-flex; }
  .admin-shell__content { padding: 1.2em 1em 2.5em; }
  .admin-shell__top { padding: .7em 1em; }
  .admin-shell__userchip { display: none; }
}

/* ---------- Handy: Menü als Schublade statt fester Icon-Leiste ---------- */
.admin-shell__burger, .admin-shell__navclose, .admin-shell__scrim { display: none; }
@media (max-width: 640px) {
  .admin-shell__burger {
    display: inline-flex; position: relative; flex: none; align-items: center; justify-content: center;
    width: 2.5em; height: 2.5em; border: 1px solid var(--wf-line); border-radius: 12px; background: #fff; color: var(--wf-ink); cursor: pointer;
  }
  .admin-shell__burgerdot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--wf-red); }
  .admin-shell__side {
    position: fixed; z-index: 60; top: 0; left: 0; bottom: 0; height: auto; width: min(82vw, 18em);
    padding: 1.2em .9em 1em; transform: translateX(-105%); transition: transform .25s ease; box-shadow: none; overflow-y: auto;
  }
  .admin-shell.is-navopen .admin-shell__side { transform: none; box-shadow: 0 0 40px rgba(30, 25, 15, .25); }
  .admin-shell__scrim { display: block; position: fixed; inset: 0; z-index: 55; background: rgba(30, 25, 15, .35); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .admin-shell.is-navopen .admin-shell__scrim { opacity: 1; pointer-events: auto; }
  .admin-shell__navclose { display: block; position: absolute; top: .7em; right: .7em; width: 2em; height: 2em; border: 0; background: none; font-size: 1.6em; line-height: 1; color: var(--wf-muted); cursor: pointer; }
  /* in der Schublade wieder mit Beschriftung */
  .admin-shell__brand { justify-content: flex-start; padding: .2em .3em 1em; }
  .admin-shell__wordmark, .admin-shell__navlabel { display: inline; }
  .admin-shell__grouplabel { display: block; }
  .admin-shell__sideuserinfo { display: flex; }
  .admin-shell__group + .admin-shell__group { border-top: 0; }
  .admin-shell__navlink { justify-content: flex-start; padding: .65em .8em; }
  .admin-shell__badge { position: static; transform: none; margin-left: auto; }
  .admin-shell__sideuser { justify-content: flex-start; }
  .admin-shell__content { padding: 1em .8em 2.5em; }
  .admin-shell__top { padding: .6em .8em; gap: .6em; }
}
:global(html.wf-nav-open) { overflow: hidden; }

@media (max-width: 520px) {
  .admin-shell__search { max-width: none; }
  .admin-shell__top .wf-btn:not(.admin-shell__pushprompt .wf-btn) { display: none; }
}
</style>
