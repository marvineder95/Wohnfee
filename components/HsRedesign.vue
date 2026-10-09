<script setup lang="ts">
// Redesign-Seite im Design der Home-Staging-Seiten. Alle Inhalte kommen aus
// pages.json (Seite 4) und werden nur neu angeordnet:
//   Headline-Element        → H1 im Hero (Lead = Seitenbeschreibung)
//   Slider-Bilder           → Bildstrecke „Von der Skizze zum Wohngefühl“
//   Textblöcke (ohne icon_list) → Bild/Text-Sektionen, <h3> darin = Zitat
//   icon_list-Elemente      → Ablauf-Schritte; „no_icon“ = Investitions-Band
//   Newslist                → Trends als Kartenraster
const props = defineProps<{ page: any }>()
const { news } = useSiteData()

const IMG = '/files/wohnfee/bilder/redesign/'
const els = computed<any[]>(() => props.page.columns?.main || [])
const strip = (h: string) => h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

const h1 = computed(() => els.value.find(e => e.type === 'headline')?.headline || props.page.title)
const lead = computed(() => (props.page.description || '').replace(/\s+-\s+/g, ' – '))

// Bildstrecke aus dem bisherigen Slider
const gallery = computed(() => (props.page.columns?.slider?.[0]?.items || [])
  .map((i: any) => ({ src: asset(i.src), alt: i.alt || '', caption: i.caption || '' })))

// Textblöcke: führendes <h3> als Zitat herauslösen, leere Absätze entfernen
const blocks = computed(() => els.value
  .filter(e => e.type === 'text' && !String(e.cssClass || '').includes('icon_list'))
  .map((e) => {
    let html: string = e.html || ''
    const m = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
    const quote = m ? strip(m[1]) : ''
    if (m) html = html.replace(m[0], '')
    html = html.replace(/<p>\s*(&nbsp;| )?\s*<\/p>/g, '')
    return { id: e.id, title: e.headline, html, quote }
  }))
const blockImg = [IMG + 'Redesign4_JUZI.jpg', IMG + 'XT200240.JPG']

// Ablauf
const stepsTitle = computed(() => {
  const h = els.value.find(e => e.type === 'headline' && /ablauf/i.test(e.headline))?.headline || 'Der Ablauf'
  return h.replace(/'\s+s\b/g, '’s').replace(/\s+-\s+/g, ' – ')
})
const STEP_ICONS = ['phone', 'edit', 'truck', 'calendar']
const steps = computed(() => els.value
  .filter(e => String(e.cssClass || '').includes('icon_list') && !String(e.cssClass || '').includes('no_icon'))
  .map((e, i) => {
    const m = (e.html || '').match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
    const title = m ? strip(m[1]).replace(/^\d+\.\s*/, '') : ''
    const text = strip((e.html || '').replace(m?.[0] || '', ''))
    return { id: e.id, title, text, icon: STEP_ICONS[i] || 'check' }
  }))

// Investitions-Band
const invest = computed(() => {
  const e = els.value.find(x => String(x.cssClass || '').includes('no_icon'))
  if (!e) return null
  const m = (e.html || '').match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
  return {
    title: m ? strip(m[1]).replace(/Investition die/, 'Investition, die') : '',
    html: (e.html || '').replace(m?.[0] || '', '')
  }
})

// Trends (gleiche Auswahl wie das bisherige Newslist-Modul)
const trendsTitle = computed(() => els.value.find(e => e.type === 'headline' && /trend/i.test(e.headline))?.headline || 'Trends')
const trends = computed(() => {
  const el = els.value.find(e => e.type === 'newslist')
  if (!el) return []
  return Object.values(news as Record<string, any>)
    .filter((n: any) => el.archives?.includes(n.archive))
    .filter((n: any) => !el.category || (n.categories || []).map(String).includes(String(el.category)))
    .sort((a: any, b: any) => Number(b.date) - Number(a.date))
    .slice(0, 3)
})
const teaser = (n: any) => {
  const t = strip(n.teaser || '')
  return t.length > 150 ? t.slice(0, 150).replace(/\s+\S*$/, '') + ' …' : t
}

// Bildstrecke per Pfeil verschieben
const stripEl = ref<HTMLElement | null>(null)
const slide = (dir: number) => {
  const el = stripEl.value
  if (!el) return
  const card = el.querySelector<HTMLElement>('.hsr__frame')
  el.scrollBy({ left: dir * ((card?.offsetWidth || 400) + 20), behavior: 'smooth' })
}

// Hero-Höhe + Reveal
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}
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

function scrollToId(id: string, e: Event) {
  e.preventDefault()
  const t = document.getElementById(id)
  if (!t) return
  const off = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight || 108
  window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' })
}
</script>

<template>
  <div ref="root" class="hsr">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hsr__hero">
      <NuxtImg class="hsr__bg" :src="IMG + 'Ferienapartment-0008.jpg'" alt="Neu gestalteter Wohn- und Essbereich nach einem WOHNFEE Redesign"
               sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:1600px 2xl:1920px"
               loading="eager" fetchpriority="high" />
      <div class="hsr__inside">
        <p class="hsr__eyebrow">Interior Redesign</p>
        <h1 class="hsr__h1">{{ h1 }}</h1>
        <p class="hsr__lead">{{ lead }}</p>
        <div class="hsr__actions">
          <NuxtLink to="/kontakt.html" class="hsr__btn hsr__btn--primary">Jetzt Beratung anfragen</NuxtLink>
          <a href="#ablauf" class="hsr__btn hsr__btn--ghost" @click="scrollToId('ablauf', $event)">Zum Ablauf</a>
        </div>
      </div>
      <a href="#skizze" class="hsr__cue" @click="scrollToId('skizze', $event)">
        Mehr entdecken
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </a>
    </section>

    <!-- ── Bildstrecke ──────────────────────────────── -->
    <section v-if="gallery.length" id="skizze" class="hsr__journey">
      <div class="hsr__wrap hsr__jhead rv">
        <div>
          <p class="hsr__divider hsr__divider--left"><span>Von der Skizze zum Wohngefühl</span></p>
          <p class="hsr__jsteps">
            <template v-for="(g, i) in gallery" :key="g.src">
              <span>{{ g.caption }}</span><em v-if="i < gallery.length - 1">→</em>
            </template>
          </p>
        </div>
        <div class="hsr__arrows">
          <button type="button" aria-label="Zurück" @click="slide(-1)"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
          <button type="button" aria-label="Weiter" @click="slide(1)"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg></button>
        </div>
      </div>
      <div ref="stripEl" class="hsr__strip">
        <figure v-for="(g, i) in gallery" :key="g.src" class="hsr__frame">
          <NuxtImg :src="g.src" :alt="g.alt" loading="lazy"
                   sizes="xs:90vw sm:80vw md:60vw lg:560px xl:560px xxl:560px 2xl:560px" />
          <figcaption>
            <span class="hsr__fnum">{{ String(i + 1).padStart(2, '0') }}</span>
            {{ g.caption }}
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- ── Textblöcke ───────────────────────────────── -->
    <section class="hsr__content">
      <div v-for="(b, i) in blocks" :key="b.id" class="hsr__wrap hsr__block rv" :class="{ 'is-rev': i % 2 === 1 }">
        <div class="hsr__text">
          <h2 class="hsr__h2">{{ b.title }}</h2>
          <div class="hsr__rte" v-html="b.html" />
        </div>
        <div class="hsr__mediawrap">
          <figure class="hsr__media">
            <NuxtImg :src="blockImg[i] || blockImg[0]" alt="" loading="lazy"
                     sizes="xs:100vw sm:100vw md:50vw lg:600px xl:600px xxl:600px 2xl:600px" />
          </figure>
          <blockquote v-if="b.quote" class="hsr__quote">{{ b.quote }}</blockquote>
        </div>
      </div>
    </section>

    <!-- ── Ablauf ───────────────────────────────────── -->
    <section v-if="steps.length" id="ablauf" class="hsr__steps">
      <div class="hsr__wrap">
        <div class="hsr__head rv">
          <p class="hsr__divider"><span>In {{ steps.length === 4 ? 'vier' : steps.length }} Schritten</span></p>
          <h2 class="hsr__h2 hsr__h2--center">{{ stepsTitle }}</h2>
        </div>
        <ol class="hsr__sgrid">
          <li v-for="(s, i) in steps" :key="s.id" class="hsr__step rv" :style="{ transitionDelay: `${i * 90}ms` }">
            <div class="hsr__stop">
              <span class="hsr__snum">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="hsr__sicon"><WfIcon :name="s.icon" :size="20" /></span>
            </div>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ── Investition ──────────────────────────────── -->
    <section v-if="invest" class="hsr__invest">
      <div class="hsr__wrap hsr__igrid rv">
        <div class="hsr__iicon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2" /></svg>
          <span>Zeit gewonnen</span>
        </div>
        <div>
          <p class="hsr__eyebrow hsr__eyebrow--light">Kosten &amp; Nutzen</p>
          <h2 class="hsr__h2 hsr__h2--light">{{ invest.title }}</h2>
          <div class="hsr__itext" v-html="invest.html" />
          <div class="hsr__actions">
            <NuxtLink to="/kontakt.html" class="hsr__btn hsr__btn--light">Beratung anfragen</NuxtLink>
            <a href="tel:+436769202236" class="hsr__btn hsr__btn--outline">+43 676 9202236</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Trends ───────────────────────────────────── -->
    <section v-if="trends.length" class="hsr__trends">
      <div class="hsr__wrap">
        <div class="hsr__head hsr__thead rv">
          <div>
            <p class="hsr__divider hsr__divider--left"><span>Inspiration</span></p>
            <h2 class="hsr__h2">{{ trendsTitle }}</h2>
          </div>
          <NuxtLink to="/trends-tipps.html" class="hsr__more">Alle Trends &amp; Tipps <WfIcon name="arrow" :size="15" /></NuxtLink>
        </div>
        <div class="hsr__tgrid">
          <NuxtLink v-for="(n, i) in trends" :key="n.route" :to="n.route" class="hsr__trend rv"
                    :style="{ transitionDelay: `${i * 90}ms` }">
            <div class="hsr__timg">
              <NuxtImg v-if="n.image" :src="asset(n.image)" :alt="n.imageAlt || n.headline" loading="lazy"
                       sizes="xs:100vw sm:100vw md:50vw lg:400px xl:400px xxl:400px 2xl:400px" />
            </div>
            <div class="hsr__tbody">
              <h3>{{ n.headline }}</h3>
              <p>{{ teaser(n) }}</p>
              <span class="hsr__tlink">Weiterlesen <WfIcon name="arrow" :size="14" /></span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsr {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsr__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsr h1, .hsr h2, .hsr h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; }

/* Typo-Bausteine */
.hsr__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.3em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsr__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsr__eyebrow--light { color: #fff; }
.hsr__eyebrow--light::after { background: rgba(255, 255, 255, .6); }
.hsr__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 .9em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsr__divider::before, .hsr__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hsr__divider--left { justify-content: flex-start; }
.hsr__divider--left::before { display: none; }
.hsr__h1 { font-size: clamp(2.4em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .45em; }
.hsr__h2 { font-size: clamp(1.6em, 3vw, 2.2em) !important; line-height: 1.2; margin: 0 0 .6em; }
.hsr__h2--center { text-align: center !important; }
.hsr__h2--light { color: #fff !important; }
.hsr__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0 0 1.8em; }
.hsr__head { margin-bottom: 2.6em; }

.hsr__actions { display: flex; flex-wrap: wrap; gap: .8em; }
.hsr__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px;
  font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hsr__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hsr__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hsr__btn--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border: 1px solid var(--ink); }
.hsr__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.hsr__btn--light { background: #fff; color: var(--green); }
.hsr__btn--light:hover { background: var(--cream); color: var(--green-dark); }
.hsr__btn--outline { border: 1px solid rgba(255, 255, 255, .7); color: #fff; }
.hsr__btn--outline:hover { background: rgba(255, 255, 255, .12); color: #fff; }

/* ── Hero ── */
.hsr__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(560px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(560px, calc(100svh - var(--hs-head, 108px)));
}
.hsr__bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 65% 55%; }
.hsr__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(248, 245, 239, .97) 0%, rgba(248, 245, 239, .9) 32%,
      rgba(248, 245, 239, .5) 50%, rgba(248, 245, 239, 0) 66%),
    linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, 0) 16%);
}
.hsr__inside { position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 4em 1.5em 5em; box-sizing: border-box; }
.hsr__inside > * { max-width: 33rem; }
.hsr__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em;
  font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); text-decoration: none;
}
.hsr__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.hsr__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: hsr-bob 1.8s ease-in-out infinite; }
.hsr__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes hsr-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }

/* ── Bildstrecke ── */
.hsr__journey { padding: 4em 0 4.5em; overflow: hidden; }
.hsr__jhead { display: flex; align-items: flex-end; justify-content: space-between; gap: 2em; margin-bottom: 1.8em; }
.hsr__jsteps { margin: 0; font-family: var(--serif); font-size: clamp(1.15em, 2vw, 1.45em); line-height: 1.6; color: var(--ink); max-width: 46em; }
.hsr__jsteps em { font-style: normal; color: var(--green); margin: 0 .45em; }
.hsr__arrows { display: flex; gap: .5em; flex: none; }
.hsr__arrows button {
  width: 2.9em; height: 2.9em; border-radius: 50%; border: 1px solid var(--ink); background: #fff; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; color: var(--ink); transition: background .15s, color .15s, border-color .15s;
}
.hsr__arrows button:hover { background: var(--green); border-color: var(--green); color: #fff; }
.hsr__arrows svg { width: 1.2em; height: 1.2em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hsr__strip {
  display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
  padding: .5em max(1.5em, calc((100vw - 1240px) / 2 + 1.5em)) 1em;
  scroll-padding-left: max(1.5em, calc((100vw - 1240px) / 2 + 1.5em));
}
.hsr__strip::-webkit-scrollbar { display: none; }
.hsr__frame {
  flex: 0 0 min(560px, 82vw); margin: 0; scroll-snap-align: start;
  background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid var(--line);
  box-shadow: 0 6px 22px rgba(60, 50, 30, .08); transition: transform .3s ease, box-shadow .3s ease;
}
.hsr__frame:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(60, 50, 30, .14); }
.hsr__frame img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; }
.hsr__frame figcaption {
  display: flex; align-items: center; gap: .8em; padding: 1em 1.2em 1.1em;
  font-family: var(--serif); font-size: 1.1em; color: var(--ink);
}
.hsr__fnum {
  flex: none; width: 2.3em; height: 2.3em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green); font-size: .75em; font-weight: 700; font-family: var(--font-family-01, 'Open Sans', sans-serif);
}

/* ── Textblöcke ── */
.hsr__content { background: #fff; padding: 5em 0 1em; }
.hsr__block { display: grid; grid-template-columns: 1fr 1fr; gap: 4.5em; align-items: center; margin-bottom: 5em; }
.hsr__block.is-rev .hsr__text { order: 2; }
.hsr__block.is-rev .hsr__mediawrap { order: 1; }
.hsr__rte :deep(p) { line-height: 1.8; color: var(--muted); margin: 0 0 1em; }
.hsr__rte :deep(p:last-child) { margin-bottom: 0; }
.hsr__rte :deep(strong) { color: var(--ink); }
.hsr__mediawrap { position: relative; padding-bottom: 2.5em; }
.hsr__media { margin: 0; }
.hsr__media img {
  width: 100%; aspect-ratio: 5 / 4; object-fit: cover; display: block; border-radius: 18px;
  box-shadow: 0 18px 45px rgba(60, 50, 30, .16);
}
.hsr__quote {
  position: absolute; left: -2em; right: 3em; bottom: 0; margin: 0;
  background: var(--green); color: #fff; border-radius: 16px; padding: 1.2em 1.4em 1.2em 3.4em;
  font-family: var(--serif); font-size: 1.25em; line-height: 1.4; box-shadow: 0 14px 34px rgba(47, 93, 64, .3);
}
.hsr__quote::before {
  content: "\201C"; position: absolute; left: .45em; top: .05em; font-size: 2.8em; line-height: 1; color: rgba(255, 255, 255, .45);
}
.hsr__block.is-rev .hsr__quote { left: 3em; right: -2em; }

/* ── Ablauf ── */
.hsr__steps { padding: 5em 0; }
.hsr .hsr__sgrid {
  list-style: none; margin: 0 auto; padding: 0; max-width: 1040px;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.4em;
}
.hsr__step {
  position: relative; background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 1.6em 1.8em 1.8em;
  transition: transform .25s ease, box-shadow .25s ease;
}
.hsr__step:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hsr__stop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1em; }
.hsr__snum {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green); color: #fff; font-family: var(--serif); font-weight: 600; font-size: .95em;
  box-shadow: 0 0 0 6px var(--cream);
}
.hsr__sicon {
  width: 2.5em; height: 2.5em; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}
.hsr__step h3 { font-size: 1.2em; line-height: 1.3; margin: 0 0 .6em; }
.hsr__step p { margin: 0; font-size: .9em; line-height: 1.7; color: var(--muted); }

/* ── Investition ── */
.hsr__invest {
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%);
  color: #fff; padding: 5em 0; position: relative; overflow: hidden;
}
.hsr__invest::after {
  content: ""; position: absolute; right: -8em; bottom: -8em; width: 26em; height: 26em; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, .12); box-shadow: 0 0 0 3em rgba(255, 255, 255, .03); pointer-events: none;
}
.hsr__igrid { display: grid; grid-template-columns: .55fr 1.45fr; gap: 4em; align-items: center; position: relative; z-index: 1; }
.hsr__iicon {
  aspect-ratio: 1; border-radius: 50%; border: 1px solid rgba(255, 255, 255, .25); background: rgba(255, 255, 255, .06);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .8em; max-width: 260px;
}
.hsr__iicon svg { width: 34%; height: auto; fill: none; stroke: #fff; stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.hsr__iicon span { font-family: var(--serif); font-size: 1.3em; }
.hsr__itext :deep(p) { line-height: 1.8; color: rgba(255, 255, 255, .88); margin: 0 0 1.8em; }

/* ── Trends ── */
.hsr__trends { padding: 5em 0 5.5em; }
.hsr__thead { display: flex; align-items: flex-end; justify-content: space-between; gap: 2em; }
.hsr__thead .hsr__h2 { margin: 0; }
.hsr__more {
  display: inline-flex; align-items: center; gap: .5em; color: var(--green); font-weight: 600; text-decoration: none;
  border-bottom: 1px solid #b9c9bc; padding-bottom: 2px; white-space: nowrap;
}
.hsr__more:hover { border-color: var(--green); }
.hsr__tgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5em; }
.hsr__trend {
  display: flex; flex-direction: column; background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid var(--line);
  text-decoration: none; color: var(--ink); transition: transform .25s ease, box-shadow .25s ease;
}
.hsr__trend:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hsr__timg { aspect-ratio: 4 / 3; overflow: hidden; background: var(--line); }
.hsr__timg img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
.hsr__trend:hover .hsr__timg img { transform: scale(1.05); }
.hsr__tbody { padding: 1.2em 1.3em 1.4em; display: flex; flex-direction: column; flex: 1; }
.hsr__tbody h3 { font-size: 1.15em; line-height: 1.35; margin: 0 0 .5em; }
.hsr__tbody p { margin: 0 0 1em; font-size: .88em; line-height: 1.65; color: var(--muted); }
.hsr__tlink { margin-top: auto; display: inline-flex; align-items: center; gap: .4em; color: var(--green); font-weight: 600; font-size: .85em; }

/* ── Reveal ── */
.hsr.is-anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.hsr.is-anim .rv.is-in { opacity: 1; transform: none; }
.hsr.is-anim .hsr__step.rv.is-in:hover, .hsr.is-anim .hsr__trend.rv.is-in:hover { transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 960px) {
  .hsr__hero { min-height: 0; align-items: flex-end; }
  .hsr__bg { height: 20em; }
  .hsr__hero::after {
    inset: 0 0 auto 0; height: 20em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .85) 30%, rgba(248, 245, 239, 0) 65%);
  }
  .hsr__inside { padding: 13em 1em 2.5em; }
  .hsr__cue { display: none; }
  .hsr__block, .hsr__igrid { grid-template-columns: 1fr; gap: 2.5em; }
  .hsr__block.is-rev .hsr__text, .hsr__block .hsr__text { order: 1; }
  .hsr__block.is-rev .hsr__mediawrap, .hsr__block .hsr__mediawrap { order: 2; }
  .hsr__quote, .hsr__block.is-rev .hsr__quote { left: 1em; right: 1em; }
  .hsr__iicon { max-width: 180px; }
  .hsr__tgrid { grid-template-columns: 1fr 1fr; }
  .hsr__jhead { align-items: flex-start; flex-direction: column; }
  .hsr__arrows { display: none; }
}
@media (max-width: 600px) {
  .hsr__wrap { padding: 0 1em; }
  .hsr .hsr__sgrid, .hsr__tgrid { grid-template-columns: 1fr; }
  .hsr__thead { flex-direction: column; align-items: flex-start; }
  .hsr__journey, .hsr__steps, .hsr__invest, .hsr__trends { padding: 3.2em 0; }
  .hsr__content { padding-top: 3.2em; }
  .hsr__strip { padding-left: 1em; padding-right: 1em; scroll-padding-left: 1em; }
  .hsr__quote { font-size: 1.05em; }
}
@media (prefers-reduced-motion: reduce) { .hsr__cue svg { animation: none; } }
</style>
