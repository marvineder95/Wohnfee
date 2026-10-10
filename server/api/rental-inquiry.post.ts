import { query, queryOne } from '../utils/db'
import { clientIp, assertNotLimited, countAttempt } from '../utils/rate-limit'
import { assignedQuantity } from '../utils/inventory-sync'
import { reservedQuantity, startReservation } from '../utils/reservations'
import { rentalPerks, transportPerk, MIN_MONTHLY, OTHER_STATES_DISCOUNT } from '../../shared/rental-perks'

function clean(v: any, max = 190): string | null {
  return String(v ?? '').trim().slice(0, max) || null
}

function dateOk(v: any): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

// POST /api/rental-inquiry — Mietanfrage aus dem Furniture-Leasing-Shop speichern.
// Öffentlicher Endpunkt (kein Login), aber nur öffentliche Inventardaten werden gelesen
// und die monatlichen Preise werden SERVERSEITIG aus der Datenbank neu berechnet.
export default defineEventHandler(async (event) => {
  // Spam-Schutz: max. 5 Mietanfragen je IP und Stunde
  const limitKey = `rental:${clientIp(event)}`
  assertNotLimited(limitKey, 5, 60 * 60 * 1000)
  const body = await readBody(event)

  // Pflichtfelder
  const lastName = clean(body?.lastName, 64)
  const email = clean(body?.email, 190)
  const street = clean(body?.street, 190)
  const zip = clean(body?.zip, 16)
  const city = clean(body?.city, 128)
  const startDate = clean(body?.startDate, 10)
  const duration = Number(body?.durationMonths)
  if (!lastName || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte Name und eine gültige E-Mail-Adresse angeben.' })
  }
  if (!street || !zip || !city) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte die Lieferadresse vervollständigen.' })
  }
  if (!dateOk(startDate) || !Number.isInteger(duration) || duration < 1 || duration > 48) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte Mietbeginn und Mietdauer wählen.' })
  }

  // Positionen serverseitig auflösen und bepreisen
  const rawItems: any[] = Array.isArray(body?.items) ? body.items.slice(0, 50) : []
  if (!rawItems.length) {
    throw createError({ statusCode: 400, statusMessage: 'Der Warenkorb ist leer.' })
  }
  const items: Array<{ item_id: number; title: string; quantity: number; duration_months: number; monthly_price: number | null }> = []
  let monthlyTotal = 0
  for (const raw of rawItems) {
    const itemId = Number(raw?.id)
    const qty = Math.min(99, Math.max(1, Number(raw?.quantity) || 1))
    const dur = Number(raw?.durationMonths)
    if (!Number.isInteger(itemId) || itemId < 1 || ![1, 3].includes(dur)) continue
    const item: any = await queryOne(
      `SELECT id, title, quantity AS stock, rentable, status,
              rent_price_1m AS p1, rent_price_3m AS p3
       FROM inventory_items WHERE id = :id`, { id: itemId }
    )
    // nur vermietbare, lagernde Objekte, Menge begrenzt auf realen Bestand
    if (!item || !item.rentable || item.status !== 'lager') continue
    // frei = Bestand − in Projekten − von offenen Anfragen reserviert
    const stock = Math.max(0, (Number(item.stock) || 0) - await assignedQuantity(itemId) - await reservedQuantity(itemId))
    if (stock < 1) continue
    const price = dur === 1 ? (item.p1 !== null ? Number(item.p1) : null)
      : (item.p3 !== null ? Number(item.p3) : null)
    const finalQty = Math.min(qty, stock)
    items.push({
      item_id: item.id, title: String(item.title).slice(0, 190), quantity: finalQty,
      duration_months: dur, monthly_price: price
    })
    if (price !== null) monthlyTotal += price * finalQty
  }
  if (!items.length) {
    throw createError({ statusCode: 400, statusMessage: 'Keine der gewählten Positionen ist derzeit mietbar.' })
  }

  // Mindestmietwert & Transport-Vorteil – serverseitig mit DB-Preisen geprüft
  const perkLines = items.map((i) => ({ price: i.monthly_price, quantity: i.quantity, durationMonths: i.duration_months }))
  if (!rentalPerks(perkLines).minReached) {
    throw createError({ statusCode: 400, statusMessage: `Der Mindestmietwert beträgt € ${MIN_MONTHLY} pro Monat.` })
  }
  const selfPickup = /selbst/i.test(String(body?.deliveryOption ?? ''))
  const perk = selfPickup ? 'none' : transportPerk(perkLines, zip, duration)
  const perkNote = perk === 'free'
    ? 'Transport: GRATIS (Wien, Mietwert ab 3 Monaten erreicht)'
    : perk === 'discount'
      ? `Transport: −${Math.round(OTHER_STATES_DISCOUNT * 100)} % Rabatt auf Liefer-/Abholgebühr (außerhalb Wiens)`
      : null
  // Deko-Paket nur, wenn im Dashboard aktiviert (Preis kommt aus den Konditionen)
  const { getTransportSettings } = await import('../utils/transport')
  const ts = await getTransportSettings()
  const deco = !!body?.decoPackage && ts.decoEnabled && ts.decoPrice > 0
  const decoNote = deco ? `${ts.decoTitle} gewünscht (einmalig € ${ts.decoPrice.toLocaleString('de-AT', { minimumFractionDigits: 2 })} netto)` : null
  const notes = [perkNote, decoNote, clean(body?.notes, 2000)].filter(Boolean).join('\n') || null

  // Enddatum aus Start + Dauer
  const start = new Date(String(startDate) + 'T00:00:00Z')
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + duration)
  const endDate = end.toISOString().slice(0, 10)

  const result: any = await query(
    `INSERT INTO rental_inquiries
       (number, first_name, last_name, company, email, phone, street, zip, city, country,
        start_date, end_date, duration_months, delivery_option, delivery_notes, monthly_total, notes, deco_package)
     VALUES
       ('PENDING', :fn, :ln, :company, :email, :phone, :street, :zip, :city, :country,
        :start, :end, :dur, :dopt, :dnotes, :total, :notes, :deco)`,
    {
      fn: clean(body?.firstName, 64), ln: lastName,
      company: clean(body?.company, 128), email,
      phone: clean(body?.phone, 64),
      street, zip, city,
      country: clean(body?.country, 64) || 'Österreich',
      start: startDate, end: endDate, dur: duration,
      dopt: clean(body?.deliveryOption, 64) || 'Lieferung & Abholung durch WOHNFEE',
      dnotes: clean(body?.deliveryNotes, 1000),
      total: Math.round(monthlyTotal * 100) / 100,
      notes,
      deco: deco ? 1 : 0
    }
  )
  countAttempt(limitKey, 60 * 60 * 1000)
  const inquiryId = result.insertId
  const year = new Date().getFullYear()
  const number = `M${year}-${String(inquiryId).padStart(4, '0')}`
  await query('UPDATE rental_inquiries SET number = :n WHERE id = :id', { n: number, id: inquiryId })

  for (const it of items) {
    await query(
      `INSERT INTO rental_inquiry_items (inquiry_id, item_id, title, quantity, duration_months, monthly_price)
       VALUES (:iid, :item, :title, :qty, :dur, :price)`,
      { iid: inquiryId, item: it.item_id, title: it.title, qty: it.quantity, dur: it.duration_months, price: it.monthly_price }
    )
  }

  // Möbel für 3 Tage reservieren – sie verschwinden sofort aus dem Shop
  await startReservation(inquiryId)

  // Benachrichtigung an office@wohnfee.at — Fehler beim Mailversand dürfen
  // die Anfrage nicht scheitern lassen (ohne SMTP wird sie nur geloggt).
  try {
    const { sendMail, rentalInquiryMail } = await import('../utils/mailer')
    const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const mail = rentalInquiryMail({
      number,
      name: [clean(body?.firstName, 64), lastName].filter(Boolean).join(' '),
      email,
      phone: clean(body?.phone, 64),
      address: [street, `${zip} ${city}`, clean(body?.country, 64) || 'Österreich'].filter(Boolean).join(', '),
      period: `${fmt(String(startDate))} – ${fmt(endDate)} (${duration} Monate)`,
      deliveryOption: clean(body?.deliveryOption, 64) || 'Lieferung & Abholung durch WOHNFEE',
      deliveryNotes: clean(body?.deliveryNotes, 1000),
      notes,
      items: items.map(i => ({ title: i.title, quantity: i.quantity, durationMonths: i.duration_months, monthlyPrice: i.monthly_price })),
      monthlyTotal: Math.round(monthlyTotal * 100) / 100
    })
    await sendMail('office@wohnfee.at', mail.subject, mail.text, mail.html)
  } catch (e) {
    console.error('[rental-inquiry] Benachrichtigungsmail fehlgeschlagen:', e)
  }

  // Push an das Team (PWA)
  import('../utils/push').then(({ notifyTeam }) => notifyTeam({
    title: 'Neue Mietanfrage',
    body: `${[clean(body?.firstName, 64), lastName].filter(Boolean).join(' ')} · ${city} · ${(Math.round(monthlyTotal * 100) / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}/Monat`,
    url: '/admin/mietanfragen',
    tag: `rental-${inquiryId}`
  })).catch(() => {})

  // Angebot inkl. berechneter Transportkosten automatisch als Entwurf anlegen –
  // im Hintergrund, damit der Kunde nicht auf die Routenberechnung warten muss
  import('../utils/offer-create')
    .then(({ createOfferForInquiry }) => createOfferForInquiry(inquiryId))
    .then(r => console.log(`[rental-inquiry] Angebot ${r.number} automatisch erstellt`))
    .catch(e => console.error('[rental-inquiry] Automatisches Angebot fehlgeschlagen:', e?.message || e))

  return { ok: true, number, monthlyTotal: Math.round(monthlyTotal * 100) / 100, itemCount: items.length }
})
