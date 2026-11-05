import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { MAX_UPLOAD_BYTES } from './image-optimize'
import { query, queryOne } from './db'
import { todayVienna } from './site'
import { EMPLOYMENT_TYPES, SALARY_TYPES, isValue, vacationAccount } from '../../shared/employees'

// Mitarbeiter-Daten (Tabelle employees). Nur Admins (Bereich „users“, shared/permissions.ts).
// Sensible Daten (SV-Nr., Bank, Gehalt) verlassen das Dashboard nie.

export const EMPLOYEE_FILES_ROOT = join(process.cwd(), 'public', 'uploads', 'private', 'employees')

const FILE_EXT: Record<string, string> = {
  'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'
}

/** Datei geschützt ablegen (public/uploads/private/employees/<id>/…) und als Mitarbeiter-Dokument eintragen. */
export async function saveEmployeeFile(employeeId: number, file: { data: Buffer; type?: string },
  meta: { category: string; title: string; validUntil?: string | null; by: string; absenceId?: number | null }) {
  const ext = FILE_EXT[file.type || '']
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Nur PDF, JPEG, PNG oder WebP erlaubt' })
  if (file.data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 25 MB)' })
  const dir = join(EMPLOYEE_FILES_ROOT, String(employeeId))
  await mkdir(dir, { recursive: true })
  const fname = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
  await writeFile(join(dir, fname), file.data)
  await query(
    `INSERT INTO employee_documents (employee_id, absence_id, category, title, file_path, mime, size, valid_until, uploaded_by_name)
     VALUES (:id, :absenceId, :category, :title, :path, :mime, :size, :validUntil, :by)`,
    { id: employeeId, absenceId: meta.absenceId || null, category: meta.category, title: meta.title.slice(0, 190),
      path: `${employeeId}/${fname}`, mime: file.type, size: file.data.length, validUntil: meta.validUntil || null, by: meta.by }
  )
}

const TEXT_FIELDS = [
  'title', 'first_name', 'last_name', 'position', 'email', 'private_email', 'phone', 'street', 'zip', 'city',
  'nationality', 'svnr', 'work_days', 'collective_agreement', 'iban', 'bic', 'account_holder',
  'emergency_name', 'emergency_relation', 'emergency_phone', 'driving_license', 'clothing_size', 'equipment', 'notes'
] as const
const DATE_FIELDS = ['birth_date', 'entry_date', 'exit_date', 'probation_until'] as const
const NUM_FIELDS = ['weekly_hours', 'salary', 'vacation_days'] as const

/** Formular → Spaltenwerte (leere Felder = NULL, Daten/Zahlen geprüft). */
export function employeeValues(body: any): Record<string, any> {
  const v: Record<string, any> = {}
  for (const f of TEXT_FIELDS) {
    const s = body?.[f] == null ? '' : String(body[f]).trim()
    v[f] = s ? s.slice(0, f === 'notes' ? 10000 : f === 'equipment' ? 500 : 190) : null
  }
  if (v.iban) v.iban = v.iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()
  if (v.bic) v.bic = v.bic.replace(/\s+/g, '').toUpperCase()
  for (const f of DATE_FIELDS) {
    const s = String(body?.[f] || '').slice(0, 10)
    v[f] = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
  }
  for (const f of NUM_FIELDS) {
    const raw = body?.[f]
    const n = raw === '' || raw == null ? NaN : Number(String(raw).replace(',', '.'))
    v[f] = Number.isFinite(n) && n >= 0 ? n : null
  }
  // Übertrag zum 1.1. eines Jahres (darf negativ sein = Vorgriff)
  const oy = Number(body?.vacation_opening_year)
  const od = body?.vacation_opening_days === '' || body?.vacation_opening_days == null ? NaN : Number(String(body.vacation_opening_days).replace(',', '.'))
  v.vacation_opening_year = Number.isInteger(oy) && oy >= 2000 && oy <= 2100 ? oy : null
  v.vacation_opening_days = v.vacation_opening_year && Number.isFinite(od) ? Math.max(-999, Math.min(999, od)) : null
  v.employment_type = isValue(EMPLOYMENT_TYPES, body?.employment_type) ? body.employment_type : null
  v.salary_type = isValue(SALARY_TYPES, body?.salary_type) ? body.salary_type : null
  if (!v.first_name && !v.last_name) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte Vor- oder Nachname angeben' })
  }
  return v
}

export async function requireEmployee(id: number) {
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: 'Ungültige Mitarbeiter-ID' })
  const emp = await queryOne<any>('SELECT * FROM employees WHERE id = :id', { id })
  if (!emp) throw createError({ statusCode: 404, statusMessage: 'Mitarbeiter nicht gefunden' })
  return emp
}

/** Liste für die Übersicht: Kerndaten + Zugang + Urlaub im laufenden Jahr + heutige Abwesenheit + Fristen. */
export async function listEmployees() {
  const today = todayVienna()
  const year = today.slice(0, 4)
  const rows = await query<any>(
    `SELECT e.id, e.title, e.first_name, e.last_name, e.position, e.photo_path, e.email, e.phone,
            e.employment_type, e.entry_date, e.exit_date, e.probation_until, e.vacation_days, e.vacation_opening_year, e.vacation_opening_days, e.weekly_hours,
            u.id AS user_id, u.username, u.role, u.status AS user_status, u.avatar_path,
            (SELECT a.type FROM employee_absences a
              WHERE a.employee_id = e.id AND a.status = 'genehmigt' AND :today BETWEEN a.date_from AND a.date_to LIMIT 1) AS absent_today,
            (SELECT COALESCE(SUM(a.days), 0) FROM employee_absences a
              WHERE a.employee_id = e.id AND a.type = 'krankenstand' AND a.status = 'genehmigt' AND YEAR(a.date_from) = :year) AS sick_days,
            (SELECT COUNT(*) FROM employee_absences a WHERE a.employee_id = e.id AND a.status = 'beantragt') AS pending_requests,
            (SELECT COUNT(*) FROM employee_absences a WHERE a.employee_id = e.id AND a.type = 'krankenstand'
              AND a.requested_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_documents d WHERE d.absence_id = a.id)) AS missing_sick_notes,
            (SELECT COUNT(*) FROM employee_documents d WHERE d.employee_id = e.id) AS doc_count,
            (SELECT MIN(d.valid_until) FROM employee_documents d
              WHERE d.employee_id = e.id AND d.valid_until IS NOT NULL AND d.valid_until >= :today) AS next_doc_expiry
     FROM employees e
     LEFT JOIN admin_users u ON u.id = e.user_id
     ORDER BY (e.exit_date IS NOT NULL AND e.exit_date < :today), e.last_name, e.first_name`,
    { today, year: Number(year) }
  )
  const used = await query<{ employee_id: number; y: number; days: number }>(
    `SELECT employee_id, YEAR(date_from) AS y, SUM(days) AS days FROM employee_absences
     WHERE type = 'urlaub' AND status = 'genehmigt' GROUP BY employee_id, YEAR(date_from)`
  )
  for (const e of rows) {
    const usedByYear: Record<number, number> = {}
    for (const u of used) if (u.employee_id === e.id) usedByYear[Number(u.y)] = Number(u.days)
    e.vacation = e.vacation_days == null ? null : vacationAccount({
      annual: Number(e.vacation_days), entry: e.entry_date, exit: e.exit_date,
      openingYear: e.vacation_opening_year, openingDays: e.vacation_opening_days, usedByYear, year: Number(year)
    })
  }
  return { today, employees: rows }
}

export async function employeeDetail(id: number) {
  const emp = await requireEmployee(id)
  const [documents, absences, user] = await Promise.all([
    query(`SELECT id, absence_id, category, title, mime, size, valid_until, uploaded_by_name, created_at
           FROM employee_documents WHERE employee_id = :id ORDER BY created_at DESC`, { id }),
    query(`SELECT a.id, a.type, a.date_from, a.date_to, a.days, a.note, a.status, a.requested_by, a.review_note, a.reviewed_by_name,
                  u.display_name AS requested_by_name,
                  (SELECT COUNT(*) FROM employee_documents d WHERE d.absence_id = a.id) AS file_count
           FROM employee_absences a LEFT JOIN admin_users u ON u.id = a.requested_by
           WHERE a.employee_id = :id ORDER BY a.date_from DESC`, { id }),
    emp.user_id
      ? queryOne(`SELECT u.id, u.username, u.email, u.role, u.status, u.created_at AS createdAt,
                         u.invite_expires_at AS inviteExpiresAt, u.avatar_path, i.username AS invitedByUsername
                  FROM admin_users u LEFT JOIN admin_users i ON i.id = u.invited_by WHERE u.id = :uid`, { uid: emp.user_id })
      : Promise.resolve(null)
  ])
  return { employee: emp, documents, absences, user }
}
