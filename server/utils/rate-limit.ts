// Einfache Begrenzung von Fehlversuchen (im Speicher des Server-Prozesses) –
// bremst Passwort-Raten beim Login und Missbrauch von „Passwort vergessen".
const buckets = new Map<string, { count: number; resetAt: number }>()

// Hinter einem Proxy (nginx, ngrok) steht die echte IP als LETZTER Eintrag in
// X-Forwarded-For – frühere Einträge kann der Absender selbst fälschen.
export function clientIp(event: any): string {
  const xff = String(getRequestHeader(event, 'x-forwarded-for') || '')
  const last = xff.split(',').map(s => s.trim()).filter(Boolean).pop()
  return last || getRequestIP(event) || 'unknown'
}

/** Wirft 429, wenn `key` innerhalb von `windowMs` schon `max` Mal gezählt wurde. */
export function assertNotLimited(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (b && b.resetAt > now && b.count >= max) {
    const min = Math.ceil((b.resetAt - now) / 60000)
    throw createError({ statusCode: 429, statusMessage: `Zu viele Versuche – bitte in ${min} Minute${min === 1 ? '' : 'n'} erneut probieren.` })
  }
}

export function countAttempt(key: string, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs })
  else b.count++
  // aufräumen, damit die Map nicht unbegrenzt wächst
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
}

export function clearAttempts(key: string) {
  buckets.delete(key)
}
