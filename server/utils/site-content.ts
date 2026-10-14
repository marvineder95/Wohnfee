import { getSetting, setSetting } from './settings'
import { query, queryOne } from './db'
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, type SiteContent } from '../../shared/site-content'

const KEY = 'site_content'

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const raw = await getSetting(KEY)
    if (raw) return normalizeSiteContent(JSON.parse(raw))
  } catch { /* Standard */ }
  return DEFAULT_SITE_CONTENT
}
export async function saveSiteContent(raw: unknown): Promise<SiteContent> {
  const c = normalizeSiteContent(raw)
  await setSetting(KEY, JSON.stringify(c))
  return c
}

/** Anzahl Möbel & Accessoires im Bestand (ohne verkauft / außer Dienst), auf Hunderter abgerundet */
export async function catalogCount(): Promise<string> {
  const r: any = await queryOne(`SELECT COALESCE(SUM(quantity), 0) AS n FROM inventory_items WHERE status IN ('lager','vermietet','pflege')`)
  const n = Number(r?.n) || 0
  const dots = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return n >= 200 ? `${dots(Math.floor(n / 100) * 100)}+` : String(n)
}

/** Öffentliche Sicht: nur freigeschaltete Blöcke, Kundenstimmen nur sichtbare */
export async function publicSiteContent() {
  const c = await getSiteContent()
  const fill = async (b: SiteContent['stats']) => b.visible
    ? await Promise.all(b.items.map(async i => ({ value: i.auto === 'catalog' ? await catalogCount() : i.value, valueEn: i.auto === 'catalog' ? null : i.valueEn || null, label: i.label, labelEn: i.labelEn || null })))
    : []
  const testimonials = await query<any>(
    `SELECT id, quote, quote_en, name, role, audience, rating FROM testimonials WHERE visible = 1 ORDER BY sort_order, id`).catch(() => [])
  return {
    stats: await fill(c.stats),
    developer: await fill(c.developer),
    testimonials: testimonials.map((t: any) => ({
      id: Number(t.id), quote: t.quote, quoteEn: t.quote_en || null, name: t.name, role: t.role || null,
      audience: t.audience, rating: t.rating ? Number(t.rating) : null
    }))
  }
}
