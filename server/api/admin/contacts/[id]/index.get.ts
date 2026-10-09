import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Kontakt-ID' })
  }
  const contact = await queryOne(
    `SELECT id, type, name1, name2, street, zip, city, country, email, phone, notes, status, source
     FROM contacts WHERE id = :id`, { id }
  )
  if (!contact) throw createError({ statusCode: 404, statusMessage: 'Kontakt nicht gefunden' })
  const tags = await query('SELECT tag FROM contact_tags WHERE contact_id = :id ORDER BY tag', { id })
  const locations = await query(
    `SELECT id, name, address, zip, city, type FROM locations WHERE contact_id = :id ORDER BY name`, { id }
  )
  return { contact, tags: tags.map(t => t.tag), locations }
})
