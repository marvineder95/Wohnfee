import { getDb, query, queryOne } from './db'
import { nextInvoiceNumber } from './invoices'
import { getSetting } from './settings'
import { todayVienna } from './site'
import { addDays, addMonths, generateDueRecurring } from './recurring'

// Angenommenes Mietangebot → Rechnungsentwürfe (nie automatisch versendet):
//   1. „Miete Monat 1"  – nur die Monatsmieten (Positionen mit Einheit „Mon.") × 1 Monat,
//      Leistungszeitraum ab Mietbeginn. Dient zugleich als Vorlage für das Abo.
//   2. Abo für Monat 2 … N – erzeugt zu jedem Monatsbeginn automatisch einen Entwurf.
//   3. „Einmalige Leistungen" – Lieferung, Abholung, Kilometergeld, Deko-Paket (falls > 0 €).

const RENT_UNIT = /^mon\.?$/i

async function insertInvoice(conn: any, offer: any, data: {
  subject: string; serviceFrom: string | null; serviceTo: string | null; note: string | null
  items: Array<{ description: string; quantity: number; unit: string; unit_price: number }>
}): Promise<{ id: number; number: string; netto: number }> {
  const docDate = todayVienna()
  const { year2, max } = await nextInvoiceNumber(docDate)
  let number = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    number = `${String(year2).padStart(2, '0')}${max + 1 + attempt}WF`
    const [rows]: any = await conn.query('SELECT id FROM invoices WHERE number = ?', [number])
    if (!rows.length) break
  }
  const lang = offer.lang === 'en' ? 'en' : 'de'
  const intro = await getSetting(`invoice_default_intro_${lang}`)
  const [res]: any = await conn.query(
    `INSERT INTO invoices
       (number, contact_id, customer_name, customer_street, customer_zip, customer_city, customer_country, customer_uid,
        doc_date, service_from, service_to, subject, intro, lang, vat_rate, vat_free, vat_note, note, status, offer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'entwurf', ?)`,
    [number, offer.contact_id, offer.customer_name, offer.customer_street, offer.customer_zip, offer.customer_city,
     offer.customer_country, offer.customer_uid, docDate, data.serviceFrom, data.serviceTo, data.subject.slice(0, 190),
     intro || null, lang, offer.vat_free ? 0 : Number(offer.vat_rate) || 20, offer.vat_free ? 1 : 0, offer.vat_note, data.note, offer.id]
  )
  const id = res.insertId
  let pos = 0
  let netto = 0
  for (const it of data.items) {
    await conn.query(
      'INSERT INTO invoice_items (invoice_id, position, description, quantity, unit, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
      [id, ++pos, it.description.slice(0, 250), it.quantity, it.unit, it.unit_price])
    netto += it.quantity * it.unit_price
  }
  if (offer.contact_id) {
    const total = offer.vat_free ? netto : Math.round(netto * (1 + (Number(offer.vat_rate) || 20) / 100) * 100) / 100
    await conn.query(
      `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
       VALUES (?, 'rechnung', ?, NULL, ?, ?, ?, ?, 'dashboard')`,
      [offer.contact_id, number, docDate, total, data.serviceTo, `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`])
  }
  return { id, number, netto }
}

/** Legt die Rechnungsentwürfe + Abo an. Idempotent: hat das Angebot schon eine Rechnung, passiert nichts. */
export async function createInvoicesForAcceptedOffer(offerId: number, by = 'Automatisch'):
  Promise<{ rentInvoice: string | null; oneTimeInvoice: string | null; recurringMonths: number } | null> {
  const offer: any = await queryOne('SELECT * FROM offers WHERE id = :id', { id: offerId })
  if (!offer || offer.invoice_id) return null
  const inquiry: any = await queryOne('SELECT start_date, duration_months, number FROM rental_inquiries WHERE offer_id = :id ORDER BY id DESC LIMIT 1', { id: offerId })
  if (!inquiry) return null // nur Mietangebote aus dem Shop
  const items: any[] = await query(
    'SELECT description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position', { id: offerId })

  const months = Math.max(1, Number(inquiry.duration_months) || 1)
  const start = String(inquiry.start_date || todayVienna()).slice(0, 10)
  const rent = items.filter((i) => RENT_UNIT.test(String(i.unit || '').trim()))
  const oneTime = items.filter((i) => !RENT_UNIT.test(String(i.unit || '').trim()))
    .filter((i) => Number(i.quantity) * Number(i.unit_price) !== 0)
  const lang = offer.lang === 'en' ? 'en' : 'de'
  const t = (de: string, en: string) => (lang === 'en' ? en : de)
  const fromOffer = t(`Automatisch erstellt aus Angebot ${offer.number} – bitte vor dem Versand prüfen.`,
    `Created automatically from offer ${offer.number} – please review before sending.`)

  const conn = await getDb().getConnection()
  let rentInv: { id: number; number: string } | null = null
  let oneInv: { id: number; number: string } | null = null
  try {
    await conn.beginTransaction()
    if (rent.length) {
      rentInv = await insertInvoice(conn, offer, {
        subject: `${t('Möbelmiete', 'Furniture rental')} ${inquiry.number} – ${t('Monat', 'month')} 1/${months}`,
        serviceFrom: start, serviceTo: addDays(addMonths(start, 1), -1), note: fromOffer,
        items: rent.map((i) => ({
          description: String(i.description).replace(/\s*–\s*Monatsmiete/i, ` – ${t('Monatsmiete', 'monthly rent')}`),
          quantity: 1, unit: 'Mon.', unit_price: Number(i.unit_price)
        }))
      })
    }
    if (oneTime.length) {
      oneInv = await insertInvoice(conn, offer, {
        subject: `${t('Einmalige Leistungen', 'One-off services')} ${inquiry.number}`,
        serviceFrom: start, serviceTo: null, note: fromOffer,
        items: oneTime.map((i) => ({ description: String(i.description), quantity: Number(i.quantity), unit: i.unit || '', unit_price: Number(i.unit_price) }))
      })
    }
    if (rentInv || oneInv) {
      await conn.query('UPDATE offers SET invoice_id = ? WHERE id = ?', [(rentInv || oneInv)!.id, offerId])
    }
    // Abo für die restlichen Monate: Vorlage = Monat-1-Rechnung
    if (rentInv && months > 1) {
      await conn.query(
        `INSERT INTO recurring_invoices (source_invoice_id, title, next_date, end_date, created_by) VALUES (?, ?, ?, ?, ?)`,
        [rentInv.id, `${t('Möbelmiete', 'Furniture rental')} ${inquiry.number}`.slice(0, 190), addMonths(start, 1), addMonths(start, months - 1), by])
    }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
  // Liegt Monat 2 schon in der Vergangenheit (Mietbeginn zurückdatiert), gleich nachziehen
  if (rentInv && months > 1) await generateDueRecurring()
  return { rentInvoice: rentInv?.number || null, oneTimeInvoice: oneInv?.number || null, recurringMonths: rentInv ? months - 1 : 0 }
}
