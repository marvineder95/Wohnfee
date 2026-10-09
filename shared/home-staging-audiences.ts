// Zielgruppen der Home-Staging-Seite: Karten im Hero (HsHero) und die
// Zielgruppen-Unterseiten (HsAudience) teilen sich diese Daten.
const IMG = '/files/wohnfee/bilder/homestaging/'

export interface HsAudience {
  route: string
  title: string
  text: string
  titleEn: string
  textEn: string
  img: string
  /** zweites Bild für den Inhaltsbereich der Unterseite */
  sideImg: string
}

export const HS_AUDIENCES: HsAudience[] = [
  {
    route: '/fuer-bautraeger-2.html',
    title: 'Für Bauträger',
    text: 'Musterwohnungen, Showrooms und Projektvermarktung mit maximaler Wirkung.',
    titleEn: 'For Property Developers',
    textEn: 'Show flats, showrooms and project marketing with maximum impact.',
    img: IMG + 'WOHNZIMMER_Musterwohnung_Maerz23.jpg',
    sideImg: IMG + 'HomeOffice_Musterwohnung_Maerz23.jpg'
  },
  {
    route: '/fuer-makler.html',
    title: 'Für Makler',
    text: 'Attraktive Immobilienpräsentation für schnellere Verkäufe und höhere Verkaufspreise.',
    titleEn: 'For Estate Agents',
    textEn: 'Attractive property presentation for faster sales and higher selling prices.',
    img: IMG + 'ESSEN.jpg',
    sideImg: IMG + '2023-03-08_TheOne-0092.jpg'
  },
  {
    route: '/fuer-privatpersonen-2.html',
    title: 'Für Privatpersonen',
    text: 'Temporäre Einrichtungslösungen für Umzug, Renovierung oder längere Aufenthalte.',
    titleEn: 'For Private Individuals',
    textEn: 'Temporary furnishing solutions for moves, renovations or longer stays.',
    img: IMG + 'WOHNEN-0041.jpg',
    sideImg: IMG + 'Schlafen.jpg'
  }
]

export const HS_AUDIENCE_ROUTES = HS_AUDIENCES.map(a => a.route)
