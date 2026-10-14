import { query } from './db'
import { normalizeWebsite } from '../../shared/partners'

// Gemeinsame Abbildung DB-Zeile → API-Objekt
export function mapPartner(r: any) {
  return {
    id: Number(r.id), kind: r.kind, name: r.name, category: r.category || null,
    description: r.description || null, descriptionEn: r.description_en || null,
    website: r.website || null, logo: r.logo_path || null,
    visible: !!r.visible, sortOrder: Number(r.sort_order) || 0, note: r.note ?? null
  }
}

export function partnerFields(body: any) {
  const clean = (v: any, max = 190) => String(v ?? '').trim().slice(0, max) || null
  const logo = clean(body?.logo, 255)
  return {
    kind: body?.kind === 'referenz' ? 'referenz' : 'partner',
    name: clean(body?.name),
    category: clean(body?.category, 64),
    description: clean(body?.description, 2000),
    description_en: clean(body?.descriptionEn, 2000),
    website: normalizeWebsite(body?.website),
    // nur eigene Uploads als Logo zulassen
    logo_path: logo && logo.startsWith('/uploads/partner/') ? logo : null,
    visible: body?.visible ? 1 : 0,
    sort_order: Math.max(-9999, Math.min(9999, Math.round(Number(body?.sortOrder) || 0))),
    note: clean(body?.note, 2000)
  }
}

/** Sichtbare Einträge für die Website */
export async function visiblePartners() {
  const rows = await query<any>(
    `SELECT * FROM partners WHERE visible = 1 ORDER BY sort_order, name`).catch(() => [])
  const list = rows.map(mapPartner).map(({ note, visible, sortOrder, ...p }) => p)
  return {
    partners: list.filter(p => p.kind === 'partner'),
    references: list.filter(p => p.kind === 'referenz')
  }
}
