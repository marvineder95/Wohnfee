// Sprache der aktuellen Seite (DE/EN) für die neu gestalteten Komponenten.
// - t('Deutsch', 'English') wählt den Text passend zur Sprache
// - lp('/kontakt.html') liefert im EN-Modus das englische Gegenstück (falls vorhanden)
import routes from '~/data/routes.json'

export const useLang = () => {
  const route = useRoute()
  const isEn = computed(() => route.path.startsWith('/en/'))
  const lang = computed<'de' | 'en'>(() => (isEn.value ? 'en' : 'de'))
  const t = (de: string, en: string) => (isEn.value ? en : de)
  const lp = (path: string) => {
    if (!isEn.value || !path.startsWith('/') || path.startsWith('/en/')) return path
    const [p, hash] = path.split('#')
    const key = p.endsWith('.html') ? p : p + '.html'
    const en = (routes as Record<string, unknown>)['/en' + key] ? '/en' + key : p
    return hash ? `${en}#${hash}` : en
  }
  return { isEn, lang, t, lp }
}

/** DE-Route einer Seite (für EN-Seiten das `alternate`-Gegenstück) */
export const baseRoute = (page: any) =>
  page?.route?.startsWith('/en/') ? (page.alternate || page.route.slice(3)) : page?.route
