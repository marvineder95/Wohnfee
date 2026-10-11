import { query, queryOne } from './db'
import { cleanText, sanitizeBody, slugify } from './blog'
import { PROPERTY_CATEGORIES, PROPERTY_FEATURES, PROPERTY_STATUS } from '../../shared/properties'

// Immobilien: Validierung (Dashboard) und Ausgabe (öffentlich/Admin).

const parseJson = (v: any, fb: any) => { try { return v ? JSON.parse(v) : fb } catch { return fb } }
export const imagesOf = (r: any): Array<{ src: string; alt: string }> => parseJson(r.images, [])
export const featuresOf = (r: any): string[] => parseJson(r.features, [])

const num = (v: any, max = 1e9) => {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null
}
const cleanImagePath = (v: unknown) => {
  const s = String(v || '').trim()
  return /^\/(uploads|files)\/[\w\-./ ]+\.(jpe?g|png|webp)$/i.test(s) && !s.includes('..') ? s : null
}
const cls = (v: any) => (/^(A\+\+|A\+|A|B|C|D|E|F|G)$/.test(String(v || '').trim().toUpperCase()) ? String(v).trim().toUpperCase() : null)

export const propertyRoute = (slug: string) => `/immobilien/${slug}.html`

async function uniqueSlug(wanted: string, ownId: number | null) {
  const base = slugify(wanted)
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    const hit = await queryOne('SELECT id FROM properties WHERE slug = :slug AND (:ownId IS NULL OR id <> :ownId)', { slug, ownId })
    if (!hit) return slug
  }
  throw createError({ statusCode: 409, statusMessage: 'Kein freier Link-Name – bitte Titel anpassen.' })
}

export async function readPropertyInput(b: any, ownId: number | null) {
  const title = cleanText(b?.title, 190)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Bitte einen Titel eingeben.' })
  const features = Array.isArray(b?.features) ? b.features.filter((f: any) => PROPERTY_FEATURES.some(x => x.key === f)) : []
  const images = Array.isArray(b?.images)
    ? b.images.map((g: any) => ({ src: cleanImagePath(g?.src), alt: cleanText(g?.alt, 190) })).filter((g: any) => g.src).slice(0, 40)
    : []
  return {
    title,
    slug: await uniqueSlug(String(b?.slug || '').trim() || title, ownId),
    refNo: cleanText(b?.refNo, 32) || null,
    status: Object.keys(PROPERTY_STATUS).includes(b?.status) ? b.status : 'entwurf',
    offerType: b?.offerType === 'kauf' ? 'kauf' : 'miete',
    category: PROPERTY_CATEGORIES.some(c => c.value === b?.category) ? b.category : 'wohnung',
    teaser: cleanText(b?.teaser, 400) || null,
    descriptionHtml: sanitizeBody(b?.descriptionHtml) || null,
    street: cleanText(b?.street, 190) || null,
    showStreet: b?.showStreet ? 1 : 0,
    zip: cleanText(b?.zip, 16) || null,
    city: cleanText(b?.city, 128) || null,
    district: cleanText(b?.district, 128) || null,
    rooms: num(b?.rooms, 99),
    livingArea: num(b?.livingArea, 100000),
    usableArea: num(b?.usableArea, 1000000),
    floor: cleanText(b?.floor, 32) || null,
    yearBuilt: num(b?.yearBuilt, 2100) !== null ? Math.round(num(b?.yearBuilt, 2100)!) : null,
    price: num(b?.price),
    operatingCosts: num(b?.operatingCosts),
    deposit: cleanText(b?.deposit, 64) || null,
    commission: cleanText(b?.commission, 190) || null,
    availableFrom: cleanText(b?.availableFrom, 64) || null,
    minRentMonths: num(b?.minRentMonths, 600) !== null ? Math.round(num(b?.minRentMonths, 600)!) : null,
    hwb: num(b?.hwb, 10000),
    hwbClass: cls(b?.hwbClass),
    fgee: num(b?.fgee, 100),
    fgeeClass: cls(b?.fgeeClass),
    features: JSON.stringify(features),
    images: JSON.stringify(images),
    furnishedByWohnfee: b?.furnishedByWohnfee ? 1 : 0,
    partnerName: cleanText(b?.partnerName, 190) || null,
    contactName: cleanText(b?.contactName, 128) || null,
    contactPhone: cleanText(b?.contactPhone, 64) || null,
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(b?.contactEmail || '').trim()) ? String(b.contactEmail).trim().slice(0, 190) : null,
    willhabenUrl: /^https:\/\/(www\.)?willhaben\.at\//.test(String(b?.willhabenUrl || '')) ? String(b.willhabenUrl).slice(0, 255) : null
  }
}

export const PROPERTY_COLS = `title = :title, slug = :slug, ref_no = :refNo, status = :status, offer_type = :offerType, category = :category,
  teaser = :teaser, description_html = :descriptionHtml, street = :street, show_street = :showStreet, zip = :zip, city = :city,
  district = :district, rooms = :rooms, living_area = :livingArea, usable_area = :usableArea, floor = :floor, year_built = :yearBuilt,
  price = :price, operating_costs = :operatingCosts, deposit = :deposit, commission = :commission, available_from = :availableFrom,
  min_rent_months = :minRentMonths, hwb = :hwb, hwb_class = :hwbClass, fgee = :fgee, fgee_class = :fgeeClass, features = :features,
  images = :images, furnished_by_wohnfee = :furnishedByWohnfee, partner_name = :partnerName, contact_name = :contactName,
  contact_phone = :contactPhone, contact_email = :contactEmail, willhaben_url = :willhabenUrl`

const n = (v: any) => (v === null || v === undefined ? null : Number(v))

/** Öffentliche Ausgabe – Straße nur, wenn freigegeben */
export function toPublicProperty(r: any) {
  return {
    slug: r.slug, route: propertyRoute(r.slug), refNo: r.ref_no, status: r.status, offerType: r.offer_type, category: r.category,
    title: r.title, teaser: r.teaser || '', descriptionHtml: r.description_html || '',
    street: r.show_street ? r.street : null, zip: r.zip, city: r.city, district: r.district,
    rooms: n(r.rooms), livingArea: n(r.living_area), usableArea: n(r.usable_area), floor: r.floor, yearBuilt: r.year_built,
    price: n(r.price), operatingCosts: n(r.operating_costs), deposit: r.deposit, commission: r.commission,
    availableFrom: r.available_from, minRentMonths: r.min_rent_months,
    hwb: n(r.hwb), hwbClass: r.hwb_class, fgee: n(r.fgee), fgeeClass: r.fgee_class,
    features: featuresOf(r), images: imagesOf(r), furnishedByWohnfee: !!r.furnished_by_wohnfee,
    partnerName: r.partner_name, contactName: r.contact_name, contactPhone: r.contact_phone, contactEmail: r.contact_email,
    willhabenUrl: r.willhaben_url, updatedAt: r.updated_at
  }
}

export function toAdminProperty(r: any) {
  return {
    ...toPublicProperty(r), id: r.id, street: r.street, showStreet: !!r.show_street,
    willhabenStatus: r.willhaben_status, willhabenExportedAt: r.willhaben_exported_at, createdAt: r.created_at
  }
}

export async function loadProperty(id: number) {
  const r = await queryOne('SELECT * FROM properties WHERE id = :id', { id })
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Immobilie nicht gefunden' })
  return r
}

/** öffentlich sichtbare Status */
export const PUBLIC_STATUSES = Object.entries(PROPERTY_STATUS).filter(([, v]) => v.public).map(([k]) => k)

export async function publicProperties() {
  const rows = await query(
    `SELECT * FROM properties WHERE status IN (${PUBLIC_STATUSES.map(s => `'${s}'`).join(',')})
     ORDER BY FIELD(status, 'aktiv', 'reserviert', 'vergeben'), sort_order, updated_at DESC`)
  return rows.map(toPublicProperty)
}
