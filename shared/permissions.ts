// Rollen & Rechte im Dashboard – EINE Tabelle für Server (Durchsetzung) und Oberfläche
// (Menü, Buttons). Änderungen nur hier.
//
//   Admin       (superadmin) alles
//   Designerin  (designer)   alles außer Benutzerverwaltung; Konditionen nur ansehen
//   Spediteur   (driver)     nur ansehen; eigene Kalendertermine anlegen/ändern; Abholung erledigt melden;
//                            keine Angebote, Rechnungen, Konditionen, Newsletter, Blog, Benutzer

export type Role = 'superadmin' | 'designer' | 'driver'
export type Access = 'none' | 'view' | 'edit'

export type Area =
  | 'dashboard' | 'anfragen' | 'mietanfragen' | 'projekte' | 'touren' | 'kalender' | 'inventar'
  | 'kontakte' | 'angebote' | 'rechnungen' | 'artikel' | 'newsletter' | 'konditionen' | 'users'

export const ROLES: Array<{ value: Role; label: string; text: string }> = [
  { value: 'superadmin', label: 'Admin', text: 'Voller Zugriff inkl. Benutzerverwaltung und Konditionen.' },
  { value: 'designer', label: 'Designerin', text: 'Kann alles bearbeiten – außer Benutzer verwalten und Konditionen ändern.' },
  { value: 'driver', label: 'Spediteur', text: 'Sieht Anfragen, Projekte, Touren, Inventar und Kontakte; trägt eigene Termine im Kalender ein und meldet erledigte Abholungen. Keine Angebote, Rechnungen oder Konditionen.' }
]

export const roleLabel = (r?: string | null) => ROLES.find(x => x.value === r)?.label || 'Unbekannt'

const MATRIX: Record<Role, Partial<Record<Area, Access>>> = {
  superadmin: {
    dashboard: 'edit', anfragen: 'edit', mietanfragen: 'edit', projekte: 'edit', touren: 'edit', kalender: 'edit',
    inventar: 'edit', kontakte: 'edit', angebote: 'edit', rechnungen: 'edit', artikel: 'edit', newsletter: 'edit',
    konditionen: 'edit', users: 'edit'
  },
  designer: {
    dashboard: 'edit', anfragen: 'edit', mietanfragen: 'edit', projekte: 'edit', touren: 'edit', kalender: 'edit',
    inventar: 'edit', kontakte: 'edit', angebote: 'edit', rechnungen: 'edit', artikel: 'edit', newsletter: 'edit',
    konditionen: 'view', users: 'none'
  },
  driver: {
    dashboard: 'view', anfragen: 'view', mietanfragen: 'view', projekte: 'view', touren: 'view',
    kalender: 'edit', // nur eigene Termine – Besitz prüft die Kalender-API
    inventar: 'view', kontakte: 'view'
  }
}

export function access(role: string | null | undefined, area: Area): Access {
  return MATRIX[(role as Role)]?.[area] || 'none'
}
export const canView = (role: string | null | undefined, area: Area) => access(role, area) !== 'none'
export const canEdit = (role: string | null | undefined, area: Area) => access(role, area) === 'edit'

/** Bekommt Push bei neuen Anfragen? */
export const receivesInquiryPush = (role: string | null | undefined) => canEdit(role, 'anfragen')

/** Dashboard-Seite → Bereich */
export function areaForPath(path: string): Area | null {
  const p = path.replace(/^\/admin\/?/, '').split(/[/?#]/)[0]
  const map: Record<string, Area> = {
    dashboard: 'dashboard', anfragen: 'anfragen', mietanfragen: 'mietanfragen', projekte: 'projekte',
    touren: 'touren', packliste: 'touren', kalender: 'kalender', inventar: 'inventar', kontakte: 'kontakte',
    angebote: 'angebote', rechnungen: 'rechnungen', artikel: 'artikel', newsletter: 'newsletter',
    konditionen: 'konditionen', users: 'users'
  }
  return map[p] || null // profil, passwort, einladung … sind für alle offen
}

/**
 * API-Pfad (/api/admin/…) + Methode → benötigter Bereich & Zugriff.
 * null = keine Bereichsprüfung (Session, Profil, Push …).
 */
export function requirementForApi(path: string, method: string): { area: Area; need: Access } | null {
  const p = path.replace(/^\/api\/admin\/?/, '').split('?')[0]
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
  const need: Access = write ? 'edit' : 'view'
  const seg = p.split('/')
  // Aktionen, die Angebote erzeugen, brauchen Angebots-Rechte
  if (/^(inquiries|rental-inquiries)\/\d+\/offer$/.test(p) || /^projects\/\d+\/extension-offer$/.test(p)) {
    return { area: 'angebote', need: 'edit' }
  }
  // Abholung erledigt (Möbel zurück ins Lager): darf jeder mit Touren-Zugriff – auch der Spediteur.
  // Wer es gedrückt hat, steht im Projektverlauf.
  if (/^projects\/\d+\/return$/.test(p)) return { area: 'touren', need: 'view' }
  // Dokumente eines Kontakts enthalten Rechnungen/Angebote
  if (/^contacts\/\d+\/documents$/.test(p)) return { area: 'rechnungen', need: 'view' }
  // Probe-Berechnung ist reines Ansehen
  if (p === 'transport/quote') return { area: 'konditionen', need: 'view' }
  const map: Record<string, Area> = {
    dashboard: 'dashboard', inquiries: 'anfragen', 'rental-inquiries': 'mietanfragen', projects: 'projekte',
    logistics: 'touren', calendar: 'kalender', inventory: 'inventar', contacts: 'kontakte', offers: 'angebote',
    invoices: 'rechnungen', recurring: 'rechnungen', blog: 'artikel', newsletter: 'newsletter',
    transport: 'konditionen', users: 'users'
  }
  const area = map[seg[0]]
  return area ? { area, need } : null
}
