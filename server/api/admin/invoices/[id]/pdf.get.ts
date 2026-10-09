import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { buildInvoicePdf } from '../../../../utils/invoice-pdf'

// GET /api/admin/invoices/:id/pdf — Rechnung als PDF (WOHNFEE-Design)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Rechnungs-ID' })
  }
  const invoice: any = await queryOne('SELECT * FROM invoices WHERE id = :id', { id })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  const items: any[] = await query(
    'SELECT position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = :id ORDER BY position',
    { id }
  )
  let stornoInfo = null
  if (invoice.storno_of) {
    stornoInfo = await queryOne('SELECT number, doc_date FROM invoices WHERE id = :oid', { oid: invoice.storno_of })
  }
  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const pdf = await buildInvoicePdf(invoice, items, logoPng, stornoInfo)

  const fname = encodeURIComponent(`${invoice.number.replace(/\//g, '-')}.pdf`).replace(/['()]/g, '')
  // ?inline=1 → für die Vorschau im Popup (Browser zeigt das PDF an), sonst Download
  const inline = getQuery(event).inline === '1'
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${fname}`)
  return pdf
})
