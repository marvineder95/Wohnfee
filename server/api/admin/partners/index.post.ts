import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { partnerFields } from '../../../utils/partners'

// POST /api/admin/partners – neuen Partner / neue Referenz anlegen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const f = partnerFields(await readBody(event))
  if (!f.name) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Namen angeben.' })
  const res: any = await query(
    `INSERT INTO partners (kind, name, category, description, description_en, website, logo_path, visible, sort_order, note)
     VALUES (:kind, :name, :category, :description, :description_en, :website, :logo_path, :visible, :sort_order, :note)`, f)
  return { ok: true, id: res.insertId }
})
