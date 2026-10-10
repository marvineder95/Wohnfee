// Öffentlicher Mietkatalog, einmal geladen und seitenweit geteilt
// (Warenkorb-Vorschläge, Checkout-Hinweise).
export interface CatalogItem {
  id: number
  title: string
  titleEn?: string | null
  category: string | null
  imagePath: string | null
  rentPrice1m: number | null
  rentPrice3m: number | null
  quantity: number
  matches: number[]
}

export function useRentalCatalog() {
  const items = useState<CatalogItem[]>('wf-rental-catalog', () => [])
  const loaded = useState('wf-rental-catalog-loaded', () => false)
  async function load() {
    if (loaded.value || !import.meta.client) return
    loaded.value = true
    try {
      const res = await $fetch<{ items: CatalogItem[] }>('/api/rental-catalog')
      items.value = res.items
    } catch {
      loaded.value = false
    }
  }
  return { items, load }
}
