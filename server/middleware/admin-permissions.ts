import { currentAdminUser } from '../utils/admin-auth'
import { requirementForApi, access, roleLabel } from '../../shared/permissions'

// Rechte-Prüfung für ALLE Dashboard-APIs (/api/admin/…) anhand shared/permissions.ts.
// Nicht angemeldete Anfragen laufen durch – die Endpunkte antworten dann selbst mit 401.
export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/admin/')) return
  const req = requirementForApi(path, event.method)
  if (!req) return
  const user = await currentAdminUser(event)
  if (!user) return
  const has = access(user.role, req.area)
  const ok = req.need === 'view' ? has !== 'none' : has === 'edit'
  if (!ok) {
    throw createError({
      statusCode: 403,
      statusMessage: req.need === 'view'
        ? `Keine Berechtigung – als ${roleLabel(user.role)} ist dieser Bereich nicht freigegeben.`
        : `Keine Berechtigung – als ${roleLabel(user.role)} kannst du hier nur ansehen.`
    })
  }
  // für Endpunkte, die die Rolle noch feiner prüfen (z. B. eigene Kalendertermine)
  event.context.adminUser = user
})
