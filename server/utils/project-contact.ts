import { query, queryOne } from './db'

// Rechnungsadresse für ein Projekt ermitteln (z. B. für das Verlängerungs-Angebot).
// 1. Verknüpfter Kontakt (projects.contact_id)
// 2. sonst Suche über die einzelnen Wörter im Freitext „Kunde" (z. B. „kibb Hr. Maczek" → KIBB Immobilien GmbH),
//    zuerst in den Kontakten, dann in alten Dokumenten (Rechnungen/ABs aus Nextcloud).
// „z. H. …" und UID kommen aus der letzten Rechnung bzw. dem letzten Dokument des Kontakts.

export interface ProjectContact {
  id: number
  name: string
  street: string | null
  zip: string | null
  city: string | null
  uid: string | null
  attn: string | null
}

const STOP = new Set(['gmbh', 'herr', 'frau', 'firma', 'immobilien', 'wohnung', 'projekt', 'staging', 'wien', 'top'])

export function searchWords(text: string): string[] {
  return String(text || '')
    .split(/[\s,;:/()|–-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()))
}

async function findContactId(text: string): Promise<number | null> {
  for (const w of searchWords(text)) {
    const hits: any[] = await query(
      `SELECT id FROM contacts WHERE status = 'aktiv' AND CONCAT_WS(' ', name1, name2) LIKE :q
       ORDER BY type = 'firma' DESC, id LIMIT 2`, { q: `%${w}%` })
    if (hits.length === 1) return Number(hits[0].id)
  }
  for (const w of searchWords(text)) {
    const doc: any = await queryOne(
      `SELECT contact_id FROM documents WHERE contact_id IS NOT NULL AND customer_raw LIKE :q
       ORDER BY doc_date IS NULL, doc_date DESC LIMIT 1`, { q: `%${w}%` })
    if (doc?.contact_id) return Number(doc.contact_id)
  }
  return null
}

export async function contactDetails(id: number): Promise<ProjectContact | null> {
  const c: any = await queryOne('SELECT id, name1, name2, street, zip, city FROM contacts WHERE id = :id', { id })
  if (!c) return null
  const inv: any = await queryOne(
    `SELECT customer_uid FROM invoices WHERE contact_id = :id AND customer_uid IS NOT NULL ORDER BY doc_date DESC LIMIT 1`, { id })
  const doc: any = await queryOne(
    `SELECT customer_raw FROM documents WHERE contact_id = :id AND customer_raw IS NOT NULL
     ORDER BY doc_date IS NULL, doc_date DESC LIMIT 1`, { id })
  const parts = String(doc?.customer_raw || '').split('|').map((s) => s.trim())
  const attn = parts.find((p) => /^z\.\s*h(d)?\.?\s/i.test(p)) || null
  const uidRaw = inv?.customer_uid || parts.find((p) => /^ATU\s?\d{8}$/i.test(p.replace(/\s+/g, ''))) || null
  return {
    id: Number(c.id),
    name: [c.name1, c.name2].filter(Boolean).join(' '),
    street: c.street || null, zip: c.zip || null, city: c.city || null,
    uid: uidRaw ? String(uidRaw).replace(/\s+/g, '') : null,
    attn
  }
}

/** Kontakt zum Projekt; findet die Suche einen, wird er am Projekt gespeichert (im Projekt änderbar). */
export async function resolveProjectContact(project: any): Promise<ProjectContact | null> {
  let id = project.contact_id ? Number(project.contact_id) : null
  if (!id) {
    id = await findContactId(project.customer || '')
    if (id) await query('UPDATE projects SET contact_id = :cid WHERE id = :id AND contact_id IS NULL', { cid: id, id: project.id })
  }
  return id ? contactDetails(id) : null
}
