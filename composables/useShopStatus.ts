// Mietshop öffentlich? (Schalter „Mietshop öffentlich“ unter Konditionen, /api/shop-status)
// Vorgerenderte Seiten laden den Status im Browser; live gerenderte (Furniture Leasing) schon am Server. Bis dahin: weder Produkte noch „Coming Soon“ zeigen.
let pending: Promise<void> | null = null
export function useShopStatus() {
  const state = useState<{ loaded: boolean; public: boolean; preview: boolean; properties: boolean }>('wf-shop-status', () => ({ loaded: false, public: false, preview: false, properties: false }))
  function load(): Promise<void> {
    if (state.value.loaded) return Promise.resolve()
    // Server (live gerenderte Seiten, z. B. Furniture Leasing): mit den Cookies der Anfrage
    if (import.meta.server) {
      return useRequestFetch()<{ public: boolean; preview: boolean; properties: boolean }>('/api/shop-status')
        .then((r) => { state.value = { loaded: true, public: !!r.public, preview: !!r.preview, properties: !!r.properties } })
        .catch(() => { /* im Browser erneut versuchen */ })
    }
    if (!pending) {
      pending = $fetch<{ public: boolean; preview: boolean; properties: boolean }>('/api/shop-status')
        .then((r) => { state.value = { loaded: true, public: !!r.public, preview: !!r.preview, properties: !!r.properties } })
        .catch(() => { state.value = { loaded: true, public: false, preview: false, properties: false } })
        .finally(() => { pending = null })
    }
    return pending
  }
  /** Shop nutzbar (öffentlich oder Admin-Vorschau) */
  const open = computed(() => state.value.loaded && (state.value.public || state.value.preview))
  /** „Coming Soon“ zeigen */
  const closed = computed(() => state.value.loaded && !state.value.public && !state.value.preview)
  const preview = computed(() => state.value.loaded && !state.value.public && state.value.preview)
  /** Immobilien-Bereich öffentlich (Menüpunkt zeigen) */
  const properties = computed(() => state.value.loaded && state.value.properties)
  return { state, load, open, closed, preview, properties }
}
