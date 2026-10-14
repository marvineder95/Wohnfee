// Öffentlicher Mietkatalog (Möbel, Pakete, Rabattstaffel), einmal geladen und seitenweit geteilt
// (Shop, Warenkorb, Vorschläge, Checkout).
import { DEFAULT_TIERS, type DiscountTier } from '~~/shared/rental-pricing'

export interface CatalogItem {
  id: number
  title: string
  titleEn?: string | null
  category: string | null
  imagePath: string | null
  description?: string | null
  descriptionEn?: string | null
  /** Grundpreis = Monatsmiete bei 1 Monat (null = auf Anfrage) */
  price: number | null
  quantity: number
  matches: number[]
}
export interface CatalogPackage {
  id: number
  title: string
  titleEn: string | null
  description: string | null
  descriptionEn: string | null
  imagePath: string | null
  /** Paket-Grundpreis pro Monat (vor Mietdauer-Rabatt) */
  base: number
  /** Summe der Einzelpreise (für „statt …“) */
  sum: number | null
  discountPct: number
  available: boolean
  items: Array<{ id: number; title: string; titleEn: string | null; imagePath: string | null; quantity: number }>
}

let pending: Promise<boolean> | null = null

export function useRentalCatalog() {
  const items = useState<CatalogItem[]>('wf-rental-catalog', () => [])
  const packages = useState<CatalogPackage[]>('wf-rental-packages', () => [])
  const tiers = useState<DiscountTier[]>('wf-rental-tiers', () => DEFAULT_TIERS)
  const loaded = useState('wf-rental-catalog-loaded', () => false)
  const ready = useState('wf-rental-catalog-ready', () => false)
  /** lädt einmal (parallele Aufrufe teilen sich die Anfrage); false bei Fehler, z. B. offline */
  function load(force = false): Promise<boolean> {
    if (!import.meta.client) return Promise.resolve(false)
    if (pending && !force) return pending
    if (ready.value && !force) return Promise.resolve(true)
    loaded.value = true
    pending = $fetch<{ items: CatalogItem[]; packages: CatalogPackage[]; tiers: DiscountTier[] }>('/api/rental-catalog')
      .then((res) => {
        items.value = res.items
        packages.value = res.packages || []
        tiers.value = res.tiers?.length ? res.tiers : DEFAULT_TIERS
        ready.value = true
        return true
      })
      .catch(() => { loaded.value = false; return false })
      .finally(() => { pending = null })
    return pending
  }
  return { items, packages, tiers, ready, load }
}
