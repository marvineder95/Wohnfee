import routes from '~/data/routes.json'
import pages from '~/data/pages.json'
import pagesEn from '~/data/pages-en.json'
import news from '~/data/news.json'
import newsEn from '~/data/news-en.json'
import nav from '~/data/nav.json'
import site from '~/data/site.json'
import categories from '~/data/categories.json'

export const useSiteData = () => ({ routes, pages, pagesEn, news, newsEn, nav, site, categories })

export const asset = (path?: string | null) => {
  if (!path) return ''
  return path.startsWith('/') ? path : '/' + path
}

export const resolveRoute = (path: string) => {
  const key = path.endsWith('.html') ? path : path + '.html'
  return (routes as Record<string, { type: string, id: string }>)[key]
}

/** full canonical url for a route path */
export const canonical = (path: string) => (site as { baseUrl: string }).baseUrl + path
