<script setup lang="ts">
// Preisseite (Home Staging) im Design der Home-Staging-Seiten. Inhalte kommen
// aus pages.json (Seite 47) und werden nur strukturiert:
//   1. Textelement     → H1 + allgemeine Bedingungen (Liste) + Hinweise (fett)
//   „PAKET n“-Element   → Paketstart, <h3> darin = Leistungsumfang
//   Element mit <h4>/h4 → Raum mit Ausstattungsliste
//   Element ohne Titel  → Hinweis „wie in Paket n und zusätzlich“
//   „Preis: …“-Headline → Paketpreis
const props = defineProps<{ page: any }>()
const { isEn, t, lp } = useLang()

const strip = (h: string) => h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const items = (h: string) => (h.match(/<li[^>]*>([\s\S]*?)<\/li>/g) || []).map(strip)

interface Room { name: string; items: string[]; from: number }
interface Pack { no: number; label: string; scope: string; sqm: string; price: string; note: string; rooms: Room[] }

const parsed = computed(() => {
  const els: any[] = props.page.columns?.main || []
  const general = els[0] || {}
  const html: string = general.html || ''
  const notes = (html.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [])
    .map(strip).filter(t => t && !/^(Allgemein|General):?$/i.test(t))
    // zwei <strong> direkt hintereinander („bzw. “ + „individuell …“) sauber zusammenführen
    .map(t => t.replace(/\s+/g, ' '))

  const packs: Pack[] = []
  let cur: Pack | null = null
  for (const e of els.slice(1)) {
    const head = String(e.headline || '')
    if (/^(PAKET|PACKAGE)\s*\d+/i.test(head)) {
      const no = Number(head.match(/\d+/)![0])
      // Tippfehler-Reste im Pflegetext („ ,“, Komma bzw. „€“ am Ende) nur in der Anzeige glätten
      const scope = strip(e.html || '').replace(/\s+,/g, ',').replace(/[,\s€]+$/, '')
      const sqm = scope.match(/max\.\s*(\d+)\s*(qm|sqm|m²)/i)?.[1] || ''
      cur = { no, label: head, scope, sqm, price: '', note: '', rooms: [] }
      packs.push(cur)
      continue
    }
    if (!cur) continue
    if (e.type === 'headline' && /^(Preis|Price)/i.test(head)) {
      cur.price = head.replace(/^(Preis|Price):\s*/i, '').trim()
      continue
    }
    const h4 = (e.html || '').match(/^\s*<h4[^>]*>([\s\S]*?)<\/h4>/)
    const name = (head || (h4 ? strip(h4[1]) : '')).replace(/:$/, '').trim()
    if (name) {
      cur.rooms.push({ name, items: items(e.html || ''), from: cur.no })
    } else if (e.html) {
      cur.note = strip(e.html)
    }
  }
  return { title: general.headline || props.page.title, conditions: items(html), notes, packs }
})

// Pakete bauen aufeinander auf („wie in Paket n und zusätzlich“): enthaltene Räume kumulieren
const allRooms = computed(() => parsed.value.packs.flatMap(p => p.rooms))
const included = (p: Pack) => allRooms.value.filter(r => r.from <= p.no)

// „€ 2990,00“ (DE) bzw. „€ 2990.00“ (EN) → je Sprache formatiert (€ 2.990,00 / € 2,990.00)
const fmtPrice = (raw: string) => {
  const m = raw.match(/(\d[\d.,]*?)[.,](\d{2})(?!\d)/)
  if (!m) return { main: raw, cents: '' }
  const int = String(Number(m[1].replace(/[.,]/g, '')))
  const thousands = isEn.value ? ',' : '.'
  return { main: '€ ' + int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands), cents: (isEn.value ? '.' : ',') + m[2] }
}

// Icons für Räume und Bedingungen (Stroke-Stil wie WfIcon)
const ROOM_ICON: Record<string, string> = {
  wohn: 'M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 12a1.5 1.5 0 0 1 3 0v2h12v-2a1.5 1.5 0 0 1 3 0v5H3v-5Zm2 5v2m14-2v2',
  ess: 'M4 10h16M6 10v9m12-9v9M9 6a3 3 0 0 1 6 0M12 3v0',
  küche: 'M4 4h16v16H4V4Zm0 6h16M8 7h.01M12 7h.01M9 14h6',
  vor: 'M7 21V4h10v17M4 21h16M14 12h.01',
  schlaf: 'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15h18M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m0 0V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M3 18v2m18-2v2',
  bad: 'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Zm2 0V6a2 2 0 0 1 4 0M7 19l-1 2m11-2 1 2',
  weitere: 'M4 20V9h16v11M4 9l8-5 8 5M9 20v-6h6v6'
}
// englische Raumnamen auf die gleichen Icons abbilden
const ROOM_EN: Record<string, string> = { living: 'wohn', dining: 'ess', kitchen: 'küche', entrance: 'vor', bedroom: 'schlaf', bath: 'bad' }
const roomIcon = (name: string) => {
  const raw = name.toLowerCase()
  const n = ROOM_EN[Object.keys(ROOM_EN).find(k => raw.startsWith(k)) || ''] || raw
  const key = Object.keys(ROOM_ICON).find(k => n.startsWith(k)) || 'weitere'
  return ROOM_ICON[key]
}
const condIcon = (c: string) => /leih|monat|rental period|month/i.test(c) ? 'calendar'
  : /anzahl|zahlung|deposit|payment/i.test(c) ? 'euro'
    : /ust|steuer|vat/i.test(c) ? 'receipt' : 'bell'

// Hero-Höhe + Scroll-Reveal wie auf den übrigen Home-Staging-Seiten
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

function scrollTo(id: string, e: Event) {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div ref="root" class="hsp">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hsp__hero">
      <NuxtImg class="hsp__bg" src="/files/wohnfee/bilder/homestaging/2024-04-17_Einwanggasse_27-23_0064.jpg" alt=""
               sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:1600px 2xl:1920px"
               loading="eager" fetchpriority="high" />
      <div class="hsp__inside">
        <NuxtLink :to="lp('/home-staging.html')" class="hsp__eyebrow">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
          Home Staging
        </NuxtLink>
        <h1 class="hsp__h1">{{ parsed.title }}</h1>
        <div class="hsp__actions">
          <a href="#pakete" class="hsp__btn hsp__btn--primary" @click="scrollTo('pakete', $event)">{{ t('Pakete ansehen', 'View packages') }}</a>
          <NuxtLink :to="lp('/kontakt.html')" class="hsp__btn hsp__btn--ghost">{{ t('Beratung anfragen', 'Request a consultation') }}</NuxtLink>
        </div>
        <ul class="hsp__conds" :aria-label="t('Allgemein', 'General')">
          <li v-for="c in parsed.conditions" :key="c">
            <span class="hsp__condicon"><WfIcon :name="condIcon(c)" :size="18" /></span>
            <span>{{ c }}</span>
          </li>
        </ul>
      </div>
      <a href="#pakete" class="hsp__cue" :aria-label="t('Zu den Paketen scrollen', 'Scroll to the packages')" @click="scrollTo('pakete', $event)">
        {{ t('Zu den Paketen', 'To the packages') }}
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </a>
    </section>

    <!-- ── Pakete ───────────────────────────────────── -->
    <section id="pakete" class="hsp__packs">
      <div class="hsp__wrap">
        <div class="hsp__head rv">
          <p class="hsp__divider"><span>{{ t('Unsere Pakete', 'Our packages') }}</span></p>
        </div>
        <div class="hsp__grid">
          <article v-for="p in parsed.packs" :key="p.no" class="hsp__pack rv"
                   :class="{ 'hsp__pack--dark': p.no === parsed.packs.length }"
                   :style="{ transitionDelay: `${(p.no - 1) * 90}ms` }">
            <div class="hsp__packtop">
              <h2 class="hsp__packlabel">{{ p.label }}</h2>
              <span v-if="p.sqm" class="hsp__sqm">{{ t('bis', 'up to') }} {{ p.sqm }} m²</span>
            </div>
            <p class="hsp__scope">{{ p.scope }}</p>
            <div class="hsp__price">
              <span class="hsp__pricelabel">{{ t('Preis', 'Price') }}</span>
              <span class="hsp__priceval"><em>{{ t('ab', 'from') }}</em>{{ fmtPrice(p.price).main }}<small>{{ fmtPrice(p.price).cents }}</small></span>
              <span class="hsp__pricenote">{{ t('zzgl. USt. · endgültiger Preis je nach Objekt', 'plus VAT · final price depends on the property') }}</span>
            </div>
            <p v-if="p.note" class="hsp__note">{{ p.note }}</p>
            <ul class="hsp__rooms">
              <li v-for="r in allRooms" :key="r.name" :class="{ 'is-off': r.from > p.no, 'is-new': r.from === p.no && p.no > 1 }">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path v-if="r.from <= p.no" d="m4.5 12.5 5 5 10-11" />
                  <path v-else d="M6 12h12" />
                </svg>
                <span :data-new="t('neu', 'new')">{{ r.name }}</span>
              </li>
            </ul>
            <NuxtLink :to="{ path: lp('/kontakt.html'), query: { thema: 'staging', nachricht: t(`Anfrage zu ${p.label} (${p.scope})`, `Enquiry about ${p.label} (${p.scope})`) } }" class="hsp__packcta">
              {{ t(`${p.label} anfragen`, `Enquire about ${p.label}`) }} <WfIcon name="arrow" :size="15" />
            </NuxtLink>
          </article>
        </div>
        <div v-if="parsed.notes.length" class="hsp__infos rv">
          <p v-for="n in parsed.notes" :key="n">
            <span class="hsp__infoicon"><WfIcon name="bell" :size="16" /></span>{{ n }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── Ausstattung je Raum ──────────────────────── -->
    <section class="hsp__detail">
      <div class="hsp__wrap">
        <div class="hsp__head rv">
          <p class="hsp__divider"><span>{{ t('Im Detail', 'In detail') }}</span></p>
        </div>
        <div class="hsp__rgrid">
          <article v-for="r in allRooms" :key="r.name" class="hsp__room rv">
            <div class="hsp__roomhead">
              <span class="hsp__roomicon">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="roomIcon(r.name)" /></svg>
              </span>
              <h3>{{ r.name }}</h3>
              <span class="hsp__from">{{ t('ab Paket', 'from package') }} {{ r.from }}</span>
            </div>
            <ul>
              <li v-for="it in r.items" :key="it">{{ it }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsp {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsp__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsp h1, .hsp h2, .hsp h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; }
.hsp ul { list-style: none; margin: 0; padding: 0; }

/* ── Hero ── */
.hsp__hero {
  position: relative; overflow: hidden; display: flex; align-items: center;
  min-height: max(560px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(560px, calc(100svh - var(--hs-head, 108px)));
}
.hsp__bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 50%; }
.hsp__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(248, 245, 239, .97) 0%, rgba(248, 245, 239, .9) 34%,
      rgba(248, 245, 239, .45) 52%, rgba(248, 245, 239, 0) 68%),
    linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, 0) 16%);
}
.hsp__inside { position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 4em 1.5em; box-sizing: border-box; }
.hsp__inside > * { max-width: 34rem; }
.hsp__eyebrow {
  display: inline-flex; align-items: center; gap: .7em; margin: 0 0 1.3em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
  color: var(--ink); text-decoration: none; transition: color .15s;
}
.hsp__eyebrow svg {
  width: 1.4em; height: 1.4em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  transition: transform .2s;
}
.hsp__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsp__eyebrow:hover { color: var(--green); }
.hsp__eyebrow:hover svg { transform: translateX(-3px); }
.hsp__h1 { font-size: clamp(2.3em, 5vw, 3.6em) !important; line-height: 1.08; letter-spacing: -.01em; margin: 0 0 .75em; }
.hsp__actions { display: flex; flex-wrap: wrap; gap: .8em; margin-bottom: 2.4em; }
.hsp__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px;
  font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hsp__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hsp__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hsp__btn--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border: 1px solid var(--ink); }
.hsp__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.hsp__conds { display: grid; grid-template-columns: 1fr 1fr; gap: .8em 1.4em; }
.hsp__conds li { display: flex; align-items: center; gap: .7em; font-size: .88em; line-height: 1.4; color: var(--ink); }
.hsp__condicon {
  flex: none; width: 2.5em; height: 2.5em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, .75); border: 1px solid #d9d3c4; color: var(--green);
}

/* ── Pakete ── */
.hsp__packs {
  scroll-margin-top: var(--hs-head, 108px);
  /* Paketbereich füllt genau einen Bildschirm unter dem Header */
  min-height: calc(100vh - var(--hs-head, 108px));
  min-height: calc(100svh - var(--hs-head, 108px));
  box-sizing: border-box; padding: 1.6em 0 2em;
  display: flex; flex-direction: column; justify-content: center;
}
.hsp__packs .hsp__head { margin-bottom: 1.2em; }

/* Scroll-Hinweis am unteren Hero-Rand */
.hsp__cue {
  position: absolute; left: 50%; bottom: 1.6em; z-index: 2; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: .5em;
  font-size: .68em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
  color: var(--ink); text-decoration: none;
}
.hsp__cue span {
  width: 2.6em; height: 2.6em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ink); background: rgba(255, 255, 255, .6); transition: background .15s, color .15s, border-color .15s;
}
.hsp__cue svg { width: 1.3em; height: 1.3em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; animation: hsp-bob 1.8s ease-in-out infinite; }
.hsp__cue:hover span { background: var(--green); border-color: var(--green); color: #fff; }
@keyframes hsp-bob { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(3px); } }
@media (prefers-reduced-motion: reduce) { .hsp__cue svg { animation: none; } }
.hsp__head { margin-bottom: 2.2em; }
.hsp__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsp__divider::before, .hsp__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hsp__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.3em; align-items: stretch; }
.hsp__pack {
  display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: 22px;
  padding: 1.3em 1.5em 1.4em; box-shadow: 0 2px 14px rgba(60, 50, 30, .06);
  transition: transform .25s ease, box-shadow .25s ease;
}
.hsp__pack:hover { transform: translateY(-5px); box-shadow: 0 20px 44px rgba(60, 50, 30, .13); }
.hsp__packtop { display: flex; align-items: center; justify-content: space-between; gap: 1em; margin-bottom: .6em; }
.hsp__packlabel {
  font-family: var(--font-family-01, 'Open Sans', sans-serif) !important; font-size: .78em !important; font-weight: 700 !important;
  letter-spacing: .2em; text-transform: uppercase; color: var(--green) !important; margin: 0;
}
.hsp__sqm {
  font-size: .78em; font-weight: 700; color: var(--green); background: var(--green-soft);
  border-radius: 999px; padding: .4em .9em; white-space: nowrap;
}
.hsp__scope { font-family: var(--serif); font-size: 1em; line-height: 1.4; margin: 0 0 .8em; min-height: 2.8em; color: var(--ink); }
.hsp__price {
  display: flex; flex-direction: column; gap: .1em; padding: .7em 0 .75em; margin-bottom: .8em;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.hsp__pricelabel { font-size: .72em; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; color: var(--muted); }
.hsp__priceval { font-family: var(--serif); font-size: 2.05em; line-height: 1.1; color: var(--ink); }
.hsp__priceval small { font-size: .45em; margin-left: .1em; color: var(--muted); }
.hsp__priceval em { font-style: normal; font-size: .42em; margin-right: .35em; color: var(--muted); vertical-align: .35em; }
.hsp__pack--dark .hsp__priceval em { color: rgba(255, 255, 255, .72); }
.hsp__pricenote { font-size: .8em; line-height: 1.45; color: var(--muted); }
.hsp__rooms { display: grid; grid-template-columns: 1fr 1fr; gap: .45em .8em; margin-bottom: 1em !important; }
.hsp__rooms li { display: flex; align-items: center; gap: .5em; font-size: .84em; line-height: 1.3; color: var(--ink); }
.hsp__rooms li:last-child { grid-column: 1 / -1; }
.hsp__rooms svg {
  flex: none; width: 1.35em; height: 1.35em; padding: .2em; border-radius: 50%; box-sizing: border-box;
  background: var(--green-soft); fill: none; stroke: var(--green); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round;
}
.hsp__rooms li.is-new span { font-weight: 700; }
.hsp__rooms li.is-new span::after {
  content: attr(data-new); margin-left: .5em; font-size: .68em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: #fff; background: var(--green); border-radius: 999px; padding: .15em .55em; vertical-align: middle;
}
.hsp__rooms li.is-off { color: #b3ad9f; }
.hsp__rooms li.is-off svg { background: #f2efe8; stroke: #c9c2b2; }
.hsp__note { font-size: .76em; line-height: 1.45; color: var(--muted); margin: 0 0 .7em; font-style: italic; }
.hsp__packcta {
  margin-top: auto; display: inline-flex; align-items: center; justify-content: center; gap: .5em;
  padding: .7em 1.2em; border-radius: 999px; border: 1px solid var(--green); color: var(--green);
  font-weight: 600; font-size: .88em; text-decoration: none; transition: background .15s, color .15s;
}
.hsp__packcta:hover { background: var(--green); color: #fff; }

/* Komplett-Paket dunkel hervorgehoben */
.hsp__pack--dark {
  background: radial-gradient(circle at 20% 0%, #3c7350 0%, var(--green) 50%, #22412d 100%);
  border-color: transparent; color: #fff; box-shadow: 0 18px 40px rgba(47, 93, 64, .3);
}
.hsp__pack--dark .hsp__packlabel { color: #cfe0d2 !important; }
.hsp__pack--dark .hsp__sqm { background: rgba(255, 255, 255, .14); color: #fff; }
.hsp__pack--dark .hsp__scope, .hsp__pack--dark .hsp__priceval, .hsp__pack--dark .hsp__rooms li { color: #fff; }
.hsp__pack--dark .hsp__price { border-color: rgba(255, 255, 255, .18); }
.hsp__pack--dark .hsp__pricelabel, .hsp__pack--dark .hsp__pricenote,
.hsp__pack--dark .hsp__priceval small, .hsp__pack--dark .hsp__note { color: rgba(255, 255, 255, .72); }
.hsp__pack--dark .hsp__rooms svg { background: rgba(255, 255, 255, .16); stroke: #fff; }
.hsp__pack--dark .hsp__rooms li.is-new span::after { background: #fff; color: var(--green); }
.hsp__pack--dark .hsp__packcta { background: #fff; border-color: #fff; color: var(--green); }
.hsp__pack--dark .hsp__packcta:hover { background: var(--cream); color: var(--green-dark); }

.hsp__infos {
  margin-top: 1.2em; display: grid; gap: .4em; padding: .9em 1.3em;
  background: #fff; border: 1px dashed #cfc7b4; border-radius: 16px;
}
.hsp__infos p { display: flex; align-items: center; gap: .7em; margin: 0; font-size: .84em; line-height: 1.45; color: var(--ink); }
.hsp__infoicon {
  flex: none; width: 1.9em; height: 1.9em; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}

/* ── Raum-Details ── */
.hsp__detail { background: #fff; padding: 4.5em 0 5em; }
.hsp__rgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.3em; }
.hsp__room {
  background: var(--cream); border: 1px solid var(--line); border-radius: 18px; padding: 1.5em 1.5em 1.4em;
  transition: transform .25s ease, box-shadow .25s ease, background .25s;
}
.hsp__room:hover { background: #fff; transform: translateY(-3px); box-shadow: 0 14px 30px rgba(60, 50, 30, .1); }
.hsp__roomhead {
  display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .35em .75em; margin-bottom: 1em;
}
.hsp__roomhead h3 { font-size: 1.2em; line-height: 1.3; margin: 0; }
.hsp__roomicon { grid-row: span 2; }
.hsp__roomicon {
  flex: none; width: 2.6em; height: 2.6em; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}
.hsp__roomicon svg { width: 1.35em; height: 1.35em; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.hsp__from {
  font-size: .68em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--green);
  border: 1px solid #cfdccf; border-radius: 999px; padding: .3em .75em; white-space: nowrap; justify-self: start;
}
.hsp__room li {
  position: relative; padding-left: 1.2em; margin-bottom: .45em; font-size: .9em; line-height: 1.5; color: var(--muted);
}
.hsp__room li::before {
  content: ""; position: absolute; left: 0; top: .6em; width: .45em; height: .45em; border-radius: 50%; background: #9db59f;
}

/* ── Scroll-Reveal ── */
.hsp.is-anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.hsp.is-anim .rv.is-in { opacity: 1; transform: none; }
.hsp.is-anim .hsp__pack.rv.is-in:hover { transform: translateY(-5px); }

/* ── Responsive ── */
@media (max-width: 1000px) {
  .hsp__packs { min-height: 0; padding: 3em 0; }
  .hsp__grid { grid-template-columns: 1fr; max-width: 560px; margin: 0 auto; }
  .hsp__scope { min-height: 0; }
}
@media (max-width: 960px) {
  .hsp__hero { min-height: 0; align-items: flex-end; }
  .hsp__bg { height: 20em; }
  .hsp__hero::after {
    inset: 0 0 auto 0; height: 20em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .85) 30%, rgba(248, 245, 239, 0) 65%);
  }
  .hsp__inside { padding: 13em 1em 2em; }
}
@media (max-width: 600px) {
  .hsp__wrap { padding: 0 1em; }
  .hsp__conds { grid-template-columns: 1fr; }
  .hsp__pack { padding: 1.6em 1.3em; }
  .hsp__detail { padding: 3.2em 0; }
}
</style>
