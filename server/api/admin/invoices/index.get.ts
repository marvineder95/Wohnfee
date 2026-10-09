import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { nextInvoiceNumber } from '../../../utils/invoices'
import { getSetting } from '../../../utils/settings'

// GET /api/admin/invoices — Liste + Vorschlag für die nächste Rechnungsnummer + Standardtexte
// Nummernschema: <JJ><lfd ab 1000>WF (z. B. 261000WF), Jahreswechsel beginnt wieder bei 1000.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const invoices = await query(
    `SELECT i.id, i.number, i.contact_id, i.customer_name, i.doc_date, i.status, i.lang, i.vat_free, i.vat_rate, i.storno_of,
            c.email AS contact_email,
            (SELECT ROUND(SUM(ii.quantity * ii.unit_price), 2) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS netto
     FROM invoices i
     LEFT JOIN contacts c ON c.id = i.contact_id
     ORDER BY i.doc_date DESC, i.id DESC
     LIMIT 300`
  )

  const suggest = (await nextInvoiceNumber()).number

  const defaults = {
    note_de: (await getSetting('invoice_default_note_de')) || '',
    note_en: (await getSetting('invoice_default_note_en')) || '',
    intro_de: (await getSetting('invoice_default_intro_de')) || '',
    intro_en: (await getSetting('invoice_default_intro_en')) || ''
  }

  return { invoices, suggest, defaults }
})
