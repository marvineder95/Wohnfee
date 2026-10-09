// Zielkategorien für das Inventar (Spalte inventory_items.category).
// Schlüssel = DB-Wert, Label = Anzeigename im Dashboard.
export const INVENTORY_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'sofa', label: 'Sofas & Sessel' },
  { key: 'bett', label: 'Betten' },
  { key: 'teppiche', label: 'Teppiche' },
  { key: 'stuehle', label: 'Stühle & Bänke' },
  { key: 'spiegel', label: 'Spiegel' },
  { key: 'tische', label: 'Tische' },
  { key: 'lampen', label: 'Lampen' },
  { key: 'deko', label: 'Deko' },
  { key: 'textilien', label: 'Textilien' },
  { key: 'schrank', label: 'Schränke & Aufbewahrung' },
  { key: 'pflanzen', label: 'Pflanzen' },
  { key: 'kueche', label: 'Küche & Haushalt' },
  { key: 'bad', label: 'Bad' },
  { key: 'technik', label: 'Technik & Geräte' },
  { key: 'buero', label: 'Büro & Papier' },
  { key: 'sonstiges', label: 'Sonstiges' }
]

export const INVENTORY_CATEGORY_KEYS = INVENTORY_CATEGORIES.map((c) => c.key)

export function categoryLabel(key: string | null | undefined): string {
  return INVENTORY_CATEGORIES.find((c) => c.key === key)?.label || '—'
}
