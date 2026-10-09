import { todayVienna } from './site'
import { getDb, query, queryOne } from './db'
import { nextOfferNumber } from './invoices'
import { getSetting } from './settings'

// Erzeugt aus einer Mietanfrage (rental_inquiries) automatisch ein Angebot
// im Wohnfee-Design (Tabelle offers + offer_items) und verknuepft beides.
// Idempotent: existiert bereits ein Angebot, wird das Bestehende zurueckgegeben.
// Aufgerufen vom Dashboard: Mietanfrage → „Angebot erstellen".
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
  const contactId = await findOrCreateContact({
    email: inquiry.email, firstName: inquiry.first_name, lastName: inquiry.last_name, company: inquiry.company,
    street: inquiry.street, zip: inquiry.zip, city: inquiry.city, phone: inquiry.phone, source: 'shop'
  })

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
  // Transport-Vorteil (Gratis-Transport Wien / Rabatt) aus der Anfrage übernehmen
  if (inquiry.notes) note += `${note ? '\n' : ''}${inquiry.notes}`

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
    await conn.query(
      "UPDATE rental_inquiries SET offer_id = ?, status = IF(status = 'neu', 'in_bearbeitung', status) WHERE id = ?",
      [offerId, inquiryId])
    await conn.commit()
    return { offerId, number, created: true }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}


/** Kontakt per E-Mail finden oder neu anlegen (Quelle z. B. 'shop' oder 'website') */
export async function findOrCreateContact(data: {
  email: string; firstName?: string | null; lastName?: string | null; company?: string | null
  street?: string | null; zip?: string | null; city?: string | null; phone?: string | null; source: string
}): Promise<number> {
  const existing: any = await queryOne(
    'SELECT id FROM contacts WHERE LOWER(email) = LOWER(:email) LIMIT 1', { email: data.email }
  )
  if (existing) return existing.id
  const isCompany = !!data.company && !data.lastName
  const res: any = await query(
    `INSERT INTO contacts (type, name1, name2, street, zip, city, email, phone, source)
     VALUES (:type, :n1, :n2, :street, :zip, :city, :email, :phone, :source)`,
    {
      type: isCompany ? 'firma' : 'person',
      n1: isCompany ? data.company : (data.firstName || null),
      n2: isCompany ? null : (data.lastName || null),
      street: data.street || null, zip: data.zip || null, city: data.city || null,
      email: data.email, phone: data.phone || null, source: data.source
    }
  )
  return res.insertId
}

// Kontaktanfrage (Website-Formular) → Kontakt + Angebotsentwurf.
// Der Anfragetext landet als Notiz im Angebot; Positionen trägt das Team selbst ein.
export async function createOfferForContactInquiry(inquiryId: number): Promise<{ offerId: number; number: string; created: boolean }> {
  const inq: any = await queryOne('SELECT * FROM contact_inquiries WHERE id = :id', { id: inquiryId })
  if (!inq) throw new Error('Anfrage nicht gefunden')
  if (inq.offer_id) {
    const existing: any = await queryOne('SELECT id, number FROM offers WHERE id = :id', { id: inq.offer_id })
    if (existing) return { offerId: existing.id, number: existing.number, created: false }
  }
  const parts = String(inq.name || '').trim().split(/\s+/)
  const lastName = parts.length > 1 ? parts.pop()! : parts[0] || null
  const firstName = parts.length ? parts.join(' ') : null
  const contactId = inq.contact_id || await findOrCreateContact({
    email: inq.email, firstName, lastName, phone: inq.phone, source: 'website'
  })
  const docDate = todayVienna()
  const defaultNote = await getSetting('offer_default_note_de')
  const note = [defaultNote || '', `Ihre Anfrage vom ${new Date(inq.created_at).toLocaleDateString('de-AT')}:\n${inq.message}`]
    .filter(Boolean).join('\n\n').slice(0, 5000)
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
    const [res]: any = await conn.query(
      `INSERT INTO offers
         (number, contact_id, customer_name, customer_country, doc_date, valid_until, subject, lang, vat_rate, vat_free, note, status)
       VALUES (?, ?, ?, 'AT', ?, ?, ?, 'de', 20, 0, ?, 'entwurf')`,
      [number, contactId, inq.name || inq.email, docDate, todayVienna(14), (inq.subject || 'Home Staging').slice(0, 190), note]
    )
    const offerId = res.insertId
    // Platzhalter-Position – wird im Angebot angepasst
    await conn.query(
      `INSERT INTO offer_items (offer_id, position, description, quantity, unit, unit_price)
       VALUES (?, 1, ?, 1, 'Pausch.', 0)`,
      [offerId, `${inq.subject || 'Leistung'} – laut Besprechung`.slice(0, 250)]
    )
    await conn.query(
      "UPDATE contact_inquiries SET offer_id = ?, contact_id = ?, status = IF(status = 'neu', 'gelesen', status) WHERE id = ?",
      [offerId, contactId, inquiryId])
    await conn.commit()
    return { offerId, number, created: true }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
