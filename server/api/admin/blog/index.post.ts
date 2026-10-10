import { query } from '../../../utils/db'
import { requireAdmin } from '../../../utils/admin-auth'
import { readBlogInput, loadPostRow } from '../../../utils/blog-save'
import { toAdminArticle } from '../../../utils/blog'

// POST /api/admin/blog – neuen Artikel anlegen
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const d = await readBlogInput(await readBody(event), null)
  const res: any = await query(
    `INSERT INTO blog_posts
       (section, slug, title, teaser, body_html, cover_image, cover_alt, meta_description,
        status, published_at, author_name, created_by, categories, gallery)
     VALUES (:section, :slug, :title, :teaser, :bodyHtml, :coverImage, :coverAlt, :metaDescription,
             :status, :publishedAt, :authorName, :createdBy, :categories, :gallery)`,
    { ...d, authorName: (user.displayName || user.username || '').slice(0, 128), createdBy: user.id || null }
  )
  return toAdminArticle(await loadPostRow(Number(res.insertId)))
})
