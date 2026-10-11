import { PROPERTY_CATEGORIES } from '../../shared/properties'
import { imagesOf, featuresOf, propertyRoute } from './properties'

// OpenImmo-XML (Version 1.2.7) für den Import in Immobilienportale (willhaben-Maklerschnittstelle u. a.).
// Bilder werden als REMOTE-Anhänge (öffentliche URLs) übergeben → keine ZIP-Datei nötig.
// ⚠ Welche Felder willhaben zwingend erwartet, mit willhaben (Business-Support) abstimmen.

const x = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tag = (name: string, v: any) => (v === null || v === undefined || v === '' ? '' : `<${name}>${x(v)}</${name}>`)
const strip = (h: string) => String(h || '').replace(/<\/(p|h2|h3|li)>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

/** Ein <immobilie>-Block */
export function immobilieXml(r: any, origin: string, action: 'CHANGE' | 'DELETE' = 'CHANGE'): string {
  const cat = PROPERTY_CATEGORIES.find(c => c.value === r.category) || PROPERTY_CATEGORIES[0]
  const miete = r.offer_type !== 'kauf'
  const gewerbe = ['buero', 'geschaeft'].includes(r.category)
  const f = new Set(featuresOf(r))
  const objektart = {
    WOHNUNG: '<wohnung wohnungtyp="ETAGE"/>', HAUS: '<haus haustyp="EINFAMILIENHAUS"/>',
    BUERO_PRAXEN: '<buero_praxen buero_typ="BUEROFLAECHE"/>', EINZELHANDEL: '<einzelhandel handel_typ="LADENLOKAL"/>',
    GRUNDSTUECK: '<grundstueck grundst_typ="WOHNEN"/>'
  }[cat.openimmo]
  const images = imagesOf(r).map((img, i) => {
    const url = /^https?:\/\//.test(img.src) ? img.src : origin + encodeURI(img.src)
    const fmt = /\.png$/i.test(img.src) ? 'image/png' : /\.webp$/i.test(img.src) ? 'image/webp' : 'image/jpeg'
    return `<anhang location="REMOTE" gruppe="${i === 0 ? 'TITELBILD' : 'BILD'}"><anhangtitel>${x(img.alt || r.title)}</anhangtitel><format>${fmt}</format><daten><pfad>${x(url)}</pfad></daten></anhang>`
  }).join('')
  const stand = new Date().toISOString().slice(0, 10)
  const description = [strip(r.description_html || r.teaser || ''),
    r.furnished_by_wohnfee ? 'Die Wohnung wurde von WOHNFEE Home Staging eingerichtet.' : '',
    `Weitere Infos: ${origin}${propertyRoute(r.slug)}`].filter(Boolean).join('\n\n')

  return `<immobilie>
<objektkategorie>
<nutzungsart WOHNEN="${gewerbe ? 'false' : 'true'}" GEWERBE="${gewerbe ? 'true' : 'false'}"/>
<vermarktungsart KAUF="${miete ? 'false' : 'true'}" MIETE_PACHT="${miete ? 'true' : 'false'}"/>
<objektart>${objektart}</objektart>
</objektkategorie>
<geo>${tag('plz', r.zip)}${tag('ort', r.city)}${r.show_street ? tag('strasse', r.street) : ''}${tag('regionaler_zusatz', r.district)}<land iso_land="AUT"/>${tag('etage', r.floor)}</geo>
<kontaktperson>${tag('name', r.contact_name || 'WOHNFEE')}${tag('firma', r.partner_name || 'Eder & Steiner GmbH (WOHNFEE)')}${tag('email_zentrale', r.contact_email || 'office@wohnfee.at')}${tag('tel_zentrale', r.contact_phone || '+43 676 9202236')}</kontaktperson>
<preise>${miete ? tag('warmmiete', r.price) + (r.price != null && r.operating_costs != null ? tag('nettokaltmiete', Math.round((Number(r.price) - Number(r.operating_costs)) * 100) / 100) : '') + tag('nebenkosten', r.operating_costs) + tag('kaution_text', r.deposit) : tag('kaufpreis', r.price)}${tag('provisionstext', r.commission)}<waehrung iso_waehrung="EUR"/></preise>
<flaechen>${tag('wohnflaeche', r.living_area)}${tag('nutzflaeche', r.usable_area)}${tag('anzahl_zimmer', r.rooms)}</flaechen>
<ausstattung>${f.has('balkon') ? '<anzahl_balkone>1</anzahl_balkone>' : ''}${f.has('terrasse') ? '<anzahl_terrassen>1</anzahl_terrassen>' : ''}${f.has('garten') ? '<gartennutzung>true</gartennutzung>' : ''}${f.has('lift') ? '<fahrstuhl PERSONEN="true"/>' : ''}${f.has('moebliert') ? '<moebliert moeb="VOLL"/>' : ''}${f.has('einbaukueche') ? '<kueche EBK="true"/>' : ''}${f.has('keller') ? '<unterkellert keller="JA"/>' : ''}${f.has('garage') ? '<stellplatzart GARAGE="true"/>' : ''}${f.has('barrierefrei') ? '<barrierefrei>true</barrierefrei>' : ''}${f.has('klima') ? '<klimatisiert>true</klimatisiert>' : ''}${f.has('fussbodenheizung') ? '<heizungsart FUSSBODEN="true"/>' : ''}${f.has('haustiere') ? '<haustiere>true</haustiere>' : ''}</ausstattung>
<zustand_angaben>${tag('baujahr', r.year_built)}<energiepass>${tag('hwbwert', r.hwb)}${tag('hwbklasse', r.hwb_class)}${tag('fgeewert', r.fgee)}${tag('fgeeklasse', r.fgee_class)}</energiepass></zustand_angaben>
<freitexte>${tag('objekttitel', r.title)}${tag('objektbeschreibung', description)}${tag('dreizeiler', r.teaser)}</freitexte>
<anhaenge>${images}</anhaenge>
<verwaltung_objekt><objektadresse_freigeben>${r.show_street ? 'true' : 'false'}</objektadresse_freigeben>${tag('verfuegbar_ab', r.available_from)}${tag('min_mietdauer', r.min_rent_months ? `${r.min_rent_months} Monate` : '')}</verwaltung_objekt>
<verwaltung_techn><objektnr_extern>${x(r.ref_no || `WF-${r.id}`)}</objektnr_extern><aktion aktionart="${action}"/><openimmo_obid>WOHNFEE${String(r.id).padStart(8, '0')}</openimmo_obid><stand_vom>${stand}</stand_vom></verwaltung_techn>
</immobilie>`
}

/** Vollständiges OpenImmo-Dokument; umfang VOLL = Feed mit allen aktuellen Objekten */
export function openImmoDocument(blocks: string[], umfang: 'TEIL' | 'VOLL' = 'TEIL'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<openimmo>
<uebertragung art="ONLINE" umfang="${umfang}" modus="CHANGE" version="1.2.7" sendersoftware="WOHNFEE-Dashboard" senderversion="1.0" techn_email="office@wohnfee.at"/>
<anbieter>
<anbieternr>WOHNFEE</anbieternr>
<firma>Eder &amp; Steiner GmbH (WOHNFEE)</firma>
<openimmo_anid>WOHNFEE-ES-GMBH</openimmo_anid>
${blocks.join('\n')}
</anbieter>
</openimmo>
`
}

export const propertyToOpenImmo = (r: any, origin: string) => openImmoDocument([immobilieXml(r, origin)])
