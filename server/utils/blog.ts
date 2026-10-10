// Blog-Artikel aus der Datenbank (Dashboard → „Blog-Artikel“).
// Öffentlich werden sie im selben Format wie die statischen Artikel aus
// data/news.json ausgeliefert, damit Übersicht und Artikelansicht beide
// Quellen ohne Sonderfälle mischen können.
import sanitizeHtml from 'sanitize-html'
import routesJson from '../../data/routes.json'

// Rubriken, die im Dashboard geschrieben werden können (archive = Contao-Archiv der statischen Artikel)
export const BLOG_SECTIONS: Record<string, { label: string, prefix: string, archive: string }> = {
  aktuelles: { label: 'Aktuell', prefix: '/blogartikel-aktuelles/', archive: '13' },
  projekte: { label: 'Projekte', prefix: '/blogartikel-projekte/', archive: '11' },
  'trends-tipps': { label: 'Trends & Tipps', prefix: '/blogartikel-trends-tipps/', archive: '5' },
  events: { label: 'Events', prefix: '/blogartikel-events/', archive: '9' }
}

/** Zielgruppen der Projekte (IDs wie in categories.json / HsBlogList) */
export const PROJECT_CATEGORIES = ['2', '1', '3'] // Bauträger, Makler, Privatpersonen

const parseJson = (v: any, fallback: any) => { try { return v ? JSON.parse(v) : fallback } catch { return fallback } }
export const galleryOf = (r: any): Array<{ src: string, alt: string }> => parseJson(r.gallery, [])
export const categoriesOf = (r: any): string[] => String(r.categories || '').split(',').filter(Boolean)

export const isBlogSection = (s: unknown): s is string =>
  typeof s === 'string' && Object.prototype.hasOwnProperty.call(BLOG_SECTIONS, s)

/** „Die Trends 2025: Wärme & Ruhe“ → „die-trends-2025-waerme-ruhe“ */
export function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'artikel'
}

export const articleRoute = (section: string, slug: string) =>
  `${BLOG_SECTIONS[section]?.prefix || `/blogartikel-${section}/`}${slug}.html`

/** Route ist bereits durch einen statischen Artikel/eine Seite belegt */
export const isStaticRoute = (route: string) =>
  Object.prototype.hasOwnProperty.call(routesJson as Record<string, unknown>, route)

// Nur redaktionelle Auszeichnung erlauben – keine Skripte, Styles oder Event-Handler.
export function sanitizeBody(html: string): string {
  return sanitizeHtml(String(html || ''), {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
      'a', 'ul', 'ol', 'li', 'blockquote', 'figure', 'figcaption', 'img', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      b: 'strong',
      i: 'em',
      h1: 'h2',
      div: 'p',
      a: (tagName, attribs) => {
        const external = /^https?:\/\//i.test(attribs.href || '')
        return {
          tagName: 'a',
          attribs: external
            ? { href: attribs.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: attribs.href || '#' }
        }
      }
    },
    // leere Absätze (z. B. vom Editor) entfernen
    exclusiveFilter: frame => frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren?.length
  }).trim()
}

// Reiner Text (Titel, Teaser …): Tags entfernen, Zeichen wie „&“ unverändert lassen –
// die Ausgabe escaped Vue bzw. toPublicArticle selbst
const sanitizeText = (s: unknown, max: number) =>
  String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)

export const cleanText = sanitizeText

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** DB-Zeile → Artikel im news.json-Format (öffentliche Ausgabe) */
export function toPublicArticle(r: any) {
  const ts = r.published_at ? Math.floor(new Date(r.published_at).getTime() / 1000) : Math.floor(Date.now() / 1000)
  return {
    route: articleRoute(r.section, r.slug),
    headline: r.title,
    alias: r.slug,
    date: String(ts),
    teaser: r.teaser ? `<p>${esc(r.teaser)}</p>` : '',
    text: null,
    image: r.cover_image || null,
    imageAlt: r.cover_alt || null,
    // Vorher-Foto für den Vorher/Nachher-Regler + Fakten unter dem Foto
    beforeImage: r.before_image || null,
    facts: r.photo_facts || null,
    description: r.meta_description || r.teaser || '',
    elements: [
      ...(r.body_html ? [{ id: `db-${r.id}`, type: 'text', headline: '', html: r.body_html }] : []),
      // Bildergalerie (Projekte/Events) – HsArticle zeigt sie mit Lightbox
      ...(galleryOf(r).length ? [{ id: `db-${r.id}-gallery`, type: 'gallery', items: galleryOf(r).map(g => ({ type: 'image', src: g.src, alt: g.alt })) }] : [])
    ],
    archive: BLOG_SECTIONS[r.section]?.archive || '',
    section: r.section,
    categories: categoriesOf(r),
    url: '',
    source: 'db',
    author: r.author_name || null
  }
}

/** Admin-Ausgabe (camelCase) */
export function toAdminArticle(r: any) {
  return {
    id: r.id,
    section: r.section,
    slug: r.slug,
    title: r.title,
    teaser: r.teaser || '',
    bodyHtml: r.body_html || '',
    coverImage: r.cover_image || '',
    coverAlt: r.cover_alt || '',
    beforeImage: r.before_image || '',
    photoFacts: r.photo_facts || '',
    metaDescription: r.meta_description || '',
    status: r.status,
    publishedAt: r.published_at,
    authorName: r.author_name || '',
    categories: categoriesOf(r),
    gallery: galleryOf(r),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    route: articleRoute(r.section, r.slug)
  }
}
