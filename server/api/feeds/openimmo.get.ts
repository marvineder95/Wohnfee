import { query } from '../../utils/db'
import { getSetting } from '../../utils/settings'
import { immobilieXml, openImmoDocument } from '../../utils/openimmo'
import { publicOrigin } from '../../utils/site'

// GET /api/feeds/openimmo?key=… – OpenImmo-Feed aller für willhaben freigegebenen Objekte
// (willhaben_status im_feed/online, Status verfügbar oder reserviert). Schlüssel steht im
// Dashboard unter Immobilien → willhaben-Einstellungen; ohne gültigen Schlüssel 404.
export default defineEventHandler(async (event) => {
  const key = String(getQuery(event).key || '')
  const expected = await getSetting('willhaben_feed_key')
  if ((await getSetting('willhaben_feed')) !== 'on' || !expected || key !== expected) throw createError({ statusCode: 404 })
  const rows: any[] = await query(
    `SELECT * FROM properties WHERE willhaben_status IN ('im_feed','online') AND status IN ('aktiv','reserviert') ORDER BY id`)
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  return openImmoDocument(rows.map(r => immobilieXml(r, publicOrigin(event))), 'VOLL')
})
