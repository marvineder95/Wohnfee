import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}

// POST /api/admin/contacts — neuen Kontakt anlegen
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
  const result: any = await query(
    `INSERT INTO contacts (type, name1, name2, street, zip, city, email, phone, notes, source)
     VALUES (:type, :name1, :name2, :street, :zip, :city, :email, :phone, :notes, 'manual')`,
    {
      type, name1, name2,
      street: clean(body?.street), zip: clean(body?.zip, 16), city: clean(body?.city, 128),
      email, phone: clean(body?.phone, 64), notes: clean(body?.notes, 5000)
    }
  )
  const id = result.insertId
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 20)
    : []
  for (const tag of tags) {
    await query('INSERT IGNORE INTO contact_tags (contact_id, tag) VALUES (:id, :tag)', { id, tag })
  }
  return { ok: true, id }
})
