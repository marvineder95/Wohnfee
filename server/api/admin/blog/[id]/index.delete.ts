import { query } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/admin-auth'
import { loadPostRow, parseId } from '../../../../utils/blog-save'

// DELETE /api/admin/blog/:id – Artikel löschen (hochgeladene Bilder bleiben erhalten)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = parseId(getRouterParam(event, 'id'))
  await loadPostRow(id)
  await query('DELETE FROM blog_posts WHERE id = :id', { id })
  return { ok: true }
})
