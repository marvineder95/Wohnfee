<script setup lang="ts">
import { HS_AUDIENCES } from '~~/shared/home-staging-audiences'
// Hero + Zielgruppen-Karten für die Home-Staging-Seite (ersetzt das alte Slider-Bild)
const usps = [
  { icon: 'home', text: 'Schnellerer Verkauf\noder Vermietung' },
  { icon: 'diamond', text: 'Hochwertige &\nstilvolle Einrichtung' },
  { icon: 'truck', text: 'Alles aus\neiner Hand' }
]

const cards = HS_AUDIENCES.map(a => ({ title: a.title, text: a.text, to: a.route, img: a.img }))

// Hero füllt den Viewport unterhalb des (sticky) Headers – dessen Höhe variiert je Breakpoint
const root = ref<HTMLElement | null>(null)
function syncHeaderHeight() {
  const h = document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight
  if (h && root.value) root.value.style.setProperty('--hs-head', `${h}px`)
}
onMounted(() => {
  syncHeaderHeight()
  window.addEventListener('resize', syncHeaderHeight)
})
onUnmounted(() => window.removeEventListener('resize', syncHeaderHeight))

function scrollToContent(e: Event) {
  e.preventDefault()
  document.getElementById('hs-leistungen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div ref="root" class="hs">
    <section class="hs__hero">
      <NuxtImg class="hs__bg" src="/files/wohnfee/bilder/homestaging/Liam 61.jpg"
               alt="Hell eingerichtetes Wohnzimmer nach einem WOHNFEE Home Staging"
               sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:1600px 2xl:1920px"
               loading="eager" fetchpriority="high" />
      <div class="hs__inside">
        <p class="hs__eyebrow">Home Staging</p>
        <h2 class="hs__title">Räume, die<br>mehr bewirken.</h2>
        <p class="hs__lead">
          Wir inszenieren Immobilien mit stilvollen Einrichtungskonzepten und schaffen Räume,
          in denen sich Menschen sofort zuhause fühlen – für einen überzeugenden ersten Eindruck
          und einen erfolgreichen Verkauf oder eine schnelle Vermietung.
        </p>
        <div class="hs__actions">
          <NuxtLink to="/kontakt.html" class="hs__btn hs__btn--primary">Jetzt Beratung anfragen</NuxtLink>
          <a href="#hs-leistungen" class="hs__btn hs__btn--ghost" @click="scrollToContent">Unsere Leistungen</a>
        </div>
        <ul class="hs__usps">
          <li v-for="u in usps" :key="u.icon">
            <span class="hs__uspicon"><WfIcon :name="u.icon" :size="20" /></span>
            <span class="hs__usptext">{{ u.text }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="hs__target">
      <p class="hs__divider"><span>Für wen wir da sind</span></p>
      <h2 class="hs__ttitle">Maßgeschneiderte Lösungen für jede Anforderung.</h2>
      <div class="hs__cards">
        <NuxtLink v-for="c in cards" :key="c.to" :to="c.to" class="hs__card">
          <NuxtImg :src="c.img" :alt="c.title" class="hs__cardimg"
                   sizes="xs:100vw sm:100vw md:50vw lg:400px xl:400px xxl:400px 2xl:400px" loading="lazy" />
          <div class="hs__cardbody">
            <div>
              <h3>{{ c.title }}</h3>
              <p>{{ c.text }}</p>
            </div>
            <span class="hs__cardarrow"><WfIcon name="arrow" :size="16" /></span>
          </div>
        </NuxtLink>
      </div>
    </section>
    <span id="hs-leistungen" class="hs__anchor" />
  </div>
</template>

<style scoped>
.hs {
  --green: #2f5d40; --green-dark: #26492f; --ink: #2b2b28; --muted: #5f5b52;
  --line: #e6e0d2; --cream: #f8f5ef;
  background: var(--cream);
}

/* ── Hero: Vollbild-Foto mit hellem Verlauf links ── */
.hs__hero {
  position: relative; overflow: hidden;
  min-height: max(600px, calc(100vh - var(--hs-head, 108px)));
  min-height: max(600px, calc(100svh - var(--hs-head, 108px)));
  display: flex; align-items: center;
}
.hs__bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: 65% 55%;
}
.hs__hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(248, 245, 239, .97) 0%, rgba(248, 245, 239, .9) 30%,
      rgba(248, 245, 239, .55) 46%, rgba(248, 245, 239, 0) 62%),
    linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, 0) 14%);
}
.hs__inside {
  position: relative; z-index: 1;
  width: 100%; max-width: 1240px; margin: 0 auto; padding: 4em 1.5em 4.5em;
  box-sizing: border-box;
}
.hs__inside > * { max-width: 34em; }

.hs__eyebrow {
  display: flex; align-items: center; gap: 1em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase;
  color: var(--ink); font-weight: 600; margin: 0 0 1.3em;
}
.hs__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }

.hs__title {
  font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500;
  font-size: clamp(2.4em, 5vw, 3.6em); line-height: 1.08; letter-spacing: -.01em;
  color: var(--ink); margin: 0 0 .45em; padding: 0; border: 0; text-align: left;
}
.hs__lead { font-size: 1em; line-height: 1.7; color: var(--muted); margin: 0 0 1.8em; }

.hs__actions { display: flex; flex-wrap: wrap; gap: .8em; margin-bottom: 2.4em; }
.hs__btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: .85em 1.9em; border-radius: 999px; font-weight: 600; font-size: .9em;
  text-decoration: none; transition: background .15s, color .15s, border-color .15s, transform .15s;
}
.hs__btn--primary { background: var(--green); color: #fff; border: 1px solid var(--green); }
.hs__btn--primary:hover { background: var(--green-dark); color: #fff; transform: translateY(-1px); }
.hs__btn--ghost { background: rgba(255, 255, 255, .6); color: var(--ink); border: 1px solid var(--ink); }
.hs__btn--ghost:hover { background: #fff; color: var(--green); border-color: var(--green); }

.hs__usps { list-style: none; margin: 0; padding: 0; display: flex; }
.hs__usps li {
  display: flex; flex-direction: column; gap: .7em;
  padding: 0 1.6em; border-left: 1px solid var(--line);
  font-size: .82em; line-height: 1.45; color: var(--ink);
}
.hs__usps li:first-child { padding-left: 0; border-left: 0; }
.hs__usptext { white-space: pre-line; }
.hs__uspicon {
  width: 2.8em; height: 2.8em; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, .75); border: 1px solid #d9d3c4; color: var(--green);
}

/* ── Zielgruppen ── */
.hs__target { max-width: 1240px; margin: 0 auto; padding: 1.5em 1.5em 3.5em; box-sizing: border-box; }
.hs__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600;
  color: var(--ink); margin: 0 0 .9em;
}
.hs__divider::before, .hs__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hs__ttitle {
  font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500;
  font-size: clamp(1.5em, 3vw, 2.1em); line-height: 1.25; text-align: center;
  color: var(--ink); margin: 0 0 1.4em; padding: 0; border: 0;
}
.hs__cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4em; }
.hs__card {
  display: flex; flex-direction: column; background: #fff; border-radius: 10px; overflow: hidden;
  text-decoration: none; color: var(--ink);
  box-shadow: 0 2px 14px rgba(60, 50, 30, .08);
  transition: transform .2s ease, box-shadow .2s ease;
}
.hs__card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(60, 50, 30, .14); }
.hs__cardimg { width: 100%; aspect-ratio: 16 / 7.5; object-fit: cover; display: block; }
.hs__cardbody { display: flex; align-items: center; justify-content: space-between; gap: 1em; padding: 1.1em 1.3em 1.3em; }
.hs__cardbody h3 {
  font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500;
  font-size: 1.15em; margin: 0 0 .35em; color: var(--ink); text-align: left;
}
.hs__cardbody p { text-align: left; }
.hs__cardbody p { font-size: .82em; line-height: 1.5; color: var(--muted); margin: 0; }
.hs__cardarrow {
  flex: none; width: 2.3em; height: 2.3em; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: #eef3ee; color: var(--green); transition: background .15s, color .15s;
}
.hs__card:hover .hs__cardarrow { background: var(--green); color: #fff; }

.hs__anchor { display: block; position: relative; top: -140px; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .hs__hero { min-height: 0; align-items: flex-end; }
  .hs__bg { height: 22em; object-position: 72% 80%; }
  .hs__hero::after {
    inset: 0 0 auto 0; height: 22em;
    background: linear-gradient(0deg, var(--cream) 0%, rgba(248, 245, 239, .85) 30%,
      rgba(248, 245, 239, 0) 65%);
  }
  .hs__inside { padding: 14em 1em 2.5em; }
  .hs__cards { grid-template-columns: 1fr; }
  .hs__target { padding: 1.5em 1em 2.5em; }
}
@media (max-width: 560px) {
  .hs__usps { flex-direction: column; gap: 1em; }
  .hs__usps li { flex-direction: row; align-items: center; padding: 0; border: 0; }
  .hs__usptext { white-space: normal; }
}
</style>
