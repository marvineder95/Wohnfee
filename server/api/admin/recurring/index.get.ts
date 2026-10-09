import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { generateDueRecurring } from '../../../utils/recurring'

// GET /api/admin/recurring — alle Abo-Rechnungen (vorher fällige Entwürfe erzeugen)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const generated = await generateDueRecurring()
  const recurring = await query(
    `SELECT r.id, r.source_invoice_id AS sourceInvoiceId, r.title, r.next_date AS nextDate, r.end_date AS endDate,
            r.active, r.created_count AS createdCount, r.created_at AS createdAt,
            i.number AS sourceNumber, i.customer_name AS customerName,
            (SELECT ROUND(SUM(ii.quantity * ii.unit_price), 2) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS netto,
            (SELECT number FROM invoices l WHERE l.id = r.last_invoice_id) AS lastNumber
     FROM recurring_invoices r JOIN invoices i ON i.id = r.source_invoice_id
     ORDER BY r.active DESC, r.next_date ASC`
  )
  return { recurring, generated }
})
