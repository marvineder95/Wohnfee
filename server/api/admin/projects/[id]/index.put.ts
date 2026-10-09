import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'

const CATEGORIES = ['staging', 'leasing', 'showroom']

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}

// PUT /api/admin/projects/:id
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Projekt-ID' })
  }
  const existing = await queryOne('SELECT id FROM projects WHERE id = :id', { id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })

  const body = await readBody(event)
  const category = CATEGORIES.includes(body?.category) ? body.category : 'staging'
  if (!clean(body?.customer) && !clean(body?.title)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte Kunde oder Projekt angeben.' })
  }
  await query(
    `UPDATE projects SET
       category = :category, section = :section, customer = :customer, title = :title,
       art = :art, team = :team, status_info = :status_info, deadline_text = :deadline_text,
       deadline_date = :deadline_date, note = :note, next_step = :next_step,
       who = :who, date_info = :date_info
     WHERE id = :id`,
    {
      id, category,
      section: clean(body?.section, 64),
      customer: clean(body?.customer),
      title: clean(body?.title),
      art: clean(body?.art, 16),
      team: clean(body?.team, 16),
      status_info: clean(body?.statusInfo, 5000),
      deadline_text: clean(body?.deadlineText, 64),
      deadline_date: /^\d{4}-\d{2}-\d{2}$/.test(String(body?.deadlineDate || '')) ? body.deadlineDate : null,
      note: clean(body?.note),
      next_step: clean(body?.nextStep),
      who: clean(body?.who, 64),
      date_info: clean(body?.dateInfo, 64)
    }
  )
  return { ok: true }
})
