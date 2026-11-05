import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { notifySuperadmins } from '../../../../utils/notifications'
import { employeeForUser, parseRange, absenceRange, personName, saveSickNote } from '../../../../utils/absences'

// POST /api/admin/me/absences — Urlaub beantragen (JSON) oder Krankenstand melden (multipart, Krankmeldung optional)
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  const emp = await employeeForUser(me.id)
  const isMultipart = String(getHeader(event, 'content-type') || '').includes('multipart/form-data')
  let body: any = {}
  let files: Array<{ data: Buffer; type?: string; filename?: string }> = []
  if (isMultipart) {
    const parts = await readMultipartFormData(event) || []
    for (const p of parts) {
      if (p.filename) { if (p.name === 'file') files.push(p) } else body[p.name || ''] = p.data.toString('utf8').trim()
    }
  } else body = await readBody(event).catch(() => ({}))

  const type = body?.type === 'krankenstand' ? 'krankenstand' : 'urlaub'
  const { from, to, days } = parseRange(body)
  const note = String(body?.note || '').trim().slice(0, 255) || null
  const status = type === 'urlaub' ? 'beantragt' : 'genehmigt'
  const res: any = await query(
    `INSERT INTO employee_absences (employee_id, type, date_from, date_to, days, note, status, requested_by)
     VALUES (:emp, :type, :from, :to, :days, :note, :status, :uid)`,
    { emp: emp.id, type, from, to, days, note, status, uid: me.id }
  )
  const id = Number(res.insertId)
  for (const f of files.slice(0, 5)) await saveSickNote(emp.id, id, f, me.displayName || me.username || '')

  const who = personName(emp)
  const range = absenceRange({ date_from: from, date_to: to })
  await notifySuperadmins(type === 'urlaub'
    ? { title: `Urlaubsantrag: ${who}`, body: `${range} (${days} Arbeitstage)${note ? ' – ' + note : ''}. Bitte genehmigen oder ablehnen.`, url: `/admin/kalender?focus=${from}&abwesenheit=${id}` }
    : { title: `Krankenstand: ${who}`, body: `${range}${files.length ? ' – Krankmeldung hochgeladen' : ' – Krankmeldung folgt'}${note ? ' · ' + note : ''}`, url: `/admin/kalender?focus=${from}&abwesenheit=${id}` },
  me.id)
  return { ok: true, id }
})
