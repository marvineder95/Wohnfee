import { requireAdmin } from '../../../../utils/admin-auth'
import { getDb, queryOne } from '../../../../utils/db'
import { nextOfferNumber } from '../../../../utils/invoices'
import { todayVienna } from '../../../../utils/site'

// POST /api/admin/projects/:id/extension-offer — Angebotsentwurf „Mietverlängerung".
// Der Preis einer Verlängerung richtet sich nicht nach den einzelnen Möbeln, sondern wird frei
// festgelegt (alte Rechnungen, Erfahrung): daher nur EINE Pauschal-Position, Preis zum Ausfüllen.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const project: any = await queryOne('SELECT * FROM projects WHERE id = :id', { id })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  // Kunde: passenden Kontakt über den Namen suchen (Projekte speichern nur Freitext)
  const customer = String(project.customer || project.title || 'Kunde').slice(0, 190)
  const firstPart = customer.split(/[,–-]/)[0].trim()
  const contact: any = firstPart.length >= 3
    ? await queryOne(
      `SELECT id, street, zip, city FROM contacts
       WHERE status = 'aktiv' AND (CONCAT_WS(' ', name1, name2) LIKE :q OR name1 LIKE :q) LIMIT 1`,
      { q: `%${firstPart}%` })
    : null

  const fmt = (d: any) => d ? String(d).slice(0, 10).split('-').reverse().join('.') : ''
  const docDate = todayVienna()
  const { year2, max } = await nextOfferNumber(docDate)
  const conn = await getDb().getConnection()
  try {
    await conn.beginTransaction()
    let number = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      number = `AG${String(year2).padStart(2, '0')}${max + 1 + attempt}WF`
      if (!(await queryOne('SELECT id FROM offers WHERE number = :number', { number }))) break
    }
    const note = `Verlängerung der Leihdauer für ${project.title || 'Ihr Projekt'}` +
      (project.deadline_date ? ` – bisher vereinbart bis ${fmt(project.deadline_date)}.` : '.') +
      '\nDie Preise verstehen sich pro Monat.'
    const [res]: any = await conn.query(
      `INSERT INTO offers (number, contact_id, customer_name, customer_street, customer_zip, customer_city, customer_country,
                           doc_date, valid_until, subject, lang, vat_rate, vat_free, note, status, project_id)
       VALUES (?, ?, ?, ?, ?, ?, 'AT', ?, ?, ?, 'de', 20, 0, ?, 'entwurf', ?)`,
      [number, contact?.id || null, customer, contact?.street || null, contact?.zip || null, contact?.city || null,
       docDate, todayVienna(14), `Mietverlängerung ${project.title || ''}`.trim().slice(0, 190), note, id]
    )
    const offerId = res.insertId
    // Neuer Zeitraum: ab dem Tag nach dem bisherigen Ende, 1 Monat (im Angebot anpassbar)
    let period = ''
    if (project.deadline_date) {
      const from = new Date(String(project.deadline_date).slice(0, 10) + 'T12:00:00Z')
      from.setUTCDate(from.getUTCDate() + 1)
      const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1); to.setUTCDate(to.getUTCDate() - 1)
      period = ` (${fmt(from.toISOString())}–${fmt(to.toISOString())})`
    }
    await conn.query(
      `INSERT INTO offer_items (offer_id, position, description, quantity, unit, unit_price) VALUES (?, 1, ?, 1, 'Mon.', 0)`,
      [offerId, `Verlängerung ${project.title || 'Staging'} inkl. Leihmöbel, Beleuchtungen & Accessoires${period}`.slice(0, 250)]
    )
    await conn.commit()
    return { ok: true, offerId, number }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
