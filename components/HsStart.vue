<script setup lang="ts">
// Startseite: zeigt das gesamte Angebot in der Priorität
// Home Staging > Furniture Leasing > Redesign. Hero-Bilder und H1 kommen aus
// pages.json / pages-en.json (Seite 2), Projekte/Presse aus news(-en).json.
import { HS_AUDIENCES } from '~~/shared/home-staging-audiences'

const props = defineProps<{ page: any }>()
const { isEn, lang, t, lp } = useLang()
const { news, newsEn, pages, pagesEn } = useSiteData()

const flat = (els: any[]): any[] => els.flatMap(e => [e, ...flat(e.children || [])])
const els = computed(() => flat(props.page.columns?.main || []))
const strip = (h: string) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

const h1 = computed(() => els.value.find(e => e.type === 'headline')?.headline || '')

// ── Hero-Slideshow (Bilder aus dem bisherigen Slider) ──
const slides = computed(() => ((props.page.columns?.slider?.[0]?.items) || [])
  .filter((i: any) => i.src).map((i: any) => ({ src: asset(i.src), alt: i.alt || '' })))
const active = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const go = (i: number) => { active.value = (i + slides.value.length) % slides.value.length }

// ── Leistungen ──
const services = computed(() => [
  { id: 'home-staging', no: '01', title: 'Home Staging', text: t('Immobilien inszenieren – für schnelleren Verkauf und bessere Preise.', 'Staging properties – for faster sales and better prices.') },
  { id: 'furniture-leasing', no: '02', title: 'Furniture Leasing', text: t('Hochwertige Möbel flexibel mieten – ab 1 Monat.', 'Rent high-quality furniture flexibly – from 1 month.') },
  { id: 'redesign', no: '03', title: 'Redesign', text: t('Das eigene Zuhause neu gestalten – vom Konzept bis zur Umsetzung.', 'Redesign your own home – from concept to implementation.') }
])

const hsFacts = computed(() => [
  { value: t('1 Tag', '1 day'), label: t('für das gesamte Staging', 'for the entire staging') },
  { value: '80–150', label: t('Teile pro Immobilie', 'pieces per property') },
  { value: '1–2 %', label: t('vom Verkaufspreis', 'of the sale price') }
])

const audiences = computed(() => HS_AUDIENCES.map(a => ({
  to: lp(a.route), title: t(a.title, a.titleEn), text: t(a.text, a.textEn), img: a.img
})))

// Nutzen-Karten (Element 28 der Startseite)
const BENEFIT_ICONS = ['camera', 'home', 'clock']
const benefitsTitle = computed(() => els.value.find(e => e.type === 'headline' && e.id === '23')?.headline || '')
const benefits = computed(() => (els.value.find(e => e.id === '28')?.children || []).map((c: any, i: number) => {
  const m = String(c.html || '').match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
  return {
    icon: BENEFIT_ICONS[i] || 'check',
    title: strip(m?.[1] || ''),
    text: strip(String(c.html || '').replace(m?.[0] || '', ''))
  }
}))

const flFeatures = computed(() => [
  { icon: 'calendar', title: t('Flexible Mietdauer', 'Flexible rental period'), text: t('Von 1 Monat bis zu mehreren Jahren – je länger, desto günstiger.', 'From 1 month to several years – the longer, the better the price.') },
  { icon: 'truck', title: t('Lieferung & Montage', 'Delivery & assembly'), text: t('Mit eigener Spedition – inklusive Abholung am Ende.', 'With our own transport service – including collection at the end.') },
  { icon: 'diamond', title: t('Hochwertige Auswahl', 'High-quality selection'), text: t('Möbel, Leuchten & Accessoires für temporäre Wohnlösungen.', 'Furniture, lamps & accessories for temporary living.') }
])
const FL = '/files/wohnfee/bilder/furniture-leasing/'
const flImages = [FL + '2024-05-07_L154-FL_0011.jpg', FL + 'Furniture_Leasing_1_Essen.jpg', FL + 'Furniture_Leasing_4.jpg']

const redesignText = computed(() => {
  const d = ((isEn.value ? pagesEn : pages) as Record<string, any>)['4']?.description || ''
  return String(d).replace(/\s+-\s+/g, ' – ')
})

// Projekte & Presse
const projects = computed(() => blogItems('projekte', lang.value).filter(n => n.image).slice(0, 3))
const pressAll = computed(() => Object.values((isEn.value ? newsEn : news) as Record<string, any>)
  .filter((n: any) => n.archive === '8').sort((a: any, b: any) => Number(b.date) - Number(a.date)))
const pressClips = computed(() => pressAll.value.filter((n: any) => n.image).slice(0, 5))

// Hero-Höhe, Reveal, Slideshow
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}
let io: IntersectionObserver | null = null
onMounted(() => {
  syncHeaderHeight()
  window.addEventListener('resize', syncHeaderHeight)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce && slides.value.length > 1) timer = setInterval(() => go(active.value + 1), 6500)
  const el = root.value
  if (!el || !('IntersectionObserver' in window) || reduce) return
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
  if (timer) clearInterval(timer)
  io?.disconnect()
})

function scrollToId(id: string, e?: Event) {
  e?.preventDefault()
  const el = document.getElementById(id)
  if (!el) return
  const off = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight || 108
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' })
}
</script>

<template>
  <div ref="root" class="hss">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hss__hero">
      <div class="hss__slides" aria-hidden="true">
        <HsImg v-for="(s, i) in slides" :key="s.src" :src="s.src" :alt="s.alt" class="hss__slide"
               :class="{ 'is-active': i === active }" :loading="i === 0 ? 'eager' : 'lazy'"
               sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:1600px 2xl:1920px" />
      </div>
      <div class="hss__inside">
        <p class="hss__eyebrow">Home Staging · Furniture Leasing · Redesign</p>
        <h1 class="hss__h1">{{ h1 }}</h1>
        <p class="hss__lead">
          {{ t('Wir inszenieren Immobilien, vermieten hochwertige Möbel und gestalten Wohnräume neu – seit 2011, mit eigener Spedition und viel Liebe zum Detail.',
               'We stage properties, rent out high-quality furniture and redesign living spaces – since 2011, with our own transport service and great attention to detail.') }}
        </p>
        <div class="hss__actions">
          <NuxtLink :to="lp('/home-staging.html')" class="hss__btn hss__btn--primary">{{ t('Home Staging entdecken', 'Discover home staging') }}</NuxtLink>
          <NuxtLink :to="lp('/kontakt.html')" class="hss__btn hss__btn--ghost">{{ t('Beratung anfragen', 'Request a consultation') }}</NuxtLink>
        </div>
        <div v-if="slides.length > 1" class="hss__dots" role="group" :aria-label="t('Bilder', 'Images')">
          <button v-for="(s, i) in slides" :key="s.src" type="button" :class="{ 'is-active': i === active }"
                  :aria-label="t(`Bild ${i + 1}`, `Image ${i + 1}`)" @click="go(i)" />
        </div>
      </div>

      <nav class="hss__services" :aria-label="t('Unsere Leistungen', 'Our services')">
        <a v-for="s in services" :key="s.id" :href="`#${s.id}`" class="hss__service" @click="scrollToId(s.id, $event)">
          <span class="hss__sno">{{ s.no }}</span>
          <span class="hss__stext"><strong>{{ s.title }}</strong><small>{{ s.text }}</small></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </a>
      </nav>
    </section>

    <!-- ── 01 Home Staging ──────────────────────────── -->
    <section id="home-staging" class="hss__hs">
      <div class="hss__wrap hss__split rv">
        <div class="hss__text">
          <p class="hss__label"><span>01</span>{{ t('Unser Kerngeschäft', 'Our core business') }}</p>
          <h2 class="hss__h2">Home Staging</h2>
          <p class="hss__intro">
            {{ t('Wir richten leere oder bewohnte Immobilien so ein, dass sich Interessentinnen und Interessenten sofort zuhause fühlen – mit echten Möbeln, Teppichen, Accessoires und Licht. Das Ergebnis: perfekte Fotos, weniger Besichtigungen und eine deutlich kürzere Vermarktung.',
                 'We furnish empty or occupied properties so that prospective buyers and tenants feel at home straight away – with real furniture, rugs, accessories and lighting. The result: perfect photos, fewer viewings and a significantly shorter marketing period.') }}
          </p>
          <ul class="hss__facts">
            <li v-for="f in hsFacts" :key="f.value"><strong>{{ f.value }}</strong><span>{{ f.label }}</span></li>
          </ul>
          <div class="hss__actions">
            <NuxtLink :to="lp('/home-staging.html')" class="hss__btn hss__btn--primary">{{ t('Mehr zu Home Staging', 'More about home staging') }}</NuxtLink>
            <NuxtLink :to="lp('/home-staging/preise.html')" class="hss__btn hss__btn--ghost">{{ t('Preise & Pakete', 'Prices & packages') }}</NuxtLink>
          </div>
        </div>
        <div class="hss__collage">
          <HsImg src="/files/wohnfee/bilder_slider/SLIDER_Gobergasse-96_0108.jpg" alt="" class="hss__cimg hss__cimg--main"
                 sizes="xs:100vw sm:100vw md:60vw lg:600px xl:600px xxl:600px 2xl:600px" />
          <HsImg src="/files/wohnfee/bilder/homestaging/Liam 61.jpg" alt="" class="hss__cimg hss__cimg--small"
                 sizes="xs:50vw sm:40vw md:30vw lg:280px xl:280px xxl:280px 2xl:280px" />
        </div>
      </div>

      <div class="hss__wrap">
        <p class="hss__divider rv"><span>{{ t('Für wen wir da sind', 'Who we work for') }}</span></p>
        <div class="hss__aud">
          <NuxtLink v-for="a in audiences" :key="a.to" :to="a.to" class="hss__acard rv">
            <HsImg :src="a.img" :alt="a.title" sizes="xs:100vw sm:100vw md:33vw lg:400px xl:400px xxl:400px 2xl:400px" />
            <span class="hss__aover">
              <strong>{{ a.title }}</strong>
              <small>{{ a.text }}</small>
            </span>
          </NuxtLink>
        </div>

        <div v-if="benefits.length" class="hss__benefits rv">
          <h3 class="hss__h3">{{ benefitsTitle }}</h3>
          <ul>
            <li v-for="b in benefits" :key="b.title">
              <span class="hss__bicon"><WfIcon :name="b.icon" :size="22" /></span>
              <span><strong>{{ b.title }}</strong><small>{{ b.text }}</small></span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── 02 Furniture Leasing ─────────────────────── -->
    <section id="furniture-leasing" class="hss__fl">
      <div class="hss__wrap hss__split hss__split--rev rv">
        <div class="hss__flimgs">
          <HsImg :src="flImages[0]" alt="" class="hss__flmain" sizes="xs:100vw sm:100vw md:60vw lg:620px xl:620px xxl:620px 2xl:620px" />
          <div class="hss__flthumbs">
            <HsImg v-for="img in flImages.slice(1)" :key="img" :src="img" alt="" sizes="xs:50vw sm:50vw md:30vw lg:300px xl:300px xxl:300px 2xl:300px" />
          </div>
        </div>
        <div class="hss__text">
          <p class="hss__label"><span>02</span>{{ t('Möbel auf Zeit', 'Furniture for a while') }}</p>
          <h2 class="hss__h2">Furniture Leasing</h2>
          <p class="hss__intro">
            {{ t('Stilvolle Möbel für zeitlich flexible Wohnkonzepte: Hochwertige Möbel & Accessoires zur Miete – für Home Staging, temporäre Wohnlösungen und mehr.',
                 'Stylish furniture for flexible living: high-quality furniture & accessories for rent – for home staging, temporary homes and more.') }}
          </p>
          <ul class="hss__features">
            <li v-for="f in flFeatures" :key="f.title">
              <span class="hss__bicon"><WfIcon :name="f.icon" :size="20" /></span>
              <span><strong>{{ f.title }}</strong><small>{{ f.text }}</small></span>
            </li>
          </ul>
          <div class="hss__actions">
            <NuxtLink :to="lp('/furniture-leasing.html')" class="hss__btn hss__btn--primary">{{ t('Zum Mietshop', 'To the rental shop') }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 03 Redesign ──────────────────────────────── -->
    <section id="redesign" class="hss__rd">
      <div class="hss__wrap">
        <div class="hss__rdbox rv">
          <HsImg src="/files/wohnfee/bilder/redesign/Ferienapartment-0010.jpg" alt="" class="hss__rdimg"
                 sizes="xs:100vw sm:100vw md:50vw lg:560px xl:560px xxl:560px 2xl:560px" />
          <div class="hss__rdtext">
            <p class="hss__label hss__label--light"><span>03</span>{{ t('Für Ihr Zuhause', 'For your home') }}</p>
            <h2 class="hss__h2 hss__h2--light">Redesign</h2>
            <p>{{ redesignText }}</p>
            <div class="hss__actions">
              <NuxtLink :to="lp('/redesign.html')" class="hss__btn hss__btn--light">{{ t('Mehr zum Redesign', 'More about redesign') }}</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Projekte ─────────────────────────────────── -->
    <section v-if="projects.length" class="hss__projects">
      <div class="hss__wrap">
        <div class="hss__head rv">
          <div>
            <p class="hss__divider hss__divider--left"><span>{{ t('Referenzen', 'References') }}</span></p>
            <h2 class="hss__h2">{{ t('Aktuelle Projekte', 'Recent projects') }}</h2>
          </div>
          <NuxtLink :to="lp('/projekte.html')" class="hss__more">{{ t('Alle Projekte', 'All projects') }} <WfIcon name="arrow" :size="15" /></NuxtLink>
        </div>
        <div class="hss__pgrid">
          <NuxtLink v-for="p in projects" :key="p.route" :to="p.route" class="hss__pcard rv">
            <span class="hss__pimg"><HsImg :src="asset(p.image)" :alt="p.headline" sizes="xs:100vw sm:100vw md:33vw lg:400px xl:400px xxl:400px 2xl:400px" /></span>
            <span class="hss__pbody">
              <small>{{ blogDate(p.date, lang) }}</small>
              <strong>{{ p.headline }}</strong>
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Presse ───────────────────────────────────── -->
    <section v-if="pressClips.length" class="hss__press">
      <div class="hss__wrap hss__pressrow rv">
        <div>
          <p class="hss__divider hss__divider--left"><span>{{ t('In den Medien', 'In the media') }}</span></p>
          <p class="hss__presstext">
            {{ t(`${pressAll.length} Berichte über WOHNFEE – von Die Presse bis Kurier.`, `${pressAll.length} articles about WOHNFEE – from Die Presse to Kurier.`) }}
          </p>
          <NuxtLink :to="lp('/presse.html')" class="hss__more">{{ t('Zum Pressespiegel', 'To the press review') }} <WfIcon name="arrow" :size="15" /></NuxtLink>
        </div>
        <NuxtLink :to="lp('/presse.html')" class="hss__clips" :aria-label="t('Zum Pressespiegel', 'To the press review')">
          <span v-for="(c, i) in pressClips" :key="c.route" class="hss__clip" :style="{ '--i': i }">
            <HsImg :src="asset(c.image)" alt="" sizes="xs:30vw sm:20vw md:15vw lg:160px xl:160px xxl:160px 2xl:160px" />
          </span>
        </NuxtLink>
      </div>
    </section>

    <!-- ── Kontakt ──────────────────────────────────── -->
    <section class="hss__cta">
      <div class="hss__wrap">
        <div class="hss__ctabox rv">
          <div>
            <p class="hss__label hss__label--light">{{ t('Persönliche Beratung', 'Personal advice') }}</p>
            <h2 class="hss__h2 hss__h2--light">{{ t('Erzählen Sie uns von Ihrem Projekt', 'Tell us about your project') }}</h2>
            <p>{{ t('Ob Home Staging, Furniture Leasing oder Redesign – wir finden die passende Lösung für Ihre Immobilie.', 'Whether home staging, furniture leasing or redesign – we will find the right solution for your property.') }}</p>
          </div>
          <div class="hss__ctaactions">
            <NuxtLink :to="lp('/kontakt.html')" class="hss__btn hss__btn--light">{{ t('Beratung anfragen', 'Request a consultation') }}</NuxtLink>
            <a href="tel:+436769202236" class="hss__btn hss__btn--outline">+43 676 9202236</a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hss {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hss__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hss h1, .hss h2, .hss h3 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; text-transform: none; }

/* Typo-Bausteine */
.hss__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.3em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hss__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hss__label {
  display: flex; align-items: center; gap: .8em; margin: 0 0 .9em;
  font-size: .72em; letter-spacing: .2em; text-transform: uppercase; font-weight: 700; color: var(--green);
}
.hss__label span {
  font-family: var(--serif); font-size: 1.5em; letter-spacing: 0; color: transparent; -webkit-text-stroke: 1px var(--green);
}
.hss__label--light { color: #cfe0d2; }
.hss__label--light span { -webkit-text-stroke-color: #cfe0d2; }
.hss__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 1.6em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hss__divider::before, .hss__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hss__divider--left { justify-content: flex-start; margin-bottom: .7em; }
.hss__divider--left::before { display: none; }
.hss__h1 { font-size: clamp(2.4em, 5vw, 3.8em) !important; line-height: 1.07; letter-spacing: -.01em; margin: 0 0 .45em; }
.hss__h2 { font-size: clamp(2em, 4vw, 3em) !important; line-height: 1.1; margin: 0 0 .45em; }
.hss__h2--light { color: #fff !important; }
.hss__h3 { font-size: 1.5em !important; margin: 0 0 1em; text-align: center !important; }
.hss__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0 0 1.8em; }
.hss__intro { font-size: 1.02em; line-height: 1.8; color: var(--muted); margin: 0 0 1.5em; }

.hss__actions { display: flex; flex-wrap: wrap; gap: .8em; }
.hss__btn {
  display: inline-flex; align-items: center; padding: .85em 1.9em; border-radius: 999px;
  font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hss__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hss__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hss__btn--ghost { background: rgba(255, 255, 255, .65); color: var(--ink); border: 1px solid var(--ink); }
.hss__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }
.hss__btn--light { background: #fff; color: var(--green); }
.hss__btn--light:hover { background: var(--cream); color: var(--green-dark); }
.hss__btn--outline { border: 1px solid rgba(255, 255, 255, .7); color: #fff; }
.hss__btn--outline:hover { background: rgba(255, 255, 255, .12); color: #fff; }
.hss__more {
  display: inline-flex; align-items: center; gap: .5em; color: var(--green); font-weight: 600; text-decoration: none;
  border-bottom: 1px solid #b9c9bc; padding-bottom: 2px; white-space: nowrap;
}
.hss__more:hover { border-color: var(--green); }

/* ── Hero ── */
.hss__hero {
  position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center;
  min-height: max(640px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(640px, calc(100svh - var(--hs-head, 108px)));
}
.hss__slides { position: absolute; inset: 0; }
.hss__slide {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 50%;
  opacity: 0; transform: scale(1.06); transition: opacity 1.4s ease, transform 7s ease-out;
}
.hss__slide.is-active { opacity: 1; transform: scale(1); }
.hss__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(248, 245, 239, .97) 0%, rgba(248, 245, 239, .9) 32%,
      rgba(248, 245, 239, .45) 52%, rgba(248, 245, 239, 0) 68%),
    linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .6) 14%, rgba(248, 245, 239, 0) 30%);
}
.hss__inside { position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 3em 1.5em 2em; box-sizing: border-box; }
.hss__inside > * { max-width: 34rem; }
.hss__dots { display: flex; gap: .45em; margin-top: 2em; }
.hss__dots button {
  width: 2.2em; height: 4px; border: 0; border-radius: 999px; background: rgba(43, 43, 40, .2); cursor: pointer; padding: 0;
  transition: background .3s, width .3s;
}
.hss__dots button.is-active { background: var(--green); width: 3.4em; }

.hss__services {
  position: relative; z-index: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 1.5em 2.2em; box-sizing: border-box;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em;
}
.hss__service {
  display: flex; align-items: center; gap: 1em; padding: 1.1em 1.3em; border-radius: 18px; text-decoration: none; color: var(--ink);
  background: rgba(255, 255, 255, .86); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border: 1px solid rgba(230, 224, 210, .9); box-shadow: 0 12px 30px rgba(60, 50, 30, .1);
  transition: transform .2s, box-shadow .2s, border-color .2s;
}
.hss__service:hover { transform: translateY(-3px); border-color: var(--green); box-shadow: 0 18px 36px rgba(60, 50, 30, .14); }
.hss__sno { font-family: var(--serif); font-size: 1.9em; line-height: 1; color: transparent; -webkit-text-stroke: 1px var(--green); flex: none; }
.hss__stext { display: grid; gap: .15em; flex: 1; min-width: 0; }
.hss__stext strong { font-family: var(--serif); font-weight: 500; font-size: 1.15em; }
.hss__stext small { font-size: .8em; line-height: 1.4; color: var(--muted); }
/* Desktop: Hero inkl. Leistungskarten passt genau in den sichtbaren Bereich (100vh minus Header).
   Schrift und Abstände skalieren mit der Fensterhöhe, damit auch Laptops nichts abschneiden. */
@media (min-width: 1001px) {
  .hss__hero {
    justify-content: space-between;
    height: calc(100vh - var(--hs-head, 108px)); height: calc(100svh - var(--hs-head, 108px));
    min-height: 520px;
  }
  .hss__inside { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center;
    padding: clamp(1em, 3.5vh, 3em) 1.5em clamp(.8em, 2vh, 2em); }
  .hss__inside > .hss__h1 { max-width: 46rem; font-size: clamp(2em, min(4.4vw, 6.2vh), 3.8em) !important; margin-bottom: clamp(.25em, 1.8vh, .45em); }
  .hss__inside > .hss__eyebrow { margin-bottom: clamp(.6em, 1.8vh, 1.3em); }
  .hss__inside > .hss__lead { font-size: clamp(.95em, 1.9vh, 1.05em); line-height: 1.6; margin-bottom: clamp(.9em, 2.6vh, 1.8em); }
  .hss__inside > .hss__dots { margin-top: clamp(.9em, 2.4vh, 2em); }
  .hss__services { padding-bottom: clamp(.9em, 2.8vh, 2.2em); }
  .hss__service { padding: clamp(.65em, 1.6vh, 1.1em) 1.3em; }
}
.hss__service svg { flex: none; width: 1.2em; height: 1.2em; fill: none; stroke: var(--green); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ── Split-Layouts ── */
.hss__split { display: grid; grid-template-columns: 1fr 1.05fr; gap: 4.5em; align-items: center; }
.hss__split--rev { grid-template-columns: 1.05fr 1fr; }

/* ── 01 Home Staging ── */
.hss__hs { padding: 5.5em 0 5em; background: #fff; }
.hss__facts { list-style: none; margin: 0 0 1.8em; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: .8em; }
.hss__facts li { display: grid; gap: .2em; padding: .9em 1em; border-radius: 14px; background: var(--cream); border: 1px solid var(--line); }
.hss__facts strong { font-family: var(--serif); font-weight: 500; font-size: 1.5em; color: var(--green); line-height: 1.1; }
.hss__facts span { font-size: .78em; color: var(--muted); line-height: 1.4; }
.hss__collage { position: relative; padding: 0 0 3em 3em; }
.hss__cimg { display: block; object-fit: cover; border-radius: 18px; }
.hss__collage :deep(.hss__cimg--main) { width: 100%; aspect-ratio: 4 / 3.2; box-shadow: 0 22px 50px rgba(60, 50, 30, .16); }
.hss__collage :deep(.hss__cimg--small) {
  position: absolute; left: 0; bottom: 0; width: 42%; aspect-ratio: 1; border: 6px solid #fff; box-shadow: 0 14px 34px rgba(60, 50, 30, .18);
}

.hss__aud { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.3em; margin: 4.5em 0 0; }
.hss__wrap > .hss__divider { margin-top: 4.5em; }
.hss__aud { margin-top: 0; }
.hss__acard { position: relative; display: block; aspect-ratio: 4 / 3; border-radius: 18px; overflow: hidden; color: #fff; text-decoration: none; }
.hss__acard :deep(img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .7s ease; }
.hss__acard::after { content: ""; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(25, 30, 22, .78) 0%, rgba(25, 30, 22, .2) 55%, rgba(25, 30, 22, 0) 100%); }
.hss__acard:hover :deep(img) { transform: scale(1.05); }
.hss__aover { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; padding: 1.3em 1.4em; display: grid; gap: .3em; }
.hss__aover strong { font-family: var(--serif); font-weight: 500; font-size: 1.35em; }
.hss__aover small { font-size: .84em; line-height: 1.45; color: rgba(255, 255, 255, .88); }

.hss__benefits { margin-top: 4em; padding: 2.2em 2.4em; border-radius: 22px; background: var(--cream); border: 1px solid var(--line); }
.hss__benefits ul, .hss__features { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.2em; }
.hss__benefits ul { grid-template-columns: repeat(3, 1fr); }
.hss__benefits li, .hss__features li { display: flex; gap: .9em; align-items: flex-start; }
.hss__benefits li > span:last-child, .hss__features li > span:last-child { display: grid; gap: .25em; }
.hss__benefits strong, .hss__features strong { font-family: var(--serif); font-weight: 500; font-size: 1.1em; }
.hss__benefits small, .hss__features small { font-size: .88em; line-height: 1.6; color: var(--muted); }
.hss__bicon {
  flex: none; width: 2.7em; height: 2.7em; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}

/* ── 02 Furniture Leasing ── */
.hss__fl { padding: 5.5em 0; }
.hss__features { margin-bottom: 1.8em; }
.hss__flimgs { display: grid; gap: .8em; }
.hss__flimgs :deep(.hss__flmain) { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 18px; display: block; box-shadow: 0 22px 50px rgba(60, 50, 30, .16); }
.hss__flthumbs { display: grid; grid-template-columns: 1fr 1fr; gap: .8em; }
.hss__flthumbs :deep(img) { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 14px; display: block; }

/* ── 03 Redesign ── */
.hss__rd { padding: 0 0 5.5em; }
.hss__rdbox {
  display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; border-radius: 26px;
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%); color: #fff;
}
.hss__rdbox :deep(.hss__rdimg) { width: 100%; height: 100%; min-height: 340px; object-fit: cover; display: block; }
.hss__rdtext { padding: 3em 3.2em; display: flex; flex-direction: column; justify-content: center; }
.hss__rdtext > p:not(.hss__label) { line-height: 1.75; color: rgba(255, 255, 255, .86); margin: 0 0 1.8em; }

/* ── Projekte ── */
.hss__projects { background: #fff; padding: 5em 0; }
.hss__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 2em; margin-bottom: 2em; flex-wrap: wrap; }
.hss__head .hss__h2 { margin: 0; font-size: clamp(1.6em, 3vw, 2.2em) !important; }
.hss__pgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4em; }
.hss__pcard {
  display: flex; flex-direction: column; border-radius: 18px; overflow: hidden; background: var(--cream); border: 1px solid var(--line);
  text-decoration: none; color: var(--ink); transition: transform .25s, box-shadow .25s;
}
.hss__pcard:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(60, 50, 30, .12); }
.hss__pimg { display: block; aspect-ratio: 4 / 3; overflow: hidden; }
.hss__pimg :deep(img) { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
.hss__pcard:hover .hss__pimg :deep(img) { transform: scale(1.05); }
.hss__pbody { display: grid; gap: .3em; padding: 1.1em 1.3em 1.3em; }
.hss__pbody small { font-size: .78em; color: var(--muted); }
.hss__pbody strong { font-family: var(--serif); font-weight: 500; font-size: 1.12em; line-height: 1.35; }

/* ── Presse ── */
.hss__press { padding: 4.5em 0; overflow: hidden; }
.hss__pressrow { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3em; align-items: center; }
.hss__presstext { font-family: var(--serif); font-size: 1.4em; line-height: 1.4; margin: 0 0 1em; }
.hss__clips { position: relative; height: 230px; display: block; }
.hss__clip {
  position: absolute; top: 50%; left: calc(4% + var(--i) * 18%); width: 26%; aspect-ratio: 3 / 4; background: #fff; padding: .4em;
  border-radius: 8px; box-shadow: 0 14px 30px rgba(60, 50, 30, .18); transform: translateY(-50%) rotate(calc((var(--i) - 2) * 4deg));
  transition: transform .35s ease;
}
.hss__clip :deep(img) { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; display: block; border-radius: 4px; }
.hss__clips:hover .hss__clip { transform: translateY(-56%) rotate(calc((var(--i) - 2) * 6deg)); }

/* ── Kontakt ── */
.hss__cta { padding: 0 0 5em; }
.hss__ctabox {
  display: grid; grid-template-columns: 1.3fr 1fr; gap: 2.5em; align-items: center; border-radius: 26px; padding: 3em 3.2em;
  background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%); color: #fff;
}
.hss__ctabox p:not(.hss__label) { margin: 0; line-height: 1.7; color: rgba(255, 255, 255, .86); }
.hss__ctaactions { display: grid; gap: .7em; justify-items: stretch; }
.hss__ctaactions .hss__btn { justify-content: center; }

/* ── Reveal ── */
.hss.is-anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.hss.is-anim .rv.is-in { opacity: 1; transform: none; }
.hss.is-anim .hss__acard.rv.is-in:hover, .hss.is-anim .hss__pcard.rv.is-in:hover { transform: translateY(-4px); }

/* ── Responsive ── */
@media (max-width: 1000px) {
  .hss__split, .hss__split--rev, .hss__rdbox, .hss__ctabox, .hss__pressrow { grid-template-columns: 1fr; gap: 2.5em; }
  .hss__split--rev .hss__flimgs { order: 2; }
  .hss__services { grid-template-columns: 1fr; gap: .6em; }
  .hss__aud, .hss__pgrid, .hss__benefits ul { grid-template-columns: 1fr; }
  .hss__collage { padding: 0 0 2.5em 1.5em; }
  .hss__rdtext, .hss__ctabox { padding: 2.2em 1.6em; }
}
@media (max-width: 760px) {
  .hss__hero { min-height: 0; }
  .hss__slides { height: 19em; }
  .hss__hero::after {
    inset: 0 0 auto 0; height: 19em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .85) 30%, rgba(248, 245, 239, 0) 65%);
  }
  .hss__inside { padding: 12em 1em 1.5em; }
  .hss__services { padding: 0 1em 2em; }
  .hss__wrap { padding: 0 1em; }
  .hss__facts { grid-template-columns: 1fr; }
  .hss__hs, .hss__fl, .hss__projects { padding: 3.5em 0; }
  .hss__benefits { padding: 1.6em 1.3em; }
  .hss__clips { height: 160px; }
}
@media (prefers-reduced-motion: reduce) { .hss__slide { transition: opacity .3s; transform: none; } }
</style>
