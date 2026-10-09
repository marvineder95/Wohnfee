import { query, queryOne } from './db'

// Hält den Lagerstatus eines Inventarobjekts mit seinen Projektzuweisungen synchron:
// - komplett zugewiesen (Summe ≥ Menge)  → „vermietet" (Einsatzort = Projekt)
// - wieder frei (Summe < Menge)          → „lager"
// Verkaufte / außer Dienst gestellte Objekte werden nicht angefasst.

/** Anzahl, die aktuell in Projekten im Einsatz ist (optional ohne ein Projekt) */
export async function assignedQuantity(itemId: number, exceptProjectId?: number): Promise<number> {
  const row: any = await queryOne(
    `SELECT COALESCE(SUM(quantity), 0) AS n FROM project_items
     WHERE item_id = :itemId ${exceptProjectId ? 'AND project_id <> :exceptProjectId' : ''}`,
    { itemId, exceptProjectId }
  )
  return Number(row?.n || 0)
}

export async function syncItemStatus(itemId: number) {
  const item: any = await queryOne('SELECT id, quantity, status FROM inventory_items WHERE id = :itemId', { itemId })
  if (!item || !['lager', 'vermietet'].includes(item.status)) return
  const assigned = await assignedQuantity(itemId)
  const stock = Math.max(1, Number(item.quantity) || 1)
  if (assigned >= stock && item.status === 'lager') {
    // Einsatzort: Kunde bzw. Projekt der jüngsten Zuweisung
    const p: any = await queryOne(
      `SELECT p.customer, p.title FROM project_items pi JOIN projects p ON p.id = pi.project_id
       WHERE pi.item_id = :itemId ORDER BY pi.assigned_at DESC LIMIT 1`, { itemId }
    )
    const loc = [p?.customer, p?.title].filter(Boolean).join(' – ').slice(0, 190) || null
    await query(`UPDATE inventory_items SET status = 'vermietet', customer_location = :loc WHERE id = :itemId`, { loc, itemId })
  } else if (assigned < stock && item.status === 'vermietet') {
    await query(
      `UPDATE inventory_items SET status = 'lager', customer_location = IF(:assigned = 0, NULL, customer_location) WHERE id = :itemId`,
      { assigned, itemId }
    )
  }
}
