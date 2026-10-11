import { query, queryOne } from './db'
import { isOfferToken, withdrawalDeadline } from './reservations'
import { todayVienna } from './site'

// Angebot über den öffentlichen Link laden (ohne Login). Unbekannte/ungültige Token → 404.
export async function offerByToken(token: unknown): Promise<any> {
  if (!isOfferToken(token)) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  const offer: any = await queryOne('SELECT * FROM offers WHERE public_token = :token', { token })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  return offer
}

/** Öffentliche Sicht – nur, was ohnehin im Angebots-PDF steht, plus Mietdetails mit Fotos */
export async function publicOfferView(offer: any) {
  const items: any[] = await query(
    'SELECT description, quantity, unit, unit_price FROM offer_items WHERE offer_id = :id ORDER BY position', { id: offer.id })
  const lines = items.map((it) => {
    const qty = Number(it.quantity) || 0
    const price = Number(it.unit_price) || 0
    return { description: it.description, quantity: qty, unit: it.unit || '', unitPrice: price, total: Math.round(qty * price * 100) / 100 }
  })
  const netto = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100
  const vat = offer.vat_free ? 0 : Math.round(netto * (Number(offer.vat_rate) || 20)) / 100
  const validUntil = offer.valid_until ? String(offer.valid_until).slice(0, 10) : null

  const inq: any = await queryOne(
    `SELECT id, number, start_date, end_date, duration_months, street, zip, city, monthly_total,
            reservation_status, reserved_until, company, email
     FROM rental_inquiries WHERE offer_id = :id ORDER BY id DESC LIMIT 1`, { id: offer.id })
  let rental: any = null
  if (inq) {
    const furniture: any[] = await query(
      `SELECT rii.title, i.title_en AS titleEn, rii.quantity, rii.monthly_price AS monthlyPrice, i.image_path AS image
       FROM rental_inquiry_items rii LEFT JOIN inventory_items i ON i.id = rii.item_id
       WHERE rii.inquiry_id = :id ORDER BY rii.id`, { id: inq.id })
    const reservedUntil = inq.reserved_until ? new Date(inq.reserved_until) : null
    rental = {
      startDate: inq.start_date, endDate: inq.end_date, months: inq.duration_months,
      address: [inq.street, [inq.zip, inq.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      monthlyTotal: inq.monthly_total !== null ? Number(inq.monthly_total) : null,
      reservedUntil: reservedUntil?.toISOString() || null,
      reserved: inq.reservation_status === 'aktiv' && !!reservedUntil && reservedUntil.getTime() > Date.now(),
      furniture: furniture.map((f) => ({
        title: f.title, titleEn: f.titleEn, quantity: f.quantity,
        monthlyPrice: f.monthlyPrice !== null ? Number(f.monthlyPrice) : null, image: f.image || null
      }))
    }
  }
  // Fernabsatz: Widerrufsrecht nur für Privatkunden; vorzeitiger Beginn, wenn Mietbeginn in die 14-Tage-Frist fällt
  const deadline = withdrawalDeadline(offer)
  const contact: any = offer.contact_id ? await queryOne('SELECT email FROM contacts WHERE id = :id', { id: offer.contact_id }) : null
  const fagg = {
    customerType: offer.customer_type || null,
    customerTypeDefault: inq?.company ? 'firma' : 'privat',
    earlyStartNeeded: !!inq?.start_date && String(inq.start_date).slice(0, 10) <= todayVienna(14),
    earlyStart: !!offer.early_start,
    canWithdraw: !!deadline && deadline.getTime() > Date.now(),
    withdrawDeadline: deadline?.toISOString() || null,
    withdrawnAt: offer.withdrawn_at ? new Date(offer.withdrawn_at).toISOString() : null,
    email: contact?.email || inq?.email || ''
  }
  return {
    fagg,
    number: offer.number, docDate: String(offer.doc_date).slice(0, 10), validUntil,
    subject: offer.subject, customerName: offer.customer_name, lang: offer.lang === 'en' ? 'en' : 'de',
    status: offer.status, expired: !!validUntil && validUntil < todayVienna() && !['angenommen', 'abgelehnt', 'widerrufen'].includes(offer.status),
    respondedAt: offer.responded_at, responseName: offer.response_name,
    vatFree: !!offer.vat_free, vatRate: Number(offer.vat_rate) || 20, vatNote: offer.vat_note, note: offer.note,
    lines, netto, vat, brutto: Math.round((netto + vat) * 100) / 100,
    rental
  }
}
