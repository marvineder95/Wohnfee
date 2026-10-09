import routes from '~/data/routes.json'
import news from '~/data/news.json'
import site from '~/data/site.json'
import { query } from '../utils/db'
import { articleRoute } from '../utils/blog'

export default defineEventHandler(async (event) => {
  const base = (site as any).baseUrl as string
  const entries: string[] = []

  for (const [path, info] of Object.entries(routes as Record<string, { type: string, id: string }>)) {
    if (info.type === 'news') {
      const n = (news as Record<string, any>)[info.id]
      // press items link to external sources; live sitemap excludes them
      if (n?.url) continue
    }
    // category archives are linked internally but not listed in the live sitemap
    if (info.type === 'category') continue
    let lastmod = ''
    if (info.type === 'news') {
      const n = (news as Record<string, any>)[info.id]
      if (n?.date) lastmod = new Date(Number(n.date) * 1000).toISOString().slice(0, 10)
    }
    entries.push(`  <url>\n    <loc>${base}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`)
  }

  // im Dashboard veröffentlichte Blog-Artikel (ohne DB einfach weglassen)
  const posts = await query<any>(
    `SELECT section, slug, published_at, updated_at FROM blog_posts
     WHERE status = 'veroeffentlicht' AND published_at <= UTC_TIMESTAMP()`
  ).catch(() => [])
  for (const p of posts) {
    const lastmod = new Date(p.updated_at || p.published_at).toISOString().slice(0, 10)
    entries.push(`  <url>\n    <loc>${base}${articleRoute(p.section, p.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

  event.node.res.setHeader('content-type', 'application/xml; charset=utf-8')
  return xml
})
