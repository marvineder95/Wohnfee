import { todayVienna } from './site'
// Gemeinsame Helfer für Rechnungs-Endpunkte
export function invClean(v: any, max = 190) {
  return String(v ?? '').trim().slice(0, max) || null
}
export function invMoney(v: any): number {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}
export function invDate(v: any): string | null {
  const s = String(v ?? '').trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export interface ParsedItem {
  position: number
  description: string | null
  quantity: number
  unit: string | null
  unit_price: number
}

export function parseItems(body: any): ParsedItem[] {
  if (!Array.isArray(body?.items)) return []
  return body.items
    .map((it: any, i: number) => ({
      position: i + 1,
      description: invClean(it?.description, 500),
      quantity: invMoney(it?.quantity) || 1,
      unit: invClean(it?.unit, 16),
      unit_price: invMoney(it?.unit_price)
    }))
    .filter((it: ParsedItem) => it.description)
    .slice(0, 50)
}

// Naechste freie Rechnungsnummer: <JJ><lfd ab 1000>WF (z. B. 261002WF).
// Das Jahr richtet sich nach dem Rechnungsdatum; Jahreswechsel startet wieder bei 1000.
export async function nextInvoiceNumber(docDate?: string | null): Promise<{ year2: number; number: string; max: number }> {
  const { query } = await import('./db')
  const d = docDate && /^\d{4}-\d{2}-\d{2}$/.test(docDate) ? docDate : todayVienna()
  const year2 = Number(d.slice(0, 4)) % 100
  const rows = await query("SELECT number FROM invoices WHERE number REGEXP '^[0-9]{6}WF$'")
  let max = 999
  for (const r of rows as any[]) {
    const m = String((r as any).number || '').match(/^(\d{2})(\d{4})WF$/)
    if (m && Number(m[1]) === year2 && Number(m[2]) > max) max = Number(m[2])
  }
  return { year2, max, number: `${String(year2).padStart(2, '0')}${max + 1}WF` }
}

// Naechste freie Angebotsnummer: AG<JJ><lfd ab 1000>WF (z. B. AG261000WF), eigener Zaehler.
export async function nextOfferNumber(docDate?: string | null): Promise<{ year2: number; number: string; max: number }> {
  const { query } = await import('./db')
  const d = docDate && /^\d{4}-\d{2}-\d{2}$/.test(docDate) ? docDate : todayVienna()
  const year2 = Number(d.slice(0, 4)) % 100
  const rows = await query("SELECT number FROM offers WHERE number REGEXP '^AG[0-9]{6}WF$'")
  let max = 999
  for (const r of rows as any[]) {
    const m = String((r as any).number || '').match(/^AG(\d{2})(\d{4})WF$/)
    if (m && Number(m[1]) === year2 && Number(m[2]) > max) max = Number(m[2])
  }
  return { year2, max, number: `AG${String(year2).padStart(2, '0')}${max + 1}WF` }
}
