import { query } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/admin-auth'
import { loadPostRow, parseId, readBlogInput } from '../../../../utils/blog-save'
import { toAdminArticle } from '../../../../utils/blog'

// PUT /api/admin/blog/:id – Artikel speichern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = parseId(getRouterParam(event, 'id'))
  await loadPostRow(id)
  const d = await readBlogInput(await readBody(event), id)
  await query(
    `UPDATE blog_posts SET section = :section, slug = :slug, title = :title, teaser = :teaser,
       body_html = :bodyHtml, cover_image = :coverImage, cover_alt = :coverAlt,
       meta_description = :metaDescription, status = :status, published_at = :publishedAt
     WHERE id = :id`,
    { ...d, id }
  )
  return toAdminArticle(await loadPostRow(id))
})
