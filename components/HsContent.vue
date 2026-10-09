<script setup lang="ts">
// Inhalt der Home-Staging-Seite im Hero-Design: Intro, Ablauf-Timeline,
// Investitions-Band und Nutzen-Karten. Texte kommen aus den Seitendaten der
// jeweiligen Sprache (pages.json / pages-en.json, Elemente 45, 76, 77, 75,
// 80–81, 135–139, 69, 74) – nur kurze Beschriftungen sind hier übersetzt.
const props = defineProps<{ page: any }>()
const { t, lp } = useLang()
const IMG = '/files/wohnfee/bilder/homestaging/'

const els = computed<any[]>(() => props.page.columns?.main || [])
const byId = (id: string) => els.value.find(e => e.id === id) || {}
const strip = (h: string) => String(h || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').trim()
const paras = (h: string) => (String(h || '').match(/<p[^>]*>[\s\S]*?<\/p>/g) || []).map(strip).filter(Boolean)
const heading = (h: string, tag = 'h3') => strip(String(h || '').match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] || '')

const intro = computed(() => {
  const html = byId('45').html || ''
  const [lead, ...rest] = (paras(html)[0] || '').split('\n').map(s => s.trim()).filter(Boolean)
  return { title: heading(html, 'h1'), lead: lead || '', text: rest.join(' ') }
})
const problem = computed(() => ({ title: byId('76').headline || '', items: paras(byId('76').html) }))
const solutionBlock = computed(() => ({ title: byId('77').headline || '', text: paras(byId('77').html).join(' ') }))

const solution = computed(() => [
  t('Licht- & Farbkonzept', 'Lighting & colour concept'),
  t('Klare Raumfunktionen', 'Clear room functions'),
  t('Gezielte Reduktion', 'Targeted decluttering'),
  t('Leihmobiliar & Accessoires', 'Rental furniture & accessories'),
  t('Passende Beleuchtung', 'Suitable lighting')
])

const STEP_META: Record<string, { icon: string, tag?: [string, string] }> = {
  80: { icon: 'phone' },
  81: { icon: 'file' },
  135: { icon: 'truck', tag: ['an nur 1 Tag', 'in just 1 day'] },
  136: { icon: 'diamond', tag: ['80 – 150 Teile', '80 – 150 pieces'] },
  137: { icon: 'calendar', tag: ['mind. 2 Monate', 'min. 2 months'] },
  138: { icon: 'key' }
}
const steps = computed(() => Object.keys(STEP_META).map((id) => {
  const e = byId(id)
  const html = String(e.html || '')
  const q = html.match(/<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/)
  const body = q ? html.replace(q[0], '') : html
  const meta = STEP_META[id]
  return {
    icon: meta.icon,
    title: heading(html).replace(/^\d+\.\s*/, ''),
    tag: meta.tag ? t(meta.tag[0], meta.tag[1]) : '',
    question: q ? strip(q[1]).replace(/^\(|\)$/g, '') : '',
    text: paras(body).join(' ')
  }
}).filter(s => s.title))

const invest = computed(() => {
  const html = byId('139').html || ''
  return { title: heading(html).replace(/Investition die/, 'Investition, die'), text: paras(html).join(' ') }
})

const BENEFIT_ICONS = ['camera', 'home', 'clock']
const benefitsTitle = computed(() => byId('69').headline || '')
const benefits = computed(() => (byId('74').children || []).map((c: any, i: number) => ({
  icon: BENEFIT_ICONS[i] || 'check',
  title: heading(c.html, 'h2').replace(/\s*\n\s*/g, ' '),
  text: paras(c.html).join(' ')
})))

// Sanftes Einblenden beim Scrollen. Ohne JS (SSR/Prerender) bleibt alles sichtbar,
// weil der Ausgangszustand erst über die Klasse .is-anim aktiviert wird.
const root = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
onMounted(() => {
  const el = root.value
  if (!el || !('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.classList.add('is-anim')
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in')
        io?.unobserve(e.target)
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
  el.querySelectorAll('.rv').forEach(n => io!.observe(n))
})
onUnmounted(() => io?.disconnect())
</script>

<template>
  <div ref="root" class="hsc">
    <!-- ── Intro ─────────────────────────────────────── -->
    <section class="hsc__intro">
      <div class="hsc__wrap hsc__introgrid">
        <div class="hsc__introtext rv">
          <p class="hsc__eyebrow">{{ t('Warum Home Staging', 'Why home staging') }}</p>
          <h1 class="hsc__h1">{{ intro.title }}</h1>
          <p class="hsc__lead">{{ intro.lead }}</p>
          <p class="hsc__text">{{ intro.text }}</p>
        </div>
        <div class="hsc__collage rv">
          <NuxtImg :src="IMG + 'Archihaus WZ2.jpg'"       :alt="t('Inszenierter Wohnbereich mit Blick auf den Pool', 'Staged living area overlooking the pool')"
                   class="hsc__img hsc__img--main" sizes="xs:100vw sm:100vw md:60vw lg:560px xl:560px xxl:560px 2xl:560px" loading="lazy" />
          <NuxtImg :src="IMG + 'SLIDER_HS_2_034.jpg'"       :alt="t('Gemütliche Leseecke nach dem Home Staging', 'Cosy reading corner after home staging')"
                   class="hsc__img hsc__img--small" sizes="xs:60vw sm:50vw md:30vw lg:300px xl:300px xxl:300px 2xl:300px" loading="lazy" />
          <div class="hsc__badge">
            <strong>{{ t('1 Tag', '1 day') }}</strong>
            <span v-html="t('für das gesamte<br>Staging', 'for the entire<br>staging')" />
          </div>
        </div>
      </div>

      <div class="hsc__wrap hsc__duo">
        <article class="hsc__panel rv">
          <span class="hsc__label">{{ t('Die Herausforderung', 'The challenge') }}</span>
          <h2 class="hsc__h3">{{ problem.title }}</h2>
          <ul class="hsc__problems">
            <li v-for="(p, i) in problem.items" :key="i">
              <span class="hsc__dot"><WfIcon :name="i === 0 ? 'eye' : 'users'" :size="18" /></span>{{ p }}
            </li>
          </ul>
        </article>
        <article class="hsc__panel hsc__panel--green rv">
          <span class="hsc__label">{{ t('Unsere Lösung', 'Our solution') }}</span>
          <h2 class="hsc__h3">{{ solutionBlock.title }}</h2>
          <p>{{ solutionBlock.text }}</p>
          <ul class="hsc__chips">
            <li v-for="s in solution" :key="s"><WfIcon name="check" :size="14" />{{ s }}</li>
          </ul>
        </article>
      </div>
    </section>

    <!-- ── Ablauf ────────────────────────────────────── -->
    <section class="hsc__steps">
      <div class="hsc__wrap">
        <div class="hsc__head rv">
          <p class="hsc__divider"><span>{{ t('So geht\'s', 'How it works') }}</span></p>
          <h2 class="hsc__h2">{{ t('Der Ablauf – in sechs Schritten', 'The process – in six steps') }}</h2>
          <p class="hsc__sub">{{ t('Von der ersten Besichtigung bis zur Abholung: Wir kümmern uns um alles.', 'From the first viewing to collection: we take care of everything.') }}</p>
        </div>

        <ol class="hsc__timeline">
          <li v-for="(s, i) in steps" :key="s.title" class="hsc__step rv">
            <div class="hsc__node">
              <span class="hsc__num">{{ String(i + 1).padStart(2, '0') }}</span>
            </div>
            <div class="hsc__card">
              <div class="hsc__cardhead">
                <span class="hsc__icon"><WfIcon :name="s.icon" :size="20" /></span>
                <h3>{{ s.title }}</h3>
                <span v-if="s.tag" class="hsc__tag">{{ s.tag }}</span>
              </div>
              <p v-if="s.question" class="hsc__question">{{ t('„', '“') }}{{ s.question }}{{ t('“', '”') }}</p>
              <p>{{ s.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- ── Investition ───────────────────────────────── -->
    <section class="hsc__invest">
      <div class="hsc__wrap hsc__investgrid rv">
        <div class="hsc__stat">
          <span class="hsc__statnum">1 – 2 %</span>
          <span class="hsc__statlabel">{{ t('vom Verkaufspreis', 'of the sale price') }}</span>
          <span class="hsc__statnote">{{ t('inkl. aller Leihmöbel und Accessoires', 'incl. all rental furniture and accessories') }}</span>
        </div>
        <div class="hsc__investtext">
          <p class="hsc__eyebrow hsc__eyebrow--light">{{ t('Kosten & Nutzen', 'Costs & benefits') }}</p>
          <h2 class="hsc__h2 hsc__h2--light">{{ invest.title }}</h2>
          <p>{{ invest.text }}</p>
          <div class="hsc__actions">
            <NuxtLink :to="lp('/home-staging/preise.html')" class="hsc__btn hsc__btn--light">{{ t('Preise ansehen', 'View prices') }}</NuxtLink>
            <NuxtLink :to="lp('/kontakt.html')" class="hsc__btn hsc__btn--outline">{{ t('Beratung anfragen', 'Request a consultation') }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Nutzen ────────────────────────────────────── -->
    <section class="hsc__benefits">
      <div class="hsc__wrap">
        <div class="hsc__head rv">
          <p class="hsc__divider"><span>{{ t('Ihre Vorteile', 'Your benefits') }}</span></p>
          <h2 class="hsc__h2">{{ benefitsTitle }}</h2>
        </div>
        <div class="hsc__bgrid">
          <article v-for="(b, i) in benefits" :key="b.title" class="hsc__benefit rv" :style="{ transitionDelay: `${i * 90}ms` }">
            <span class="hsc__bicon"><WfIcon :name="b.icon" :size="26" /></span>
            <h3>{{ b.title }}</h3>
            <p>{{ b.text }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsc {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  color: var(--ink);
}
.hsc__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }

/* Typo */
.hsc__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.1em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsc__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsc__eyebrow--light { color: #fff; }
.hsc__eyebrow--light::after { background: rgba(255, 255, 255, .6); }
.hsc__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 .9em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsc__divider::before, .hsc__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hsc h1, .hsc h2, .hsc h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; }
.hsc__h1 { font-size: clamp(2.1em, 4vw, 3em); line-height: 1.1; margin: 0 0 .5em; text-align: left; }
.hsc__h2 { font-size: clamp(1.6em, 3vw, 2.2em); line-height: 1.2; margin: 0 0 .4em; text-align: center; }
.hsc__h2--light { color: #fff !important; text-align: left; }
.hsc__h3 { font-size: 1.35em; line-height: 1.3; margin: .5em 0 .8em; text-align: left; }
.hsc__lead { font-family: var(--serif); font-size: 1.3em; line-height: 1.5; margin: 0 0 .8em; color: var(--ink); }
.hsc__text { font-size: 1em; line-height: 1.75; color: var(--muted); margin: 0; }
.hsc__sub { text-align: center; color: var(--muted); margin: 0 auto; max-width: 36em; line-height: 1.6; }
.hsc__head { margin-bottom: 3em; }

/* ── Intro ── */
.hsc__intro { background: var(--cream); padding: 4.5em 0 5em; }
.hsc__introgrid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 4em; align-items: center; margin-bottom: 4em; }
.hsc__collage { position: relative; padding: 0 0 3.5em 3em; }
.hsc__img { display: block; object-fit: cover; border-radius: 14px; }
.hsc__img--main { width: 100%; aspect-ratio: 4 / 3; box-shadow: 0 18px 45px rgba(60, 50, 30, .16); }
.hsc__img--small {
  position: absolute; left: 0; bottom: 0; width: 44%; aspect-ratio: 1 / 1;
  border: 6px solid var(--cream); box-shadow: 0 14px 34px rgba(60, 50, 30, .18);
}
.hsc__badge {
  position: absolute; right: -1em; top: 1.6em;
  background: var(--green); color: #fff; border-radius: 14px; padding: .9em 1.2em;
  display: flex; align-items: center; gap: .8em; box-shadow: 0 12px 30px rgba(47, 93, 64, .35);
}
.hsc__badge strong { font-family: var(--serif); font-size: 1.9em; font-weight: 500; line-height: 1; }
.hsc__badge span { font-size: .78em; line-height: 1.35; opacity: .9; }

.hsc__duo { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6em; }
.hsc__panel {
  background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 2em 2.1em;
  box-shadow: 0 2px 14px rgba(60, 50, 30, .06);
}
.hsc__panel p { line-height: 1.75; color: var(--muted); margin: 0 0 1.2em; }
.hsc__panel--green { background: var(--green-soft); border-color: #d9e5da; }
.hsc__label {
  display: inline-block; font-size: .68em; letter-spacing: .18em; text-transform: uppercase; font-weight: 700;
  color: var(--green); background: var(--green-soft); border-radius: 999px; padding: .45em 1em;
}
.hsc__panel--green .hsc__label { background: #fff; }
.hsc__problems { list-style: none; margin: 0; padding: 0; display: grid; gap: 1em; }
.hsc__problems li { display: flex; gap: .9em; align-items: flex-start; line-height: 1.6; color: var(--muted); }
.hsc__dot {
  flex: none; width: 2.3em; height: 2.3em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--cream); border: 1px solid var(--line); color: var(--green);
}
.hsc__chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .5em; }
.hsc__chips li {
  display: inline-flex; align-items: center; gap: .4em; font-size: .82em; font-weight: 600;
  background: #fff; color: var(--green); border-radius: 999px; padding: .45em .9em; border: 1px solid #d9e5da;
}

/* ── Ablauf ── */
.hsc__steps { background: #fff; padding: 5em 0; }
.hsc .hsc__timeline { display: block; list-style: none; margin: 0 auto; padding: 0; max-width: 920px; position: relative; }
.hsc__timeline::before {
  content: ""; position: absolute; left: 1.9em; top: 1em; bottom: 1em; width: 2px;
  background: linear-gradient(var(--green) 0%, var(--line) 100%);
}
.hsc__step { display: grid; grid-template-columns: 3.8em 1fr; gap: 1.6em; margin-bottom: 1.4em; position: relative; }
.hsc__step:last-child { margin-bottom: 0; }
.hsc__node { display: flex; justify-content: center; padding-top: .9em; }
.hsc__num {
  width: 3.8em; height: 3.8em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: #fff; border: 2px solid var(--green); color: var(--green);
  font-family: var(--serif); font-size: 1em; font-weight: 600; position: relative; z-index: 1;
  transition: background .25s, color .25s;
}
.hsc__step:hover .hsc__num { background: var(--green); color: #fff; }
.hsc__card {
  background: var(--cream); border: 1px solid var(--line); border-radius: 16px; padding: 1.5em 1.8em;
  transition: transform .25s ease, box-shadow .25s ease, background .25s;
}
.hsc__step:hover .hsc__card { background: #fff; transform: translateX(4px); box-shadow: 0 12px 30px rgba(60, 50, 30, .10); }
.hsc__cardhead { display: flex; align-items: center; gap: .8em; flex-wrap: wrap; margin-bottom: .7em; }
.hsc__cardhead h3 { font-size: 1.25em; margin: 0; text-align: left; flex: 1 1 auto; }
.hsc__icon {
  flex: none; width: 2.4em; height: 2.4em; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}
.hsc__tag {
  font-size: .72em; font-weight: 700; letter-spacing: .04em; color: #fff; background: var(--green);
  border-radius: 999px; padding: .4em .9em; white-space: nowrap;
}
.hsc__card p { margin: 0; line-height: 1.75; color: var(--muted); }
.hsc__question {
  font-family: var(--serif); font-style: italic; color: var(--ink) !important;
  border-left: 3px solid var(--green); padding-left: .9em; margin-bottom: .8em !important;
}

/* ── Investition ── */
.hsc__invest {
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%);
  color: #fff; padding: 5em 0; position: relative; overflow: hidden;
}
.hsc__invest::after {
  content: ""; position: absolute; right: -8em; bottom: -8em; width: 26em; height: 26em; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, .12); box-shadow: 0 0 0 3em rgba(255, 255, 255, .03);
  pointer-events: none;
}
.hsc__investgrid { display: grid; grid-template-columns: .8fr 1.2fr; gap: 4em; align-items: center; position: relative; z-index: 1; }
.hsc__stat {
  display: flex; flex-direction: column; align-items: flex-start; gap: .3em;
  border: 1px solid rgba(255, 255, 255, .25); border-radius: 20px; padding: 2.2em 2.4em;
  background: rgba(255, 255, 255, .06); backdrop-filter: blur(2px);
}
.hsc__statnum { font-family: var(--serif); font-size: clamp(3em, 7vw, 4.8em); line-height: 1; font-weight: 500; }
.hsc__statlabel { font-size: 1.15em; font-weight: 600; }
.hsc__statnote { font-size: .85em; opacity: .75; }
.hsc__investtext p { line-height: 1.8; color: rgba(255, 255, 255, .88); margin: 0 0 1.8em; }
.hsc__actions { display: flex; flex-wrap: wrap; gap: .8em; }
.hsc__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px;
  font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, transform .15s;
}
.hsc__btn--light { background: #fff; color: var(--green); }
.hsc__btn--light:hover { background: var(--cream); color: var(--green-dark); transform: translateY(-1px); }
.hsc__btn--outline { border: 1px solid rgba(255, 255, 255, .7); color: #fff; }
.hsc__btn--outline:hover { background: rgba(255, 255, 255, .12); color: #fff; }

/* ── Nutzen ── */
.hsc__benefits { background: var(--cream); padding: 5em 0 5.5em; }
.hsc__bgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6em; }
.hsc__benefit {
  background: #fff; border-radius: 18px; padding: 2.2em 2em 2.2em; position: relative; overflow: hidden;
  box-shadow: 0 2px 14px rgba(60, 50, 30, .07); transition: transform .25s ease, box-shadow .25s ease;
}
.hsc__benefit::before {
  content: ""; position: absolute; left: 0; top: 0; right: 0; height: 4px;
  background: var(--green); transform: scaleX(0); transform-origin: left; transition: transform .35s ease;
}
.hsc__benefit:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hsc__benefit:hover::before { transform: scaleX(1); }
.hsc__bicon {
  width: 3.4em; height: 3.4em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green); margin-bottom: 1.2em;
}
.hsc__benefit h3 { font-size: 1.3em; margin: 0 0 .5em; text-align: left; }
.hsc__benefit p { margin: 0; line-height: 1.7; color: var(--muted); }

/* ── Scroll-Reveal (nur mit JS aktiv) ── */
.hsc.is-anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.hsc.is-anim .rv.is-in { opacity: 1; transform: none; }
.hsc.is-anim .hsc__benefit.rv.is-in:hover { transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 960px) {
  .hsc__introgrid, .hsc__investgrid { grid-template-columns: 1fr; gap: 2.5em; }
  .hsc__duo, .hsc__bgrid { grid-template-columns: 1fr; }
  .hsc__collage { padding: 0 0 2.5em 1.5em; }
  .hsc__badge { right: .5em; }
}
@media (max-width: 600px) {
  .hsc__wrap { padding: 0 1em; }
  .hsc__intro, .hsc__steps, .hsc__invest, .hsc__benefits { padding-top: 3.2em; padding-bottom: 3.2em; }
  .hsc__panel { padding: 1.6em 1.3em; }
  .hsc__timeline::before { left: 1.4em; }
  .hsc__step { grid-template-columns: 2.8em 1fr; gap: .9em; }
  .hsc__num { width: 2.8em; height: 2.8em; font-size: .9em; }
  .hsc__card { padding: 1.2em 1.1em; }
  .hsc__stat { padding: 1.6em 1.6em; }
}
</style>
