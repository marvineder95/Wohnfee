import { query } from '../../utils/db'
import { isBlogSection, toPublicArticle } from '../../utils/blog'

// GET /api/blog?section=trends-tipps – veröffentlichte Artikel aus dem Dashboard
// (öffentlich; Entwürfe und zukünftig datierte Artikel bleiben verborgen)
export default defineEventHandler(async (event) => {
  const section = getQuery(event).section
  if (!isBlogSection(section)) throw createError({ statusCode: 400, statusMessage: 'Unbekannter Bereich' })
  const rows = await query(
    `SELECT * FROM blog_posts
     WHERE section = :section AND status = 'veroeffentlicht' AND published_at <= UTC_TIMESTAMP()
     ORDER BY published_at DESC`,
    { section }
  )
  setResponseHeader(event, 'cache-control', 'public, max-age=60')
  return { items: rows.map(toPublicArticle) }
})
