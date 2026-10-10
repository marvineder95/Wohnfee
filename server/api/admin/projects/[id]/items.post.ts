import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { assignedQuantity, syncItemStatus } from '../../../../utils/inventory-sync'
import { reservedQuantity, reservationHolders } from '../../../../utils/reservations'

function clean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}
function dateOrNull(v: any): string | null {
  const s = String(v ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

// POST /api/admin/projects/:id/items — Möbel dem Projekt zuweisen
// Body: { item_id, quantity?, return_date?, note? }
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Projekt-ID' })
  }
  const body = await readBody(event)
  const itemId = Number(body?.item_id)
  if (!Number.isInteger(itemId) || itemId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte ein Inventarobjekt wählen.' })
  }
  const project = await queryOne('SELECT id FROM projects WHERE id = :id', { id })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  const item = await queryOne('SELECT id, quantity FROM inventory_items WHERE id = :itemId', { itemId })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Inventarobjekt nicht gefunden' })

  const stock = Number(item.quantity) || 1
  const qty = Math.max(1, Math.min(Number(body?.quantity) || 1, stock))
  // Doppelbelegung verhindern: Menge darf den noch freien Bestand nicht übersteigen
  const elsewhere = await assignedQuantity(itemId, id)
  const free = Math.max(0, stock - elsewhere)
  // Für offene Mietanfragen reservierte Stücke sind ebenfalls nicht frei
  const reserved = await reservedQuantity(itemId)
  if (qty > free - reserved && qty <= free) {
    const holders = await reservationHolders(itemId)
    throw createError({
      statusCode: 409,
      statusMessage: `${free - reserved > 0 ? `Nur noch ${free - reserved} Stück frei, der Rest ist` : 'Dieses Objekt ist'} reserviert für Mietanfrage ${holders.join(', ')}. ` +
        'Wird das Angebot angenommen, landet es automatisch im Projekt; sonst die Reservierung unter „Mietanfragen" freigeben.'
    })
  }
  if (qty > free) {
    const where: any[] = await query(
      `SELECT COALESCE(p.customer, p.title) AS label FROM project_items pi JOIN projects p ON p.id = pi.project_id
       WHERE pi.item_id = :itemId AND pi.project_id <> :id LIMIT 3`, { itemId, id }
    )
    const names = where.map((w) => w.label).filter(Boolean).join(', ')
    throw createError({
      statusCode: 409,
      statusMessage: free === 0
        ? `Dieses Objekt ist bereits vollständig im Einsatz${names ? ` (${names})` : ''}.`
        : `Nur noch ${free} Stück frei – der Rest ist im Einsatz${names ? ` (${names})` : ''}.`
    })
  }
  await query(
    `INSERT INTO project_items (project_id, item_id, quantity, return_date, note)
     VALUES (:id, :itemId, :qty, :ret, :note)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), return_date = VALUES(return_date), note = VALUES(note)`,
    { id, itemId, qty, ret: dateOrNull(body?.return_date), note: clean(body?.note) }
  )
  await syncItemStatus(itemId)
  return { ok: true }
})
