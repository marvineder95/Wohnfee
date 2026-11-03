// Status eines Projekts (Spalte projects.status).
// Entwurf / Angebot versendet → Möbel sind für das Projekt RESERVIERT (nicht im Shop, für andere Projekte gesperrt,
// bleiben aber im Lager). Auftrag angenommen → Möbel gelten als vermietet. Abgelehnt → Möbel werden freigegeben.
export type ProjectStatus = 'entwurf' | 'angebot' | 'angenommen' | 'abgelehnt'

export const PROJECT_STATUSES: Array<{ value: ProjectStatus; label: string; tone: string }> = [
  { value: 'entwurf', label: 'Entwurf', tone: 'gray' },
  { value: 'angebot', label: 'Angebot versendet', tone: 'amber' },
  { value: 'angenommen', label: 'Auftrag angenommen', tone: 'green' },
  { value: 'abgelehnt', label: 'Abgelehnt', tone: 'red' }
]

export const isProjectStatus = (v: any): v is ProjectStatus => PROJECT_STATUSES.some(s => s.value === v)
export const projectStatusLabel = (v: string | null | undefined) => PROJECT_STATUSES.find(s => s.value === v)?.label || 'Auftrag angenommen'
/** Möbel nur reserviert (noch nicht beim Kunden) */
export const isReservingStatus = (v: string | null | undefined) => v === 'entwurf' || v === 'angebot'
