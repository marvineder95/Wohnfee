// Partner & Referenzen (Dashboard /admin/partner, Tabelle `partners`).
//   partner  = Kooperationspartner → Seite /partner.html (Menü „Über uns“ → „Partner“)
//   referenz = Kunden-Logos        → Logo-Leiste auf Startseite + „Für Bauträger“
// Auf der Website erscheint nur, was „sichtbar“ ist – ohne sichtbare Einträge bleibt alles ausgeblendet.
export type PartnerKind = 'partner' | 'referenz'

export const PARTNER_KINDS: Record<PartnerKind, { label: string; plural: string; where: string }> = {
  partner: { label: 'Partner', plural: 'Partner', where: 'Seite „Partner“ unter „Über uns“' },
  referenz: { label: 'Referenz', plural: 'Referenzen', where: 'Logo-Leiste auf der Startseite und bei „Für Bauträger“' }
}

export const PARTNER_CATEGORIES = ['Fotografie', 'Makler', 'Bauträger', 'Handwerk', 'Möbel & Deko', 'Transport', 'Sonstiges']

/** Website-Link vereinheitlichen (https:// ergänzen, nur http/https zulassen) */
export function normalizeWebsite(v: unknown): string | null {
  let s = String(v ?? '').trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    return /^https?:$/.test(u.protocol) ? u.toString().slice(0, 255) : null
  } catch { return null }
}
