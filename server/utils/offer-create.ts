import { todayVienna } from './site'
import { getDb, query, queryOne } from './db'
import { nextOfferNumber } from './invoices'
import { getSetting } from './settings'

// Erzeugt aus einer Mietanfrage (rental_inquiries) automatisch ein Angebot
// im Wohnfee-Design (Tabelle offers + offer_items) und verknuepft beides.
// Idempotent: existiert bereits ein Angebot, wird das Bestehende zurueckgegeben.
// Wird aufgerufen von POST /api/rental-inquiry (automatisch beim Eingang)
// sowie vom Dashboard (Nach erstellen fuer aeltere Anfragen ohne Angebot).
export async function createOfferForInquiry(inquiryId: number): Promise<{ offerId: number; number: string; created: boolean }> {
  const inquiry: any = await queryOne('SELECT * FROM rental_inquiries WHERE id = :id', { id: inquiryId })
  if (!inquiry) throw new Error('Mietanfrage nicht gefunden')

  if (inquiry.offer_id) {
    const existing: any = await queryOne('SELECT id, number FROM offers WHERE id = :id', { id: inquiry.offer_id })
    if (existing) return { offerId: existing.id, number: existing.number, created: false }
  }

  const items: any[] = await query(
    'SELECT title, quantity, duration_months, monthly_price FROM rental_inquiry_items WHERE inquiry_id = :id ORDER BY id',
    { id: inquiryId }
  )
  if (!items.length) throw new Error('Die Anfrage enthält keine Positionen.')

  // Kundenkontakt per E-Mail finden oder anlegen – damit das Angebot auch
  // in der Kundentabelle (Dokumente) auftaucht
  let contactId: number | null = null
  const existingContact: any = await queryOne(
    'SELECT id FROM contacts WHERE LOWER(email) = LOWER(:email) LIMIT 1',
    { email: inquiry.email }
  )
  if (existingContact) {
    contactId = existingContact.id
  } else {
    const res: any = await query(
      `INSERT INTO contacts (type, name1, name2, street, zip, city, email, phone, source)
       VALUES ('person', :fn, :ln, :street, :zip, :city, :email, :phone, 'shop')`,
      {
        fn: inquiry.first_name, ln: inquiry.last_name,
        street: inquiry.street, zip: inquiry.zip, city: inquiry.city,
        email: inquiry.email, phone: inquiry.phone
      }
    )
    contactId = res.insertId
  }

  const fmt = (d: any) => d
    ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''
  const start = fmt(inquiry.start_date)
  const end = fmt(inquiry.end_date)
  const docDate = todayVienna()
  const validUntil = todayVienna(14)

  const subject = `Möbelmiete${start ? ` ${start}` : ''}${end ? ` – ${end}` : ''}`
  // Standardtext der Angebote + Abwicklungs-Infos aus der Anfrage
  const defaultNote = await getSetting('offer_default_note_de')
  let note = defaultNote || ''
  if (inquiry.delivery_option) note += `${note ? '\n\n' : ''}Abwicklung: ${inquiry.delivery_option}`
  if (inquiry.delivery_notes) note += `${note ? '\n' : ''}Lieferhinweise: ${inquiry.delivery_notes}`

  const { year2, max } = await nextOfferNumber(docDate)
  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    let number = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      number = `AG${String(year2).padStart(2, '0')}${max + 1 + attempt}WF`
      const clash = await queryOne('SELECT id FROM offers WHERE number = :number', { number })
      if (!clash) break
    }
    const customerName = [inquiry.first_name, inquiry.last_name].filter(Boolean).join(' ')
      || inquiry.company || inquiry.email
    const [res]: any = await conn.query(
      `INSERT INTO offers
         (number, contact_id, customer_name, customer_street, customer_zip, customer_city,
          customer_country, doc_date, valid_until, subject, lang, vat_rate, vat_free, note, status)
       VALUES
         (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'de', 20, 0, ?, 'entwurf')`,
      [number, contactId, customerName, inquiry.street, inquiry.zip, inquiry.city,
       'AT', docDate, validUntil, subject, note.slice(0, 5000)]
    )
    const offerId = res.insertId
    let position = 0
    for (const it of items) {
      position++
      const price = it.monthly_price !== null ? Number(it.monthly_price) : 0
      const description = `${it.title} – Mietdauer ${it.duration_months ?? '–'} Monate` +
        (it.monthly_price === null ? ' (Preis auf Anfrage)' : '')
      await conn.query(
        `INSERT INTO offer_items (offer_id, position, description, quantity, unit, unit_price)
         VALUES (?, ?, ?, ?, 'Mon.', ?)`,
        [offerId, position, description.slice(0, 250), it.quantity, price]
      )
    }
    // In der Kundentabelle (Dokumente) auftauchen lassen
    const netto = items.reduce((s: number, it: any) =>
      s + (it.monthly_price !== null ? Number(it.monthly_price) * it.quantity : 0), 0)
    const brutto = Math.round(netto * 1.2 * 100) / 100
    await conn.query(
      `INSERT IGNORE INTO documents (contact_id, kind, number, customer_raw, doc_date, total, return_date, file_path, source)
       VALUES (?, 'angebot', ?, NULL, ?, ?, NULL, ?, 'dashboard')`,
      [contactId, number, docDate, brutto, `dashboard/${number.replace(/[^a-z0-9/_-]+/gi, '_')}.pdf`]
    )
    await conn.query('UPDATE rental_inquiries SET offer_id = ? WHERE id = ?', [offerId, inquiryId])
    await conn.commit()
    return { offerId, number, created: true }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
