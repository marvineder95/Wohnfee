import { getSetting, setSetting } from './settings'
import { currentAdminUser } from './admin-auth'

// Mietshop öffentlich ja/nein (Setting `shop_public`, Schalter unter Konditionen).
// Aus = „Coming Soon“: Besucher sehen keine Produkte, keine Warenkorb-/Checkout-Funktion, Mietanfragen werden abgewiesen.
// Eingeloggte Dashboard-Benutzer sehen den Shop weiter als Vorschau.
export async function shopPublic(): Promise<boolean> {
  return (await getSetting('shop_public').catch(() => '')) === '1'
}
export async function setShopPublic(on: boolean) {
  await setSetting('shop_public', on ? '1' : '0')
}
/** Darf diese Anfrage den Shop sehen/nutzen? (öffentlich oder Admin-Vorschau) */
export async function shopAccess(event: any): Promise<{ public: boolean; preview: boolean }> {
  const pub = await shopPublic()
  if (pub) return { public: true, preview: false }
  const admin = await currentAdminUser(event).catch(() => null)
  return { public: false, preview: !!admin }
}

// Immobilien öffentlich ja/nein (Setting `properties_public`, Schalter im Dashboard unter Immobilien).
// Aus: Menüpunkt weg, /immobilien.html + Detailseiten 404, nicht in der Sitemap, öffentliche Immobilien-API gesperrt.
export async function propertiesPublic(): Promise<boolean> {
  return (await getSetting('properties_public').catch(() => '')) === '1'
}
export async function setPropertiesPublic(on: boolean) {
  await setSetting('properties_public', on ? '1' : '0')
}
/** Immobilien sichtbar? (öffentlich oder eingeloggt als Vorschau) – wirft 404, wenn nicht */
export async function requirePropertiesAccess(event: any) {
  if (await propertiesPublic()) return
  const admin = await currentAdminUser(event).catch(() => null)
  if (!admin) throw createError({ statusCode: 404, statusMessage: 'Seite nicht gefunden' })
}
