import routesJson from './data/routes.json'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: true,
  // all data comes from statically imported JSON — no useAsyncData/useFetch anywhere,
  // so payload extraction only breaks .html prerender routes (start.html/_payload.json EEXIST)
  experimental: { payloadExtraction: false },
  modules: ['@nuxt/image'],
  css: ['~/assets/css/admin-theme.css'],
  runtimeConfig: {
    // server-only secrets — override in production via NUXT_* env vars (or .env):
    //   NUXT_ADMIN_SECRET, NUXT_DB_HOST, NUXT_DB_PORT, NUXT_DB_USER, NUXT_DB_PASSWORD, NUXT_DB_NAME
    adminSecret: process.env.NUXT_ADMIN_SECRET || '',
    dbHost: process.env.NUXT_DB_HOST || '127.0.0.1',
    dbPort: Number(process.env.NUXT_DB_PORT || 3307),
    dbUser: process.env.NUXT_DB_USER || 'wohnfee',
    dbPassword: process.env.NUXT_DB_PASSWORD || 'wohnfee-dev',
    dbName: process.env.NUXT_DB_NAME || 'wohnfee',
    // SMTP for invite mails (optional in dev — mails are logged instead)
    smtpHost: process.env.NUXT_SMTP_HOST || '',
    smtpPort: Number(process.env.NUXT_SMTP_PORT || 465),
    smtpUser: process.env.NUXT_SMTP_USER || '',
    smtpPassword: process.env.NUXT_SMTP_PASSWORD || '',
    smtpSecure: process.env.NUXT_SMTP_SECURE !== undefined ? process.env.NUXT_SMTP_SECURE === 'true' : undefined,
    mailFrom: process.env.NUXT_MAIL_FROM || ''
  },
  image: {
    // 'ipx' is resolved automatically by the module: live optimization in dev,
    // pre-generated _ipx variants when running `nuxi generate` for static hosting
    provider: 'ipx',
    quality: 80,
    screens: {
      xs: 400,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1600,
      '2xl': 1920
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      meta: [
        { charset: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
      ],
      link: [
        { rel: 'stylesheet', href: '/vendor/swiper/swiper-bundle.min.css' },
        { rel: 'stylesheet', href: '/system/modules/mobile_menu/assets/css/mobile-menu.min.css' },
        { rel: 'stylesheet', href: '/assets/contao/css/layout.min.css' },
        { rel: 'stylesheet', href: '/assets/contao/css/responsive.min.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/cookiebar.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/webfonts.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/style.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/icons.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/icon-menu.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/navigation.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/blog.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/media-queries.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/mobile_menu.css' },
        { rel: 'stylesheet', href: '/files/wohnfee/layout/css/migration.css' }
      ],
      script: [
        { src: '/vendor/swiper/swiper-bundle.min.js', defer: true }
      ]
    }
  },
  nitro: {
    routeRules: {
      '/': { redirect: { to: '/start.html', statusCode: 302 } },
      // live statt vorgerendert (Dashboard-Artikel), auch falls der Link-Crawler aktiv ist
      '/trends-tipps.html': { prerender: false },
      '/aktuelles.html': { prerender: false },
      '/blogartikel-trends-tipps/**': { prerender: false },
      '/sitemap.xml': { prerender: false }
    },
    prerender: {
      failOnError: true,
      // routes are listed explicitly from data/routes.json — the link crawler alone
      // misses pages in this app, so prerendering must not depend on it
      routes: [
        '/robots.txt',
        '/admin',
        '/admin/dashboard',
        '/admin/users',
        '/admin/einladung',
        '/admin/profil',
        '/admin/passwort',
        '/admin/anfragen',
        '/admin/projekte',
        '/admin/rechnungen',
        '/admin/kontakte',
        '/admin/inventar',
        '/admin/artikel',
        // Trends & Tipps (Übersicht + Artikel), Aktuell und die Sitemap werden live gerendert,
        // damit im Dashboard veröffentlichte Artikel sofort ohne Neu-Build erscheinen
        ...Object.keys(routesJson).filter(r => !['/trends-tipps.html', '/aktuelles.html'].includes(r) && !r.startsWith('/blogartikel-trends-tipps/'))
      ]
    }
  }
})

