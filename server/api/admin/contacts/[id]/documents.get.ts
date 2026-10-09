import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

// GET /api/admin/contacts/:id/documents — Rechnungen/Angebote/Verträge des Kontakts
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Kontakt-ID' })
  }
  const contact = await queryOne('SELECT id FROM contacts WHERE id = :id', { id })
  if (!contact) throw createError({ statusCode: 404, statusMessage: 'Kontakt nicht gefunden' })

  const docs = await query(
    `SELECT id, kind, number, customer_raw, doc_date, total, return_date, file_path, source
     FROM documents
     WHERE contact_id = :id
     ORDER BY doc_date IS NULL, doc_date DESC, id DESC`,
    { id }
  )
  const stats = await queryOne(
    `SELECT
       SUM(kind = 'rechnung') AS rechnungen,
       SUM(kind IN ('angebot','vertrag')) AS angebote,
       SUM(total) AS gesamtsumme
     FROM documents WHERE contact_id = :id`,
    { id }
  )
  return { documents: docs, stats }
})
