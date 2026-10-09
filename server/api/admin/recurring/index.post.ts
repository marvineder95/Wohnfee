import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'
import { invDate, invClean } from '../../../utils/invoices'
import { addMonths, generateDueRecurring } from '../../../utils/recurring'

// POST /api/admin/recurring — Rechnung als monatliche Vorlage einrichten
// Body: { invoice_id, start_date?, end_date?, title? }
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event)
  const invoiceId = Number(body?.invoice_id)
  const inv: any = await queryOne('SELECT id, doc_date, service_from, storno_of, status FROM invoices WHERE id = :id', { id: invoiceId })
  if (!inv) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  if (inv.storno_of || inv.status === 'storniert') {
    throw createError({ statusCode: 400, statusMessage: 'Stornierte Rechnungen können nicht wiederholt werden.' })
  }
  const exists = await queryOne('SELECT id FROM recurring_invoices WHERE source_invoice_id = :id AND active = 1', { id: invoiceId })
  if (exists) throw createError({ statusCode: 409, statusMessage: 'Für diese Rechnung läuft bereits ein Abo.' })

  const base = String(inv.service_from || inv.doc_date).slice(0, 10)
  const start = invDate(body?.start_date) || addMonths(base, 1)
  const end = invDate(body?.end_date)
  if (end && end < start) throw createError({ statusCode: 400, statusMessage: 'Das Enddatum liegt vor dem ersten Termin.' })
  const res: any = await query(
    `INSERT INTO recurring_invoices (source_invoice_id, title, next_date, end_date, created_by)
     VALUES (:invoiceId, :title, :start, :end, :by)`,
    { invoiceId, title: invClean(body?.title), start, end, by: user.displayName || user.username }
  )
  const generated = await generateDueRecurring()
  return { ok: true, id: res.insertId, generated }
})
