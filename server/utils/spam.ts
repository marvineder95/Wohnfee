import { createHmac, timingSafeEqual } from 'node:crypto'

// Spam-Schutz für öffentliche Formulare – ohne externe Dienste (kein reCAPTCHA → kein Cookie-Banner nötig).
// 1. Honeypot (verstecktes Feld „website“) → Bot, wird still verworfen (macht der Endpunkt selbst).
// 2. Formular-Token: holt das Formular per JavaScript beim Öffnen (/api/form-token). Fehlt es, ist es gefälscht
//    oder wurde schneller als MIN_FILL_MS abgeschickt → Spam.
// 3. Inhalt: viele Links, Link im Namen, typische Spam-Begriffe, überwiegend fremde Schrift → Spam.
// Spam wird NICHT gelöscht, sondern mit Status „spam“ gespeichert (Reiter „Spam“ in den Anfragen) – ohne Mail/Push.

const MIN_FILL_MS = 4000
const MAX_AGE_MS = 24 * 60 * 60 * 1000

function secret() {
  return String(useRuntimeConfig().adminSecret || 'wf-dev-secret-bitte-setzen') + ':form'
}
const sign = (ts: string) => createHmac('sha256', secret()).update(ts).digest('base64url')

export function issueFormToken() {
  const ts = String(Date.now())
  return `${ts}.${sign(ts)}`
}

/** null = in Ordnung, sonst der Grund (für die Spam-Notiz). */
export function formTokenProblem(token: unknown): string | null {
  const [ts, sig] = String(token || '').split('.')
  if (!ts || !sig) return 'ohne Formular-Token (Direktaufruf)'
  const expected = sign(ts)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return 'gefälschtes Formular-Token'
  const age = Date.now() - Number(ts)
  if (age < MIN_FILL_MS) return `in ${Math.max(0, Math.round(age / 1000))} s ausgefüllt`
  if (age > MAX_AGE_MS) return 'Formular-Token abgelaufen'
  return null
}

const SPAM_WORDS = [
  'seo', 'backlink', 'casino', 'crypto', 'bitcoin', 'forex', 'viagra', 'cialis', 'porn', 'escort', 'loan',
  'guest post', 'rank your website', 'first page of google', 'web design services', 'increase your traffic',
  'whatsapp me', 'telegram', 'betting', 'investment opportunity', 'marketing services', 'lead generation'
]

export function contentProblems(f: { name?: string; email?: string; message?: string }): string[] {
  const name = String(f.name || '')
  const msg = String(f.message || '')
  const text = `${name} ${msg}`.toLowerCase()
  const out: string[] = []
  const links = (msg.match(/https?:\/\/|www\./gi) || []).length
  if (links >= 2) out.push(`${links} Links`)
  if (/https?:\/\/|www\.|\.(com|ru|xyz|top|online)\b/i.test(name)) out.push('Link im Namen')
  const hits = SPAM_WORDS.filter(w => new RegExp(`\\b${w}s?\\b`, 'i').test(text))
  if (hits.length) out.push(`Spam-Begriffe: ${hits.slice(0, 3).join(', ')}`)
  const letters = text.replace(/[^\p{L}]/gu, '')
  const foreign = text.replace(/[^\p{Script=Cyrillic}\p{Script=Han}\p{Script=Arabic}\p{Script=Thai}\p{Script=Hangul}]/gu, '')
  if (letters.length > 20 && foreign.length / letters.length > 0.3) out.push('fremde Schrift')
  return out
}

/** Gesamturteil für einen Eintrag: Grund(e) als Text oder null. */
export function spamReason(token: unknown, f: { name?: string; email?: string; message?: string }): string | null {
  const reasons = [formTokenProblem(token), ...contentProblems(f)].filter(Boolean)
  return reasons.length ? reasons.join(' · ') : null
}

/** Spam nach 30 Tagen endgültig löschen (Datensparsamkeit) – läuft täglich (server/plugins/spam-cleanup.ts). */
export async function purgeOldSpam() {
  try {
    const { query } = await import('./db')
    await query("DELETE FROM contact_inquiries WHERE status = 'spam' AND created_at < NOW() - INTERVAL 30 DAY")
  } catch (e: any) {
    console.error('[spam] Aufräumen fehlgeschlagen:', e?.message || e)
  }
}
