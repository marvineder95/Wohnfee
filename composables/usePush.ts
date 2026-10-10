// Push-Benachrichtigungen fürs Dashboard (pro Gerät/Browser).
// iOS: funktioniert nur, wenn das Dashboard als App zum Home-Bildschirm hinzugefügt wurde.

const SW_URL = () => (import.meta.dev ? '/wf-admin-sw.js?dev=1' : '/wf-admin-sw.js')

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePush() {
  const supported = useState('wf-push-supported', () => false)
  const permission = useState<NotificationPermission | 'unsupported'>('wf-push-permission', () => 'default')
  const subscribed = useState('wf-push-subscribed', () => false)
  const busy = useState('wf-push-busy', () => false)
  const error = useState('wf-push-error', () => '')
  // iPhone/iPad im Browser (nicht als App installiert) → Push nicht möglich
  const iosNeedsInstall = useState('wf-push-ios', () => false)

  async function registration() {
    return navigator.serviceWorker.register(SW_URL(), { scope: '/' })
  }

  async function refresh() {
    if (!import.meta.client) return
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    iosNeedsInstall.value = isIos && !standalone
    supported.value = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported.value) { permission.value = 'unsupported'; return }
    permission.value = Notification.permission
    try {
      const reg = await navigator.serviceWorker.getRegistration('/')
      subscribed.value = !!(reg && await reg.pushManager.getSubscription())
    } catch { subscribed.value = false }
  }

  async function enable() {
    error.value = ''
    busy.value = true
    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') {
        error.value = 'Benachrichtigungen wurden im Browser nicht erlaubt.'
        return false
      }
      const reg = await registration()
      await navigator.serviceWorker.ready
      const { key } = await $fetch<{ key: string }>('/api/admin/push/key')
      const sub = await reg.pushManager.getSubscription()
        || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
      await $fetch('/api/admin/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } })
      subscribed.value = true
      return true
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.message || 'Aktivieren fehlgeschlagen.'
      return false
    } finally {
      busy.value = false
    }
  }

  async function disable() {
    busy.value = true
    try {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = reg && await reg.pushManager.getSubscription()
      if (sub) {
        await $fetch('/api/admin/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {})
        await sub.unsubscribe()
      }
      subscribed.value = false
    } finally {
      busy.value = false
    }
  }

  async function test() {
    error.value = ''
    const res = await $fetch<{ sent: number; total: number }>('/api/admin/push/test', { method: 'POST' })
    if (!res.sent) error.value = 'Keine Benachrichtigung zugestellt – bitte Push erneut aktivieren.'
    return res
  }

  return { supported, permission, subscribed, busy, error, iosNeedsInstall, refresh, enable, disable, test }
}
