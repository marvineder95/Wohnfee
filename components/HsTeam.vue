<script setup lang="ts">
// Teamseite im Design der übrigen Seiten. Die Porträts kommen unverändert aus
// pages.json (Seite 37, Elemente mit cssClass „teamfoto“): <h2> = Name,
// erster Absatz = Einstieg, <blockquote> = Zitate, <h3>Kontakt</h3> + Absatz = Kontakt.
const props = defineProps<{ page: any }>()

const TEAM = '/files/wohnfee/team/'
const els = computed<any[]>(() => props.page.columns?.main || [])
const h1 = computed(() => els.value.find(e => e.type === 'headline')?.headline || props.page.title)

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
// Anführungszeichen am Zitatrand vereinheitlichen (Pflegetext mischt „ … " und „ … “)
const cleanQuote = (q: string) => strip(q).replace(/^[„"“]\s*/, '').replace(/\s*[“"”]\s*\.?$/, '').trim()

const members = computed(() => els.value
  .filter(e => String(e.cssClass || '').includes('teamfoto'))
  .map((e) => {
    let html: string = e.html || ''
    const name = strip(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] || '')
    html = html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, '')

    // Kontaktblock (alles ab <h3>Kontakt</h3>) → Links als Buttons
    const contactIdx = html.search(/<h3[^>]*>\s*Kontakt/i)
    const contactHtml = contactIdx >= 0 ? html.slice(contactIdx) : ''
    if (contactIdx >= 0) html = html.slice(0, contactIdx)
    const contacts = [...contactHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(m => ({ href: m[1], label: strip(m[2]), icon: m[1].startsWith('tel:') ? 'phone' : 'mail' }))

    // Zitate herauslösen
    const quotes = [...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map(m => cleanQuote(m[1]))
    html = html.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/g, '')

    const paras = (html.match(/<p[^>]*>[\s\S]*?<\/p>/g) || []).map(strip).filter(Boolean)
    return {
      id: e.id,
      name,
      first: name.split(' ')[0],
      intro: paras[0] || '',
      bio: paras.slice(1),
      quotes,
      contacts,
      img: asset(e.src)
    }
  }))

// Kennzahlen (Website-Angaben; Einsatzgebiet bewusst offen: eigene Spedition)
const facts = [
  { value: '2011', label: 'gegründet – seitdem inszenieren wir Immobilien' },
  { value: '1 Tag', label: 'für das Staging einer gesamten Immobilie' },
  { value: '80–150', label: 'Teile liefern wir durchschnittlich pro Staging an' },
  { value: 'Flexibel', label: 'standortunabhängig im Einsatz – dank eigener Spedition' }
]

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
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
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
  <div ref="root" class="hst">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hst__hero">
      <div class="hst__inside">
        <div class="hst__intro">
          <p class="hst__eyebrow">Über uns</p>
          <h1 class="hst__h1">{{ h1 }}</h1>
          <p class="hst__lead">
            Seit 2011 inszenieren wir Immobilien – standortunabhängig und flexibel dank eigener Spedition,
            mit Leidenschaft für Raumgestaltung, viel Erfahrung und einem Auge fürs Detail.
          </p>
          <div class="hst__actions">
            <a href="#team" class="hst__btn hst__btn--primary" @click="scrollToId('team', $event)">Team kennenlernen</a>
            <NuxtLink to="/kontakt.html" class="hst__btn hst__btn--ghost">Kontakt aufnehmen</NuxtLink>
          </div>
          <ul class="hst__faces" aria-label="Unser Team">
            <li v-for="m in members" :key="m.id">
              <a :href="`#person-${m.id}`" :title="m.name" @click="scrollToId(`person-${m.id}`, $event)">
                <HsImg :src="m.img" :alt="m.name" sizes="xs:120px sm:120px md:120px lg:120px xl:120px xxl:120px 2xl:120px" />
              </a>
            </li>
            <li class="hst__facestext">{{ members.map(m => m.first).join(' & ') }}<br><small>freuen sich auf Ihr Projekt</small></li>
          </ul>
        </div>
        <figure class="hst__heroimg">
          <HsImg :src="TEAM + 'Wohn.Fee Brandingfotos_23-18.jpg'" alt="Das WOHNFEE Team bei der Planung im Showroom"
                 sizes="xs:100vw sm:100vw md:60vw lg:720px xl:720px xxl:720px 2xl:720px" loading="eager" fetchpriority="high" />
        </figure>
      </div>
      <a href="#team" class="hst__cue" @click="scrollToId('team', $event)">
        Das Team
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </a>
    </section>

    <!-- ── Porträts ─────────────────────────────────── -->
    <section id="team" class="hst__team">
      <article v-for="(m, i) in members" :id="`person-${m.id}`" :key="m.id"
               class="hst__wrap hst__person rv" :class="{ 'is-rev': i % 2 === 1 }">
        <figure class="hst__portrait">
          <HsImg :src="m.img" :alt="`Porträt von ${m.name}`"
                 sizes="xs:100vw sm:100vw md:50vw lg:520px xl:520px xxl:520px 2xl:520px" />
          <figcaption>
            <strong>{{ m.name }}</strong>
            <span>WOHNFEE Team</span>
          </figcaption>
        </figure>

        <div class="hst__text">
          <span class="hst__num">{{ String(i + 1).padStart(2, '0') }}</span>
          <h2 class="hst__name">{{ m.name }}</h2>
          <p class="hst__introtext">{{ m.intro }}</p>

          <blockquote v-if="m.quotes[0]" class="hst__quote">
            <p>{{ m.quotes[0] }}</p>
            <span class="hst__qby">– {{ m.first }}</span>
          </blockquote>

          <p v-for="(b, j) in m.bio" :key="j" class="hst__bio">{{ b }}</p>

          <blockquote v-for="(q, j) in m.quotes.slice(1)" :key="'q' + j" class="hst__quote hst__quote--light">
            <p>{{ q }}</p>
            <span class="hst__qby">– {{ m.first }}</span>
          </blockquote>

          <div v-if="m.contacts.length" class="hst__contacts">
            <a v-for="c in m.contacts" :key="c.href" :href="c.href" class="hst__contact">
              <WfIcon :name="c.icon" :size="16" /> {{ c.label }}
            </a>
          </div>
        </div>
      </article>
    </section>

    <!-- ── Zahlen ───────────────────────────────────── -->
    <section class="hst__facts">
      <div class="hst__wrap">
        <p class="hst__divider rv"><span>WOHNFEE in Zahlen</span></p>
        <ul class="hst__fgrid">
          <li v-for="(f, i) in facts" :key="f.value" class="rv" :style="{ transitionDelay: `${i * 80}ms` }">
            <strong>{{ f.value }}</strong>
            <span>{{ f.label }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Kontakt ──────────────────────────────────── -->
    <section class="hst__cta">
      <div class="hst__wrap">
        <div class="hst__ctabox rv">
          <figure class="hst__ctaimg">
            <HsImg :src="TEAM + 'sharpen_WohnFee_Brandingfotos_23-22.jpg'" alt="Das WOHNFEE Team mit bunten Kissen"
                   sizes="xs:100vw sm:100vw md:50vw lg:600px xl:600px xxl:600px 2xl:600px" />
          </figure>
          <div class="hst__ctatext">
            <p class="hst__eyebrow hst__eyebrow--light">Persönlich für Sie da</p>
            <h2 class="hst__h2">Lernen wir uns kennen</h2>
            <p>Erzählen Sie uns von Ihrer Immobilie – wir beraten Sie gerne persönlich und finden die passende Lösung.</p>
            <div class="hst__actions">
              <NuxtLink to="/kontakt.html" class="hst__btn hst__btn--light">Beratung anfragen</NuxtLink>
              <a href="tel:+436769202236" class="hst__btn hst__btn--outline">+43 676 9202236</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hst {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hst__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hst h1, .hst h2, .hst h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; text-transform: none; }

.hst__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.2em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hst__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hst__eyebrow--light { color: #fff; }
.hst__eyebrow--light::after { background: rgba(255, 255, 255, .6); }
.hst__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 2.2em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hst__divider::before, .hst__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hst__h1 { font-size: clamp(2.4em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .45em; }
.hst__h2 { font-size: clamp(1.6em, 3vw, 2.2em) !important; line-height: 1.2; margin: 0 0 .5em; }
.hst__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0 0 1.8em; }

.hst__actions { display: flex; flex-wrap: wrap; gap: .8em; }
.hst__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px;
  font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hst__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hst__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hst__btn--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border: 1px solid var(--ink); }
.hst__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.hst__btn--light { background: #fff; color: var(--green); }
.hst__btn--light:hover { background: var(--cream); color: var(--green-dark); }
.hst__btn--outline { border: 1px solid rgba(255, 255, 255, .7); color: #fff; }
.hst__btn--outline:hover { background: rgba(255, 255, 255, .12); color: #fff; }

/* ── Hero ── */
.hst__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(600px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(600px, calc(100svh - var(--hs-head, 108px)));
  background: radial-gradient(circle at 85% 30%, #efe9dc 0%, var(--cream) 55%);
}
.hst__inside {
  position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 3em 1.5em 5em; box-sizing: border-box;
  display: grid; grid-template-columns: .9fr 1.1fr; gap: 4em; align-items: center;
}
.hst__intro > * { max-width: 32rem; }
.hst__heroimg { position: relative; margin: 0; isolation: isolate; }
.hst__heroimg :deep(img) {
  width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; border-radius: 26px;
  box-shadow: 0 26px 60px rgba(60, 50, 30, .2);
}
.hst__heroimg::before {
  content: ""; position: absolute; inset: 1.6em -1.6em -1.6em 1.6em; z-index: -1; border: 1px solid #cfd9cf; border-radius: 26px;
}

.hst__faces { list-style: none; margin: 2.2em 0 0; padding: 0; display: flex; align-items: center; }
.hst__faces li a { display: block; width: 3.4em; height: 3.4em; border-radius: 50%; overflow: hidden; border: 3px solid var(--cream); margin-right: -.7em; box-shadow: 0 4px 12px rgba(60, 50, 30, .15); transition: transform .2s; }
.hst__faces li a:hover { transform: translateY(-3px); z-index: 1; position: relative; }
.hst__faces :deep(img) { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; display: block; transform: scale(2.3); transform-origin: 50% 14%; }
.hst__facestext { margin-left: 1.5em; font-family: var(--serif); font-size: 1.05em; line-height: 1.3; }
.hst__facestext small { font-family: var(--font-family-01, 'Open Sans', sans-serif); font-size: .78em; color: var(--muted); }

.hst__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em;
  font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); text-decoration: none;
}
.hst__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.hst__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: hst-bob 1.8s ease-in-out infinite; }
.hst__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes hst-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }

/* ── Porträts ── */
.hst__team { background: #fff; padding: 5em 0 2em; }
.hst__person { display: grid; grid-template-columns: .85fr 1.15fr; gap: 4.5em; align-items: start; margin-bottom: 6em; }
.hst__person.is-rev .hst__portrait { order: 2; }
.hst__person.is-rev .hst__text { order: 1; }
.hst__portrait { position: sticky; top: calc(var(--hs-head, 108px) + 2em); margin: 0; isolation: isolate; }
.hst__portrait :deep(img) {
  width: 100%; aspect-ratio: 4 / 5; object-fit: cover; object-position: 50% 20%; display: block; border-radius: 22px;
  box-shadow: 0 22px 50px rgba(60, 50, 30, .16);
}
.hst__portrait::before {
  content: ""; position: absolute; inset: -1.4em 1.4em 1.4em -1.4em; z-index: -1; border-radius: 22px; background: var(--green-soft);
}
.hst__person.is-rev .hst__portrait::before { inset: -1.4em -1.4em 1.4em 1.4em; }
.hst__portrait figcaption {
  position: absolute; left: 1.2em; bottom: 1.2em; display: grid; gap: .1em;
  background: rgba(255, 255, 255, .92); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  border-radius: 14px; padding: .7em 1.1em; box-shadow: 0 8px 22px rgba(60, 50, 30, .12);
}
.hst__portrait figcaption strong { font-family: var(--serif); font-weight: 500; font-size: 1.1em; }
.hst__portrait figcaption span { font-size: .72em; letter-spacing: .14em; text-transform: uppercase; color: var(--green); font-weight: 700; }

.hst__num { display: block; font-family: var(--serif); font-size: 3.2em; line-height: 1; color: transparent; -webkit-text-stroke: 1px #b9c9bc; margin-bottom: .2em; }
.hst__name { font-size: clamp(1.9em, 3.5vw, 2.6em) !important; line-height: 1.1; margin: 0 0 .5em; }
.hst__introtext { font-family: var(--serif); font-size: 1.2em; line-height: 1.6; color: var(--ink); margin: 0 0 1.4em; }
.hst__bio { line-height: 1.85; color: var(--muted); margin: 0 0 1.2em; }
.hst__quote {
  position: relative; margin: 1.6em 0; padding: 1.5em 1.6em 1.3em 3.6em; border-radius: 18px;
  background: var(--green); color: #fff; box-shadow: 0 14px 34px rgba(47, 93, 64, .25);
}
.hst__quote::before {
  content: "\201C"; position: absolute; left: .35em; top: .05em; font-family: var(--serif); font-size: 4em; line-height: 1;
  color: rgba(255, 255, 255, .35);
}
.hst__quote p { margin: 0 0 .6em; font-family: var(--serif); font-size: 1.15em; line-height: 1.55; color: #fff; }
.hst__quote, .hst__quote p { text-align: left !important; font-style: normal; }
.hst__qby { display: block; font-size: .8em; letter-spacing: .08em; color: rgba(255, 255, 255, .75); }
.hst__quote--light { background: var(--cream); color: var(--ink); box-shadow: none; border: 1px solid var(--line); }
.hst__quote--light::before { color: #b9c9bc; }
.hst__quote--light p { color: var(--ink); }
.hst__quote--light .hst__qby { color: var(--muted); }
.hst__contacts { display: flex; flex-wrap: wrap; gap: .6em; margin-top: 1.8em; }
.hst__contact {
  display: inline-flex; align-items: center; gap: .55em; padding: .7em 1.2em; border-radius: 999px;
  border: 1px solid var(--line); background: var(--cream); color: var(--ink); text-decoration: none; font-weight: 600; font-size: .9em;
  transition: background .15s, color .15s, border-color .15s;
}
.hst__contact :deep(svg) { color: var(--green); }
.hst__contact:hover { background: var(--green); border-color: var(--green); color: #fff; }
.hst__contact:hover :deep(svg) { color: #fff; }

/* ── Zahlen ── */
.hst__facts { padding: 4.5em 0; }
.hst__fgrid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.3em; }
.hst__fgrid li {
  display: flex; flex-direction: column; gap: .45em; padding: 1.6em 1.5em; border-radius: 20px; background: #fff;
  border: 1px solid var(--line); transition: transform .25s, box-shadow .25s;
}
.hst__fgrid li:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(60, 50, 30, .1); }
.hst__fgrid strong { font-family: var(--serif); font-weight: 500; font-size: 2.6em; line-height: 1; color: var(--green); }
.hst__fgrid span { font-size: .9em; line-height: 1.5; color: var(--muted); }

/* ── Kontakt ── */
.hst__cta { padding: 0 0 5em; }
.hst__ctabox {
  display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; border-radius: 26px;
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%); color: #fff;
}
.hst__ctaimg { margin: 0; min-height: 100%; }
.hst__ctaimg :deep(img) { width: 100%; height: 100%; min-height: 320px; object-fit: cover; display: block; }
.hst__ctatext { padding: 3em 3em 3.2em; display: flex; flex-direction: column; justify-content: center; }
.hst__ctatext .hst__h2 { color: #fff !important; }
.hst__ctatext > p:not(.hst__eyebrow) { line-height: 1.75; color: rgba(255, 255, 255, .86); margin: 0 0 1.8em; }

/* ── Reveal ── */
.hst.is-anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.hst.is-anim .rv.is-in { opacity: 1; transform: none; }
.hst.is-anim .hst__fgrid li.rv.is-in:hover { transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 960px) {
  .hst__hero { min-height: 0; }
  .hst__inside { grid-template-columns: 1fr; gap: 2.2em; padding: 2.5em 1em 3em; }
  .hst__heroimg { order: -1; }
  .hst__heroimg::before { display: none; }
  .hst__cue { display: none; }
  .hst__person, .hst__ctabox { grid-template-columns: 1fr; gap: 2.5em; }
  .hst__person.is-rev .hst__portrait, .hst__person .hst__portrait { order: 0; position: relative; top: 0; max-width: 460px; }
  .hst__person.is-rev .hst__text { order: 1; }
  .hst__portrait::before { display: none; }
  .hst__fgrid { grid-template-columns: 1fr 1fr; }
  .hst__ctatext { padding: 2.2em 1.6em 2.4em; }
}
@media (max-width: 600px) {
  .hst__wrap { padding: 0 1em; }
  .hst__team { padding-top: 3.2em; }
  .hst__person { margin-bottom: 4em; }
  .hst__quote { padding: 1.2em 1.2em 1.1em 2.8em; }
  .hst__facts { padding: 3.2em 0; }
}
@media (prefers-reduced-motion: reduce) { .hst__cue svg { animation: none; } }
</style>
