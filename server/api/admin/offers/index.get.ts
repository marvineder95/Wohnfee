import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { nextOfferNumber } from '../../../utils/invoices'
import { getSetting } from '../../../utils/settings'

// GET /api/admin/offers — Liste + Vorschlag für die nächste Angebotsnummer + Standardtexte
// Nummernschema: <JJ><lfd ab 1000>WF (z. B. 261000WF), eigener Zaehler, Jahreswechsel beginnt wieder bei 1000.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const offers = await query(
    `SELECT o.id, o.number, o.contact_id, o.customer_name, o.doc_date, o.valid_until, o.status, o.lang, o.vat_free,
            o.invoice_id, c.email AS contact_email,
            (SELECT ROUND(SUM(oi.quantity * oi.unit_price), 2) FROM offer_items oi WHERE oi.offer_id = o.id) AS netto
     FROM offers o
     LEFT JOIN contacts c ON c.id = o.contact_id
     ORDER BY o.doc_date DESC, o.id DESC
     LIMIT 300`
  )

  const suggest = (await nextOfferNumber()).number

  const defaults = {
    note_de: (await getSetting('offer_default_note_de')) || '',
    note_en: (await getSetting('offer_default_note_en')) || ''
  }

  return { offers, suggest, defaults }
})
