<script setup lang="ts">
const props = defineProps<{ el: any }>()
const { news, newsEn } = useSiteData()
const route = useRoute()

const isEn = computed(() => route.path.startsWith('/en/'))
const L = computed(() => isEn.value ? {
  readArticle: 'Read article',
  more: 'more …',
  goTo: 'Go to article:',
  page: 'Page',
  of: 'of',
  back: 'Back',
  fwd: 'Forward',
  end: 'End',
  goto: 'Go to page'
} : {
  readArticle: 'Artikel lesen',
  more: 'mehr …',
  goTo: 'Zum Beitrag:',
  page: 'Seite',
  of: 'von',
  back: 'Zurück',
  fwd: 'Vorwärts',
  end: 'Ende',
  goto: 'Gehe zu Seite'
})

const allItems = computed(() => {
  const src: Record<string, any> = isEn.value ? (newsEn as any) : (news as any)
  let all = Object.values(src)
    .filter((n: any) => props.el.archives?.includes(n.archive))
  if (props.el.category) {
    all = all.filter((n: any) => (n.categories || []).map(String).includes(String(props.el.category)))
  }
  return all.sort((a: any, b: any) => Number(b.date) - Number(a.date))
})

// Contao semantics: perPage = items per page (activates pagination, ?page_n<ModuleId>=N),
// limit = hard cap on total items shown, never paginates by itself
const pageSize = computed(() => props.el.perPage || 0)
const hardLimit = computed(() => props.el.limit || 0)
const totalPages = computed(() => pageSize.value ? Math.ceil(allItems.value.length / pageSize.value) : 1)

const pageParam = computed(() => `page_n${props.el.moduleId || ''}`)
const currentPage = computed(() => {
  const raw = Number((route.query as Record<string, any>)[pageParam.value] || 1)
  return Math.min(Math.max(1, raw), totalPages.value)
})

const items = computed(() => {
  if (pageSize.value) {
    return allItems.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
  }
  return hardLimit.value ? allItems.value.slice(0, hardLimit.value) : allItems.value
})

const pageHref = (p: number) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(route.query as Record<string, any>)) {
    if (k !== pageParam.value && typeof v === 'string') q.set(k, v)
  }
  if (p > 1) q.set(pageParam.value, String(p))
  const qs = q.toString()
  return route.path + (qs ? `?${qs}` : '')
}

const arcClass = (n: any) => {
  let cls = `arc_${n.archive}` + (n.categories || []).map((c: any) => ` news_category_${c} category_${c}`).join('')
  if (props.el.variant === 'short' && n.url) cls += ' pdf'
  return cls
}

const fmtDate = (ts: any) => {
  const d = new Date(Number(ts) * 1000)
  const iso = d.toISOString()
  const de = d.toLocaleString(isEn.value ? 'en-GB' : 'de-AT', { day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit' }).replace(',', '')
  return { iso, de }
}

// Presse (news_short): headline links to the external source (PDF) when present
const href = (n: any) => n.url || n.route
const isExternal = (n: any) => !!n.url
</script>

<template>
  <div class="mod_newslist block" :class="el.cssClass">
    <component :is="el.headlineUnit || 'h2'" v-if="el.headline">{{ el.headline }}</component>
    <!-- news_short: compact press list, headline links to source -->
    <template v-if="el.variant === 'short'">
      <div v-for="n in items" :key="n.route"
           class="layout_short block" :class="arcClass(n)"
           itemscope itemtype="http://schema.org/Article">
        <h2 itemprop="name">
          <a :href="href(n)" :title="`${L.readArticle}: ${n.subheadline || ''}`"
             :target="isExternal(n) ? '_blank' : undefined"
             :rel="isExternal(n) ? 'noreferrer noopener' : undefined">{{ n.headline }}</a>
        </h2>
        <figure v-if="n.image" class="image_container float_above">
          <a :href="href(n)" :title="`${L.goTo} ${n.headline}`"
             :target="isExternal(n) ? '_blank' : undefined"
             :rel="isExternal(n) ? 'noreferrer noopener' : undefined">
            <NuxtImg :src="asset(n.image)" :alt="n.imageAlt || ''" loading="lazy"
                     sizes="xs:100vw sm:100vw md:480px lg:480px xl:480px xxl:480px 2xl:480px" />
          </a>
        </figure>
        <div v-if="n.teaser" class="ce_text block" itemprop="description" v-html="n.teaser" />
        <p class="more">
          <a :href="href(n)" :target="isExternal(n) ? '_blank' : undefined"
             :rel="isExternal(n) ? 'noreferrer noopener' : undefined"
             :title="`${L.readArticle}:  ${n.headline}`"
             :class="{ external: isExternal(n) }" itemprop="url">{{ L.readArticle }}</a>
        </p>
      </div>
    </template>

    <!-- news_simple: date + h3, no teaser (project overviews) -->
    <template v-else-if="el.variant === 'simple'">
      <div v-for="n in items" :key="n.route"
           class="layout_simple block featured" :class="arcClass(n)"
           itemscope itemtype="http://schema.org/Article">
        <figure v-if="n.image" class="image_container float_above">
          <NuxtLink :to="n.route" :title="`${L.goTo} ${n.headline}`">
            <NuxtImg :src="asset(n.image)" :alt="n.imageAlt || ''" loading="lazy"
                     sizes="xs:100vw sm:100vw md:480px lg:480px xl:480px xxl:480px 2xl:480px" />
          </NuxtLink>
        </figure>
        <time :datetime="fmtDate(n.date).iso" itemprop="datePublished">{{ fmtDate(n.date).de }}</time>
        <h3><NuxtLink :to="n.route" :title="`${L.goTo} ${n.headline}`">{{ n.headline }}</NuxtLink></h3>
      </div>
    </template>

    <!-- news_latest: teaser cards with h2 (default) -->
    <template v-else>
      <div v-for="n in items" :key="n.route"
           class="layout_latest block featured" :class="arcClass(n)"
           itemscope itemtype="http://schema.org/Article">
        <figure v-if="n.image" class="image_container float_above">
          <NuxtLink :to="n.route" :title="`${L.goTo} ${n.headline}`">
            <NuxtImg :src="asset(n.image)" :alt="n.imageAlt || ''" loading="lazy"
                     sizes="xs:100vw sm:100vw md:480px lg:480px xl:480px xxl:480px 2xl:480px" />
          </NuxtLink>
        </figure>
        <h2 itemprop="name">
          <NuxtLink :to="n.route" :title="`${L.goTo} ${n.headline}`">{{ n.headline }}</NuxtLink>
        </h2>
        <div class="ce_text block" itemprop="description" v-html="n.teaser || ''" />
        <p class="more">
          <NuxtLink :to="n.route" :title="`${L.goTo} ${n.headline}`">{{ L.more }}<span class="invisible"> {{ n.headline }}</span></NuxtLink>
        </p>
      </div>
    </template>

    <!-- pagination, mirrors Contao markup -->
    <nav v-if="totalPages > 1" class="pagination block" :aria-label="isEn ? 'Pagination menu' : 'Seitenumbruch-Menü'">
      <p>{{ L.page }} {{ currentPage }} {{ L.of }} {{ totalPages }}</p>
      <ul>
        <li v-if="currentPage > 1">
          <a :href="pageHref(currentPage - 1)" class="previous" :title="`${L.goto} ${currentPage - 1}`">{{ L.back }}</a>
        </li>
        <li v-for="p in totalPages" :key="p">
          <strong v-if="p === currentPage" class="active">{{ p }}</strong>
          <a v-else :href="pageHref(p)" class="link" :title="`${L.goto} ${p}`">{{ p }}</a>
        </li>
        <li v-if="currentPage < totalPages" class="next">
          <a :href="pageHref(currentPage + 1)" class="next" :title="`${L.goto} ${currentPage + 1}`">{{ L.fwd }}</a>
        </li>
        <li v-if="currentPage < totalPages" class="last">
          <a :href="pageHref(totalPages)" class="last" :title="`${L.goto} ${totalPages}`">{{ L.end }}</a>
        </li>
      </ul>
    </nav>
  </div>
</template>
