import { requireAdmin } from '../../../../utils/admin-auth'
import { getDb, query, queryOne } from '../../../../utils/db'
import { nextOfferNumber } from '../../../../utils/invoices'
import { todayVienna } from '../../../../utils/site'

// POST /api/admin/projects/:id/extension-offer — Angebotsentwurf „Mietverlängerung"
// mit allen Möbeln, die aktuell im Projekt sind (Monatspreis: 3-Monats- bzw. 1-Monats-Miete).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const project: any = await queryOne('SELECT * FROM projects WHERE id = :id', { id })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  const items: any[] = await query(
    `SELECT pi.quantity, i.title, i.rent_price_1m AS p1, i.rent_price_3m AS p3
     FROM project_items pi JOIN inventory_items i ON i.id = pi.item_id
     WHERE pi.project_id = :id ORDER BY i.category, i.title`, { id }
  )
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Dem Projekt sind keine Möbel zugewiesen.' })

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
      '\nDie Preise verstehen sich pro Monat; die Verlängerung ist monatlich kündbar.'
    const [res]: any = await conn.query(
      `INSERT INTO offers (number, contact_id, customer_name, customer_street, customer_zip, customer_city, customer_country,
                           doc_date, valid_until, subject, lang, vat_rate, vat_free, note, status, project_id)
       VALUES (?, ?, ?, ?, ?, ?, 'AT', ?, ?, ?, 'de', 20, 0, ?, 'entwurf', ?)`,
      [number, contact?.id || null, customer, contact?.street || null, contact?.zip || null, contact?.city || null,
       docDate, todayVienna(14), `Mietverlängerung ${project.title || ''}`.trim().slice(0, 190), note, id]
    )
    const offerId = res.insertId
    // gleiche Möbel (Titel + Preis) zu einer Position zusammenfassen
    const grouped = new Map<string, { title: string; qty: number; price: number }>()
    for (const it of items) {
      const price = it.p3 !== null ? Number(it.p3) : (it.p1 !== null ? Number(it.p1) : 0)
      const key = `${it.title}|${price}`
      const g = grouped.get(key)
      if (g) g.qty += Number(it.quantity) || 1
      else grouped.set(key, { title: it.title, qty: Number(it.quantity) || 1, price })
    }
    let pos = 0
    for (const g of grouped.values()) {
      await conn.query(
        `INSERT INTO offer_items (offer_id, position, description, quantity, unit, unit_price) VALUES (?, ?, ?, ?, 'Mon.', ?)`,
        [offerId, ++pos, `Mietverlängerung – ${g.title}`.slice(0, 250), g.qty, g.price]
      )
    }
    await conn.commit()
    return { ok: true, offerId, number, positions: pos }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})
