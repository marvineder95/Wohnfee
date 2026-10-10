import { randomBytes } from 'node:crypto'
import { getDb, query, queryOne } from './db'
import { syncItemStatus } from './inventory-sync'
import { todayVienna } from './site'

// Reservierung von Mietmöbeln zwischen Anfrage und Kundenentscheidung.
//
//   Mietanfrage eingegangen  → Möbel 3 Tage reserviert (nicht im Shop)
//   Angebot verschickt       → Angebot 3 Tage gültig, Reservierung bis Ende des Gültigkeitstags
//   nach 2 Tagen ohne Antwort → Erinnerungsmail an den Kunden
//   angenommen               → Projekt mit den Möbeln (vermietet bis Abholung erledigt)
//   abgelehnt / abgelaufen   → Möbel sofort wieder im Shop
//
// Reserviert zählt eine Anfrage nur mit reservation_status = 'aktiv' UND reserved_until in der
// Zukunft – der Ablauf greift damit sofort, auch bevor der Job den Status nachzieht.

export const RESERVE_DAYS = 3
export const OFFER_VALID_DAYS = 3
export const REMINDER_AFTER_HOURS = 48

/** SQL: reservierte Menge je Inventarobjekt (für JOINs) */
export const RESERVED_SQL = `
  SELECT rii.item_id, SUM(rii.quantity) AS reserved
  FROM rental_inquiry_items rii JOIN rental_inquiries r ON r.id = rii.inquiry_id
  WHERE r.reservation_status = 'aktiv' AND r.reserved_until > UTC_TIMESTAMP() AND rii.item_id IS NOT NULL
  GROUP BY rii.item_id`

export async function reservedQuantity(itemId: number, exceptInquiryId?: number): Promise<number> {
  const row: any = await queryOne(
    `SELECT COALESCE(SUM(rii.quantity), 0) AS n
     FROM rental_inquiry_items rii JOIN rental_inquiries r ON r.id = rii.inquiry_id
     WHERE rii.item_id = :itemId AND r.reservation_status = 'aktiv' AND r.reserved_until > UTC_TIMESTAMP()
       ${exceptInquiryId ? 'AND r.id <> :exceptInquiryId' : ''}`,
    { itemId, exceptInquiryId }
  )
  return Number(row?.n || 0)
}

/** Wer hält die Reservierung? (für Hinweise im Dashboard) */
export async function reservationHolders(itemId: number): Promise<string[]> {
  const rows: any[] = await query(
    `SELECT r.number, DATE_FORMAT(r.reserved_until, '%Y-%m-%dT%H:%i:%sZ') AS until
     FROM rental_inquiry_items rii JOIN rental_inquiries r ON r.id = rii.inquiry_id
     WHERE rii.item_id = :itemId AND r.reservation_status = 'aktiv' AND r.reserved_until > UTC_TIMESTAMP()
     ORDER BY r.reserved_until`, { itemId }
  )
  return rows.map((r) => `${r.number} bis ${fmtDateTime(r.until)}`)
}

/** Ende eines Kalendertags in Wien als UTC-Datum (für „gültig bis …") */
export function viennaEndOfDay(iso: string): Date {
  const guess = new Date(`${iso}T23:59:59Z`)
  const local = new Date(guess.toLocaleString('en-US', { timeZone: 'Europe/Vienna' }))
  const utc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }))
  return new Date(guess.getTime() - (local.getTime() - utc.getTime()))
}

export function fmtDateTime(v: string | Date) {
  return new Date(v).toLocaleString('de-AT', {
    timeZone: 'Europe/Vienna', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const toSql = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

/** Neue Mietanfrage: Möbel für RESERVE_DAYS reservieren */
export async function startReservation(inquiryId: number) {
  await query(
    `UPDATE rental_inquiries SET reservation_status = 'aktiv',
       reserved_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${RESERVE_DAYS} DAY) WHERE id = :id`,
    { id: inquiryId }
  )
}

/** Öffentlichen Link-Token eines Angebots holen bzw. anlegen */
export async function ensureOfferToken(offerId: number): Promise<string> {
  const row: any = await queryOne('SELECT public_token FROM offers WHERE id = :id', { id: offerId })
  if (row?.public_token) return row.public_token
  const token = randomBytes(24).toString('base64url')
  await query('UPDATE offers SET public_token = :token WHERE id = :id AND public_token IS NULL', { token, id: offerId })
  const again: any = await queryOne('SELECT public_token FROM offers WHERE id = :id', { id: offerId })
  return again.public_token
}

export const isOfferToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{32}$/.test(t)

/** Mietanfrage zu einem Angebot (falls es aus dem Shop kommt) */
export async function inquiryForOffer(offerId: number): Promise<any | null> {
  return queryOne('SELECT * FROM rental_inquiries WHERE offer_id = :id ORDER BY id DESC LIMIT 1', { id: offerId })
}

/**
 * Angebot wird verschickt: bei Mietangeboten gilt es OFFER_VALID_DAYS ab heute
 * (ein im Dashboard bewusst längeres Datum bleibt) und die Reservierung läuft bis dahin.
 * Gibt das (ggf. neue) „gültig bis" zurück.
 */
export async function prepareOfferSend(offerId: number): Promise<string | null> {
  const offer: any = await queryOne('SELECT valid_until FROM offers WHERE id = :id', { id: offerId })
  const inquiry = await inquiryForOffer(offerId)
  let validUntil: string | null = offer?.valid_until ? String(offer.valid_until).slice(0, 10) : null
  if (inquiry) {
    const min = todayVienna(OFFER_VALID_DAYS)
    if (!validUntil || validUntil < min) validUntil = min
    await query('UPDATE offers SET valid_until = :v WHERE id = :id', { v: validUntil, id: offerId })
    if (!['angenommen', 'abgelehnt'].includes(inquiry.reservation_status)) {
      // Reservierung schon abgelaufen/freigegeben? Nur neu reservieren, wenn alles noch frei ist.
      const active = inquiry.reservation_status === 'aktiv' && new Date(inquiry.reserved_until).getTime() > Date.now()
      if (!active) {
        const missing = await unavailableItems(inquiry.id)
        if (missing.length) {
          throw createError({
            statusCode: 409,
            statusMessage: `Die Reservierung ist abgelaufen und inzwischen sind nicht mehr alle Möbel frei (${missing.slice(0, 3).join(', ')}). Bitte das Angebot anpassen.`
          })
        }
      }
      await query(
        `UPDATE rental_inquiries SET reservation_status = 'aktiv', reserved_until = :until WHERE id = :id`,
        { until: toSql(viennaEndOfDay(validUntil)), id: inquiry.id }
      )
    }
  }
  await query('UPDATE offers SET sent_at = UTC_TIMESTAMP(), reminder_sent_at = NULL WHERE id = :id', { id: offerId })
  return validUntil
}

/** Möbel einer Mietanfrage, die (ohne deren eigene Reservierung) nicht mehr frei sind */
async function unavailableItems(inquiryId: number): Promise<string[]> {
  const items: any[] = await query(
    `SELECT rii.item_id, rii.title, rii.quantity, i.quantity AS stock, i.status
     FROM rental_inquiry_items rii LEFT JOIN inventory_items i ON i.id = rii.item_id
     WHERE rii.inquiry_id = :id`, { id: inquiryId }
  )
  const missing: string[] = []
  for (const it of items) {
    if (!it.item_id || it.stock === null) { missing.push(it.title); continue }
    const assigned: any = await queryOne('SELECT COALESCE(SUM(quantity),0) AS n FROM project_items WHERE item_id = :i', { i: it.item_id })
    const free = Number(it.stock) - Number(assigned?.n || 0) - await reservedQuantity(it.item_id, inquiryId)
    if (it.status !== 'lager' && it.status !== 'vermietet') missing.push(it.title)
    else if (free < Number(it.quantity)) missing.push(it.title)
  }
  return missing
}

export type Decision = { by: 'kunde' | 'team'; name?: string | null; reason?: string | null }

/**
 * Angebot annehmen. Bei Mietangeboten: Projekt anlegen, Möbel zuweisen, Liefertermin im Kalender.
 * Wirft einen Fehler mit statusMessage, wenn es nicht (mehr) angenommen werden kann.
 */
export async function acceptOffer(offerId: number, d: Decision): Promise<{ projectId: number | null }> {
  const offer: any = await queryOne('SELECT * FROM offers WHERE id = :id', { id: offerId })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  if (offer.status === 'abgelehnt' && d.by === 'kunde') {
    throw createError({ statusCode: 409, statusMessage: 'Dieses Angebot wurde bereits abgelehnt.' })
  }
  const inquiry = await inquiryForOffer(offerId)
  if (offer.status === 'angenommen' && (!inquiry || inquiry.project_id)) return { projectId: inquiry?.project_id || null }
  if (d.by === 'kunde' && offer.valid_until && String(offer.valid_until).slice(0, 10) < todayVienna()) {
    throw createError({ statusCode: 410, statusMessage: 'Dieses Angebot ist leider abgelaufen.' })
  }

  let projectId: number | null = null
  if (inquiry && !inquiry.project_id) {
    // Reservierung abgelaufen? Dann nur, wenn alles noch frei ist.
    const active = inquiry.reservation_status === 'aktiv' && new Date(inquiry.reserved_until).getTime() > Date.now()
    if (!active) {
      const missing = await unavailableItems(inquiry.id)
      if (missing.length) {
        throw createError({
          statusCode: 409,
          statusMessage: `Leider sind nicht mehr alle Möbel verfügbar (${missing.slice(0, 3).join(', ')}). Wir melden uns mit einer Alternative.`
        })
      }
    }
    projectId = await createRentalProject(inquiry, offer)
  }

  await query(
    `UPDATE offers SET status = 'angenommen', responded_at = UTC_TIMESTAMP(), response_by = :by,
       response_name = :name, decline_reason = NULL WHERE id = :id`,
    { by: d.by, name: d.name?.slice(0, 190) || null, id: offerId }
  )
  if (inquiry) {
    await query(
      `UPDATE rental_inquiries SET reservation_status = 'angenommen', status = 'beantwortet',
         project_id = COALESCE(:pid, project_id) WHERE id = :id`,
      { pid: projectId, id: inquiry.id }
    )
  }
  if (offer.project_id) {
    // Mietverlängerung: im Projekt vermerken – Deadline passt das Team an
    const line = `Verlängerung ${offer.number} angenommen am ${new Date().toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' })}`
    await query(
      `UPDATE projects SET status_info = CONCAT_WS('\n', NULLIF(status_info, ''), :line), next_step = 'Neues Mietende eintragen' WHERE id = :id`,
      { line, id: offer.project_id }
    )
  }
  return { projectId: projectId || offer.project_id || null }
}

async function createRentalProject(inquiry: any, offer: any): Promise<number> {
  const name = [inquiry.first_name, inquiry.last_name].filter(Boolean).join(' ')
  const customer = (inquiry.company ? `${inquiry.company}${name ? ` (${name})` : ''}` : name || inquiry.email).slice(0, 190)
  const fmt = (v: any) => v ? String(v).slice(0, 10).split('-').reverse().join('.') : ''
  const items: any[] = await query(
    'SELECT item_id, title, quantity FROM rental_inquiry_items WHERE inquiry_id = :id AND item_id IS NOT NULL', { id: inquiry.id }
  )
  const conn = await getDb().getConnection()
  let projectId = 0
  try {
    await conn.beginTransaction()
    const [res]: any = await conn.query(
      `INSERT INTO projects (category, customer, title, status_info, deadline_text, deadline_date, next_step, date_info, source)
       VALUES ('leasing', ?, ?, ?, 'Mietende', ?, 'Lieferung planen', ?, 'shop')`,
      [customer, `Möbelmiete ${inquiry.number}`.slice(0, 190),
       [`Angebot ${offer.number} angenommen`, `${inquiry.street || ''}, ${inquiry.zip || ''} ${inquiry.city || ''}`.trim(),
        inquiry.phone ? `Tel. ${inquiry.phone}` : '', inquiry.email].filter(Boolean).join('\n'),
       inquiry.end_date || null, `${fmt(inquiry.start_date)} – ${fmt(inquiry.end_date)}`.slice(0, 64)]
    )
    projectId = res.insertId
    for (const it of items) {
      await conn.query(
        `INSERT INTO project_items (project_id, item_id, quantity, note) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [projectId, it.item_id, it.quantity, `aus ${inquiry.number}`]
      )
    }
    if (inquiry.start_date) {
      await conn.query(
        `INSERT INTO calendar_events (title, type, event_date, all_day, location, project_id, notes, created_by_name)
         VALUES (?, 'lieferung', ?, 1, ?, ?, ?, 'Automatisch')`,
        [`Lieferung ${customer}`.slice(0, 190), inquiry.start_date,
         [inquiry.street, [inquiry.zip, inquiry.city].filter(Boolean).join(' ')].filter(Boolean).join(', ').slice(0, 190) || null,
         projectId, `Mietbeginn laut Angebot ${offer.number} – Uhrzeit mit dem Kunden abstimmen.`]
      )
    }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
  for (const it of items) await syncItemStatus(it.item_id)
  return projectId
}

/** Angebot ablehnen → Reservierung sofort freigeben */
export async function declineOffer(offerId: number, d: Decision) {
  const offer: any = await queryOne('SELECT id, status FROM offers WHERE id = :id', { id: offerId })
  if (!offer) throw createError({ statusCode: 404, statusMessage: 'Angebot nicht gefunden' })
  if (offer.status === 'angenommen' && d.by === 'kunde') {
    throw createError({ statusCode: 409, statusMessage: 'Dieses Angebot wurde bereits angenommen.' })
  }
  await query(
    `UPDATE offers SET status = 'abgelehnt', responded_at = UTC_TIMESTAMP(), response_by = :by,
       response_name = :name, decline_reason = :reason WHERE id = :id`,
    { by: d.by, name: d.name?.slice(0, 190) || null, reason: d.reason?.slice(0, 2000) || null, id: offerId }
  )
  await query(
    `UPDATE rental_inquiries SET reservation_status = 'abgelehnt', status = IF(status IN ('neu','in_bearbeitung'), 'beantwortet', status)
     WHERE offer_id = :id AND (reservation_status IS NULL OR reservation_status IN ('aktiv','abgelaufen'))`,
    { id: offerId }
  )
}

/** Dashboard: Reservierung verlängern (+RESERVE_DAYS ab jetzt bzw. ab bisherigem Ende) */
export async function extendReservation(inquiryId: number) {
  await query(
    `UPDATE rental_inquiries SET reservation_status = 'aktiv',
       reserved_until = DATE_ADD(GREATEST(COALESCE(reserved_until, UTC_TIMESTAMP()), UTC_TIMESTAMP()), INTERVAL ${RESERVE_DAYS} DAY)
     WHERE id = :id AND (reservation_status IS NULL OR reservation_status IN ('aktiv','abgelaufen','freigegeben'))`,
    { id: inquiryId }
  )
}

/** Dashboard: Reservierung von Hand aufheben */
export async function releaseReservation(inquiryId: number) {
  await query(
    `UPDATE rental_inquiries SET reservation_status = 'freigegeben' WHERE id = :id AND reservation_status = 'aktiv'`,
    { id: inquiryId }
  )
}
