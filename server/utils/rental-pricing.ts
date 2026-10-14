import { getSetting, setSetting } from './settings'
import { DEFAULT_TIERS, normalizeTiers, type DiscountTier } from '../../shared/rental-pricing'

const KEY = 'rental_discount_tiers'

/** Rabattstaffel aus den Konditionen (Standard, solange nichts gespeichert ist) */
export async function getTiers(): Promise<DiscountTier[]> {
  try {
    const raw = await getSetting(KEY)
    if (raw) return normalizeTiers(JSON.parse(raw))
  } catch { /* Standard */ }
  return DEFAULT_TIERS
}

export async function saveTiers(raw: unknown): Promise<DiscountTier[]> {
  const tiers = normalizeTiers(raw)
  await setSetting(KEY, JSON.stringify(tiers))
  return tiers
}
