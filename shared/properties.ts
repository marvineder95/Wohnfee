// Immobilien (Vermietung/Verkauf über WOHNFEE bzw. Partner-Makler) – gemeinsame Listen für
// Website, Dashboard und OpenImmo-Export (willhaben).

export const PROPERTY_CATEGORIES: Array<{ value: string; de: string; en: string; openimmo: string }> = [
  { value: 'wohnung', de: 'Wohnung', en: 'Apartment', openimmo: 'WOHNUNG' },
  { value: 'haus', de: 'Haus', en: 'House', openimmo: 'HAUS' },
  { value: 'buero', de: 'Büro / Praxis', en: 'Office / practice', openimmo: 'BUERO_PRAXEN' },
  { value: 'geschaeft', de: 'Geschäftslokal', en: 'Retail space', openimmo: 'EINZELHANDEL' },
  { value: 'grundstueck', de: 'Grundstück', en: 'Plot', openimmo: 'GRUNDSTUECK' }
]

export const PROPERTY_STATUS: Record<string, { de: string; en: string; public: boolean }> = {
  entwurf: { de: 'Entwurf', en: 'Draft', public: false },
  aktiv: { de: 'Verfügbar', en: 'Available', public: true },
  reserviert: { de: 'Reserviert', en: 'Reserved', public: true },
  vergeben: { de: 'Vergeben', en: 'Let / sold', public: true },
  archiviert: { de: 'Archiviert', en: 'Archived', public: false }
}

/** Ausstattung – Schlüssel bleiben stabil (in DB gespeichert) */
export const PROPERTY_FEATURES: Array<{ key: string; de: string; en: string; icon: string }> = [
  { key: 'balkon', de: 'Balkon', en: 'Balcony', icon: 'home' },
  { key: 'terrasse', de: 'Terrasse', en: 'Terrace', icon: 'home' },
  { key: 'garten', de: 'Garten', en: 'Garden', icon: 'leaf' },
  { key: 'lift', de: 'Lift', en: 'Lift', icon: 'arrow' },
  { key: 'moebliert', de: 'Möbliert', en: 'Furnished', icon: 'box' },
  { key: 'einbaukueche', de: 'Einbauküche', en: 'Fitted kitchen', icon: 'check' },
  { key: 'keller', de: 'Kellerabteil', en: 'Cellar', icon: 'box' },
  { key: 'garage', de: 'Garage / Stellplatz', en: 'Garage / parking', icon: 'truck' },
  { key: 'barrierefrei', de: 'Barrierefrei', en: 'Accessible', icon: 'check' },
  { key: 'klima', de: 'Klimaanlage', en: 'Air conditioning', icon: 'check' },
  { key: 'fussbodenheizung', de: 'Fußbodenheizung', en: 'Underfloor heating', icon: 'check' },
  { key: 'haustiere', de: 'Haustiere erlaubt', en: 'Pets allowed', icon: 'heart' }
]

export const categoryLabel = (v: string, lang: 'de' | 'en' = 'de') =>
  PROPERTY_CATEGORIES.find(c => c.value === v)?.[lang] || v

/** Pflichtangaben für Inserate in Österreich (EAVG 2012: HWB + fGEE im Inserat) */
export function publishWarnings(p: { hwb?: any; fgee?: any; images?: any[]; price?: any; living_area?: any; livingArea?: any }): string[] {
  const w: string[] = []
  if (p.hwb == null || p.hwb === '' || p.fgee == null || p.fgee === '') w.push('Energieausweis: HWB und fGEE fehlen – in Österreich Pflicht in jedem Inserat (EAVG).')
  if (!p.images || !p.images.length) w.push('Keine Fotos – Inserate ohne Bilder werden kaum angeklickt.')
  if (p.price == null || p.price === '') w.push('Kein Preis angegeben.')
  if ((p.living_area ?? p.livingArea) == null || (p.living_area ?? p.livingArea) === '') w.push('Keine Wohnfläche angegeben.')
  return w
}
