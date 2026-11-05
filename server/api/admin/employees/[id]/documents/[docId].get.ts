import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'
import { requireSuperadmin } from '../../../../../utils/admin-auth'
import { queryOne } from '../../../../../utils/db'
import { EMPLOYEE_FILES_ROOT } from '../../../../../utils/employees'

// GET /api/admin/employees/:id/documents/:docId — Dokument ansehen (inline) bzw. ?download=1
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  const doc = await queryOne<any>('SELECT * FROM employee_documents WHERE id = :docId AND employee_id = :id', { id, docId })
  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Dokument nicht gefunden' })
  const file = normalize(join(EMPLOYEE_FILES_ROOT, doc.file_path))
  if (!file.startsWith(EMPLOYEE_FILES_ROOT + sep)) throw createError({ statusCode: 404 })
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404, statusMessage: 'Datei fehlt am Server' })

  const ext = doc.file_path.slice(doc.file_path.lastIndexOf('.'))
  const name = encodeURIComponent(`${doc.title}${ext}`)
  const mode = getQuery(event).download ? 'attachment' : 'inline'
  setResponseHeaders(event, {
    'content-type': doc.mime,
    'content-length': String(info.size),
    'content-disposition': `${mode}; filename*=UTF-8''${name}`,
    'cache-control': 'private, no-store'
  })
  return sendStream(event, createReadStream(file))
})
