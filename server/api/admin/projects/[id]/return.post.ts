import { requireAdmin } from '../../../../utils/admin-auth'
import { query, queryOne } from '../../../../utils/db'
import { syncItemStatus } from '../../../../utils/inventory-sync'

const STATES = ['lager', 'pflege', 'ausser_dienst']

// POST /api/admin/projects/:id/return — Abholung erledigt: Möbel zurück ins Lager.
// Body: { items: [{ itemId, state: 'lager' | 'pflege' | 'ausser_dienst', note? }] }
//   lager         → sofort wieder im Shop
//   pflege        → Reinigung/Reparatur, erst nach Freigabe im Inventar wieder im Shop
//   ausser_dienst → defekt
// Nicht genannte Möbel bleiben im Projekt (Teilabholung).
export default defineEventHandler(async (event) => {
  const user: any = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const project: any = await queryOne('SELECT id, status_info FROM projects WHERE id = :id', { id })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Projekt nicht gefunden' })
  const body = await readBody(event).catch(() => ({}))
  const list: any[] = Array.isArray(body?.items) ? body.items.slice(0, 500) : []
  if (!list.length) throw createError({ statusCode: 400, statusMessage: 'Bitte mindestens ein Möbelstück auswählen.' })

  const done: string[] = []
  for (const raw of list) {
    const itemId = Number(raw?.itemId)
    const state = STATES.includes(raw?.state) ? raw.state : 'lager'
    const row: any = await queryOne(
      `SELECT pi.item_id, i.title FROM project_items pi JOIN inventory_items i ON i.id = pi.item_id
       WHERE pi.project_id = :id AND pi.item_id = :itemId`, { id, itemId })
    if (!row) continue
    await query('DELETE FROM project_items WHERE project_id = :id AND item_id = :itemId', { id, itemId })
    await syncItemStatus(itemId)
    if (state !== 'lager') {
      await query(
        `UPDATE inventory_items SET status = :state, customer_location = NULL WHERE id = :itemId AND status IN ('lager','vermietet')`,
        { state, itemId })
    }
    const note = String(raw?.note || '').trim().slice(0, 120)
    done.push(`${row.title}${state === 'pflege' ? ' (Reinigung/Reparatur)' : state === 'ausser_dienst' ? ' (defekt)' : ''}${note ? ` – ${note}` : ''}`)
  }

  const left: any = await queryOne('SELECT COUNT(*) AS n FROM project_items WHERE project_id = :id', { id })
  const today = new Date().toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' })
  const who = user?.display_name || user?.displayName || user?.email || 'Team'
  const line = `Abholung ${today} (${who}): ${done.length} Möbel zurück${done.length ? ` – ${done.join(', ')}` : ''}`.slice(0, 1500)
  await query(
    `UPDATE projects SET status_info = CONCAT_WS('\n', NULLIF(status_info, ''), :line),
       next_step = IF(:left = 0, 'Abgeschlossen – alle Möbel zurück', next_step) WHERE id = :id`,
    { line, left: Number(left?.n || 0), id })
  return { ok: true, returned: done.length, remaining: Number(left?.n || 0) }
})
