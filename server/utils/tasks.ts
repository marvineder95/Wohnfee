import { query, queryOne } from './db'
import { notifyUser } from './notifications'
import type { AdminUser } from './admin-auth'

// To-Do-Liste (/admin/aufgaben): Admin legt Aufgaben an (für eine Person oder „alle“),
// Designerin/Spediteur melden mit Text „erledigt“, der Admin prüft → entfernen oder Feedback (wieder offen).
// Verlauf in task_events: erstellt · gemeldet · feedback · geaendert

export const TASKS_URL = '/admin/aufgaben'
export const userName = (u: Pick<AdminUser, 'displayName' | 'username'>) => u.displayName || u.username || 'Unbekannt'

/** Sieht dieser Benutzer die Aufgabe? Admin alles, sonst „alle“ oder persönlich zugewiesen. */
export const visibleSql = (u: AdminUser) => u.role === 'superadmin' ? '1=1' : `(t.assigned_to IS NULL OR t.assigned_to = ${Number(u.id)})`

export async function requireTask(id: number, u: AdminUser) {
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Aufgaben-ID' })
  const t = await queryOne<any>(`SELECT t.* FROM tasks t WHERE t.id = :id AND ${visibleSql(u)}`, { id })
  if (!t) throw createError({ statusCode: 404, statusMessage: 'Aufgabe nicht gefunden' })
  return t
}

export async function addEvent(taskId: number, u: AdminUser, kind: string, text?: string | null) {
  await query('INSERT INTO task_events (task_id, user_id, user_name, kind, text) VALUES (:taskId, :uid, :name, :kind, :text)',
    { taskId, uid: u.id, name: userName(u), kind, text: text?.trim() ? text.trim().slice(0, 5000) : null })
}

/** Aktive Team-Mitglieder ohne Admin-Rolle (Empfänger von „für alle“-Aufgaben) */
export async function teamMembers() {
  return query<any>(`SELECT id, COALESCE(NULLIF(display_name, ''), username) AS name, role FROM admin_users
                     WHERE status = 'active' ORDER BY role = 'superadmin', name`)
}

/** Neue/zugewiesene Aufgabe: zuständige Person bzw. das ganze Team (ohne Admins) benachrichtigen */
export async function notifyAssignees(task: { id: number; title: string; assigned_to: number | null; due_date?: string | null }, intro: string, exceptId?: number) {
  const due = task.due_date ? ` · bis ${String(task.due_date).slice(8, 10)}.${String(task.due_date).slice(5, 7)}.` : ''
  const note = { title: `${intro}: ${task.title}`, body: `To-Do${due}`, url: `${TASKS_URL}?task=${task.id}` }
  if (task.assigned_to) {
    if (task.assigned_to !== exceptId) await notifyUser(task.assigned_to, note)
    return
  }
  for (const m of await teamMembers()) {
    if (m.role !== 'superadmin' && Number(m.id) !== exceptId) await notifyUser(Number(m.id), note)
  }
}

export function taskValues(body: any) {
  const title = String(body?.title || '').trim().slice(0, 190)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Titel angeben' })
  const due = String(body?.due_date || '').slice(0, 10)
  const assigned = Number(body?.assigned_to)
  return {
    title,
    description: String(body?.description || '').trim().slice(0, 10000) || null,
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    priority: body?.priority === 'hoch' ? 'hoch' : 'normal',
    assigned_to: Number.isInteger(assigned) && assigned > 0 ? assigned : null
  }
}
