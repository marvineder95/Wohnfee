import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { toAdminArticle } from '../../../utils/blog'

// GET /api/admin/blog – alle Artikel aus dem Dashboard (Entwürfe + veröffentlicht)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await query(
    `SELECT id, section, slug, title, teaser, cover_image, cover_alt, meta_description, status,
            published_at, author_name, created_at, updated_at, NULL AS body_html
     FROM blog_posts ORDER BY COALESCE(published_at, created_at) DESC`
  )
  return { items: rows.map(toAdminArticle) }
})
