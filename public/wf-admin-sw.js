/* WOHNFEE Dashboard — Service Worker
 *
 * WICHTIG zum Verständnis des Scopes:
 * - Registriert wird dieser SW mit Scope "/" (Datei liegt im Root),
 *   aber die REGISTRIERUNG passiert nur auf Admin-Seiten.
 * - Der fetch-Handler greift NUR bei Anfragen unter /admin/ und bei den
 *   Admin-Assets (/_nuxt/*). Alles andere (öffentliche Website!) wird
 *   1:1 durchgereicht — kein Caching, keine Eingriffe, SEO unberührt.
 */

const CACHE = 'wf-admin-v2'
// Im Dev-Server (?dev=1) nur Push – kein Caching, sonst stören veraltete Chunks
const DEV = new URL(self.location.href).searchParams.get('dev') === '1'

// Nur diese Anfragen verwaltet der SW
const isAdminPage = (url) => url.pathname.startsWith('/admin')
const isAdminAsset = (url) => url.pathname.startsWith('/_nuxt/')

self.addEventListener('install', (event) => {
  if (!DEV) event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/admin/dashboard'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (DEV) return
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  // Öffentliche Website und APIs: komplett ignorieren
  if (!isAdminPage(url) && !isAdminAsset(url)) return

  // Admin-Seiten: Netzwerk bevorzugt, Cache als Offline-Fallback
  if (isAdminPage(url)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(event.request, copy))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          if (cached) return cached
          // Offline + nichts im Cache → App-Shell als Fallback
          return (await caches.match('/admin/dashboard')) || Response.error()
        })
    )
    return
  }

  // Admin-Assets (JS/CSS-Chunks): Cache bevorzugt (offline fähig), im Hintergrund aktualisieren
  if (isAdminAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(event.request, copy))
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
})

// ---------- Push-Benachrichtigungen (neue Kontakt-/Mietanfragen) ----------
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  const title = data.title || 'WOHNFEE Dashboard'
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/wf-admin-icon-192.png',
      badge: '/wf-admin-icon-192.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || '/admin/dashboard' }
    }),
    // App-Symbol-Zähler (unterstützt auf iOS/macOS/Android bei installierter PWA)
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : null
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/admin/dashboard', self.location.origin).href
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = all.find((c) => new URL(c.url).pathname.startsWith('/admin'))
    if (existing) {
      await existing.focus()
      if ('navigate' in existing) return existing.navigate(target)
      return
    }
    return self.clients.openWindow(target)
  })())
})
