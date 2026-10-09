import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'

const CATEGORIES = ['staging', 'leasing', 'showroom']

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}

// POST /api/admin/projects
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const category = CATEGORIES.includes(body?.category) ? body.category : 'staging'
  if (!clean(body?.customer) && !clean(body?.title)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte Kunde oder Projekt angeben.' })
  }
  const result: any = await query(
    `INSERT INTO projects
       (category, section, customer, title, art, team, status_info, deadline_text, deadline_date,
        note, next_step, who, date_info, source)
     VALUES
       (:category, :section, :customer, :title, :art, :team, :status_info, :deadline_text, :deadline_date,
        :note, :next_step, :who, :date_info, 'manual')`,
    {
      category,
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
  return { ok: true, id: result.insertId }
})
