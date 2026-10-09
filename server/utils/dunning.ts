import { addDays } from './recurring'
import { todayVienna } from './site'

// Mahnwesen: Zahlungsziel und Mahnstufen an einer Stelle
export const PAYMENT_DAYS = 14        // Zahlungsziel laut Rechnungstext
export const REMINDER_GRACE_DAYS = 7  // neue Frist nach jeder Erinnerung/Mahnung

export const REMINDER_LEVELS = [
  { de: 'Zahlungserinnerung', en: 'Payment reminder' },
  { de: '1. Mahnung', en: 'First reminder' },
  { de: '2. Mahnung', en: 'Final reminder' }
] as const

/** Fälligkeit: Rechnungsdatum + 14 Tage, nach einer Erinnerung deren Datum + 7 Tage */
export function dueDate(inv: { doc_date: any; last_reminder_at?: any }): string {
  if (inv.last_reminder_at) return addDays(String(inv.last_reminder_at).slice(0, 10), REMINDER_GRACE_DAYS)
  return addDays(String(inv.doc_date).slice(0, 10), PAYMENT_DAYS)
}

export function daysOverdue(inv: { doc_date: any; last_reminder_at?: any }): number {
  const due = new Date(dueDate(inv) + 'T00:00:00Z').getTime()
  const today = new Date(todayVienna() + 'T00:00:00Z').getTime()
  return Math.round((today - due) / 86400000)
}
