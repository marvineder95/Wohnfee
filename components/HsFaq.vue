<script setup lang="ts">
// FAQ-Seite im Design der Home-Staging-Seiten. Fragen/Antworten kommen aus
// pages.json (Seite 31, Accordion-Element; je Eintrag headline = Frage,
// html = Antwort, category = Rubrik). Live-Suche, Rubriken-Navigation,
// Deep-Links (#faq-n) und FAQPage-Strukturdaten für Google.
const props = defineProps<{ page: any }>()

const els = computed<any[]>(() => props.page.columns?.main || [])
const title = computed(() => els.value.find(e => e.type === 'headline')?.headline || props.page.title)
const items = computed<any[]>(() => (els.value.find(e => e.type === 'accordion')?.children || [])
  .filter((c: any) => c.headline))

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// ── Suche ──
const query = ref('')
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const filtered = computed(() => {
  const q = norm(query.value.trim())
  if (!q) return items.value
  return items.value.filter(i => norm(i.headline + ' ' + strip(i.html)).includes(q))
})

// ── Rubriken (Reihenfolge wie in den Daten) ──
const categories = computed(() => {
  const order: string[] = []
  for (const i of items.value) {
    const c = i.category || 'Allgemein'
    if (!order.includes(c)) order.push(c)
  }
  return order
})
const groups = computed(() => categories.value
  .map(c => ({ name: c, slug: 'rubrik-' + norm(c).replace(/[^a-z0-9]+/g, '-'), items: filtered.value.filter(i => (i.category || 'Allgemein') === c) }))
  .filter(g => g.items.length))
const countFor = (c: string) => filtered.value.filter(i => (i.category || 'Allgemein') === c).length

// ── Akkordeon ──
const open = ref<Set<string>>(new Set(items.value[0] ? [items.value[0].id] : []))
const toggle = (id: string) => {
  const s = new Set(open.value)
  s.has(id) ? s.delete(id) : s.add(id)
  open.value = s
}
// Bei aktiver Suche alle Treffer aufklappen
const isOpen = (id: string) => !!query.value.trim() || open.value.has(id)

// ── Scrollen / Deep-Links ──
const headOffset = () => (document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight || 108) + 16
function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headOffset(), behavior: 'smooth' })
}
const activeCat = ref('')
function jump(slug: string, e: Event) {
  e.preventDefault()
  activeCat.value = slug
  scrollToId(slug)
}

// ── Hero-Höhe, Scroll-Spy, Reveal ──
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}
let spy: IntersectionObserver | null = null
let io: IntersectionObserver | null = null
function observeSections() {
  spy?.disconnect()
  spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) activeCat.value = e.target.id
  }, { rootMargin: '-30% 0px -60% 0px' })
  root.value?.querySelectorAll('.hsf__group').forEach(n => spy!.observe(n))
}
watch(groups, () => nextTick(observeSections))

onMounted(() => {
  syncHeaderHeight()
  window.addEventListener('resize', syncHeaderHeight)
  observeSections()
  // Deep-Link #faq-n: Frage öffnen und hinscrollen
  const hash = decodeURIComponent(location.hash.slice(1))
  if (hash && items.value.some(i => i.id === hash)) {
    open.value = new Set([...open.value, hash])
    setTimeout(() => scrollToId(hash), 150)
  }
  const el = root.value
  if (!el || !('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.classList.add('is-anim')
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io?.unobserve(e.target) }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
  el.querySelectorAll('.rv').forEach(n => io!.observe(n))
})
onUnmounted(() => {
  window.removeEventListener('resize', syncHeaderHeight)
  spy?.disconnect(); io?.disconnect()
})

function scrollToFaq(e: Event) {
  e.preventDefault()
  scrollToId('fragen')
}

// ── Strukturdaten (schema.org FAQPage) ──
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    key: 'faq-jsonld',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.value.map(i => ({
        '@type': 'Question',
        name: i.headline,
        acceptedAnswer: { '@type': 'Answer', text: strip(i.html) }
      }))
    })
  }]
}))
</script>

<template>
  <div ref="root" class="hsf">
    <!-- ── Hero mit Suche ───────────────────────────── -->
    <section class="hsf__hero">
      <NuxtImg class="hsf__bg" src="/files/wohnfee/bilder/homestaging/2024-04-17_Einwanggasse_27-23_0095.jpg" alt=""
               sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:1600px 2xl:1920px"
               loading="eager" fetchpriority="high" />
      <div class="hsf__inside">
        <NuxtLink to="/team.html" class="hsf__eyebrow">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
          Über uns
        </NuxtLink>
        <h1 class="hsf__h1">{{ title }}</h1>
        <p class="hsf__lead">
          Alles Wichtige zu Ablauf, Kosten und Leistungen – kurz und klar beantwortet.
        </p>
        <label class="hsf__search">
          <WfIcon name="search" :size="20" />
          <input v-model="query" type="search" placeholder="Frage suchen, z. B. „Kosten“ oder „Dauer“"
                 aria-label="FAQ durchsuchen" @keydown.enter.prevent="scrollToFaq">
          <button v-if="query" type="button" class="hsf__clear" aria-label="Suche löschen" @click="query = ''">×</button>
        </label>
        <ul class="hsf__chips">
          <li v-for="c in categories" :key="c">
            <a :href="'#rubrik-' + norm(c).replace(/[^a-z0-9]+/g, '-')"
               @click="jump('rubrik-' + norm(c).replace(/[^a-z0-9]+/g, '-'), $event)">{{ c }}</a>
          </li>
        </ul>
      </div>
      <a href="#fragen" class="hsf__cue" @click="scrollToFaq">
        {{ items.length }} Antworten
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </a>
    </section>

    <!-- ── Fragen ───────────────────────────────────── -->
    <section id="fragen" class="hsf__body">
      <div class="hsf__wrap hsf__layout">
        <aside class="hsf__side">
          <p class="hsf__sidelabel">Themen</p>
          <nav aria-label="FAQ-Themen">
            <a v-for="c in categories" :key="c"
               :href="'#rubrik-' + norm(c).replace(/[^a-z0-9]+/g, '-')"
               :class="{ 'is-active': activeCat === 'rubrik-' + norm(c).replace(/[^a-z0-9]+/g, '-'), 'is-empty': !countFor(c) }"
               @click="jump('rubrik-' + norm(c).replace(/[^a-z0-9]+/g, '-'), $event)">
              <span>{{ c }}</span><em>{{ countFor(c) }}</em>
            </a>
          </nav>
          <div class="hsf__sidecta">
            <p>Noch Fragen?</p>
            <a href="tel:+436769202236">+43 676 9202236</a>
            <a href="mailto:office@wohnfee.at">office@wohnfee.at</a>
          </div>
        </aside>

        <div class="hsf__main">
          <p v-if="query.trim()" class="hsf__result">
            <strong>{{ filtered.length }}</strong> {{ filtered.length === 1 ? 'Treffer' : 'Treffer' }} für „{{ query.trim() }}“
          </p>

          <div v-for="g in groups" :id="g.slug" :key="g.slug" class="hsf__group rv">
            <h2 class="hsf__h2">{{ g.name }}</h2>
            <div class="hsf__list">
              <div v-for="i in g.items" :id="i.id" :key="i.id" class="hsf__item" :class="{ 'is-open': isOpen(i.id) }">
                <h3 class="hsf__q">
                  <button type="button" :aria-expanded="isOpen(i.id)" :aria-controls="i.id + '-a'" @click="toggle(i.id)">
                    <span>{{ i.headline }}</span>
                    <span class="hsf__plus" aria-hidden="true" />
                  </button>
                </h3>
                <div :id="i.id + '-a'" class="hsf__a" role="region">
                  <div class="hsf__ainner">
                    <div class="hsf__rte" v-html="i.html" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!filtered.length" class="hsf__empty">
            <p>Zu „{{ query.trim() }}“ haben wir leider keine Antwort gefunden.</p>
            <button type="button" class="hsf__btn hsf__btn--ghost" @click="query = ''">Suche zurücksetzen</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Kontakt ──────────────────────────────────── -->
    <section class="hsf__contact">
      <div class="hsf__wrap">
        <div class="hsf__cbox rv">
          <div>
            <p class="hsf__eyebrow hsf__eyebrow--light">Persönliche Beratung</p>
            <h2 class="hsf__h2 hsf__h2--light">Ihre Frage war nicht dabei?</h2>
            <p class="hsf__ctext">Wir beraten Sie gerne persönlich – telefonisch, per E-Mail oder direkt bei Ihnen vor Ort.</p>
          </div>
          <div class="hsf__cactions">
            <a href="tel:+436769202236" class="hsf__cline"><WfIcon name="phone" :size="18" />+43 676 9202236</a>
            <a href="mailto:office@wohnfee.at" class="hsf__cline"><WfIcon name="mail" :size="18" />office@wohnfee.at</a>
            <NuxtLink to="/kontakt.html" class="hsf__btn hsf__btn--light">Kontakt aufnehmen</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsf {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsf__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsf h1, .hsf h2, .hsf h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; }

/* ── Hero ── */
.hsf__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(560px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(560px, calc(100svh - var(--hs-head, 108px)));
}
.hsf__bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 50%; }
.hsf__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(248, 245, 239, .97) 0%, rgba(248, 245, 239, .9) 36%,
      rgba(248, 245, 239, .5) 54%, rgba(248, 245, 239, 0) 70%),
    linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, 0) 16%);
}
.hsf__inside { position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 4em 1.5em 5em; box-sizing: border-box; }
.hsf__inside > * { max-width: 36rem; }
.hsf__eyebrow {
  display: inline-flex; align-items: center; gap: .7em; margin: 0 0 1.3em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
  color: var(--ink); text-decoration: none; transition: color .15s;
}
.hsf__eyebrow svg {
  width: 1.4em; height: 1.4em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  transition: transform .2s;
}
.hsf__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsf__eyebrow:hover { color: var(--green); }
.hsf__eyebrow:hover svg { transform: translateX(-3px); }
.hsf__eyebrow--light { color: #fff; }
.hsf__eyebrow--light::after { background: rgba(255, 255, 255, .6); }
.hsf__h1 { font-size: clamp(2.3em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .35em; }
.hsf__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0 0 1.6em; }

.hsf__search {
  display: flex; align-items: center; gap: .8em; background: #fff; border: 1px solid var(--line);
  border-radius: 999px; padding: .35em .5em .35em 1.3em; color: var(--green);
  box-shadow: 0 12px 30px rgba(60, 50, 30, .1); transition: border-color .15s, box-shadow .15s;
}
.hsf__search:focus-within { border-color: var(--green); box-shadow: 0 12px 30px rgba(47, 93, 64, .18); }
.hsf__search input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: inherit; font-size: 1em;
  color: var(--ink); padding: .75em 0;
}
.hsf__search input::-webkit-search-cancel-button { display: none; }
.hsf__clear {
  flex: none; width: 2.2em; height: 2.2em; border: 0; border-radius: 50%; cursor: pointer;
  background: var(--green-soft); color: var(--green); font-size: 1.1em; line-height: 1;
}
.hsf__chips { list-style: none; margin: 1.2em 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: .5em; }
.hsf__chips a {
  display: inline-block; padding: .5em 1em; border-radius: 999px; background: rgba(255, 255, 255, .7);
  border: 1px solid var(--line); color: var(--ink); text-decoration: none; font-size: .82em; font-weight: 600;
  transition: background .15s, color .15s, border-color .15s;
}
.hsf__chips a:hover { background: var(--green); border-color: var(--green); color: #fff; }

.hsf__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em;
  font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
  color: var(--ink); text-decoration: none;
}
.hsf__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.hsf__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: hsf-bob 1.8s ease-in-out infinite; }
.hsf__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes hsf-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }

/* ── Fragen ── */
.hsf__body { padding: 3.5em 0 4.5em; }
.hsf__layout { display: grid; grid-template-columns: 250px 1fr; gap: 3.5em; align-items: start; }
/* Grid-Kinder dürfen schrumpfen – sonst drückt die mobile Themenleiste die Seite breit */
.hsf__layout > * { min-width: 0; }
.hsf__side { position: sticky; top: calc(var(--hs-head, 108px) + 1.5em); }
.hsf__sidelabel {
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--muted); margin: 0 0 .8em;
}
.hsf__side nav { display: grid; gap: .25em; }
.hsf__side nav a {
  display: flex; align-items: center; justify-content: space-between; gap: .8em;
  padding: .65em .9em; border-radius: 12px; text-decoration: none; color: var(--ink); font-size: .9em; font-weight: 500;
  transition: background .15s, color .15s;
}
.hsf__side nav a em {
  font-style: normal; font-size: .78em; font-weight: 700; min-width: 1.9em; text-align: center;
  padding: .15em .45em; border-radius: 999px; background: #fff; border: 1px solid var(--line); color: var(--muted);
}
.hsf__side nav a:hover { background: #fff; }
.hsf__side nav a.is-active { background: var(--green-soft); color: var(--green); font-weight: 700; }
.hsf__side nav a.is-active em { background: var(--green); border-color: var(--green); color: #fff; }
.hsf__side nav a.is-empty { opacity: .4; pointer-events: none; }
.hsf__sidecta {
  margin-top: 1.6em; padding: 1.2em 1.1em; border-radius: 16px; background: #fff; border: 1px solid var(--line);
  display: grid; gap: .35em; font-size: .88em;
}
.hsf__sidecta p { margin: 0 0 .2em; font-family: var(--serif); font-size: 1.15em; }
.hsf__sidecta a { color: var(--green); text-decoration: none; font-weight: 600; }
.hsf__sidecta a:hover { text-decoration: underline; }

.hsf__result { margin: 0 0 1.4em; color: var(--muted); }
.hsf__result strong { color: var(--green); }
.hsf__group { margin-bottom: 2.8em; }
.hsf__group:last-of-type { margin-bottom: 0; }
.hsf__h2 { font-size: clamp(1.4em, 2.5vw, 1.8em) !important; margin: 0 0 .7em; }
.hsf__h2--light { color: #fff !important; }
.hsf__list { display: grid; gap: .7em; }

.hsf__item {
  background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.hsf__item:hover { border-color: #d6cfbf; }
.hsf__item.is-open { border-color: #cfdccf; box-shadow: 0 12px 30px rgba(60, 50, 30, .08); }
.hsf__q { margin: 0 !important; font-size: 1em !important; }
.hsf__q button {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1.2em;
  padding: 1.15em 1.4em; border: 0; background: none; cursor: pointer; text-align: left;
  font-family: var(--serif); font-size: 1.12em; line-height: 1.4; color: var(--ink);
}
.hsf__q button:hover { color: var(--green); }
.hsf__q button:focus-visible { outline: 2px solid var(--green); outline-offset: -2px; border-radius: 16px; }
.hsf__plus {
  flex: none; position: relative; width: 2.1em; height: 2.1em; border-radius: 50%; background: var(--green-soft);
  transition: background .2s, transform .3s ease;
}
.hsf__plus::before, .hsf__plus::after {
  content: ""; position: absolute; left: 50%; top: 50%; width: .8em; height: 2px; border-radius: 2px;
  background: var(--green); transform: translate(-50%, -50%); transition: transform .3s ease, background .2s;
}
.hsf__plus::after { transform: translate(-50%, -50%) rotate(90deg); }
.hsf__item.is-open .hsf__plus { background: var(--green); transform: rotate(180deg); }
.hsf__item.is-open .hsf__plus::before, .hsf__item.is-open .hsf__plus::after { background: #fff; }
.hsf__item.is-open .hsf__plus::after { transform: translate(-50%, -50%) rotate(0deg); }

/* weiches Auf-/Zuklappen über grid-template-rows */
.hsf__a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease; }
.hsf__item.is-open .hsf__a { grid-template-rows: 1fr; }
.hsf__ainner { overflow: hidden; }
.hsf__rte { padding: 0 1.4em 1.3em; border-top: 1px solid transparent; }
.hsf__rte :deep(p) { margin: 0 0 .8em; line-height: 1.75; color: var(--muted); }
.hsf__rte :deep(p:last-child) { margin-bottom: 0; }
.hsf__rte :deep(strong) { color: var(--ink); }
.hsf__rte :deep(ul), .hsf__rte :deep(ol) { margin: 0 0 .9em; padding-left: 1.3em; color: var(--muted); line-height: 1.7; }
.hsf__rte :deep(li) { margin-bottom: .3em; }
.hsf__rte :deep(li::marker) { color: var(--green); font-weight: 700; }
.hsf__rte :deep(a) {
  display: inline-flex; align-items: center; gap: .4em; color: var(--green); font-weight: 600; text-decoration: none;
  border-bottom: 1px solid #b9c9bc; padding-bottom: 1px;
}
.hsf__rte :deep(a)::after { content: "→"; transition: transform .2s; }
.hsf__rte :deep(a:hover)::after { transform: translateX(3px); }

.hsf__empty {
  text-align: center; padding: 3em 1.5em; border: 1px dashed #cfc7b4; border-radius: 18px; background: #fff;
}
.hsf__empty p { margin: 0 0 1.2em; color: var(--muted); }
.hsf__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px; cursor: pointer;
  font: inherit; font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s;
}
.hsf__btn--ghost { background: #fff; color: var(--ink); border: 1px solid var(--ink); }
.hsf__btn--ghost:hover { color: var(--green); border-color: var(--green); }
.hsf__btn--light { background: #fff; color: var(--green); border: 0; }
.hsf__btn--light:hover { background: var(--cream); color: var(--green-dark); }

/* ── Kontakt ── */
.hsf__contact { padding: 0 0 5em; }
.hsf__cbox {
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 2.5em; align-items: center;
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%);
  color: #fff; border-radius: 26px; padding: 3em 3.2em; position: relative; overflow: hidden;
}
.hsf__cbox::after {
  content: ""; position: absolute; right: -6em; bottom: -9em; width: 22em; height: 22em; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, .12); box-shadow: 0 0 0 2.5em rgba(255, 255, 255, .03); pointer-events: none;
}
.hsf__ctext { margin: 0; line-height: 1.7; color: rgba(255, 255, 255, .85); }
.hsf__cactions { display: grid; gap: .7em; justify-items: start; position: relative; z-index: 1; }
.hsf__cline {
  display: inline-flex; align-items: center; gap: .7em; color: #fff; text-decoration: none; font-weight: 600; font-size: 1.05em;
}
.hsf__cline :deep(svg) {
  width: 2.2em; height: 2.2em; padding: .5em; box-sizing: border-box; border-radius: 50%; background: rgba(255, 255, 255, .14);
}
.hsf__cline:hover { text-decoration: underline; }
.hsf__cactions .hsf__btn { margin-top: .5em; }

/* ── Reveal ── */
.hsf.is-anim .rv { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
.hsf.is-anim .rv.is-in { opacity: 1; transform: none; }

/* ── Responsive ── */
@media (max-width: 960px) {
  .hsf__layout { grid-template-columns: 1fr; gap: 1.5em; }
  .hsf__side { position: static; }
  .hsf__side nav { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; padding-bottom: .4em; }
  .hsf__sidecta, .hsf__sidelabel { display: none; }
  .hsf__cbox { grid-template-columns: 1fr; padding: 2.2em 1.6em; }
  .hsf__hero { min-height: 0; align-items: flex-end; }
  .hsf__bg { height: 18em; }
  .hsf__hero::after {
    inset: 0 0 auto 0; height: 18em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .85) 30%, rgba(248, 245, 239, 0) 65%);
  }
  .hsf__inside { padding: 12em 1em 2.5em; }
  .hsf__cue { display: none; }
}
@media (max-width: 600px) {
  .hsf__wrap { padding: 0 1em; }
  .hsf__q button { padding: 1em 1.1em; font-size: 1.02em; }
  .hsf__rte { padding: 0 1.1em 1.1em; }
}
@media (prefers-reduced-motion: reduce) {
  .hsf__cue svg { animation: none; }
  .hsf__a, .hsf__plus, .hsf__plus::before, .hsf__plus::after { transition: none; }
}
</style>
