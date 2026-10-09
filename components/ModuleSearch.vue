<script setup lang="ts">
const route = useRoute()
const { pages, news } = useSiteData()

const keywords = computed(() => String(route.query.keywords || '').toLowerCase().trim())

const results = computed(() => {
  if (!keywords.value || keywords.value.length < 2) return []
  const kw = keywords.value
  const strip = (html: string) => (html || '').replace(/<[^>]+>/g, ' ')

  const pageHits = Object.values(pages as Record<string, any>)
    .map((p: any) => ({
      title: p.pageTitle || p.title, route: p.route,
      text: strip([p.description, ...(p.columns?.main || []).map((e: any) => e.html || e.headline || '')].join(' '))
    }))
    .filter((p: any) => (p.title + ' ' + p.text).toLowerCase().includes(kw))

  const newsHits = Object.values(news as Record<string, any>)
    .map((n: any) => ({ title: n.headline, route: n.route, text: strip(n.teaser + ' ' + n.text) }))
    .filter((n: any) => (n.title + ' ' + n.text).toLowerCase().includes(kw))

  return [...pageHits, ...newsHits].slice(0, 30)
})
</script>

<template>
  <div class="mod_search block">
    <form action="/suche.html" method="get">
      <div class="formbody">
        <div class="widget widget-text">
          <label for="ctrl_keywords_7" class="invisible">Suchbegriffe</label>
          <input type="search" name="keywords" id="ctrl_keywords_7" class="text"
                 :value="route.query.keywords || ''" spellcheck="false">
        </div>
        <div class="widget widget-submit">
          <button type="submit" id="ctrl_submit_7" class="submit">Suchen</button>
        </div>
      </div>
    </form>
    <template v-if="keywords">
      <h2>Suchergebnisse für „{{ route.query.keywords }}“</h2>
      <p class="info">{{ results.length }} Treffer gefunden</p>
      <ul class="search-results">
        <li v-for="r in results" :key="r.route">
          <NuxtLink :to="r.route">{{ r.title }}</NuxtLink>
          <p>{{ r.text.slice(0, 200) }}…</p>
        </li>
      </ul>
    </template>
  </div>
</template>
