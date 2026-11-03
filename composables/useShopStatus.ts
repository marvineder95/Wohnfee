// Mietshop öffentlich? (Schalter „Mietshop öffentlich“ unter Konditionen, /api/shop-status)
// Seiten sind vorgerendert → Status wird im Browser geladen. Bis dahin: weder Produkte noch „Coming Soon“ zeigen.
let pending: Promise<void> | null = null
export function useShopStatus() {
  const state = useState<{ loaded: boolean; public: boolean; preview: boolean }>('wf-shop-status', () => ({ loaded: false, public: false, preview: false }))
  function load(): Promise<void> {
    if (!import.meta.client || state.value.loaded) return Promise.resolve()
    if (!pending) {
      pending = $fetch<{ public: boolean; preview: boolean }>('/api/shop-status')
        .then((r) => { state.value = { loaded: true, public: !!r.public, preview: !!r.preview } })
        .catch(() => { state.value = { loaded: true, public: false, preview: false } })
        .finally(() => { pending = null })
    }
    return pending
  }
  /** Shop nutzbar (öffentlich oder Admin-Vorschau) */
  const open = computed(() => state.value.loaded && (state.value.public || state.value.preview))
  /** „Coming Soon“ zeigen */
  const closed = computed(() => state.value.loaded && !state.value.public && !state.value.preview)
  const preview = computed(() => state.value.loaded && !state.value.public && state.value.preview)
  return { state, load, open, closed, preview }
}
