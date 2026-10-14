// Freigeschaltete Website-Inhalte aus dem Dashboard (/api/site-content): Kennzahlen, Bauträger-Fakten,
// Kundenstimmen. Im Browser geladen (viele Seiten sind vorgerendert) – leer = Bereich bleibt ausgeblendet.
export interface PublicFact { value: string; valueEn: string | null; label: string; labelEn: string | null }
export interface PublicTestimonial { id: number; quote: string; quoteEn: string | null; name: string; role: string | null; audience: string; rating: number | null }

export function useSiteContent() {
  const data = useState<{ stats: PublicFact[]; developer: PublicFact[]; testimonials: PublicTestimonial[] } | null>('wf-site-content', () => null)
  const loading = useState('wf-site-content-loading', () => false)
  if (import.meta.client && !data.value && !loading.value) {
    loading.value = true
    $fetch<any>('/api/site-content')
      .then((r) => { data.value = r })
      .catch(() => { data.value = { stats: [], developer: [], testimonials: [] } })
      .finally(() => { loading.value = false })
  }
  return {
    stats: computed(() => data.value?.stats || []),
    developer: computed(() => data.value?.developer || []),
    testimonials: computed(() => data.value?.testimonials || [])
  }
}
