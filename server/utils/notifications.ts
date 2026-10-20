import { query } from './db'
import { notifyTeam } from './push'

// Benachrichtigungen im Dashboard: Eintrag unter der Glocke (Tabelle notifications) + Push aufs Handy,
// falls der Benutzer Push aktiviert hat. Fehler hier dürfen die eigentliche Aktion nie stoppen.
export interface NotePayload { title: string; body?: string; url?: string }

export async function notifyUser(userId: number | null | undefined, n: NotePayload) {
  if (!userId) return
  try {
    await query(
      'INSERT INTO notifications (user_id, title, body, url) VALUES (:uid, :title, :body, :url)',
      { uid: userId, title: n.title.slice(0, 190), body: (n.body || '').slice(0, 500) || null, url: (n.url || '').slice(0, 255) || null }
    )
    await notifyTeam({ title: n.title, body: n.body || '', url: n.url, tag: `n-${userId}-${Date.now()}` }, userId)
  } catch (e: any) {
    console.error('[notifications] Fehler:', e?.message || e)
  }
}

/** An alle aktiven Admins (Chef), außer dem Auslöser selbst */
export async function notifySuperadmins(n: NotePayload, exceptUserId?: number) {
  const admins: any[] = await query(
    "SELECT id FROM admin_users WHERE role = 'superadmin' AND status = 'active'"
  ).catch(() => [])
  for (const a of admins) {
    if (Number(a.id) !== exceptUserId) await notifyUser(Number(a.id), n)
  }
}

/** Kurzbeschreibung eines Termins für Benachrichtigungen: „Aufbau · Fr 24.10. 09:00“ */
export function eventSummary(e: { type?: string; event_date?: string; eventDate?: string; start_time?: string | null; startTime?: string | null; all_day?: any; allDay?: any }) {
  const TYPES: Record<string, string> = { aufbau: 'Aufbau', abholung: 'Abholung', lieferung: 'Lieferung', beratung: 'Beratung', sonstiges: 'Termin' }
  const iso = String(e.event_date || e.eventDate || '').slice(0, 10)
  const d = new Date(iso + 'T12:00:00')
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()] || ''
  const date = iso ? `${wd} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : ''
  const time = (e.all_day ?? e.allDay) ? 'ganztägig' : (e.start_time || e.startTime || '')
  return [TYPES[e.type || ''] || 'Termin', [date, time].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
}

export const calendarUrl = (id: number, iso: string) => `/admin/kalender?focus=${String(iso).slice(0, 10)}&event=${id}`
