// Gemeinsamer Warenkorb für Shop, Warenkorb-Drawer, Vorschläge und Checkout.
// EINE Mietdauer für den ganzen Warenkorb; jede Zeile merkt sich den Grundpreis (1 Monat),
// der Monatspreis ergibt sich aus der Rabattstaffel (shared/rental-pricing.ts).
// Speicher: localStorage 'wf_rental_cart' (Zeilen) + 'wf_rental_months' (Dauer).
import { rentalPerks } from '~~/shared/rental-perks'
import { discountFor, priceForMonths, DEFAULT_MONTHS, MAX_MONTHS } from '~~/shared/rental-pricing'
import type { CatalogItem, CatalogPackage } from '~/composables/useRentalCatalog'

export interface CartLine {
  kind: 'item' | 'package'
  id: number
  title: string
  imagePath: string | null
  quantity: number
  /** Grundpreis pro Monat bei 1 Monat (Paket: nach Paketrabatt); null = auf Anfrage */
  base: number | null
  /** nur Pakete: Anzahl der enthaltenen Stücke (Anzeige) */
  pieces?: number
}

const KEY = 'wf_rental_cart'
const KEY_MONTHS = 'wf_rental_months'
const round2 = (v: number) => Math.round(v * 100) / 100

export function useRentalCart() {
  const lines = useState<CartLine[]>('wf-cart-lines', () => [])
  const months = useState<number>('wf-cart-months', () => DEFAULT_MONTHS)
  const catalog = useRentalCatalog()

  function load() {
    if (!import.meta.client) return
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
      // ältere Warenkörbe (je Zeile Dauer + Preis) werden übernommen; Preise frischt refresh() auf
      lines.value = (Array.isArray(raw) ? raw : []).map((l: any) => ({
        kind: l.kind === 'package' ? 'package' : 'item',
        id: Number(l.id), title: String(l.title || ''), imagePath: l.imagePath || null,
        quantity: Math.max(1, Math.min(99, Number(l.quantity) || 1)),
        base: l.base !== undefined ? l.base : (l.durationMonths === 1 ? l.price ?? null : null),
        pieces: l.pieces
      })).filter((l: CartLine) => l.id > 0)
      // gleiche Artikel aus Alt-Warenkörben (1 + 3 Monate) zusammenführen
      const merged: CartLine[] = []
      for (const l of lines.value) {
        const same = merged.find(m => m.kind === l.kind && m.id === l.id)
        if (same) same.quantity = Math.min(99, same.quantity + l.quantity)
        else merged.push(l)
      }
      lines.value = merged
      const m = Number(localStorage.getItem(KEY_MONTHS))
      if (m >= 1 && m <= MAX_MONTHS) months.value = Math.round(m)
    } catch { lines.value = [] }
  }
  function persist() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(KEY, JSON.stringify(lines.value))
      localStorage.setItem(KEY_MONTHS, String(months.value))
    } catch { /* privater Modus */ }
    window.dispatchEvent(new CustomEvent('wf:cart-changed'))
  }
  /** Preise/Titel aus dem aktuellen Katalog übernehmen, nicht mehr verfügbare Zeilen behalten (Server prüft) */
  function refresh() {
    let changed = false
    for (const l of lines.value) {
      if (l.kind === 'package') {
        const p = catalog.packages.value.find(x => x.id === l.id)
        if (p && p.base !== l.base) { l.base = p.base; changed = true }
      } else {
        const i = catalog.items.value.find(x => x.id === l.id)
        if (i && i.price !== l.base) { l.base = i.price; changed = true }
      }
    }
    if (changed) persist()
  }

  const discount = computed(() => discountFor(months.value, catalog.tiers.value))
  const unit = (l: CartLine) => priceForMonths(l.base, months.value, catalog.tiers.value)
  /** Zeilen im Format der Vorteils-Berechnung (rental-perks) */
  const perkLines = computed(() => lines.value.map(l => ({ price: unit(l), quantity: l.quantity, durationMonths: months.value })))
  const monthly = computed(() => round2(perkLines.value.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0)))
  const monthlyBase = computed(() => round2(lines.value.reduce((s, l) => s + (l.base ?? 0) * l.quantity, 0)))
  const saving = computed(() => round2(monthlyBase.value - monthly.value))
  const count = computed(() => lines.value.reduce((s, l) => s + l.quantity, 0))
  const perks = computed(() => rentalPerks(perkLines.value, months.value))

  function addItem(i: CatalogItem, qty = 1, title?: string) {
    const stock = Number(i.quantity) || 0
    const ex = lines.value.find(l => l.kind === 'item' && l.id === i.id)
    if (ex) ex.quantity = Math.min(stock > 0 ? stock : 99, ex.quantity + qty)
    else lines.value.push({ kind: 'item', id: i.id, title: title || i.title, imagePath: i.imagePath, quantity: Math.min(qty, stock || 99), base: i.price })
    persist()
  }
  function addPackage(p: CatalogPackage, title?: string) {
    const ex = lines.value.find(l => l.kind === 'package' && l.id === p.id)
    // Pakete sind Unikate aus dem Lagerbestand – einmal im Warenkorb reicht
    if (!ex) lines.value.push({ kind: 'package', id: p.id, title: title || p.title, imagePath: p.imagePath, quantity: 1, base: p.base, pieces: p.items.reduce((s, i) => s + i.quantity, 0) })
    persist()
  }
  function setQty(line: CartLine, qty: number) {
    if (qty < 1) lines.value = lines.value.filter(l => l !== line)
    else line.quantity = line.kind === 'package' ? 1 : Math.min(99, qty)
    persist()
  }
  function remove(line: CartLine) {
    lines.value = lines.value.filter(l => l !== line)
    persist()
  }
  function setMonths(m: number) {
    months.value = Math.min(MAX_MONTHS, Math.max(1, Math.round(Number(m) || 1)))
    persist()
  }
  function clear() {
    lines.value = []
    persist()
  }
  return { lines, months, discount, unit, perkLines, monthly, monthlyBase, saving, count, perks, load, persist, refresh, addItem, addPackage, setQty, remove, setMonths, clear }
}
