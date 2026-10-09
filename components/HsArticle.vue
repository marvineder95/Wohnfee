<script setup lang="ts">
// Artikelansicht für „Trends & Tipps“: Kopf mit Datum/Lesezeit, Titelbild,
// ruhige Lesespalte (Inhaltselemente aus news.json), Vor/Zurück und
// „Weitere Beiträge“.
const props = defineProps<{ article: any }>()
const { lang, t, lp } = useLang()

const all = await useBlogFeed(props.article.section)
const idx = computed(() => all.value.findIndex(n => n.route === props.article.route))
const newer = computed(() => idx.value > 0 ? all.value[idx.value - 1] : null)
const older = computed(() => idx.value >= 0 && idx.value < all.value.length - 1 ? all.value[idx.value + 1] : null)
const related = computed(() => all.value.filter(n => n.route !== props.article.route).slice(0, 3))

// Bildstrecken (Swiper/Galerie) werden als Galerie mit Lightbox dargestellt
const elements = computed(() => blogElements(props.article).map((e: any) => {
  if (e.type === 'swiper' || e.type === 'contentslider' || e.type === 'gallery') {
    const images = (e.items || []).map((i: any) => typeof i === 'string'
      ? { src: asset(i) }
      : { src: asset(i.src), alt: i.alt || '', caption: i.caption || '' }).filter((i: any) => i.src)
    return { ...e, gallery: images }
  }
  return e
}))

const SECTION_LABELS: Record<string, string> = {
  'trends-tipps': 'Trends & Tipps', projekte: 'Projekte', events: 'Events', aktuelles: 'Aktuell'
}
const SECTION_LABELS_EN: Record<string, string> = {
  'trends-tipps': 'Trends & Tips', projekte: 'Projects', events: 'Events', aktuelles: 'Current'
}
const sectionLabel = computed(() => t(SECTION_LABELS[props.article.section] || 'Blog', SECTION_LABELS_EN[props.article.section] || 'Blog'))
const lead = computed(() => blogTeaser(props.article, 400))
const backRoute = computed(() => lp(`/${props.article.section}.html`))

// Lesefortschritt
const progress = ref(0)
const body = ref<HTMLElement | null>(null)
function onScroll() {
  const el = body.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const total = r.height - window.innerHeight * 0.5
  progress.value = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.3) / (total || 1)))
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <article class="hsa2" itemscope itemtype="http://schema.org/Article">
    <div class="hsa2__progress" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true" />

    <!-- ── Kopf ─────────────────────────────────────── -->
    <header class="hsa2__head">
      <div class="hsa2__narrow">
        <NuxtLink :to="backRoute" class="hsa2__back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
          {{ sectionLabel }}
        </NuxtLink>
        <p class="hsa2__meta">
          <time :datetime="new Date(Number(article.date) * 1000).toISOString()" itemprop="datePublished">{{ blogDate(article.date, lang) }}</time>
          <span aria-hidden="true">·</span>
          {{ blogReadingMinutes(article) }} {{ t('Min. Lesezeit', 'min read') }}
        </p>
        <h1 class="hsa2__h1" itemprop="name">{{ article.headline }}</h1>
        <p v-if="lead" class="hsa2__lead" itemprop="description">{{ lead }}</p>
      </div>
      <figure v-if="article.image" class="hsa2__cover">
        <HsImg :src="asset(article.image)" :alt="article.imageAlt || article.headline" itemprop="image"
                 sizes="xs:100vw sm:100vw md:100vw lg:1100px xl:1100px xxl:1100px 2xl:1100px" loading="eager" />
      </figure>
    </header>

    <!-- ── Inhalt ───────────────────────────────────── -->
    <div ref="body" class="hsa2__body" itemprop="articleBody">
      <div class="hsa2__narrow hsa2__prose">
        <div v-if="article.text" class="rte" v-html="article.text" />
        <template v-for="(el, i) in elements" :key="el.id || i">
          <HsGallery v-if="el.gallery" :images="el.gallery" :title="article.headline" />
          <ContentElements v-else :elements="[el]" />
        </template>
      </div>

      <div class="hsa2__narrow">
        <div class="hsa2__share">
          <span>{{ t('Lust auf eine persönliche Beratung?', 'Would you like personal advice?') }}</span>
          <NuxtLink :to="lp('/kontakt.html')" class="hsa2__btn">{{ t('Beratung anfragen', 'Request a consultation') }}</NuxtLink>
        </div>

        <nav class="hsa2__pager" :aria-label="t('Weitere Artikel', 'More articles')">
          <NuxtLink v-if="older" :to="older.route" class="hsa2__pg hsa2__pg--prev">
            <span class="hsa2__pglabel">← {{ t('Älterer Beitrag', 'Older post') }}</span>
            <span class="hsa2__pgtitle">{{ older.headline }}</span>
          </NuxtLink>
          <span v-else />
          <NuxtLink v-if="newer" :to="newer.route" class="hsa2__pg hsa2__pg--next">
            <span class="hsa2__pglabel">{{ t('Neuerer Beitrag', 'Newer post') }} →</span>
            <span class="hsa2__pgtitle">{{ newer.headline }}</span>
          </NuxtLink>
        </nav>
      </div>
    </div>

    <!-- ── Weitere Beiträge ─────────────────────────── -->
    <section v-if="related.length" class="hsa2__related">
      <div class="hsa2__wrap">
        <div class="hsa2__rhead">
          <h2 class="hsa2__h2">{{ t('Weitere Beiträge', 'More posts') }}</h2>
          <NuxtLink :to="backRoute" class="hsa2__all">{{ t('Zur Übersicht', 'Back to') }} {{ sectionLabel }} <WfIcon name="arrow" :size="15" /></NuxtLink>
        </div>
        <div class="hsa2__grid">
          <NuxtLink v-for="n in related" :key="n.route" :to="n.route" class="hsa2__card">
            <div class="hsa2__cimg" :class="{ 'is-empty': !n.image }">
              <HsImg v-if="n.image" :src="asset(n.image)" :alt="n.imageAlt || n.headline" loading="lazy"
                       sizes="xs:100vw sm:100vw md:50vw lg:400px xl:400px xxl:400px 2xl:400px" />
              <span v-else class="hsa2__ph"><WfIcon name="leaf" :size="30" /></span>
            </div>
            <div class="hsa2__cbody">
              <span class="hsa2__cmeta">{{ blogDate(n.date, lang) }}</span>
              <h3>{{ n.headline }}</h3>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </article>
</template>

<style scoped>
.hsa2 {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsa2 h1, .hsa2 h2, .hsa2 h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; }
.hsa2__narrow { max-width: 760px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsa2__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }

.hsa2__progress {
  position: fixed; left: 0; right: 0; top: 0; height: 3px; z-index: 200; background: var(--green);
  transform-origin: left center; transform: scaleX(0); pointer-events: none;
}

/* ── Kopf ── */
.hsa2__head { padding: 3.5em 0 0; background: none; border: 0; box-shadow: none; position: static; }
.hsa2__back {
  display: inline-flex; align-items: center; gap: .6em; margin-bottom: 1.6em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); text-decoration: none;
}
.hsa2__back svg { width: 1.4em; height: 1.4em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
.hsa2__back:hover { color: var(--green); }
.hsa2__back:hover svg { transform: translateX(-3px); }
.hsa2__meta { display: flex; gap: .6em; flex-wrap: wrap; margin: 0 0 .8em; font-size: .85em; color: var(--muted); }
.hsa2__h1 { font-size: clamp(2em, 4.5vw, 3.1em) !important; line-height: 1.12; letter-spacing: -.01em; margin: 0 0 .5em; }
.hsa2__lead { font-family: var(--serif); font-size: 1.25em; line-height: 1.6; color: var(--muted); margin: 0 0 2em; }
.hsa2__cover { max-width: 1100px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsa2__cover img {
  width: 100%; max-height: 640px; object-fit: cover; display: block; border-radius: 22px;
  box-shadow: 0 22px 50px rgba(60, 50, 30, .16);
}

/* ── Lesespalte (Contao-Inhaltselemente) ── */
.hsa2__body { padding: 3em 0 3.5em; }
.hsa2__prose { font-size: 1.06em; }
.hsa2__prose :deep(.content-text), .hsa2__prose :deep(.ce_text), .hsa2__prose :deep(.content-image) {
  width: auto !important; max-width: none !important; margin: 0 0 1.6em !important; padding: 0 !important;
  float: none !important; display: block !important; text-align: left !important;
}
.hsa2__prose :deep(.flex) { display: block !important; }
.hsa2__prose :deep(.rte) { margin: 0 !important; padding: 0 !important; width: auto !important; }
.hsa2__prose :deep(.content-text > h2), .hsa2__prose :deep(.content-text > h3), .hsa2__prose :deep(.content-text > h4) {
  margin-bottom: .5em !important; padding: 0 !important;
}
.hsa2__prose :deep(p) { line-height: 1.85; color: #47443d; margin: 0 0 1.1em; text-align: left !important; }
.hsa2__prose :deep(h2), .hsa2__prose :deep(h3), .hsa2__prose :deep(h4) {
  font-family: var(--serif); font-weight: 500; color: var(--ink); text-align: left !important;
  margin: 1.6em 0 .6em; line-height: 1.3; padding: 0; border: 0;
}
.hsa2__prose :deep(h2) { font-size: 1.6em; }
.hsa2__prose :deep(h3) { font-size: 1.3em; }
.hsa2__prose :deep(strong) { color: var(--ink); }
.hsa2__prose :deep(a) { color: var(--green); text-decoration: underline; text-underline-offset: 3px; }
.hsa2__prose :deep(ul), .hsa2__prose :deep(ol) { padding-left: 1.3em; margin: 0 0 1.2em; line-height: 1.8; color: #47443d; }
.hsa2__prose :deep(li::marker) { color: var(--green); }
.hsa2__prose :deep(blockquote) {
  margin: 1.6em 0; padding: .4em 0 .4em 1.2em; border-left: 3px solid var(--green);
  font-family: var(--serif); font-size: 1.2em; color: var(--ink);
}
.hsa2__prose :deep(figure) { margin: 1.8em 0 !important; width: auto !important; float: none !important; }
.hsa2__prose :deep(figure img), .hsa2__prose :deep(.image_container img) {
  width: 100% !important; height: auto !important; border-radius: 16px; display: block;
}
.hsa2__prose :deep(figcaption) { margin-top: .6em; font-size: .82em; color: var(--muted); text-align: center; }
.hsa2__prose :deep(.swiper), .hsa2__prose :deep(.ce_swiper) { border-radius: 16px; overflow: hidden; margin: 1.8em 0; }
.hsa2__prose :deep(iframe) { width: 100%; aspect-ratio: 16 / 9; height: auto; border: 0; border-radius: 16px; }

.hsa2__share {
  display: flex; align-items: center; justify-content: space-between; gap: 1em; flex-wrap: wrap;
  margin: 2.5em 0 2em; padding: 1.2em 1.4em; border-radius: 16px; background: var(--green-soft); border: 1px solid #d9e5da;
  font-family: var(--serif); font-size: 1.1em;
}
.hsa2__btn {
  display: inline-flex; padding: .7em 1.5em; border-radius: 999px; background: var(--green); color: #fff;
  font-family: var(--font-family-01, 'Open Sans', sans-serif); font-size: .8em; font-weight: 600; text-decoration: none;
  transition: background .15s;
}
.hsa2__btn:hover { background: var(--green-dark); color: #fff; }

.hsa2__pager { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
.hsa2__pg {
  display: flex; flex-direction: column; gap: .35em; padding: 1.1em 1.3em; border-radius: 16px; background: #fff;
  border: 1px solid var(--line); text-decoration: none; color: var(--ink); transition: border-color .15s, box-shadow .2s;
}
.hsa2__pg:hover { border-color: var(--green); box-shadow: 0 10px 24px rgba(60, 50, 30, .08); }
.hsa2__pg--next { text-align: right; }
.hsa2__pglabel { font-size: .72em; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--green); }
.hsa2__pgtitle { font-family: var(--serif); font-size: 1.02em; line-height: 1.35; }

/* ── Weitere ── */
.hsa2__related { background: #fff; padding: 4em 0 4.5em; }
.hsa2__rhead { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5em; margin-bottom: 1.8em; flex-wrap: wrap; }
.hsa2__h2 { font-size: clamp(1.5em, 2.6vw, 2em) !important; margin: 0; }
.hsa2__all {
  display: inline-flex; align-items: center; gap: .5em; color: var(--green); font-weight: 600; text-decoration: none;
  border-bottom: 1px solid #b9c9bc; padding-bottom: 2px;
}
.hsa2__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5em; }
.hsa2__card {
  display: flex; flex-direction: column; background: var(--cream); border-radius: 16px; overflow: hidden;
  border: 1px solid var(--line); text-decoration: none; color: var(--ink); transition: transform .25s, box-shadow .25s;
}
.hsa2__card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hsa2__cimg { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--line); }
.hsa2__cimg img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
.hsa2__card:hover .hsa2__cimg img { transform: scale(1.05); }
.hsa2__cimg.is-empty { background: linear-gradient(135deg, #e9efe7 0%, #d5e2d4 100%); }
.hsa2__ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8fa891; }
.hsa2__cbody { padding: 1em 1.2em 1.2em; display: grid; gap: .3em; }
.hsa2__cmeta { font-size: .76em; color: var(--muted); }
.hsa2__cbody h3 { font-size: 1.08em; line-height: 1.35; margin: 0; }

@media (max-width: 860px) {
  .hsa2__grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .hsa2__narrow, .hsa2__wrap, .hsa2__cover { padding: 0 1em; }
  .hsa2__head { padding-top: 2.2em; }
  .hsa2__grid, .hsa2__pager { grid-template-columns: 1fr; }
  .hsa2__pg--next { text-align: left; }
  .hsa2__prose { font-size: 1em; }
}
</style>
