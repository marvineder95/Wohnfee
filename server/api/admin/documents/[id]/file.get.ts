import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'
import { requireAdmin } from '../../../../utils/admin-auth'
import { queryOne } from '../../../../utils/db'

// GET /api/admin/documents/:id/file — PDF eines importierten Dokuments (alte Rechnungen/Angebote aus Nextcloud)
// zum Ansehen im Dashboard. Die Dateien liegen NICHT öffentlich: public/uploads/documents/<file_path>
// (Upload-Route liefert nur Bilder aus). Rechte: Bereich „rechnungen“ (shared/permissions.ts).
// Im Dashboard erstellte Dokumente („dashboard/261000WF.pdf“) → bestehende PDF-Erzeugung.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Dokument-ID' })
  const doc: any = await queryOne('SELECT id, number, file_path FROM documents WHERE id = :id', { id })
  if (!doc?.file_path) throw createError({ statusCode: 404, statusMessage: 'Dokument nicht gefunden' })

  const path = String(doc.file_path).normalize('NFC')
  if (path.startsWith('dashboard/')) {
    const number = path.slice('dashboard/'.length).replace(/\.pdf$/i, '')
    const inv: any = await queryOne('SELECT id FROM invoices WHERE number = :n', { n: number })
    if (inv) return sendRedirect(event, `/api/admin/invoices/${inv.id}/pdf?inline=1`)
    const off: any = await queryOne('SELECT id FROM offers WHERE number = :n', { n: number })
    if (off) return sendRedirect(event, `/api/admin/offers/${off.id}/pdf?inline=1`)
    throw createError({ statusCode: 404, statusMessage: 'Dokument nicht gefunden' })
  }

  const root = join(process.cwd(), 'public', 'uploads', 'documents')
  const file = normalize(join(root, path))
  if (!file.startsWith(root + sep) || !file.toLowerCase().endsWith('.pdf')) throw createError({ statusCode: 404 })
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404, statusMessage: 'PDF ist (noch) nicht am Server hinterlegt.' })

  const name = encodeURIComponent(path.split('/').pop() || 'dokument.pdf')
  setResponseHeaders(event, {
    'content-type': 'application/pdf',
    'content-length': String(info.size),
    'content-disposition': `inline; filename*=UTF-8''${name}`,
    'cache-control': 'private, max-age=3600'
  })
  return sendStream(event, createReadStream(file))
})
