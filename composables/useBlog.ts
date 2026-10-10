// Hilfsfunktionen für die Blog-Seiten (Trends & Tipps): Artikelauswahl je
// Sektion, Datum, Lesezeit und bereinigte Inhaltselemente.
import news from '~/data/news.json'
import newsEn from '~/data/news-en.json'

export const blogItems = (section: string, lang: 'de' | 'en' = 'de'): any[] =>
  Object.values((lang === 'en' ? newsEn : news) as Record<string, any>)
    .filter((n: any) => n.section === section)
    .sort((a: any, b: any) => Number(b.date) - Number(a.date))

export const blogDate = (ts: string | number, lang: 'de' | 'en' = 'de') =>
  new Date(Number(ts) * 1000).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-AT', { day: 'numeric', month: 'long', year: 'numeric' })

export const blogYear = (ts: string | number) => new Date(Number(ts) * 1000).getFullYear()

// HTML → Klartext (für Anrisse/Lesezeit); Entities zurückwandeln – Vue escaped die Ausgabe ohnehin
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
const stripTags = (h: string) => (h || '').replace(/<[^>]+>/g, ' ')
  .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m]).replace(/\s+/g, ' ').trim()

export const blogPlain = (h: string) => stripTags(h)

const collectHtml = (els: any[] = []): string => els.map((e: any) =>
  (e.html || '') + ' ' + collectHtml(e.children || e.elements || [])).join(' ')

/** Lesezeit in Minuten (≈ 200 Wörter/Minute, mindestens 1) */
export const blogReadingMinutes = (n: any) => {
  const words = stripTags([n.teaser, n.text, collectHtml(n.elements)].join(' ')).split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Teaser als Klartext, auf Satz-/Wortgrenze gekürzt; „…“-Reste aus Contao entfernt */
export const blogTeaser = (n: any, max = 160) => {
  const t = stripTags(n.teaser || '').replace(/\s*(\.\.\.|…)\s*$/, '')
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + ' …' : t
}

/**
 * Inhaltselemente für die Artikelansicht: Bilder ohne Datei (Migrationsreste)
 * entfernen und das Titelbild nicht ein zweites Mal im ersten Textblock zeigen.
 */
export const blogElements = (n: any): any[] => {
  const clean = (els: any[] = []): any[] => els.map((e: any) => {
    if (e.type === 'swiper' || e.type === 'contentslider') {
      const items = (e.items || []).filter((i: any) => i.type !== 'image' || i.src)
      return items.length ? { ...e, items } : null
    }
    if (e.type === 'image' && !e.src) return null
    if (e.src && n.image && e.src === n.image) return { ...e, src: null }
    if (e.children) return { ...e, children: clean(e.children) }
    return e
  }).filter(Boolean)
  return clean(n.elements || [])
}

/** Sektionen, deren Artikel (auch) im Dashboard angelegt werden können */
const DB_SECTIONS = ['aktuelles', 'projekte', 'trends-tipps', 'events']

/**
 * Alle Artikel einer oder mehrerer Sektionen: statische (news.json) + im Dashboard
 * veröffentlichte (Datenbank, via /api/blog). Ohne erreichbare DB bleiben die statischen.
 */
export async function useBlogFeed(sections: string | string[]) {
  const { lang } = useLang()
  const l = lang.value
  const list = Array.isArray(sections) ? sections : [sections]
  // Dashboard-Artikel gibt es nur auf Deutsch
  const dbList = l === 'de' ? list.filter(s => DB_SECTIONS.includes(s)) : []
  const { data } = await useAsyncData(`blog-feed-${l}-${list.join('+')}`,
    async () => {
      if (!dbList.length) return []
      const res = await Promise.all(dbList.map(section =>
        $fetch<{ items: any[] }>('/api/blog', { query: { section } }).then(r => r.items).catch(() => [])))
      return res.flat()
    },
    { default: () => [] as any[] })
  return computed(() => {
    const seen = new Set<string>()
    return [...(data.value || []), ...list.flatMap(s => blogItems(s, l))]
      .filter(n => !seen.has(n.route) && seen.add(n.route))
      .sort((a, b) => Number(b.date) - Number(a.date))
  })
}
