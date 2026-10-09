<script setup lang="ts">
const props = defineProps<{ el: any }>()
const { news, categories } = useSiteData()

// categories of the page's archive that actually have published items
const items = computed(() => {
  const cats = Object.values(categories as Record<string, any>)
    .filter((c: any) => props.el.archives?.includes(c.archive))
  return cats.map((c: any) => ({
    ...c,
    count: Object.values(news as Record<string, any>)
      .filter((n: any) => n.archive === c.archive && (n.categories || []).map(String).includes(String(c.id)))
      .length
  })).filter((c: any) => c.count > 0)
})
</script>

<template>
  <div class="mod_newscategories_cumulative block">
    <div class="inactive-categories">
      <h6>Nach Kategorien filtern:</h6>
      <ul class="level_1">
        <li v-for="c in items" :key="c.id" :class="`news_category_${c.id} category_${c.id}`">
          <NuxtLink :to="c.route" :class="`news_category_${c.id} category_${c.id}`" :title="c.title" itemprop="url">
            <span class="name" itemprop="name">{{ c.title }}</span>
            <span class="quantity">({{ c.count }})</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
