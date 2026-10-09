<script setup lang="ts">
const { user, checked, fetchSession, logout } = useAdminAuth()
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

// PWA: Service Worker nur in Produktion registrieren (im Dev stört er nur)
if (import.meta.client && !import.meta.dev && 'serviceWorker' in navigator) {
  onMounted(() => {
    navigator.serviceWorker.register('/wf-admin-sw.js').catch(() => {})
  })
}

// Install-Prompt (Chrome/Edge; iOS hat keins → dort manuell über "Zum Home-Bildschirm")
const installEvt = ref<any>(null)
const canInstall = computed(() => !!installEvt.value)
if (import.meta.client) {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault()
    installEvt.value = e
  })
  window.addEventListener('appinstalled', () => { installEvt.value = null })
}
async function installApp() {
  if (!installEvt.value) return
  installEvt.value.prompt()
  await installEvt.value.userChoice
  installEvt.value = null
}

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

const NAV = [
  { to: '/admin/dashboard', label: 'Übersicht', icon: 'home', exact: true },
  { to: '/admin/anfragen', label: 'Anfragen', icon: 'inbox', exact: false },
  { to: '/admin/mietanfragen', label: 'Mietanfragen', icon: 'bag', exact: false },
  { to: '/admin/newsletter', label: 'Newsletter', icon: 'mail', exact: false },
  { to: '/admin/artikel', label: 'Blog-Artikel', icon: 'edit', exact: false },
  { to: '/admin/projekte', label: 'Projekte', icon: 'folder', exact: false },
  { to: '/admin/kalender', label: 'Kalender', icon: 'calendar', exact: false },
  { to: '/admin/angebote', label: 'Angebote', icon: 'file', exact: false },
  { to: '/admin/rechnungen', label: 'Rechnungen', icon: 'receipt', exact: false },
  { to: '/admin/kontakte', label: 'Kontakte', icon: 'contacts', exact: false },
  { to: '/admin/inventar', label: 'Inventar', icon: 'box', exact: false },
  { to: '/admin/users', label: 'Benutzer', icon: 'users', exact: false, super: true },
  { to: '/admin/profil', label: 'Mein Profil', icon: 'settings', exact: false }
]

const navItems = computed(() => NAV.filter(n => !n.super || user.value?.role === 'superadmin'))

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

function loadBadges() {
  loadInquiryCount()
  loadRentalInquiryCount()
}

watch(user, (u) => { if (u) loadBadges() }, { immediate: true })
watch(() => route.path, (p, prev) => {
  if ((prev === '/admin/anfragen' || prev === '/admin/mietanfragen') && p !== prev) loadBadges()
})

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
  <div class="wf-admin admin-shell">
    <aside class="admin-shell__side">
      <NuxtLink to="/admin/dashboard" class="admin-shell__brand">
        <svg class="admin-shell__leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Zm0 0c3-6 7-9 11-11" />
        </svg>
        <span class="admin-shell__wordmark">Wohnfee</span>
      </NuxtLink>

      <nav class="admin-shell__nav">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
                  class="admin-shell__navlink" :class="{ 'is-active': isActive(item) }">
          <WfIcon :name="item.icon" :size="17" />
          <span class="admin-shell__navlabel">{{ item.label }}</span>
          <span v-if="item.to === '/admin/anfragen' && newInquiries > 0" class="admin-shell__badge">
            {{ newInquiries > 99 ? '99+' : newInquiries }}
          </span>
          <span v-if="item.to === '/admin/mietanfragen' && newRentalInquiries > 0" class="admin-shell__badge">
            {{ newRentalInquiries > 99 ? '99+' : newRentalInquiries }}
          </span>
        </NuxtLink>
      </nav>

      <div class="admin-shell__sideuser">
        <span class="admin-shell__avatar">{{ initials }}</span>
        <span class="admin-shell__sideuserinfo">
          <strong>{{ user?.displayName || user?.username }}</strong>
          <small>{{ user?.role === 'superadmin' ? 'Superadmin' : user?.role === 'admin' ? 'Admin' : 'Benutzer' }}</small>
        </span>
        <button class="admin-shell__iconbtn" title="Abmelden" @click="doLogout">
          <WfIcon name="logout" :size="17" />
        </button>
      </div>
    </aside>

    <div class="admin-shell__main">
      <header class="admin-shell__top">
        <form class="admin-shell__search" role="search" @submit.prevent="submitSearch">
          <WfIcon name="search" :size="16" />
          <input v-model="globalSearch" type="search" placeholder="Kunden, Adressen oder Stichwörter suchen …" aria-label="Suchen">
        </form>
        <div class="admin-shell__topright">
          <button v-if="canInstall" class="wf-btn wf-btn--sm" @click="installApp">
            <WfIcon name="download" :size="14" /> App installieren
          </button>
          <NuxtLink to="/admin/anfragen" class="admin-shell__iconbtn admin-shell__bell" title="Anfragen">
            <WfIcon name="bell" :size="19" />
            <span v-if="newInquiries > 0" class="admin-shell__bellbadge">{{ newInquiries > 9 ? '9+' : newInquiries }}</span>
          </NuxtLink>
          <span class="admin-shell__userchip">
            {{ user?.displayName || user?.username }}
            <em>{{ user?.role === 'superadmin' ? 'SUPERADMIN' : (user?.role || '').toUpperCase() }}</em>
          </span>
        </div>
      </header>

      <main class="admin-shell__content">
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

.admin-shell__loading { color: var(--wf-muted); }

@media (max-width: 860px) {
  .admin-shell__side { width: 4.6em; padding: 1.2em .5em .9em; }
  .admin-shell__brand { justify-content: center; padding: .2em 0 1em; }
  .admin-shell__wordmark, .admin-shell__navlabel, .admin-shell__sideuserinfo { display: none; }
  .admin-shell__navlink { justify-content: center; padding: .7em .4em; }
  .admin-shell__badge { position: absolute; transform: translate(10px, -8px); }
  .admin-shell__navlink { position: relative; }
  .admin-shell__sideuser { justify-content: center; }
  .admin-shell__iconbtn[title="Abmelden"] { display: inline-flex; }
  .admin-shell__content { padding: 1.2em 1em 2.5em; }
  .admin-shell__top { padding: .7em 1em; }
  .admin-shell__userchip { display: none; }
}

@media (max-width: 520px) {
  .admin-shell__search { max-width: none; }
  .admin-shell__top .wf-btn { display: none; }
}
</style>
