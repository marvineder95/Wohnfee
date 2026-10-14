import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'
import { partnerFields } from '../../../utils/partners'

// PUT /api/admin/partners/:id – Partner / Referenz ändern
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!(await queryOne('SELECT id FROM partners WHERE id = :id', { id }))) {
    throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })
  }
  const f = partnerFields(await readBody(event))
  if (!f.name) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Namen angeben.' })
  await query(
    `UPDATE partners SET kind = :kind, name = :name, category = :category, description = :description,
       description_en = :description_en, website = :website, logo_path = :logo_path, visible = :visible,
       sort_order = :sort_order, note = :note
     WHERE id = :id`, { ...f, id })
  return { ok: true }
})
