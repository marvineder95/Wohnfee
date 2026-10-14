// Website-Inhalte aus dem Dashboard (/admin/inhalte): Kennzahlen (Startseite) und Fakten für Bauträger.
// Jede Liste hat einen Schalter „auf der Website zeigen“; Einträge mit example = true sind Beispielwerte,
// die vor dem Freischalten geprüft werden müssen.
export interface FactItem { value: string; valueEn?: string; label: string; labelEn?: string; example?: boolean; auto?: 'catalog' }
export interface FactBlock { visible: boolean; items: FactItem[] }
export interface SiteContent { stats: FactBlock; developer: FactBlock }

export const DEFAULT_SITE_CONTENT: SiteContent = {
  stats: {
    visible: false,
    items: [
      { value: '15', label: 'Jahre Erfahrung – seit 2011', labelEn: 'years of experience – since 2011' },
      { value: '800+', label: 'eingerichtete Wohnungen & Häuser', labelEn: 'homes staged', example: true },
      { value: '', label: 'Möbel & Accessoires im eigenen Bestand', labelEn: 'pieces of furniture & decor in stock', auto: 'catalog' },
      { value: '4,9 ★', label: 'Google-Bewertung', labelEn: 'Google rating', example: true }
    ]
  },
  developer: {
    visible: false,
    items: [
      { value: 'bis zu 2×', valueEn: 'up to 2×', label: 'schnellerer Verkauf mit Home Staging', labelEn: 'faster sale with home staging', example: true },
      { value: 'ab 15 €', valueEn: 'from €15', label: 'pro m² Wohnfläche und Monat', labelEn: 'per m² living space and month', example: true },
      { value: '1 Woche', valueEn: '1 week', label: 'von der Anfrage bis zur fertigen Musterwohnung', labelEn: 'from inquiry to finished show flat', example: true }
    ]
  }
}

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
function block(raw: any, fallback: FactBlock): FactBlock {
  const items = Array.isArray(raw?.items) ? raw.items : fallback.items
  return {
    visible: !!raw?.visible,
    items: items.slice(0, 8).map((i: any) => ({
      value: clean(i?.value, 24), valueEn: clean(i?.valueEn, 24) || undefined, label: clean(i?.label, 120), labelEn: clean(i?.labelEn, 120) || undefined,
      example: !!i?.example || undefined, auto: i?.auto === 'catalog' ? 'catalog' as const : undefined
    })).filter((i: FactItem) => i.label && (i.value || i.auto))
  }
}
export function normalizeSiteContent(raw: any): SiteContent {
  return {
    stats: block(raw?.stats, DEFAULT_SITE_CONTENT.stats),
    developer: block(raw?.developer, DEFAULT_SITE_CONTENT.developer)
  }
}
