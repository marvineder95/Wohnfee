import webpush from 'web-push'
import { query } from './db'
import { getSetting, setSetting } from './settings'

// Web-Push für das Dashboard (PWA): neue Kontakt- und Mietanfragen erscheinen als
// Benachrichtigung auf allen Geräten, auf denen ein Teammitglied Push aktiviert hat.
// VAPID-Schlüssel werden beim ersten Bedarf erzeugt und in `settings` gespeichert.

let configured = false

async function ensureTable() {
  await query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_push_endpoint (endpoint(255))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
}

export async function vapidPublicKey(): Promise<string> {
  let pub = await getSetting('vapid_public')
  let priv = await getSetting('vapid_private')
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys()
    pub = keys.publicKey
    priv = keys.privateKey
    await setSetting('vapid_public', pub)
    await setSetting('vapid_private', priv)
  }
  if (!configured) {
    webpush.setVapidDetails('mailto:office@wohnfee.at', pub, priv)
    configured = true
  }
  return pub
}

export async function saveSubscription(userId: number | null, sub: any, userAgent: string | null) {
  await ensureTable()
  const endpoint = String(sub?.endpoint || '')
  const p256dh = String(sub?.keys?.p256dh || '')
  const auth = String(sub?.keys?.auth || '')
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Push-Abo' })
  }
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES (:userId, :endpoint, :p256dh, :auth, :ua)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), user_agent = VALUES(user_agent)`,
    { userId, endpoint: endpoint.slice(0, 500), p256dh, auth, ua: userAgent?.slice(0, 255) || null }
  )
}

export async function removeSubscription(endpoint: string) {
  await ensureTable()
  await query('DELETE FROM push_subscriptions WHERE endpoint = :endpoint', { endpoint })
}

/** Benachrichtigung an alle registrierten Geräte (optional nur an einen Benutzer) */
export async function notifyTeam(payload: { title: string; body: string; url?: string; tag?: string }, onlyUserId?: number) {
  try {
    await ensureTable()
    await vapidPublicKey()
    const subs: any[] = await query(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions ${onlyUserId ? 'WHERE user_id = :uid' : ''}`,
      { uid: onlyUserId }
    )
    let sent = 0
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ url: '/admin/dashboard', ...payload }),
          { TTL: 60 * 60 * 24 }
        )
        sent++
      } catch (e: any) {
        // abgelaufene/abbestellte Abos aufräumen
        if (e?.statusCode === 404 || e?.statusCode === 410) await query('DELETE FROM push_subscriptions WHERE id = :id', { id: s.id })
        else console.error('[push] Senden fehlgeschlagen:', e?.statusCode || e?.message || e)
      }
    }))
    return { sent, total: subs.length }
  } catch (e: any) {
    console.error('[push] Fehler:', e?.message || e)
    return { sent: 0, total: 0 }
  }
}
