import { queryOne } from '../../../utils/db'
import { isBlogSection, toPublicArticle } from '../../../utils/blog'

// GET /api/blog/:section/:slug – einzelner veröffentlichter Artikel
export default defineEventHandler(async (event) => {
  const section = getRouterParam(event, 'section')
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!isBlogSection(section) || !/^[a-z0-9-]{1,190}$/.test(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Artikel nicht gefunden' })
  }
  const row = await queryOne(
    `SELECT * FROM blog_posts
     WHERE section = :section AND slug = :slug AND status = 'veroeffentlicht' AND published_at <= UTC_TIMESTAMP()`,
    { section, slug }
  )
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel nicht gefunden' })
  return toPublicArticle(row)
})
