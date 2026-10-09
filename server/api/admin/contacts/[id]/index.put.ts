import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}

// PUT /api/admin/contacts/:id — Kontakt bearbeiten
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Kontakt-ID' })
  }
  const existing = await queryOne('SELECT id FROM contacts WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Kontakt nicht gefunden' })

  const body = await readBody(event)
  const type = body?.type === 'firma' ? 'firma' : 'person'
  const name1 = clean(body?.name1)
  const name2 = clean(body?.name2)
  if (!name1 && !name2) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte mindestens einen Namen angeben.' })
  }
  const email = clean(body?.email)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse.' })
  }
  const status = body?.status === 'archiviert' ? 'archiviert' : 'aktiv'

  await query(
    `UPDATE contacts SET type = :type, name1 = :name1, name2 = :name2, street = :street,
       zip = :zip, city = :city, email = :email, phone = :phone, notes = :notes, status = :status
     WHERE id = :id`,
    {
      id, type, name1, name2,
      street: clean(body?.street), zip: clean(body?.zip, 16), city: clean(body?.city, 128),
      email, phone: clean(body?.phone, 64), notes: clean(body?.notes, 5000), status
    }
  )
  if (Array.isArray(body?.tags)) {
    await query('DELETE FROM contact_tags WHERE contact_id = :id', { id })
    const tags = body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 20)
    for (const tag of tags) {
      await query('INSERT IGNORE INTO contact_tags (contact_id, tag) VALUES (:id, :tag)', { id, tag })
    }
  }
  return { ok: true }
})
