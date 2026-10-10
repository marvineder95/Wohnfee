<script setup lang="ts">
// Blog-Übersichten (Aktuell, Projekte, Trends & Tipps, Events): neuester Beitrag
// als Aufmacher im Hero, Filter (Jahr, Zielgruppe oder Art), Kartenraster und
// Newsletter-Band (Element 506 aus pages.json). `category` kommt von alten
// Kategorie-URLs (/projekte/category/….html) und setzt den Filter voraus.
const props = defineProps<{ page: any, section: string, category?: string | null }>()
const { lang, t } = useLang()

type FilterKind = 'year' | 'category' | 'type'
interface Cfg { sections: string[], lead: [string, string], filter: FilterKind }
const CFG: Record<string, Cfg> = {
  'trends-tipps': { sections: ['trends-tipps'], filter: 'year', lead: ['Einrichtungstrends, Farben des Jahres, Design-Entdeckungen und Tipps aus der Praxis von WOHNFEE.', 'Interior trends, colours of the year, design discoveries and practical tips from WOHNFEE.'] },
  projekte: { sections: ['projekte'], filter: 'category', lead: ['Ausgewählte Home-Staging-Projekte – von der Musterwohnung über das Penthouse bis zur Villa.', 'Selected home staging projects – from show flats and penthouses to villas.'] },
  events: { sections: ['events'], filter: 'year', lead: ['Messen, Design-Events und besondere Momente – hier waren die WOHNFEEn unterwegs.', 'Fairs, design events and special moments – where the WOHNFEE team has been.'] },
  aktuelles: { sections: ['aktuelles', 'projekte', 'events', 'trends-tipps', 'presse'], filter: 'type', lead: ['Neuigkeiten aus der WOHNFEE-Welt: aktuelle Projekte, Events, Trends und Presseberichte auf einen Blick.', 'News from the world of WOHNFEE: current projects, events, trends and press coverage at a glance.'] }
}
const cfg = computed(() => CFG[props.section] || CFG['trends-tipps'])

// Projekt-Kategorien (categories.json, Seite „projekte“)
const PROJECT_CATS = [
  { id: '2', label: ['Bauträger', 'Property developers'] },
  { id: '1', label: ['Makler', 'Estate agents'] },
  { id: '3', label: ['Privatpersonen', 'Private individuals'] }
]
const TYPE_LABELS_DE: Record<string, string> = {
  aktuelles: 'News', projekte: 'Projekt', events: 'Event', 'trends-tipps': 'Trends & Tipps', presse: 'Presse'
}
const TYPE_LABELS_EN: Record<string, string> = {
  aktuelles: 'News', projekte: 'Project', events: 'Event', 'trends-tipps': 'Trends & Tips', presse: 'Press'
}
const typeLabel = (sec: string) => (lang.value === 'en' ? TYPE_LABELS_EN : TYPE_LABELS_DE)[sec] || 'Blog'

const items = await useBlogFeed(cfg.value.sections)
// Aufmacher: neuester Beitrag mit Foto – Presse-Ausschnitte eignen sich nicht als Hero-Bild
const featured = computed(() => items.value.find(n => n.image && n.section !== 'presse') || items.value[0])
const rest = computed(() => items.value.filter(n => n !== featured.value))

// Ziel eines Beitrags: Presseberichte verlinken auf Quelle/PDF, alle anderen auf die Artikelseite
const href = (n: any) => (n.section === 'presse' && n.url && n.url !== '#') ? n.url : n.route
const isExternal = (n: any) => /^https?:|\.pdf$/i.test(href(n))
const linkLabel = (n: any) => n.section === 'presse'
  ? (/\.pdf$/i.test(href(n)) ? t('PDF öffnen', 'Open PDF') : t('Bericht lesen', 'Read article'))
  : t('Weiterlesen', 'Read more')
const badge = (n: any) => cfg.value.filter === 'type' ? typeLabel(n.section) : String(blogYear(n.date))

const newsletter = computed(() => (props.page.columns?.main || []).find((e: any) => String(e.cssClass || '').includes('bg-nl')))
// Contao-Inline-Styles (text-align) entfernen – Ausrichtung übernimmt das Band
const nlHtml = computed(() => (newsletter.value?.html || '').replace(/\sstyle="[^"]*"/g, ''))

// Filter
const filterOptions = computed<Array<{ value: string, label: string }>>(() => {
  if (cfg.value.filter === 'category') {
    return PROJECT_CATS.filter(c => rest.value.some(n => (n.categories || []).map(String).includes(c.id)))
      .map(c => ({ value: c.id, label: t(c.label[0], c.label[1]) }))
  }
  if (cfg.value.filter === 'type') {
    return cfg.value.sections.filter(sec => rest.value.some(n => n.section === sec))
      .map(sec => ({ value: sec, label: typeLabel(sec) }))
  }
  return [...new Set(rest.value.map(n => String(blogYear(n.date))))].map(y => ({ value: y, label: y }))
})
const active = ref<string | null>(props.category && cfg.value.filter === 'category' ? String(props.category) : null)
const matches = (n: any) => {
  if (!active.value) return true
  if (cfg.value.filter === 'category') return (n.categories || []).map(String).includes(active.value)
  if (cfg.value.filter === 'type') return n.section === active.value
  return String(blogYear(n.date)) === active.value
}
// Bei aktivem Filter auch den Aufmacher einbeziehen, damit nichts fehlt
const visible = computed(() => active.value ? items.value.filter(matches) : rest.value)
const filterLabel = computed(() => cfg.value.filter === 'category' ? t('Nach Zielgruppe filtern', 'Filter by target group')
  : cfg.value.filter === 'type' ? t('Nach Art filtern', 'Filter by type') : t('Nach Jahr filtern', 'Filter by year'))

const PAGE = 9
const shown = ref(PAGE)
watch(active, () => { shown.value = PAGE })

// Hero-Höhe + Reveal
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}
let io: IntersectionObserver | null = null
const observe = () => {
  root.value?.querySelectorAll('.rv:not(.is-in)').forEach(n => io?.observe(n))
}
onMounted(() => {
  syncHeaderHeight()
  window.addEventListener('resize', syncHeaderHeight)
  if (props.category) setTimeout(() => scrollToId('beitraege'), 600)
  const el = root.value
  if (!el || !('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.classList.add('is-anim')
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io?.unobserve(e.target) }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 })
  observe()
})
watch([visible, shown], () => nextTick(observe))
onUnmounted(() => {
  window.removeEventListener('resize', syncHeaderHeight)
  io?.disconnect()
})

function scrollToId(id: string, e?: Event) {
  e?.preventDefault()
  const t = document.getElementById(id)
  if (!t) return
  const off = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight || 108
  window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' })
}
</script>

<template>
  <div ref="root" class="hsb">
    <!-- ── Hero mit Aufmacher ───────────────────────── -->
    <section class="hsb__hero">
      <div class="hsb__inside">
        <div class="hsb__intro">
        <p class="hsb__eyebrow">Blog</p>
        <h1 class="hsb__h1">{{ page.title }}</h1>
        <p class="hsb__lead">{{ t(cfg.lead[0], cfg.lead[1]) }}</p>
        <p v-if="section === 'projekte'" class="hsb__own"><WfIcon name="camera" :size="15" /> {{ t('Alle Fotos stammen aus unseren eigenen Projekten – keine Stock- oder KI-Bilder.', 'All photos come from our own projects – no stock or AI images.') }}</p>

        <NuxtLink v-if="featured" :to="href(featured)" :external="isExternal(featured)" :target="isExternal(featured) ? '_blank' : undefined" class="hsb__feature">
          <span class="hsb__badge">{{ t('Neuester Beitrag', 'Latest post') }}{{ cfg.filter === 'type' ? ` · ${badge(featured)}` : '' }}</span>
          <span class="hsb__meta">{{ blogDate(featured.date, lang) }} · {{ blogReadingMinutes(featured) }} {{ t('Min. Lesezeit', 'min read') }}</span>
          <span class="hsb__ftitle">{{ featured.headline }}</span>
          <span class="hsb__fteaser">{{ blogTeaser(featured, 180) }}</span>
          <span class="hsb__flink">{{ featured.section === 'presse' ? linkLabel(featured) : t('Artikel lesen', 'Read article') }} <WfIcon name="arrow" :size="15" /></span>
        </NuxtLink>
        </div>
        <NuxtLink v-if="featured?.image" :to="href(featured)" :external="isExternal(featured)" :target="isExternal(featured) ? '_blank' : undefined" class="hsb__fimg" tabindex="-1" aria-hidden="true">
          <HsImg :src="asset(featured.image)" alt=""
                   sizes="xs:100vw sm:100vw md:50vw lg:560px xl:560px xxl:560px 2xl:560px"
                   loading="eager" fetchpriority="high" />
        </NuxtLink>
      </div>
      <a href="#beitraege" class="hsb__cue" @click="scrollToId('beitraege', $event)">
        {{ t('Alle Beiträge', 'All posts') }}
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </a>
    </section>

    <!-- ── Beiträge ─────────────────────────────────── -->
    <section id="beitraege" class="hsb__list">
      <div class="hsb__wrap">
        <div class="hsb__head rv">
          <div>
            <p class="hsb__divider"><span>{{ t('Archiv', 'Archive') }}</span></p>
            <h2 class="hsb__h2">{{ t('Alle Beiträge', 'All posts') }}</h2>
          </div>
          <div v-if="filterOptions.length > 1" class="hsb__filters" role="group" :aria-label="filterLabel">
            <button type="button" :class="{ 'is-active': !active }" @click="active = null">{{ t('Alle', 'All') }}</button>
            <button v-for="o in filterOptions" :key="o.value" type="button" :class="{ 'is-active': active === o.value }" @click="active = o.value">{{ o.label }}</button>
          </div>
        </div>

        <div class="hsb__grid">
          <NuxtLink v-for="(n, i) in visible.slice(0, shown)" :key="n.route" :to="href(n)" :external="isExternal(n)"
                    :target="isExternal(n) ? '_blank' : undefined" class="hsb__card rv"
                    :style="{ transitionDelay: `${(i % 3) * 80}ms` }">
            <div class="hsb__cimg" :class="{ 'is-empty': !n.image }">
              <HsImg v-if="n.image" :src="asset(n.image)" :alt="n.imageAlt || n.headline" loading="lazy"
                       sizes="xs:100vw sm:100vw md:50vw lg:400px xl:400px xxl:400px 2xl:400px" />
              <span v-else class="hsb__ph"><WfIcon name="leaf" :size="34" /></span>
              <span class="hsb__year">{{ badge(n) }}</span>
              <span v-if="n.beforeImage" class="hsb__bab">{{ t('Vorher / Nachher', 'Before / after') }}</span>
            </div>
            <div class="hsb__cbody">
              <span class="hsb__cmeta">{{ blogDate(n.date, lang) }} · {{ blogReadingMinutes(n) }} {{ t('Min.', 'min') }}</span>
              <h3>{{ n.headline }}</h3>
              <em v-if="n.facts" class="hsb__facts">{{ n.facts }}</em>
              <p>{{ blogTeaser(n) }}</p>
              <span class="hsb__clink">{{ linkLabel(n) }} <WfIcon name="arrow" :size="14" /></span>
            </div>
          </NuxtLink>
        </div>

        <div v-if="visible.length > shown" class="hsb__more">
          <button type="button" class="hsb__btn hsb__btn--ghost" @click="shown += PAGE">
            {{ t('Weitere Beiträge laden', 'Load more posts') }} <span>({{ visible.length - shown }})</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ── Newsletter ───────────────────────────────── -->
    <section v-if="newsletter" class="hsb__nl">
      <div class="hsb__wrap">
        <div class="hsb__nlbox rv">
          <div class="hsb__nlicon" aria-hidden="true"><WfIcon name="mail" :size="30" /></div>
          <div>
            <h2 class="hsb__h2 hsb__h2--light">{{ newsletter.headline }}</h2>
            <div class="hsb__nlrte" v-html="nlHtml" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsb {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsb__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsb h1, .hsb h2, .hsb h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; }

.hsb__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.2em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsb__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsb__divider {
  display: flex; align-items: center; gap: 1.2em; margin: 0 0 .7em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsb__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hsb__h1 { text-transform: none !important; font-size: clamp(2.4em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .4em; }
.hsb__h2 { font-size: clamp(1.6em, 3vw, 2.2em) !important; line-height: 1.2; margin: 0; }
.hsb__h2--light { color: #fff !important; margin-bottom: .4em; }
.hsb__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0 0 1.8em; }

/* ── Hero: Text + Aufmacher links, Titelbild (oft Hochformat) rechts ── */
.hsb__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(600px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(600px, calc(100svh - var(--hs-head, 108px)));
  background: radial-gradient(circle at 85% 30%, #efe9dc 0%, var(--cream) 55%);
}
.hsb__inside {
  position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 3em 1.5em 5em; box-sizing: border-box;
  display: grid; grid-template-columns: 1.1fr .9fr; gap: 4em; align-items: center;
}
.hsb__intro > * { max-width: 34rem; }
.hsb__fimg { position: relative; display: block; justify-self: end; width: 100%; max-width: 460px; isolation: isolate; }
.hsb__fimg img {
  width: 100%; aspect-ratio: 4 / 5; max-height: calc(100svh - var(--hs-head, 108px) - 9em);
  object-fit: cover; display: block; border-radius: 26px; box-shadow: 0 26px 60px rgba(60, 50, 30, .2);
  transition: transform .6s ease;
}
.hsb__fimg::before {
  content: ""; position: absolute; inset: 1.6em -1.6em -1.6em 1.6em; z-index: -1;
  border: 1px solid #cfd9cf; border-radius: 26px;
}
.hsb__fimg:hover img { transform: scale(1.015); }
.hsb__feature {
  display: flex; flex-direction: column; gap: .45em; text-decoration: none; color: var(--ink);
  background: rgba(255, 255, 255, .88); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border: 1px solid rgba(230, 224, 210, .9); border-radius: 20px; padding: 1.4em 1.6em 1.5em;
  box-shadow: 0 18px 44px rgba(60, 50, 30, .14); transition: transform .25s ease, box-shadow .25s ease;
}
.hsb__feature:hover { transform: translateY(-4px); box-shadow: 0 24px 54px rgba(60, 50, 30, .2); }
.hsb__badge {
  align-self: flex-start; font-size: .68em; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  background: var(--green); color: #fff; border-radius: 999px; padding: .4em .9em; margin-bottom: .3em;
}
.hsb__meta, .hsb__cmeta { font-size: .78em; color: var(--muted); letter-spacing: .02em; }
.hsb__ftitle { font-family: var(--serif); font-size: 1.55em; line-height: 1.25; }
.hsb__fteaser { font-size: .92em; line-height: 1.65; color: var(--muted); }
.hsb__flink, .hsb__clink { display: inline-flex; align-items: center; gap: .45em; color: var(--green); font-weight: 600; font-size: .88em; margin-top: .3em; }
.hsb__flink :deep(svg), .hsb__clink :deep(svg) { transition: transform .2s; }
.hsb__feature:hover .hsb__flink :deep(svg), .hsb__card:hover .hsb__clink :deep(svg) { transform: translateX(4px); }

.hsb__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em;
  font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); text-decoration: none;
}
.hsb__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.hsb__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: hsb-bob 1.8s ease-in-out infinite; }
.hsb__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes hsb-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }

/* ── Liste ── */
.hsb__list { padding: 4em 0 4.5em; }
.hsb__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 2em; margin-bottom: 2.2em; flex-wrap: wrap; }
.hsb__filters { display: flex; flex-wrap: wrap; gap: .4em; }
.hsb__filters button {
  font: inherit; font-size: .84em; font-weight: 600; cursor: pointer; padding: .5em 1.05em; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; color: var(--ink); transition: background .15s, color .15s, border-color .15s;
}
.hsb__filters button:hover { border-color: var(--green); color: var(--green); }
.hsb__filters button.is-active { background: var(--green); border-color: var(--green); color: #fff; }

.hsb__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6em; }
.hsb__card {
  display: flex; flex-direction: column; background: #fff; border-radius: 18px; overflow: hidden;
  border: 1px solid var(--line); text-decoration: none; color: var(--ink);
  transition: transform .25s ease, box-shadow .25s ease;
}
.hsb__card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hsb__cimg { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--line); }
.hsb__cimg img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
.hsb__card:hover .hsb__cimg img { transform: scale(1.05); }
.hsb__cimg.is-empty { background: linear-gradient(135deg, #e9efe7 0%, #d5e2d4 100%); }
.hsb__ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8fa891; }
.hsb__year {
  position: absolute; left: .9em; top: .9em; font-size: .72em; font-weight: 700; letter-spacing: .06em;
  background: rgba(255, 255, 255, .92); color: var(--green); border-radius: 999px; padding: .35em .8em;
}
.hsb__own { display: flex; align-items: center; gap: .45em; margin: -.6em 0 1.4em; font-size: .86em; color: var(--muted); }
.hsb__facts { font-style: normal; font-size: .8em; color: var(--green); }
.hsb__bab { position: absolute; right: .8em; bottom: .8em; padding: .25em .7em; border-radius: 999px; background: rgba(255, 255, 255, .9); font-size: .72em; letter-spacing: .06em; color: var(--green); }
.hsb__cbody { padding: 1.2em 1.35em 1.4em; display: flex; flex-direction: column; flex: 1; gap: .35em; }
.hsb__cbody h3 { font-size: 1.18em; line-height: 1.35; margin: 0; }
.hsb__cbody p { margin: .2em 0 .6em; font-size: .88em; line-height: 1.65; color: var(--muted); }
.hsb__clink { margin-top: auto; }

.hsb__more { text-align: center; margin-top: 2.4em; }
.hsb__btn {
  display: inline-flex; align-items: center; gap: .4em; padding: .85em 1.9em; border-radius: 999px; cursor: pointer;
  font: inherit; font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s;
}
.hsb__btn--ghost { background: #fff; color: var(--ink); border: 1px solid var(--ink); }
.hsb__btn--ghost:hover { color: var(--green); border-color: var(--green); }
.hsb__btn span { color: var(--muted); font-weight: 500; }

/* ── Newsletter ── */
.hsb__nl { padding: 0 0 5em; }
.hsb__nlbox {
  display: grid; grid-template-columns: auto 1fr; gap: 2em; align-items: center;
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%);
  color: #fff; border-radius: 26px; padding: 2.8em 3em; position: relative; overflow: hidden;
}
.hsb__nlbox::after {
  content: ""; position: absolute; right: -6em; bottom: -9em; width: 22em; height: 22em; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, .12); box-shadow: 0 0 0 2.5em rgba(255, 255, 255, .03); pointer-events: none;
}
.hsb__nlicon {
  width: 5em; height: 5em; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, .12); border: 1px solid rgba(255, 255, 255, .25);
}
.hsb__nlrte { position: relative; z-index: 1; }
.hsb__nlrte :deep(p) { margin: 0 0 .9em; line-height: 1.7; color: rgba(255, 255, 255, .85); }
.hsb__nlrte :deep(p:last-child) { margin: 0; font-size: .82em; color: rgba(255, 255, 255, .65); }
.hsb__nlrte :deep(.wohnfee-light) { color: #fff; }
.hsb__nlrte :deep(a.abutton) {
  display: inline-flex; padding: .8em 1.8em; border-radius: 999px; background: #fff; color: var(--green);
  font-weight: 600; text-decoration: none; transition: background .15s;
}
.hsb__nlrte :deep(a.abutton:hover) { background: var(--cream); }
.hsb__nlrte :deep(a.light) { color: #fff; }

/* ── Reveal ── */
.hsb.is-anim .rv { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
.hsb.is-anim .rv.is-in { opacity: 1; transform: none; }
.hsb.is-anim .hsb__card.rv.is-in:hover { transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 960px) {
  .hsb__hero { min-height: 0; }
  .hsb__inside { grid-template-columns: 1fr; gap: 2em; padding: 2.5em 1em 3em; }
  .hsb__fimg { order: -1; justify-self: stretch; max-width: none; }
  .hsb__fimg img { aspect-ratio: 16 / 10; max-height: none; }
  .hsb__fimg::before { display: none; }
  .hsb__cue { display: none; }
  .hsb__grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .hsb__wrap { padding: 0 1em; }
  .hsb__grid { grid-template-columns: 1fr; }
  .hsb__nlbox { grid-template-columns: 1fr; padding: 2em 1.5em; }
  .hsb__list { padding: 3em 0; }
}
@media (prefers-reduced-motion: reduce) { .hsb__cue svg { animation: none; } }
</style>
