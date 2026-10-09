// Cookie consent state, shared between the cookiebar, the footer settings button
// and the Google Analytics loader.
//
// Analysis of actually-present technologies (only these are consent-managed):
//   - Google Analytics (gtag.js, UA-41629354-2)  -> category "webanalyse" (opt-in)
//   - self-hosted fonts, swiper, images          -> no consent needed
//   - youtube-nocookie iframe (1 video)          -> external content, sets no
//     cookies before user interaction (unchanged from the original site)
// Nothing non-essential loads before consent.

const STORAGE_KEY = 'wohnfee_cookie_consent'
const GA_ID = 'UA-41629354-2'

export type Consent = { webanalyse: boolean, ts: number } | null

let gaLoaded = false

const loadGA = () => {
  if (gaLoaded || !import.meta.client) return
  gaLoaded = true
  const w = window as any
  w.dataLayer = w.dataLayer || []
  const gtag = (...args: any[]) => w.dataLayer.push(args)
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  gtag('js', new Date())
  gtag('config', GA_ID, { anonymize_ip: true })
}

export const useCookiebar = () => {
  const visible = useState('cookiebar-visible', () => false)
  const view = useState<'banner' | 'settings'>('cookiebar-view', () => 'banner' as const)
  const consent = useState<Consent>('cookiebar-consent', () => null)

  // hydrate from storage on client
  const init = () => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        consent.value = { webanalyse: !!parsed.webanalyse, ts: parsed.ts || 0 }
        if (consent.value.webanalyse) loadGA()
      } else {
        visible.value = true
      }
    } catch {
      visible.value = true
    }
  }

  const persist = (webanalyse: boolean) => {
    consent.value = { webanalyse, ts: Date.now() }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent.value))
    } catch { /* private mode etc. */ }
    if (webanalyse) loadGA()
    visible.value = false
    view.value = 'banner'
  }

  const open = (target: 'banner' | 'settings' = 'banner') => {
    view.value = target
    visible.value = true
  }

  return { visible, view, consent, init, persist, open }
}
