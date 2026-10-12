// Dashboard als App installieren (PWA): Gerät erkennen + Install-Dialog von Chrome/Edge.
// iOS/Safari bieten keinen Install-Dialog – dort zeigt das Profil eine Anleitung.

const installEvt = shallowRef<any>(null)
let listening = false

export function useInstallApp() {
  if (import.meta.client && !listening) {
    listening = true
    window.addEventListener('beforeinstallprompt', (e: any) => { e.preventDefault(); installEvt.value = e })
    window.addEventListener('appinstalled', () => { installEvt.value = null })
  }

  const ua = import.meta.client ? navigator.userAgent : ''
  const isIos = import.meta.client && (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const isAndroid = /Android/.test(ua)
  const isMacSafari = import.meta.client && !isIos && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome\/|Edg\//.test(ua)
  const isFirefox = /Firefox\//.test(ua)
  const isDesktopChromium = !isIos && !isAndroid && /Chrome\/|Edg\//.test(ua) && !/Electron\//.test(ua)
  const standalone = import.meta.client && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)

  /** 'installed' | 'prompt' (Knopf möglich) | 'ios' | 'mac-safari' | 'android-manual' | 'desktop-chromium' | 'unsupported' */
  const mode = computed(() => {
    if (standalone) return 'installed'
    if (installEvt.value) return 'prompt'
    if (isIos) return 'ios'
    if (isMacSafari) return 'mac-safari'
    if (isAndroid && !isFirefox) return 'android-manual'
    if (isDesktopChromium) return 'desktop-chromium'
    return 'unsupported'
  })

  async function install() {
    const e = installEvt.value
    if (!e) return false
    e.prompt()
    const choice = await e.userChoice.catch(() => null)
    installEvt.value = null
    return choice?.outcome === 'accepted'
  }

  return { mode, canPrompt: computed(() => !!installEvt.value), install, isIos }
}
