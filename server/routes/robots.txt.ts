import site from '~/data/site.json'

export default defineEventHandler((event) => {
  event.node.res.setHeader('content-type', 'text/plain; charset=utf-8')
  return `User-agent: *
Allow: /
Disallow: /suche.html

Sitemap: ${(site as any).baseUrl}/sitemap.xml
`
})
