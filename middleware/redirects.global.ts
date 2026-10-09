import site from '~/data/site.json'

export default defineNuxtRouteMiddleware((to) => {
  const redirects = (site as any).redirects || {}
  const path = to.path
  if (redirects[path]) {
    return navigateTo(redirects[path], { redirectCode: 301 })
  }
  // mirror live site: extensionless URLs and folder variants 301 to canonical .html URL
  if (path === '/') {
    return navigateTo('/start.html', { redirectCode: 302 })
  }
  return undefined
})
