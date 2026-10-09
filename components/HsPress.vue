<script setup lang="ts">
// Pressespiegel im Design der übrigen Seiten. Quelle: news.json (Archiv 8),
// Kategorien: 7 = Online-Artikel, 8 = PDF-Artikel, übrige = Jahrgänge.
// `category` kommt von den alten Kategorie-URLs (/presse/category/….html)
// und setzt den passenden Filter voraus.
const props = defineProps<{ page: any, category?: string | null }>()
const { news, newsEn, categories } = useSiteData()
const { isEn, lang, t } = useLang()

const TYPE_CATS: Record<string, 'online' | 'pdf'> = { 7: 'online', 8: 'pdf' }

const items = computed(() => Object.values((isEn.value ? newsEn : news) as Record<string, any>)
  .filter((n: any) => n.archive === '8')
  .sort((a: any, b: any) => Number(b.date) - Number(a.date))
  .map((n: any) => {
    const cats = (n.categories || []).map(String)
    const url = n.url && n.url !== '#' ? String(n.url) : ''
    const isPdf = /\.pdf$/i.test(url) || cats.includes('8')
    const type: 'online' | 'pdf' | 'archiv' = !url ? 'archiv' : isPdf ? 'pdf' : 'online'
    let host = ''
    if (type === 'online') { try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* ungültige URL */ } }
    return { ...n, url, type, host, year: blogYear(n.date), external: /^https?:/i.test(url) }
  }))

const latest = computed(() => items.value.filter(i => i.image).slice(0, 3))
const years = computed(() => [...new Set(items.value.map(i => i.year))])
const span = computed(() => `${Math.min(...years.value)}–${Math.max(...years.value)}`)

// Filter (aus alter Kategorie-URL vorbelegt)
const preCat = props.category ? (categories as Record<string, any>)[props.category] : null
const type = ref<'alle' | 'online' | 'pdf'>(preCat && TYPE_CATS[preCat.id] ? TYPE_CATS[preCat.id] : 'alle')
const year = ref<number | null>(preCat && /^\d{4}$/.test(preCat.title) ? Number(preCat.title) : null)

const filtered = computed(() => items.value
  .filter(i => type.value === 'alle' || i.type === type.value)
  .filter(i => !year.value || i.year === year.value))
const groups = computed(() => {
  const g: { year: number, items: any[] }[] = []
  for (const i of filtered.value) {
    const last = g[g.length - 1]
    if (last && last.year === i.year) last.items.push(i)
    else g.push({ year: i.year, items: [i] })
  }
  return g
})
const countType = (t: 'online' | 'pdf') => items.value.filter(i => i.type === t).length

const label = (i: any) => i.type === 'pdf' ? t('PDF öffnen', 'Open PDF') : i.type === 'online' ? t('Artikel lesen', 'Read article') : ''

// Hero-Höhe + Reveal
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}
let io: IntersectionObserver | null = null
const observe = () => root.value?.querySelectorAll('.rv:not(.is-in)').forEach(n => io?.observe(n))
onMounted(() => {
  syncHeaderHeight()
  window.addEventListener('resize', syncHeaderHeight)
  // nach dem Scroll-Reset des Routers zum vorgefilterten Archiv springen
  if (props.category) setTimeout(() => scrollToId('archiv'), 600)
  const el = root.value
  if (!el || !('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.classList.add('is-anim')
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io?.unobserve(e.target) }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
  observe()
})
watch(groups, () => nextTick(observe))
onUnmounted(() => {
  window.removeEventListener('resize', syncHeaderHeight)
  io?.disconnect()
})

function scrollToId(id: string, e?: Event) {
  e?.preventDefault()
  const t = document.getElementById(id)
  if (!t) return
  const off = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight || 108
  window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off - 10, behavior: 'smooth' })
}
function pickYear(y: number | null) {
  year.value = y
  nextTick(() => scrollToId('archiv'))
}
</script>

<template>
  <div ref="root" class="hsp2">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hsp2__hero">
      <div class="hsp2__inside">
        <div class="hsp2__intro">
          <p class="hsp2__eyebrow">{{ t('Über uns', 'About us') }}</p>
          <h1 class="hsp2__h1">{{ t('Pressespiegel', 'Press review') }}</h1>
          <p class="hsp2__lead">
            {{ t('WOHNFEE in den Medien: Berichte, Interviews und Reportagen rund um Home Staging, Einrichtung und Wohntrends.',
                 'WOHNFEE in the media: articles, interviews and reports on home staging, interior design and living trends.') }}
          </p>
          <ul class="hsp2__stats">
            <li><strong>{{ items.length }}</strong><span>{{ t('Berichte', 'articles') }}</span></li>
            <li><strong>{{ span }}</strong><span>{{ t('im Archiv', 'in the archive') }}</span></li>
            <li><strong>{{ countType('online') }}</strong><span>online</span></li>
          </ul>
          <div class="hsp2__actions">
            <a href="#archiv" class="hsp2__btn hsp2__btn--primary" @click="scrollToId('archiv', $event)">{{ t('Zum Archiv', 'To the archive') }}</a>
            <a href="mailto:office@wohnfee.at" class="hsp2__btn hsp2__btn--ghost">{{ t('Presseanfrage', 'Press enquiry') }}</a>
          </div>
        </div>
        <div class="hsp2__stack" aria-hidden="true">
          <a v-for="(c, i) in latest" :key="c.route" :href="c.url || undefined" :target="c.external ? '_blank' : undefined"
             rel="noopener" class="hsp2__clip" :class="`hsp2__clip--${i}`" tabindex="-1">
            <HsImg :src="asset(c.image)" alt="" sizes="xs:60vw sm:50vw md:30vw lg:340px xl:340px xxl:340px 2xl:340px"
                   loading="eager" />
            <span class="hsp2__cliptag">{{ c.year }}</span>
          </a>
        </div>
      </div>
      <a href="#archiv" class="hsp2__cue" @click="scrollToId('archiv', $event)">
        {{ t('Alle Berichte', 'All articles') }}
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </a>
    </section>

    <!-- ── Archiv ───────────────────────────────────── -->
    <section id="archiv" class="hsp2__archive">
      <div class="hsp2__wrap">
        <div class="hsp2__filters">
          <div class="hsp2__seg" role="group" :aria-label="t('Art', 'Type')">
            <button type="button" :class="{ 'is-active': type === 'alle' }" @click="type = 'alle'">{{ t('Alle', 'All') }} <em>{{ items.length }}</em></button>
            <button type="button" :class="{ 'is-active': type === 'online' }" @click="type = 'online'">
              <WfIcon name="globe" :size="14" /> Online <em>{{ countType('online') }}</em>
            </button>
            <button type="button" :class="{ 'is-active': type === 'pdf' }" @click="type = 'pdf'">
              <WfIcon name="file" :size="14" /> {{ t('Print / PDF', 'Print / PDF') }} <em>{{ countType('pdf') }}</em>
            </button>
          </div>
          <div class="hsp2__years" role="group" :aria-label="t('Jahr', 'Year')">
            <button type="button" :class="{ 'is-active': !year }" @click="pickYear(null)">{{ t('Alle Jahre', 'All years') }}</button>
            <button v-for="y in years" :key="y" type="button" :class="{ 'is-active': year === y }" @click="pickYear(y)">{{ y }}</button>
          </div>
        </div>

        <p v-if="!groups.length" class="hsp2__empty">
          {{ t('Keine Berichte für diese Auswahl.', 'No articles for this selection.') }}
          <button type="button" @click="type = 'alle'; year = null">{{ t('Filter zurücksetzen', 'Reset filters') }}</button>
        </p>

        <div v-for="g in groups" :key="g.year" class="hsp2__year">
          <div class="hsp2__yearlabel"><span>{{ g.year }}</span></div>
          <div class="hsp2__grid">
            <component :is="i.url ? 'a' : 'div'" v-for="i in g.items" :key="i.route"
                       :href="i.url || undefined" :target="i.external ? '_blank' : undefined"
                       :rel="i.external ? 'noopener noreferrer' : undefined"
                       class="hsp2__card rv" :class="{ 'is-static': !i.url }">
              <div class="hsp2__cimg" :class="{ 'is-empty': !i.image }">
                <HsImg v-if="i.image" :src="asset(i.image)" :alt="i.headline"
                       sizes="xs:100vw sm:100vw md:50vw lg:360px xl:360px xxl:360px 2xl:360px" />
                <span v-else class="hsp2__ph"><WfIcon name="file" :size="30" /></span>
                <span class="hsp2__badge" :class="`is-${i.type}`">
                  <WfIcon :name="i.type === 'online' ? 'globe' : 'file'" :size="12" />
                  {{ i.type === 'online' ? 'Online' : i.type === 'pdf' ? 'Print' : t('Archiv', 'Archive') }}
                </span>
              </div>
              <div class="hsp2__cbody">
                <span class="hsp2__cmeta">{{ blogDate(i.date, lang) }}<template v-if="i.host"> · {{ i.host }}</template></span>
                <h3>{{ i.headline }}</h3>
                <p>{{ blogTeaser(i, 150) }}</p>
                <span v-if="i.url" class="hsp2__clink">
                  {{ label(i) }}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
                </span>
              </div>
            </component>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Presseanfragen ───────────────────────────── -->
    <section class="hsp2__press">
      <div class="hsp2__wrap">
        <div class="hsp2__pbox rv">
          <div class="hsp2__picon" aria-hidden="true"><WfIcon name="mail" :size="30" /></div>
          <div>
            <h2 class="hsp2__h2">{{ t('Presseanfragen', 'Press enquiries') }}</h2>
            <p>{{ t('Sie schreiben über Home Staging, Einrichtung oder Wohntrends? Wir stehen gerne für Interviews, Fotos und Hintergrundinformationen zur Verfügung.',
                    'Writing about home staging, interior design or living trends? We are happy to provide interviews, photos and background information.') }}</p>
          </div>
          <div class="hsp2__pactions">
            <a href="mailto:office@wohnfee.at" class="hsp2__btn hsp2__btn--light">office@wohnfee.at</a>
            <a href="tel:+436769202236" class="hsp2__btn hsp2__btn--outline">+43 676 9202236</a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsp2 {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsp2__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsp2 h1, .hsp2 h2, .hsp2 h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; text-transform: none; }

.hsp2__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.2em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsp2__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsp2__h1 { font-size: clamp(2.4em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .45em; }
.hsp2__h2 { font-size: clamp(1.5em, 2.6vw, 2em) !important; line-height: 1.2; margin: 0 0 .35em; color: #fff !important; }
.hsp2__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0 0 1.6em; }

.hsp2__actions { display: flex; flex-wrap: wrap; gap: .8em; }
.hsp2__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px;
  font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hsp2__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hsp2__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hsp2__btn--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border: 1px solid var(--ink); }
.hsp2__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.hsp2__btn--light { background: #fff; color: var(--green); }
.hsp2__btn--light:hover { background: var(--cream); color: var(--green-dark); }
.hsp2__btn--outline { border: 1px solid rgba(255, 255, 255, .7); color: #fff; }
.hsp2__btn--outline:hover { background: rgba(255, 255, 255, .12); color: #fff; }

/* ── Hero ── */
.hsp2__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(600px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(600px, calc(100svh - var(--hs-head, 108px)));
  background: radial-gradient(circle at 80% 40%, #efe9dc 0%, var(--cream) 55%);
}
.hsp2__inside {
  position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 3em 1.5em 5em; box-sizing: border-box;
  display: grid; grid-template-columns: 1fr 1fr; gap: 3em; align-items: center;
}
.hsp2__intro > * { max-width: 32rem; }
.hsp2__stats { list-style: none; margin: 0 0 2em; padding: 0; display: flex; gap: 2.2em; }
.hsp2__stats li { display: grid; gap: .1em; }
.hsp2__stats strong { font-family: var(--serif); font-weight: 500; font-size: 2em; line-height: 1; color: var(--green); }
.hsp2__stats span { font-size: .8em; color: var(--muted); letter-spacing: .04em; }

/* Gefächerter Stapel aus Zeitungsausschnitten */
.hsp2__stack { position: relative; height: min(560px, calc(100svh - var(--hs-head, 108px) - 8em)); min-height: 380px; }
.hsp2__clip {
  position: absolute; top: 50%; left: 50%; width: 52%; aspect-ratio: 3 / 4; display: block;
  background: #fff; padding: .7em; border-radius: 10px; box-shadow: 0 22px 50px rgba(60, 50, 30, .22);
  transition: transform .45s cubic-bezier(.2, .8, .2, 1), box-shadow .3s; cursor: default;
}
.hsp2__clip :deep(img) { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; display: block; border-radius: 4px; }
.hsp2__clip--0 { z-index: 3; transform: translate(-50%, -50%) rotate(-2deg); }
.hsp2__clip--1 { z-index: 2; transform: translate(-95%, -46%) rotate(-11deg); }
.hsp2__clip--2 { z-index: 1; transform: translate(-6%, -44%) rotate(9deg); }
.hsp2__stack:hover .hsp2__clip--1 { transform: translate(-112%, -48%) rotate(-14deg); }
.hsp2__stack:hover .hsp2__clip--2 { transform: translate(10%, -46%) rotate(12deg); }
.hsp2__cliptag {
  position: absolute; left: 1.3em; bottom: 1.3em; font-size: .72em; font-weight: 700; letter-spacing: .06em;
  background: var(--green); color: #fff; border-radius: 999px; padding: .35em .8em;
}

.hsp2__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em;
  font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); text-decoration: none;
}
.hsp2__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.hsp2__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: hsp2-bob 1.8s ease-in-out infinite; }
.hsp2__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes hsp2-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }

/* ── Archiv ── */
.hsp2__archive { background: #fff; padding: 3.5em 0 4.5em; }
.hsp2__filters {
  position: sticky; top: var(--hs-head, 108px); z-index: 5; display: grid; gap: .8em;
  padding: 1em 0; margin-bottom: 1.5em; background: rgba(255, 255, 255, .94);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line);
}
.hsp2__seg, .hsp2__years { display: flex; flex-wrap: wrap; gap: .4em; }
.hsp2__seg button, .hsp2__years button {
  display: inline-flex; align-items: center; gap: .45em; cursor: pointer; font: inherit; font-weight: 600;
  border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 999px; transition: background .15s, color .15s, border-color .15s;
}
.hsp2__seg button { padding: .55em 1.1em; font-size: .88em; }
.hsp2__seg button em { font-style: normal; font-size: .8em; font-weight: 600; color: var(--muted); }
.hsp2__years button { padding: .35em .85em; font-size: .78em; }
.hsp2__seg button:hover, .hsp2__years button:hover { border-color: var(--green); color: var(--green); }
.hsp2__seg button.is-active, .hsp2__years button.is-active { background: var(--green); border-color: var(--green); color: #fff; }
.hsp2__seg button.is-active em { color: rgba(255, 255, 255, .8); }

.hsp2__year { display: grid; grid-template-columns: 120px 1fr; gap: 2em; padding: 1.8em 0; border-top: 1px solid var(--line); }
.hsp2__year:first-of-type { border-top: 0; }
.hsp2__yearlabel span {
  position: sticky; top: calc(var(--hs-head, 108px) + 140px); display: block;
  font-family: var(--serif); font-size: 2.4em; line-height: 1; color: transparent; -webkit-text-stroke: 1px var(--green);
}
.hsp2__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.3em; }
.hsp2__card {
  display: flex; flex-direction: column; background: var(--cream); border: 1px solid var(--line); border-radius: 16px;
  overflow: hidden; text-decoration: none; color: var(--ink); transition: transform .25s ease, box-shadow .25s ease;
}
a.hsp2__card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hsp2__cimg { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #ece6d8; }
.hsp2__cimg :deep(img) { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; display: block; transition: transform .6s ease; }
a.hsp2__card:hover .hsp2__cimg :deep(img) { transform: scale(1.04); }
.hsp2__cimg.is-empty { background: linear-gradient(135deg, #e9efe7 0%, #d5e2d4 100%); }
.hsp2__ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8fa891; }
.hsp2__badge {
  position: absolute; left: .8em; top: .8em; display: inline-flex; align-items: center; gap: .35em;
  font-size: .7em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  background: rgba(255, 255, 255, .94); color: var(--green); border-radius: 999px; padding: .35em .75em;
}
.hsp2__badge.is-online { background: var(--green); color: #fff; }
.hsp2__cbody { padding: 1.1em 1.25em 1.25em; display: flex; flex-direction: column; gap: .35em; flex: 1; }
.hsp2__cmeta { font-size: .76em; color: var(--muted); }
.hsp2__cbody h3 { font-size: 1.12em; line-height: 1.35; margin: 0; }
.hsp2__cbody p { margin: .15em 0 .6em; font-size: .85em; line-height: 1.6; color: var(--muted); }
.hsp2__clink { margin-top: auto; display: inline-flex; align-items: center; gap: .35em; color: var(--green); font-weight: 600; font-size: .85em; }
.hsp2__clink svg { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
a.hsp2__card:hover .hsp2__clink svg { transform: translate(2px, -2px); }
.hsp2__empty { padding: 2em 0; color: var(--muted); }
.hsp2__empty button { margin-left: .5em; border: 0; background: none; color: var(--green); font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; }

/* ── Presseanfragen ── */
.hsp2__press { padding: 4em 0 5em; }
.hsp2__pbox {
  display: grid; grid-template-columns: auto 1fr auto; gap: 2em; align-items: center;
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%);
  color: #fff; border-radius: 26px; padding: 2.6em 3em;
}
.hsp2__pbox p { margin: 0; line-height: 1.7; color: rgba(255, 255, 255, .85); max-width: 36em; }
.hsp2__picon {
  width: 4.6em; height: 4.6em; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, .12); border: 1px solid rgba(255, 255, 255, .25);
}
.hsp2__pactions { display: grid; gap: .6em; justify-items: stretch; }
.hsp2__pactions .hsp2__btn { justify-content: center; }

/* ── Reveal ── */
.hsp2.is-anim .rv { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s ease; }
.hsp2.is-anim .rv.is-in { opacity: 1; transform: none; }
.hsp2.is-anim a.hsp2__card.rv.is-in:hover { transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 1100px) { .hsp2__grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 960px) {
  .hsp2__hero { min-height: 0; }
  .hsp2__inside { grid-template-columns: 1fr; padding: 2.5em 1em 3em; gap: 1em; }
  .hsp2__stack { height: 340px; min-height: 0; order: -1; }
  .hsp2__cue { display: none; }
  .hsp2__year { grid-template-columns: 1fr; gap: .8em; }
  .hsp2__yearlabel span { position: static; font-size: 1.9em; }
  .hsp2__pbox { grid-template-columns: 1fr; padding: 2em 1.5em; }
  .hsp2__picon { display: none; }
}
@media (max-width: 600px) {
  .hsp2__wrap { padding: 0 1em; }
  .hsp2__grid { grid-template-columns: 1fr; }
  .hsp2__stats { gap: 1.4em; }
  .hsp2__years { flex-wrap: nowrap; overflow-x: auto; padding-bottom: .2em; }
  .hsp2__years button { flex: none; }
}
@media (prefers-reduced-motion: reduce) { .hsp2__cue svg { animation: none; } }
</style>
