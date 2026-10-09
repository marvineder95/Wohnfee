import { requireAdmin } from '../../../../utils/admin-auth'
import { loadPostRow, parseId } from '../../../../utils/blog-save'
import { toAdminArticle } from '../../../../utils/blog'

// GET /api/admin/blog/:id – Artikel zum Bearbeiten
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return toAdminArticle(await loadPostRow(parseId(getRouterParam(event, 'id'))))
})
