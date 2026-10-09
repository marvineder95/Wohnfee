<script setup lang="ts">
// Kontaktseite im Design der übrigen Seiten. Kontaktdaten kommen aus pages.json
// (Seite 10): „So erreichen Sie uns“ (dl), „Office“ (Adresse), „im Netz“ (Links).
const props = defineProps<{ page: any }>()

const flat = (els: any[]): any[] => els.flatMap(e => [e, ...flat(e.children || [])])
const els = computed(() => flat(props.page.columns?.main || []))
const h1 = computed(() => els.value.find(e => e.type === 'headline')?.headline || props.page.title)
const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// Telefon / E-Mail aus der Definitionsliste (Website-Link ist auf der eigenen Seite überflüssig)
const channels = computed(() => {
  const html: string = els.value.find(e => /<dl/.test(e.html || ''))?.html || ''
  const pairs = [...html.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)]
  return pairs.map((m) => {
    const href = m[2].match(/href="([^"]+)"/)?.[1] || ''
    return { label: strip(m[1]), value: strip(m[2]), href }
  }).filter(c => /^(tel|mailto):/.test(c.href))
    .map(c => ({ ...c, icon: c.href.startsWith('tel:') ? 'phone' : 'mail' }))
})

const office = computed(() => {
  const e = els.value.find(x => /office/i.test(x.headline || ''))
  if (!e) return null
  const lines = String(e.html || '').split(/<br\s*\/?>/).map(strip).filter(Boolean)
  return { title: e.headline, lines }
})

const socials = computed(() => {
  const html: string = els.value.find(e => /instagram|facebook/i.test(e.html || ''))?.html || ''
  return [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({
    href: m[1],
    label: /instagram/i.test(m[1]) ? 'Instagram' : /facebook/i.test(m[1]) ? 'Facebook' : strip(m[2]),
    icon: /instagram/i.test(m[1]) ? 'instagram' : 'facebook'
  }))
})

const TEAM = '/files/wohnfee/team/'
const faces = [TEAM + 'WohnFee_Brandingfotos_23-26.jpg', TEAM + 'WohnFee_Brandingfotos_23-6.jpg']

const shortcuts = [
  { to: '/faq.html', icon: 'search', title: 'Häufige Fragen', text: 'Ablauf, Kosten & Leistungen – vieles ist schon beantwortet.' },
  { to: '/home-staging/preise.html', icon: 'euro', title: 'Preise & Pakete', text: 'Unsere Home-Staging-Pakete im Überblick.' },
  { to: '/team.html', icon: 'users', title: 'Unser Team', text: 'Lernen Sie die Menschen hinter WOHNFEE kennen.' }
]

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
</script>

<template>
  <div ref="root" class="hsc2">
    <section class="hsc2__main">
      <div class="hsc2__wrap hsc2__grid">
        <!-- ── Kontaktwege ── -->
        <div class="hsc2__info">
          <p class="hsc2__eyebrow">Über uns</p>
          <h1 class="hsc2__h1">{{ h1 }}</h1>
          <p class="hsc2__lead">
            Erzählen Sie uns von Ihrem Projekt – ob Home Staging, Redesign oder Furniture Leasing.
            Wir freuen uns auf Ihre Nachricht.
          </p>

          <div class="hsc2__people">
            <span class="hsc2__faces">
              <span v-for="f in faces" :key="f" class="hsc2__face">
                <HsImg :src="f" alt="" sizes="xs:120px sm:120px md:120px lg:120px xl:120px xxl:120px 2xl:120px" />
              </span>
            </span>
            <span>Ihre Ansprechpartnerinnen – <NuxtLink to="/team.html">das Team kennenlernen</NuxtLink></span>
          </div>

          <ul class="hsc2__channels">
            <li v-for="c in channels" :key="c.href">
              <a :href="c.href" class="hsc2__channel">
                <span class="hsc2__icon"><WfIcon :name="c.icon" :size="20" /></span>
                <span class="hsc2__ctext"><small>{{ c.label }}</small><strong>{{ c.value }}</strong></span>
                <WfIcon name="arrow" :size="16" class="hsc2__carrow" />
              </a>
            </li>
            <li v-if="office" class="hsc2__channel hsc2__channel--static">
              <span class="hsc2__icon"><WfIcon name="pin" :size="20" /></span>
              <span class="hsc2__ctext">
                <small>{{ office.title }}</small>
                <strong v-for="(l, i) in office.lines" :key="i" :class="{ 'is-sub': i > 0 }">{{ l }}</strong>
              </span>
            </li>
          </ul>

          <div v-if="socials.length" class="hsc2__social">
            <span>Folgen Sie uns</span>
            <a v-for="s in socials" :key="s.href" :href="s.href" target="_blank" rel="noopener" :aria-label="s.label">
              <svg v-if="s.icon === 'instagram'" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3.5H8V21h3.5v-7.5H14l.5-3.5h-3V7.8c0-.7.5-1.3 1.3-1.3H15V3Z" /></svg>
              {{ s.label }}
            </a>
          </div>
        </div>

        <!-- ── Formular ── -->
        <div class="hsc2__form">
          <AppContactForm lang="de" />
        </div>
      </div>
    </section>

    <!-- ── Abkürzungen ── -->
    <section class="hsc2__more">
      <div class="hsc2__wrap">
        <p class="hsc2__divider"><span>Vorab informieren</span></p>
        <div class="hsc2__sgrid">
          <NuxtLink v-for="s in shortcuts" :key="s.to" :to="s.to" class="hsc2__short">
            <span class="hsc2__icon"><WfIcon :name="s.icon" :size="20" /></span>
            <span>
              <strong>{{ s.title }}</strong>
              <small>{{ s.text }}</small>
            </span>
            <WfIcon name="arrow" :size="16" class="hsc2__carrow" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsc2 {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsc2__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsc2 h1 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; text-transform: none; }

.hsc2__main {
  min-height: calc(100vh - var(--hs-head, 108px)); min-height: calc(100svh - var(--hs-head, 108px));
  display: flex; align-items: center; padding: 3em 0;
  background: radial-gradient(circle at 85% 25%, #efe9dc 0%, var(--cream) 55%);
  box-sizing: border-box;
}
.hsc2__grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: 4em; align-items: center; width: 100%; }

.hsc2__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.2em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsc2__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsc2__h1 { font-size: clamp(2.4em, 5vw, 3.6em) !important; line-height: 1.08; margin: 0 0 .4em; }
.hsc2__lead { font-size: 1.02em; line-height: 1.7; color: var(--muted); margin: 0 0 1.5em; max-width: 30em; }

.hsc2__people { display: flex; align-items: center; gap: .9em; margin-bottom: 1.6em; font-size: .88em; color: var(--muted); }
.hsc2__people a { color: var(--green); font-weight: 600; }
.hsc2__faces { display: flex; flex: none; }
.hsc2__face {
  width: 2.8em; height: 2.8em; border-radius: 50%; overflow: hidden; display: block; background: #fff;
  border: 3px solid var(--cream); margin-right: -.6em; box-shadow: 0 4px 10px rgba(60, 50, 30, .15);
}
/* Ganzkörper-Porträts → aufs Gesicht zoomen */
.hsc2__face :deep(img) { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; display: block; transform: scale(2.3); transform-origin: 50% 14%; }

.hsc2__channels { list-style: none; margin: 0 0 1.4em; padding: 0; display: grid; gap: .65em; }
.hsc2__channel {
  display: flex; align-items: center; gap: 1em; padding: .9em 1.1em; border-radius: 16px; background: #fff;
  border: 1px solid var(--line); text-decoration: none; color: var(--ink); transition: border-color .15s, box-shadow .2s, transform .2s;
}
a.hsc2__channel:hover { border-color: var(--green); box-shadow: 0 10px 24px rgba(60, 50, 30, .08); transform: translateX(3px); }
.hsc2__icon {
  flex: none; width: 2.7em; height: 2.7em; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--green-soft); color: var(--green);
}
.hsc2__ctext { display: grid; gap: .1em; flex: 1; min-width: 0; }
.hsc2__ctext small { font-size: .72em; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; color: var(--muted); }
.hsc2__ctext strong { font-weight: 600; font-size: 1.02em; overflow-wrap: anywhere; }
.hsc2__ctext strong.is-sub { font-weight: 400; font-size: .92em; color: var(--muted); }
.hsc2__carrow { flex: none; color: var(--green); opacity: .5; transition: opacity .15s, transform .2s; }
a:hover > .hsc2__carrow { opacity: 1; transform: translateX(3px); }

.hsc2__social { display: flex; align-items: center; flex-wrap: wrap; gap: .5em; font-size: .85em; color: var(--muted); }
.hsc2__social span { margin-right: .3em; }
.hsc2__social a {
  display: inline-flex; align-items: center; gap: .45em; padding: .5em .95em; border-radius: 999px; border: 1px solid var(--line);
  background: #fff; color: var(--ink); text-decoration: none; font-weight: 600; transition: background .15s, color .15s, border-color .15s;
}
.hsc2__social a:hover { background: var(--green); border-color: var(--green); color: #fff; }
.hsc2__social svg { width: 1.15em; height: 1.15em; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

/* ── Abkürzungen ── */
.hsc2__more { padding: 3.5em 0 4.5em; background: #fff; }
.hsc2__divider {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 1.8em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsc2__divider::before, .hsc2__divider::after { content: ""; width: 4em; height: 1px; background: var(--green); }
.hsc2__sgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2em; }
.hsc2__short {
  display: flex; align-items: center; gap: 1em; padding: 1.2em 1.3em; border-radius: 18px; background: var(--cream);
  border: 1px solid var(--line); text-decoration: none; color: var(--ink); transition: border-color .15s, box-shadow .2s, transform .2s;
}
.hsc2__short:hover { border-color: var(--green); box-shadow: 0 12px 28px rgba(60, 50, 30, .1); transform: translateY(-3px); }
.hsc2__short > span:nth-child(2) { display: grid; gap: .2em; flex: 1; }
.hsc2__short strong { font-family: var(--serif); font-weight: 500; font-size: 1.12em; }
.hsc2__short small { font-size: .84em; line-height: 1.45; color: var(--muted); }

@media (max-width: 1000px) {
  .hsc2__main { min-height: 0; padding: 2.5em 0 3em; }
  .hsc2__grid { grid-template-columns: 1fr; gap: 2.5em; }
  .hsc2__sgrid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .hsc2__wrap { padding: 0 1em; }
}
</style>
