import { timingSafeEqual } from 'node:crypto'
import { notifyTeam } from '../../utils/push'

// POST /api/internal/deploy-notify – Push-Meldung nach einem automatischen Update (deploy/auto-update.sh).
// Nur aus dem App-Container selbst (127.0.0.1) und mit dem Admin-Secret als Token – von außen nie erreichbar.
export default defineEventHandler(async (event) => {
  const ip = String(event.node.req.socket.remoteAddress || '')
  const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
  const secret = String(useRuntimeConfig().adminSecret || '')
  const token = String(getRequestHeader(event, 'x-deploy-token') || '')
  const ok = local && !getRequestHeader(event, 'x-forwarded-for') && secret.length >= 16 && token.length === secret.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  if (!ok) throw createError({ statusCode: 404 })
  const body = await readBody(event).catch(() => ({}))
  await notifyTeam({
    title: String(body?.title || 'Website aktualisiert').slice(0, 80),
    body: String(body?.body || '').slice(0, 160),
    url: '/admin/dashboard', tag: 'deploy'
  })
  return { ok: true }
})
