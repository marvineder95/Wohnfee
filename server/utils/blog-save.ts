// Gemeinsame Validierung für Anlegen/Speichern von Blog-Artikeln (Dashboard).
import { query, queryOne } from './db'
import { articleRoute, cleanText, isBlogSection, isStaticRoute, sanitizeBody, slugify } from './blog'

const toMysqlDate = (v: unknown): string | null => {
  if (!v) return null
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

/** Bild-Pfade nur aus dem eigenen Upload-Ordner oder bestehenden Website-Dateien zulassen */
const cleanImagePath = (v: unknown) => {
  const s = String(v || '').trim()
  return /^\/(uploads|files)\/[\w\-./ ]+\.(jpe?g|png|webp)$/i.test(s) && !s.includes('..') ? s : null
}

/** Freien Slug finden (kollidiert weder mit DB-Artikeln noch mit statischen Seiten) */
async function uniqueSlug(section: string, wanted: string, ownId: number | null) {
  const base = slugify(wanted)
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    if (isStaticRoute(articleRoute(section, slug))) continue
    const hit = await queryOne<{ id: number }>(
      'SELECT id FROM blog_posts WHERE section = :section AND slug = :slug AND (:ownId IS NULL OR id <> :ownId) LIMIT 1',
      { section, slug, ownId }
    )
    if (!hit) return slug
  }
  throw createError({ statusCode: 409, statusMessage: 'Kein freier Link-Name gefunden – bitte Titel anpassen' })
}

export async function readBlogInput(body: any, ownId: number | null) {
  const section = isBlogSection(body.section) ? body.section : 'trends-tipps'
  const title = cleanText(body.title, 190)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Titel eingeben' })

  const status = body.status === 'veroeffentlicht' ? 'veroeffentlicht' : 'entwurf'
  let publishedAt = toMysqlDate(body.publishedAt)
  if (status === 'veroeffentlicht' && !publishedAt) publishedAt = toMysqlDate(new Date().toISOString())

  return {
    section,
    title,
    slug: await uniqueSlug(section, String(body.slug || '').trim() || title, ownId),
    teaser: cleanText(body.teaser, 600) || null,
    bodyHtml: sanitizeBody(body.bodyHtml) || null,
    coverImage: cleanImagePath(body.coverImage),
    coverAlt: cleanText(body.coverAlt, 190) || null,
    metaDescription: cleanText(body.metaDescription, 300) || null,
    status,
    publishedAt
  }
}

export async function loadPostRow(id: number) {
  const row = await queryOne('SELECT * FROM blog_posts WHERE id = :id', { id })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel nicht gefunden' })
  return row
}

export const parseId = (raw: unknown) => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Ungültige ID' })
  return id
}

