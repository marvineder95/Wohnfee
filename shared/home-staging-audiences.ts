// Zielgruppen der Home-Staging-Seite: Karten im Hero (HsHero) und die
// Zielgruppen-Unterseiten (HsAudience) teilen sich diese Daten.
const IMG = '/files/wohnfee/bilder/homestaging/'

export interface HsAudience {
  route: string
  title: string
  text: string
  img: string
  /** zweites Bild für den Inhaltsbereich der Unterseite */
  sideImg: string
}

export const HS_AUDIENCES: HsAudience[] = [
  {
    route: '/fuer-bautraeger-2.html',
    title: 'Für Bauträger',
    text: 'Musterwohnungen, Showrooms und Projektvermarktung mit maximaler Wirkung.',
    img: IMG + 'WOHNZIMMER_Musterwohnung_Maerz23.jpg',
    sideImg: IMG + 'HomeOffice_Musterwohnung_Maerz23.jpg'
  },
  {
    route: '/fuer-makler.html',
    title: 'Für Makler',
    text: 'Attraktive Immobilienpräsentation für schnellere Verkäufe und höhere Verkaufspreise.',
    img: IMG + 'ESSEN.jpg',
    sideImg: IMG + '2023-03-08_TheOne-0092.jpg'
  },
  {
    route: '/fuer-privatpersonen-2.html',
    title: 'Für Privatpersonen',
    text: 'Temporäre Einrichtungslösungen für Umzug, Renovierung oder längere Aufenthalte.',
    img: IMG + 'WOHNEN-0041.jpg',
    sideImg: IMG + 'Schlafen.jpg'
  }
]

export const HS_AUDIENCE_ROUTES = HS_AUDIENCES.map(a => a.route)
