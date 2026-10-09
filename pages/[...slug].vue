<script setup lang="ts">
import { HS_AUDIENCE_ROUTES } from '~~/shared/home-staging-audiences'
const { pages, pagesEn, news, newsEn, site, categories } = useSiteData()
const route = useRoute()

// DE-Route der Seite – EN-Seiten (/en/…) nutzen dieselben neuen Layouts
const pageRoute = computed(() => baseRoute(pageData.value))

// Blog-Übersichten und -Sektionen im neuen Design
const BLOG_LISTS: Record<string, string> = {
  '/aktuelles.html': 'aktuelles', '/projekte.html': 'projekte', '/trends-tipps.html': 'trends-tipps', '/events.html': 'events'
}
const BLOG_ARTICLE_SECTIONS = ['trends-tipps', 'projekte', 'events', 'aktuelles']

// pro Adresse neu aufbauen – Dashboard-Artikel werden beim Setup geladen
definePageMeta({ key: r => r.path })

const slug = computed(() => {
  const p = route.params.slug
  return '/' + (Array.isArray(p) ? p.join('/') : p)
})

const isEn = computed(() => slug.value.startsWith('/en/'))

const entry = computed(() => resolveRoute(slug.value))

// EN-Routen lesen ihre Daten aus pages-en/news-en; Seite 43 (EN-Furniture-
// Leasing) lebt weiterhin direkt in pages.json und wird per Fallback gefunden.
const pageData = computed(() => entry.value?.type === 'page'
  ? ((isEn.value ? pagesEn : pages) as Record<string, any>)[entry.value!.id]
    || (pages as Record<string, any>)[entry.value!.id] : null)
// Im Dashboard angelegte Blog-Artikel stehen nicht in routes.json, sondern in
// der Datenbank – bei unbekannter Artikel-Adresse dort nachsehen.
let dbArticle: any = null
const dbMatch = !entry.value ? slug.value.match(/^\/blogartikel-([a-z-]+)\/([a-z0-9-]+)\.html$/) : null
if (dbMatch) {
  const { data } = await useAsyncData(`blog-article-${slug.value}`,
    () => $fetch<any>(`/api/blog/${dbMatch[1]}/${dbMatch[2]}`).catch(() => ({ notFound: true })))
  dbArticle = data.value?.route ? data.value : null
}

const newsData = computed(() => entry.value?.type === 'news'
  ? ((isEn.value ? newsEn : news) as Record<string, any>)[entry.value!.id]
    || (news as Record<string, any>)[entry.value!.id] : dbArticle)

const categoryData = computed(() => entry.value?.type === 'category'
  ? (categories as Record<string, any>)[entry.value!.id] : null)

// category archive pages render the parent page's frame with a filtered newslist
// Elternseite über ihre Route finden (pages.json ist nach Seiten-ID geschlüsselt,
// categoryData.page enthält aber den Alias – der direkte Zugriff lief ins Leere)
const categoryPage = computed(() => {
  const c = categoryData.value
  if (!c) return null
  return Object.values(pages as Record<string, any>).find((p: any) => p.route === c.pageRoute)
    || (pages as Record<string, any>)[c.page] || null
})

const categoryListEl = computed(() => {
  if (!categoryData.value) return null
  return {
    type: 'newslist',
    archives: [categoryData.value.archive],
    category: categoryData.value.id,
    variant: categoryData.value.variant,
    limit: 0,
    perPage: categoryData.value.page === 'presse' ? 5 : 0,
    cssClass: categoryData.value.page === 'presse' ? 'blog' : 'projekt blog'
  }
})

const title = computed(() => {
  if (newsData.value) return `${newsData.value.headline} - WOHNFEE Home Staging`
  if (categoryPage.value) return categoryPage.value.pageTitle ? `${categoryPage.value.pageTitle} - WOHNFEE Home Staging` : `${categoryPage.value.title} - WOHNFEE Home Staging`
  const p: any = pageData.value
  if (!p) return 'Seite nicht gefunden - WOHNFEE Home Staging'
  if (p.route === '/start.html') return p.pageTitle || 'Start - WOHNFEE Home Staging'
  return p.pageTitle ? `${p.pageTitle} - WOHNFEE Home Staging` : `${p.title} - WOHNFEE Home Staging`
})

const description = computed(() =>
  newsData.value?.description?.slice(0, 160)
  || newsData.value?.teaser?.replace(/<[^>]+>/g, ' ').slice(0, 160).trim()
  || pageData.value?.description || categoryPage.value?.description || '')

const canonicalUrl = computed(() =>
  (site as any).baseUrl + (newsData.value?.route || pageData.value?.route
    || (categoryData.value ? `/${categoryData.value.page}/category/${categoryData.value.alias}.html` : slug.value)))

// Sprachversion der Seite (de/en) für <html lang> und hreflang-Annotationen.
// MUSS vor useHead deklariert sein (TDZ!).
const pageLang = computed(() =>
  (newsData.value as any)?.lang || pageData.value?.lang || 'de')
const alternateLinks = computed(() => {
  const p: any = newsData.value || pageData.value
  if (!p?.alternate) return []
  const base = (site as any).baseUrl
  const de = p.lang === 'en' ? p.alternate : p.route
  const en = p.lang === 'en' ? p.route : p.alternate
  return [
    { rel: 'alternate', hreflang: 'de', href: base + de },
    { rel: 'alternate', hreflang: 'en', href: base + en },
    { rel: 'alternate', hreflang: 'x-default', href: base + de }
  ]
})

useHead(() => ({
  title: title.value,
  htmlAttrs: { lang: pageLang.value },
  bodyAttrs: { id: 'top', class: pageData.value?.cssClass || categoryPage.value?.cssClass || '' },
  meta: [
    { name: 'robots', content: newsData.value?.robots || pageData.value?.robots || 'index,follow' },
    { name: 'description', content: description.value },
    { property: 'og:title', content: title.value },
    { property: 'og:description', content: description.value },
    { property: 'og:url', content: canonicalUrl.value },
    { property: 'og:type', content: newsData.value ? 'article' : 'website' }
  ],
  link: [
    { rel: 'canonical', href: canonicalUrl.value },
    ...alternateLinks.value
  ]
}))

const newsDate = computed(() => {
  if (!newsData.value?.date) return ''
  return new Date(Number(newsData.value.date) * 1000).toLocaleDateString(
    pageLang.value === 'en' ? 'en-GB' : 'de-AT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
})

// „Zurück zur Übersicht" im Reader: EN-Artikel verlinken auf den EN-Archivbereich
const backLabel = computed(() =>
  pageLang.value === 'en' ? '‹ Back to overview' : '‹ Zurück zur Übersicht')
const backLink = computed(() => {
  const sec = (newsData.value as any)?.section
  if (!sec) return '/aktuelles.html'
  const en = `/en/${sec}.html`
  return (pageLang.value === 'en' && resolveRoute(en)) ? en : `/${sec}.html`
})

// 404 for unknown routes
if (!entry.value && !dbArticle) {
  throw createError({ statusCode: 404, statusMessage: 'Seite nicht gefunden' })
}

// „So funktioniert"-Ablauf (330 + 333–338) ersetzt die FlHowItWorks-Komponente
// im neuen Karten-Design; der CTA (339) bleibt erhalten.
const HIW_DE = ['330', '333', '334', '335', '336', '337', '338']
const leasingInfo = computed(() => {
  if (pageData.value?.route !== '/furniture-leasing.html') return []
  return (pageData.value.columns?.main || []).filter((e: any) =>
    e.id !== '328' && e.id !== '331' && e.id !== '332' && e.id !== 'rental-split'
    && e.id !== '339' && !HIW_DE.includes(e.id)
    && !String(e.cssClass || '').includes('langlink'))
})
const leasingCta = computed(() => {
  if (pageData.value?.route !== '/furniture-leasing.html') return []
  return (pageData.value.columns?.main || []).filter((e: any) => e.id === '339')
})

// EN-Gegenstück: H1 (561) steckt im Shop-Hero, Langlink (582) wurde durch
// den globalen Sprachswitch ersetzt, Texte 562/563 ersetzt FlInfo.
// Ablauf (564 + 565–570) ersetzt FlHowItWorks; CTA (571) bleibt erhalten.
const HIW_EN = ['564', '565', '566', '567', '568', '569', '570']
const enInfo = computed(() => {
  if (pageData.value?.route !== '/en/furniture-leasing.html') return []
  return (pageData.value.columns?.main || []).filter((e: any) =>
    e.id !== '561' && e.id !== '562' && e.id !== '563' && e.id !== '571'
    && !HIW_EN.includes(e.id)
    && !String(e.cssClass || '').includes('langlink'))
})
const enCta = computed(() => {
  if (pageData.value?.route !== '/en/furniture-leasing.html') return []
  return (pageData.value.columns?.main || []).filter((e: any) => e.id === '571')
})

// Sprachwechsel-Links (DE/EN) erscheinen global im Header — die alten
// Inhalts-Links („View text in English" / „Text auf Deutsch lesen") werden
// auf allen Seiten aus dem Inhaltsbereich herausgefiltert.
const regularMain = computed(() =>
  (pageData.value?.columns?.main || []).filter((e: any) =>
    !String(e.cssClass || '').includes('langlink')))
</script>

<template>
  <!-- Furniture-Leasing-Shop: Hero, Sortiment, Warenkorb und Checkout -->
  <div v-if="pageData?.route === '/furniture-leasing.html'" class="page-content" :data-route="pageData.route">
    <RentalShop />
    <FlInfo />
    <div class="content-wrapper">
      <div class="main-column">
        <ContentElements :elements="leasingInfo" />
        <FlHowItWorks />
        <ContentElements v-if="leasingCta.length" :elements="leasingCta" />
      </div>
    </div>
    <ContentElements v-if="pageData.columns?.footer?.length" :elements="pageData.columns.footer" />
  </div>

  <!-- Furniture-Leasing-Shop (Englisch) -->
  <div v-else-if="pageData?.route === '/en/furniture-leasing.html'" class="page-content" :data-route="pageData.route">
    <RentalShop lang="en" />
    <FlInfo lang="en" />
    <div class="content-wrapper">
      <div class="main-column">
        <ContentElements :elements="enInfo" />
        <FlHowItWorks lang="en" />
        <ContentElements v-if="enCta.length" :elements="enCta" />
      </div>
    </div>
    <ContentElements v-if="pageData.columns?.footer?.length" :elements="pageData.columns.footer" />
  </div>

  <!-- Startseite: Angebot in der Reihenfolge Home Staging > Furniture Leasing > Redesign -->
  <div v-else-if="pageRoute === '/start.html'" class="page-content" :data-route="pageData.route">
    <HsStart :page="pageData" />
  </div>

  <!-- Home Staging: Hero mit Zielgruppen-Karten + neu gestalteter Inhalt -->
  <div v-else-if="pageRoute === '/home-staging.html'" class="page-content" :data-route="pageData.route">
    <HsHero />
    <HsContent :page="pageData" />
  </div>

  <!-- Home-Staging-Zielgruppen (Bauträger / Makler / Privatpersonen) -->
  <div v-else-if="pageData && HS_AUDIENCE_ROUTES.includes(pageRoute)" class="page-content" :data-route="pageData.route">
    <HsAudience :page="pageData" />
  </div>

  <!-- Home-Staging-Preise: Paket-Karten + Ausstattung je Raum -->
  <div v-else-if="pageRoute === '/home-staging/preise.html'" class="page-content" :data-route="pageData.route">
    <HsPrices :page="pageData" />
  </div>

  <!-- FAQ: Suche, Rubriken, Akkordeon + FAQPage-Strukturdaten -->
  <div v-else-if="pageRoute === '/faq.html'" class="page-content" :data-route="pageData.route">
    <HsFaq :page="pageData" />
  </div>

  <!-- Redesign: Hero, Bildstrecke, Ablauf, Investition, Trends -->
  <div v-else-if="pageRoute === '/redesign.html'" class="page-content" :data-route="pageData.route">
    <HsRedesign :page="pageData" />
  </div>

  <!-- Blog-Übersichten (Aktuell, Projekte, Trends & Tipps, Events) -->
  <div v-else-if="pageData && BLOG_LISTS[pageRoute]" class="page-content" :data-route="pageData.route">
    <HsBlogList :page="pageData" :section="BLOG_LISTS[pageRoute]" />
  </div>

  <!-- Team: Porträts, Zitate, Zahlen, Kontakt -->
  <div v-else-if="pageRoute === '/team.html'" class="page-content" :data-route="pageData.route">
    <HsTeam :page="pageData" />
  </div>

  <!-- Pressespiegel: Zeitstrahl mit Filtern -->
  <div v-else-if="pageRoute === '/presse.html'" class="page-content" :data-route="pageData.route">
    <HsPress :page="pageData" />
  </div>

  <!-- Kontakt: Kontaktwege + Formular auf einen Blick -->
  <div v-else-if="pageRoute === '/kontakt.html'" class="page-content" :data-route="pageData.route">
    <HsContact :page="pageData" />
  </div>

  <!-- Impressum: Rechtstext-Karten -->
  <div v-else-if="pageRoute === '/impressum.html'" class="page-content" :data-route="pageData.route">
    <HsLegal :page="pageData" />
  </div>

  <!-- regular page -->
  <div v-else-if="pageData" class="page-content" :data-route="pageData.route">
    <ContentElements v-if="pageData.columns?.head?.length" :elements="pageData.columns.head" />
    <div v-if="pageData.columns?.slider?.length" id="slider">
      <div class="inside">
        <div class="mod_article block">
          <ContentElements :elements="pageData.columns.slider" />
        </div>
      </div>
    </div>
    <div class="content-wrapper">
      <div v-if="pageData.columns?.left?.length" class="left-column">
        <ContentElements :elements="pageData.columns.left" />
      </div>
      <div class="main-column">
        <ContentElements :elements="regularMain" />
        <AppContactForm v-if="pageData.route === '/kontakt.html'" lang="de" />
        <AppContactForm v-else-if="pageData.route === '/en/kontakt.html'" lang="en" />
      </div>
      <div v-if="pageData.columns?.right?.length" class="right-column">
        <ContentElements :elements="pageData.columns.right" />
      </div>
    </div>
    <ContentElements v-if="pageData.columns?.footer?.length" :elements="pageData.columns.footer" />
  </div>

  <!-- alte Projekt-Kategorie-URLs: Projekte-Übersicht mit vorausgewählter Zielgruppe -->
  <div v-else-if="categoryPage && categoryData?.page === 'projekte'" class="page-content" :data-route="slug">
    <HsBlogList :page="categoryPage" section="projekte" :category="categoryData.id" />
  </div>

  <!-- alte Presse-Kategorie-URLs: neuer Pressespiegel mit vorausgewähltem Filter -->
  <div v-else-if="categoryPage && categoryData?.page === 'presse'" class="page-content" :data-route="slug">
    <HsPress :page="categoryPage" :category="categoryData.id" />
  </div>

  <!-- category archive: parent page frame + filtered newslist -->
  <div v-else-if="categoryPage && categoryListEl" class="page-content" :data-route="slug">
    <ContentElements v-if="categoryPage.columns?.slider?.length" :elements="categoryPage.columns.slider" />
    <div class="content-wrapper">
      <div class="main-column">
        <h1 class="content-headline">{{ categoryPage.title }}</h1>
        <ModuleNewslist :el="categoryListEl" />
      </div>
    </div>
  </div>

  <!-- Blog-Artikel (Trends, Projekte, Events, Aktuelles) im neuen Design (nur DE) -->
  <HsArticle v-else-if="newsData && BLOG_ARTICLE_SECTIONS.includes(newsData.section)" :article="newsData" />

  <!-- news detail -->
  <article v-else-if="newsData" class="news-reader" itemscope itemtype="http://schema.org/Article">
    <h1 itemprop="name">{{ newsData.headline }}</h1>
    <p class="date"><time :datetime="new Date(Number(newsData.date) * 1000).toISOString()">{{ newsDate }}</time></p>
    <figure v-if="newsData.image" class="image_container float_above">
      <NuxtImg :src="asset(newsData.image)" :alt="newsData.headline" itemprop="image"
               sizes="xs:100vw sm:100vw md:100vw lg:1140px xl:1140px xxl:1140px 2xl:1140px" />
    </figure>
    <div class="ce_text block rte" itemprop="articleBody" v-html="newsData.text || newsData.teaser" />
    <ContentElements :elements="newsData.elements || []" />
    <p class="back"><NuxtLink :to="backLink">{{ backLabel }}</NuxtLink></p>
  </article>

  <div v-else>
    <h1>Seite nicht gefunden</h1>
    <p>Die angeforderte Seite existiert nicht.</p>
  </div>
</template>

<!-- Modernisierung ausschließlich für die Furniture-Leasing-Seite.
     Selektor steht auf [data-route="/furniture-leasing.html"], alle anderen Seiten
     und das SEO-Grundgerüst (URL, Titel, H1, Texte) bleiben unberührt. -->
<style>
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .main-column { line-height: 1.65; }

/* H1 moderner */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .main-column h1 {
  font-size: 2.5em; letter-spacing: .01em; margin: .15em 0 .4em; line-height: 1.15;
}

/* Einstiegstext großzügiger */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .ce_headline.no-flex + .content-text p {
  font-size: 1.06em; line-height: 1.8; color: #4a4a46; max-width: 46em;
}

/* Sektionstitel mit Akzentlinie */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .main-column h2:not(.imp__title):not(.hiw__title) {
  font-size: 1.65em; margin: 1.7em 0 .7em; padding-bottom: .4em;
  border-bottom: 2px solid #ece7da; position: relative; line-height: 1.25;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .main-column h2:not(.imp__title):not(.hiw__title)::after {
  content: ""; position: absolute; left: 0; bottom: -2px;
  width: 3.2em; height: 2px; background: #2f5d40;
}

/* Icon-Liste („So funktioniert's") als aufgeräumte Karten */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text.icon_list_small {
  display: block; background: #faf8f2; border: 1px solid #ece7da; border-radius: 12px;
  padding: 1em 1.3em 1em 1.2em; margin: .7em 0; position: relative;
  box-shadow: 0 1px 4px rgba(60, 50, 30, .05);
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text.icon_list_small::before {
  width: 2.2em; flex: none; padding-right: .8em; vertical-align: middle;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text.icon_list_small::after {
  content: none;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text.icon_list_small .rte {
  width: auto; display: inline-block; vertical-align: middle; font-size: .95em;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text.icon_list_small .rte p { margin: 0; }

/* Zwischenüberschrift im Ablauf */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text h3 {
  font-size: 1.3em; line-height: 1.5; margin: 1.4em 0 .8em;
}

/* Galerie weichere Kacheln */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .ce_gallery .image_container {
  border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(60, 50, 30, .10);
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .ce_gallery img { display: block; }

/* Abschluss-CTA als elegante, helle Karte mit klarer Button-Hierarchie */
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text:has(> .rte > p > .abutton) {
  background: #faf8f2; border: 1px solid #ece7da; color: #2f2f2b;
  border-radius: 20px; padding: 2.6em 1.8em 2.2em; margin: 2.6em 0 1.2em;
  text-align: center; box-shadow: 0 10px 30px rgba(60, 50, 30, .08);
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text:has(> .rte > p > .abutton) h3 {
  color: #2f5d40; margin: 0 auto .4em; max-width: 34em;
  font-size: 1.45em; line-height: 1.45; font-weight: 600;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text:has(> .rte > p > .abutton) h3 .wohnfee { color: #2f5d40; }
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text .abutton {
  display: inline-block; background: #2f5d40; color: #fff; border-radius: 999px;
  padding: .95em 2.4em; text-decoration: none; font-weight: 600; font-size: 1.05em;
  margin-top: .9em; letter-spacing: .02em;
  box-shadow: 0 8px 20px rgba(47, 93, 64, .30);
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text .abutton:hover {
  background: #274f35; transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(47, 93, 64, .38);
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text .fl-altlink {
  display: inline-block; margin-top: .9em; color: #6b6b64; font-size: .92em;
  text-decoration: none; border-bottom: 1px solid #cfc9b8; padding-bottom: 1px;
  transition: color .15s ease, border-color .15s ease;
}
.page-content:is([data-route="/furniture-leasing.html"],[data-route="/en/furniture-leasing.html"]) .content-text .fl-altlink:hover { color: #2f5d40; border-color: #2f5d40; }
</style>
