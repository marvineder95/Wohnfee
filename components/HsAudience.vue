<script setup lang="ts">
// Zielgruppen-Unterseiten (Bauträger / Makler / Privatpersonen) im Design der
// Home-Staging-Seite. Alle Texte kommen unverändert aus pages.json – die
// Komponente ordnet sie nur neu an: H1 im Hero, Textblöcke als Bild/Text-
// Sektionen, Projektbeispiele als Kartenraster.
import { HS_AUDIENCES } from '~~/shared/home-staging-audiences'

const props = defineProps<{ page: any }>()
const { news } = useSiteData()

const audience = computed(() => HS_AUDIENCES.find(a => a.route === props.page.route)!)
const others = computed(() => HS_AUDIENCES.filter(a => a.route !== props.page.route))

const elements = computed<any[]>(() => props.page.columns?.main || [])
const h1 = computed(() => elements.value.find(e => e.type === 'headline')?.headline || props.page.title)
const list = computed(() => elements.value.find(e => e.type === 'newslist'))

// Textblock zerlegen: führende <h2>/<h3> wird zur Sektionsüberschrift,
// ein kurzer Schlusssatz (z. B. „Kümmern Sie sich um den Verkauf …“) zum Zitat.
const stripTags = (h: string) => h.replace(/<[^>]+>/g, '').trim()
const blocks = computed(() => elements.value.filter(e => e.type === 'text').map((e) => {
  let html: string = e.html || ''
  let title: string = e.headline || ''
  const lead = html.match(/^\s*<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*/)
  if (!title && lead) {
    title = stripTags(lead[1])
    html = html.slice(lead[0].length)
  }
  let quote = ''
  const paras = html.match(/<p[^>]*>[\s\S]*?<\/p>/g) || []
  const last = paras[paras.length - 1]
  if (paras.length > 1 && last && stripTags(last).length < 90) {
    quote = stripTags(last)
    html = html.slice(0, html.lastIndexOf(last)) + html.slice(html.lastIndexOf(last) + last.length)
  }
  return { id: e.id, title, html, quote }
}))

// Projektbeispiele: gleiche Auswahl wie das bisherige Newslist-Modul
const projects = computed(() => {
  const el = list.value
  if (!el) return []
  return Object.values(news as Record<string, any>)
    .filter((n: any) => el.archives?.includes(n.archive))
    .filter((n: any) => !el.category || (n.categories || []).map(String).includes(String(el.category)))
    .sort((a: any, b: any) => Number(b.date) - Number(a.date))
})
const showAll = ref(false)
const VISIBLE = 6

// Block 1: festes Bild der Zielgruppe; Block 2: ein Projektfoto, das nicht
// schon in den ersten (sichtbaren) Projektkarten darunter auftaucht
const blockImage = (i: number) => {
  if (i === 0) return audience.value.sideImg
  const p = projects.value
  return asset((p[VISIBLE] || p[p.length - 1])?.image) || audience.value.img
}

// Hero-Höhe relativ zum Viewport unter dem Sticky-Header
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}

// Scroll-Reveal (nur mit JS; ohne bleibt alles sichtbar)
let io: IntersectionObserver | null = null
onMounted(() => {
  syncHeaderHeight()
  window.addEventListener('resize', syncHeaderHeight)
  const el = root.value
  if (!el || !('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.classList.add('is-anim')
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io?.unobserve(e.target) }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 })
  el.querySelectorAll('.rv').forEach(n => io!.observe(n))
})
onUnmounted(() => {
  window.removeEventListener('resize', syncHeaderHeight)
  io?.disconnect()
})

function scrollToProjects(e: Event) {
  e.preventDefault()
  document.getElementById('projekte')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div ref="root" class="hsa">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hsa__hero">
      <NuxtImg class="hsa__bg" :src="audience.img" :alt="h1"
               sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:1600px 2xl:1920px"
               loading="eager" fetchpriority="high" />
      <div class="hsa__inside">
        <NuxtLink to="/home-staging.html" class="hsa__eyebrow">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
          Home Staging
        </NuxtLink>
        <h1 class="hsa__h1">{{ h1 }}</h1>
        <div class="hsa__actions">
          <NuxtLink to="/kontakt.html" class="hsa__btn hsa__btn--primary">Jetzt Beratung anfragen</NuxtLink>
          <a v-if="projects.length" href="#projekte" class="hsa__btn hsa__btn--ghost" @click="scrollToProjects">
            {{ list?.headline || 'Projektbeispiele' }}
            <span class="hsa__count">{{ projects.length }}</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ── Textblöcke ───────────────────────────────── -->
    <section class="hsa__content">
      <div v-for="(b, i) in blocks" :key="b.id" class="hsa__wrap hsa__block rv" :class="{ 'is-rev': i % 2 === 1 }">
        <div class="hsa__text" :class="{ 'hsa__text--panel': i % 2 === 1 }">
          <span class="hsa__num">{{ String(i + 1).padStart(2, '0') }}</span>
          <h2 v-if="b.title" class="hsa__h2">{{ b.title }}</h2>
          <div class="hsa__rte" v-html="b.html" />
          <p v-if="b.quote" class="hsa__quote">{{ b.quote }}</p>
        </div>
        <figure class="hsa__media">
          <NuxtImg :src="blockImage(i)" alt="" loading="lazy"
                   sizes="xs:100vw sm:100vw md:50vw lg:600px xl:600px xxl:600px 2xl:600px" />
        </figure>
      </div>
    </section>

    <!-- ── Projektbeispiele ─────────────────────────── -->
    <section v-if="projects.length" id="projekte" class="hsa__projects">
      <div class="hsa__wrap">
        <div class="hsa__head rv">
          <p class="hsa__divider"><span>Referenzen</span></p>
          <h2 class="hsa__h2 hsa__h2--center">{{ list?.headline || 'Projektbeispiele' }}</h2>
        </div>
        <div class="hsa__grid">
          <NuxtLink v-for="(n, i) in projects" v-show="showAll || i < VISIBLE" :key="n.route"
                    :to="n.route" class="hsa__project">
            <div class="hsa__pimg">
              <NuxtImg v-if="n.image" :src="asset(n.image)" :alt="n.imageAlt || n.headline" loading="lazy"
                       sizes="xs:100vw sm:100vw md:50vw lg:400px xl:400px xxl:400px 2xl:400px" />
            </div>
            <div class="hsa__pbody">
              <h3>{{ n.headline }}</h3>
              <span class="hsa__parrow"><WfIcon name="arrow" :size="16" /></span>
            </div>
          </NuxtLink>
        </div>
        <div v-if="projects.length > VISIBLE" class="hsa__more">
          <button type="button" class="hsa__btn hsa__btn--ghost" @click="showAll = !showAll">
            {{ showAll ? 'Weniger anzeigen' : `Alle ${projects.length} Projekte anzeigen` }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Weitere Zielgruppen ──────────────────────── -->
    <section class="hsa__others">
      <div class="hsa__wrap">
        <div class="hsa__head rv">
          <p class="hsa__divider"><span>Weitere Lösungen</span></p>
        </div>
        <div class="hsa__ogrid">
          <NuxtLink v-for="o in others" :key="o.route" :to="o.route" class="hsa__other rv">
            <NuxtImg :src="o.img" :alt="o.title" loading="lazy"
                     sizes="xs:100vw sm:100vw md:50vw lg:600px xl:600px xxl:600px 2xl:600px" />
            <div class="hsa__oover">
              <h3>{{ o.title }}</h3>
              <p>{{ o.text }}</p>
              <span class="hsa__olink">Mehr erfahren <WfIcon name="arrow" :size="15" /></span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsa {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsa__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsa h1, .hsa h2, .hsa h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; }

/* ── Hero ── */
.hsa__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(480px, calc(78vh - var(--hs-head, 108px)));
  min-height: max(480px, calc(78svh - var(--hs-head, 108px)));
}
.hsa__bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 55%; }
.hsa__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(248, 245, 239, .97) 0%, rgba(248, 245, 239, .88) 32%,
      rgba(248, 245, 239, .45) 50%, rgba(248, 245, 239, 0) 66%),
    linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, 0) 16%);
}
.hsa__inside { position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 4em 1.5em; box-sizing: border-box; }
.hsa__inside > * { max-width: 32rem; }
.hsa__eyebrow {
  display: inline-flex; align-items: center; gap: .7em; margin: 0 0 1.3em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
  color: var(--ink); text-decoration: none; transition: color .15s;
}
.hsa__eyebrow svg {
  width: 1.4em; height: 1.4em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  transition: transform .2s;
}
.hsa__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsa__eyebrow:hover { color: var(--green); }
.hsa__eyebrow:hover svg { transform: translateX(-3px); }
.hsa__h1 { font-size: clamp(2.3em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .8em; text-align: left; }

.hsa__actions { display: flex; flex-wrap: wrap; gap: .8em; }
.hsa__btn {
  display: inline-flex; align-items: center; gap: .6em; padding: .85em 1.9em; border-radius: 999px;
  font: inherit; font-weight: 600; font-size: .9em; text-decoration: none; cursor: pointer;
  transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hsa__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hsa__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hsa__btn--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border: 1px solid var(--ink); }
.hsa__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.hsa__count {
  display: inline-flex; align-items: center; justify-content: center; min-width: 1.7em; height: 1.7em; padding: 0 .4em;
  border-radius: 999px; background: var(--green-soft); color: var(--green); font-size: .8em;
}

/* ── Textblöcke ── */
.hsa__content { padding: 3.5em 0 2em; }
.hsa__block {
  display: grid; grid-template-columns: 1.05fr .95fr; gap: 4em; align-items: center; margin-bottom: 5em;
}
.hsa__block.is-rev .hsa__text { order: 2; }
.hsa__block.is-rev .hsa__media { order: 1; }
.hsa__text { position: relative; }
.hsa__text--panel {
  background: var(--green-soft); border: 1px solid #d9e5da; border-radius: 20px; padding: 2.4em 2.4em 2.2em;
}
.hsa__num {
  display: block; font-family: var(--serif); font-size: 3.2em; line-height: 1; color: transparent;
  -webkit-text-stroke: 1px #b9c9bc; margin-bottom: .25em;
}
.hsa__h2 { font-size: clamp(1.6em, 3vw, 2.2em) !important; line-height: 1.2; margin: 0 0 .7em; text-align: left; }
.hsa__h2--center { text-align: center; }
.hsa__rte :deep(p) { line-height: 1.8; color: var(--muted); margin: 0 0 1em; }
.hsa__rte :deep(p:last-child) { margin-bottom: 0; }
.hsa__rte :deep(strong) {
  color: var(--ink); font-weight: 700;
  background: linear-gradient(transparent 62%, rgba(117, 147, 100, .35) 62%);
}
.hsa__quote {
  margin: 1.4em 0 0; padding: 1em 1.3em; border-radius: 14px; background: var(--green); color: #fff;
  font-family: var(--serif); font-size: 1.2em; line-height: 1.45;
  box-shadow: 0 10px 26px rgba(47, 93, 64, .25);
}
.hsa__media { margin: 0; position: relative; isolation: isolate; }
.hsa__media img {
  width: 100%; aspect-ratio: 5 / 4; object-fit: cover; display: block; border-radius: 18px;
  box-shadow: 0 18px 45px rgba(60, 50, 30, .16);
}
.hsa__media::before {
  content: ""; position: absolute; inset: 1.4em -1.4em -1.4em 1.4em; border: 1px solid #cfd9cf; border-radius: 18px; z-index: -1;
}
.hsa__block.is-rev .hsa__media::before { inset: 1.4em 1.4em -1.4em -1.4em; }

/* ── Projekte ── */
.hsa__projects { background: #fff; padding: 5em 0; }
.hsa__head { margin-bottom: 2.4em; }
.hsa__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 .9em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsa__divider::before, .hsa__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hsa__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5em; }
.hsa__project {
  display: flex; flex-direction: column; background: var(--cream); border-radius: 14px; overflow: hidden;
  text-decoration: none; color: var(--ink); border: 1px solid var(--line);
  transition: transform .25s ease, box-shadow .25s ease;
}
.hsa__project:hover { transform: translateY(-4px); box-shadow: 0 16px 34px rgba(60, 50, 30, .13); }
.hsa__pimg { aspect-ratio: 4 / 3; overflow: hidden; background: var(--line); }
.hsa__pimg img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
.hsa__project:hover .hsa__pimg img { transform: scale(1.05); }
.hsa__pbody { display: flex; align-items: center; justify-content: space-between; gap: 1em; padding: 1em 1.2em 1.1em; }
.hsa__pbody h3 { font-size: 1.05em; line-height: 1.35; margin: 0; text-align: left; }
.hsa__parrow {
  flex: none; width: 2.2em; height: 2.2em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green); transition: background .15s, color .15s;
}
.hsa__project:hover .hsa__parrow { background: var(--green); color: #fff; }
.hsa__more { text-align: center; margin-top: 2.2em; }

/* ── Weitere Zielgruppen ── */
.hsa__others { padding: 4.5em 0 5em; }
.hsa__ogrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5em; }
.hsa__other {
  position: relative; display: block; border-radius: 18px; overflow: hidden; aspect-ratio: 16 / 8;
  text-decoration: none; color: #fff;
}
.hsa__other img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s ease; }
.hsa__other::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(25, 30, 22, .78) 0%, rgba(25, 30, 22, .25) 55%, rgba(25, 30, 22, 0) 100%);
}
.hsa__other:hover img { transform: scale(1.05); }
.hsa__oover { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; padding: 1.6em 1.8em; }
.hsa__oover h3 { color: #fff !important; font-size: 1.5em; margin: 0 0 .3em; text-align: left; }
.hsa__oover p { margin: 0 0 .8em; font-size: .9em; line-height: 1.5; color: rgba(255, 255, 255, .88); max-width: 30em; }
.hsa__olink { display: inline-flex; align-items: center; gap: .5em; font-weight: 600; font-size: .85em; }
.hsa__olink :deep(svg) { transition: transform .2s; }
.hsa__other:hover .hsa__olink :deep(svg) { transform: translateX(4px); }

/* ── Scroll-Reveal ── */
.hsa.is-anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.hsa.is-anim .rv.is-in { opacity: 1; transform: none; }

/* ── Responsive ── */
@media (max-width: 960px) {
  .hsa__block { grid-template-columns: 1fr; gap: 2.5em; margin-bottom: 3.5em; }
  .hsa__block.is-rev .hsa__text, .hsa__block .hsa__text { order: 1; }
  .hsa__block.is-rev .hsa__media, .hsa__block .hsa__media { order: 2; }
  .hsa__media::before { display: none; }
  .hsa__grid { grid-template-columns: 1fr 1fr; }
  .hsa__ogrid { grid-template-columns: 1fr; }
  .hsa__hero { min-height: 0; align-items: flex-end; }
  .hsa__bg { height: 20em; }
  .hsa__hero::after {
    inset: 0 0 auto 0; height: 20em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .85) 30%, rgba(248, 245, 239, 0) 65%);
  }
  .hsa__inside { padding: 13em 1em 2em; }
}
@media (max-width: 600px) {
  .hsa__wrap { padding: 0 1em; }
  .hsa__grid { grid-template-columns: 1fr; }
  .hsa__text--panel { padding: 1.6em 1.3em; }
  .hsa__projects, .hsa__others { padding: 3.2em 0; }
  .hsa__other { aspect-ratio: 4 / 3; }
}
</style>
