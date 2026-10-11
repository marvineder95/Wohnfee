import { requireAdmin } from '../../../../utils/admin-auth'
import { query } from '../../../../utils/db'
import { loadProperty, toAdminProperty, imagesOf } from '../../../../utils/properties'
import { publishWarnings } from '../../../../../shared/properties'
import { getSetting } from '../../../../utils/settings'

// POST /api/admin/properties/:id/willhaben – { action: 'publish' | 'online' | 'offline', url? }
// publish: prüft Pflichtangaben und markiert das Objekt für willhaben. Ist eine Schnittstelle
//          (Setting willhaben_feed=on) eingerichtet, holt willhaben die Daten über den OpenImmo-Feed
//          /api/feeds/openimmo?key=… ; sonst wird das XML zum manuellen Hochladen angeboten.
// online/offline: Status von Hand pflegen (z. B. nach manuellem Einstellen), optional mit Inserat-Link.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const r: any = await loadProperty(id)
  const body = await readBody(event).catch(() => ({}))
  if (body?.action === 'publish') {
    if (r.status !== 'aktiv') throw createError({ statusCode: 409, statusMessage: 'Nur Immobilien mit Status „Verfügbar" können veröffentlicht werden.' })
    const warnings = publishWarnings({ ...r, images: imagesOf(r) })
    if (warnings.length && !body?.force) return { ok: false, warnings }
    const feed = (await getSetting('willhaben_feed')) === 'on'
    await query(`UPDATE properties SET willhaben_status = :st, willhaben_exported_at = UTC_TIMESTAMP() WHERE id = :id`,
      { st: feed ? 'im_feed' : 'exportiert', id })
    return { ok: true, feed, property: toAdminProperty(await loadProperty(id)) }
  }
  if (body?.action === 'online' || body?.action === 'offline') {
    const url = /^https:\/\/(www\.)?willhaben\.at\//.test(String(body?.url || '')) ? String(body.url).slice(0, 255) : r.willhaben_url
    await query('UPDATE properties SET willhaben_status = :st, willhaben_url = :url WHERE id = :id',
      { st: body.action, url: body.action === 'online' ? url : r.willhaben_url, id })
    return { ok: true, property: toAdminProperty(await loadProperty(id)) }
  }
  throw createError({ statusCode: 400, statusMessage: 'Unbekannte Aktion.' })
})
