<script setup lang="ts">
// Rechtstexte (Impressum, später Datenschutz) im Design der übrigen Seiten.
// Der Inhalt bleibt ein HTML-Block in pages.json; jede <h2>-Sektion wird zu
// einer Karte, <dl>-Listen zu übersichtlichen Zeilen.
const props = defineProps<{ page: any, eyebrow?: string }>()

const block = computed(() => (props.page.columns?.main || []).find((e: any) => e.type === 'text') || {})
const title = computed(() => block.value.headline || props.page.title)

const sections = computed(() => {
  const html: string = block.value.html || ''
  const parts = html.split(/(?=<h2[^>]*>)/).map(s => s.trim()).filter(Boolean)
  return parts.map((p, i) => {
    const m = p.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/)
    const heading = m ? m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : ''
    const body = m ? p.slice(m[0].length) : p
    const slug = 'abschnitt-' + (heading.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || i)
    return { heading, body, slug }
  })
})

function jump(slug: string, e: Event) {
  e.preventDefault()
  const t = document.getElementById(slug)
  if (!t) return
  const off = (document.querySelector<HTMLElement>('.headerwrap')?.offsetHeight || 108) + 16
  window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' })
}
</script>

<template>
  <div class="hsl">
    <section class="hsl__head">
      <div class="hsl__wrap">
        <p class="hsl__eyebrow">{{ eyebrow || 'Rechtliches' }}</p>
        <h1 class="hsl__h1">{{ title }}</h1>
        <nav v-if="sections.filter(s => s.heading).length > 1" class="hsl__toc" aria-label="Inhalt">
          <a v-for="s in sections.filter(x => x.heading)" :key="s.slug" :href="`#${s.slug}`" @click="jump(s.slug, $event)">{{ s.heading }}</a>
        </nav>
      </div>
    </section>

    <section class="hsl__body">
      <div class="hsl__wrap hsl__list">
        <article v-for="s in sections" :id="s.slug" :key="s.slug" class="hsl__card">
          <h2 v-if="s.heading" class="hsl__h2">{{ s.heading }}</h2>
          <div class="hsl__rte" v-html="s.body" />
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsl {
  --green: #2f5d40; --green-soft: #eef3ee; --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsl__wrap { max-width: 920px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsl h1, .hsl h2 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; text-transform: none; }

.hsl__head { padding: 4em 0 2em; background: radial-gradient(circle at 85% 0%, #efe9dc 0%, var(--cream) 60%); }
.hsl__eyebrow {
  display: flex; align-items: center; gap: 1em; margin: 0 0 1.1em;
  font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsl__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsl__h1 { font-size: clamp(2.3em, 5vw, 3.4em) !important; line-height: 1.08; margin: 0 0 .7em; }
.hsl__toc { display: flex; flex-wrap: wrap; gap: .45em; }
.hsl__toc a {
  padding: .45em .95em; border-radius: 999px; border: 1px solid var(--line); background: #fff; color: var(--ink);
  text-decoration: none; font-size: .82em; font-weight: 600; transition: background .15s, color .15s, border-color .15s;
}
.hsl__toc a:hover { background: var(--green); border-color: var(--green); color: #fff; }

.hsl__body { padding: 1em 0 4.5em; }
.hsl__list { display: grid; gap: 1.1em; }
.hsl__card { background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 1.7em 1.9em; }
.hsl__h2 { font-size: 1.4em !important; margin: 0 0 .8em; }

.hsl__rte :deep(p) { margin: 0 0 .9em; line-height: 1.75; color: var(--muted); text-align: left !important; }
.hsl__rte :deep(p:last-child) { margin-bottom: 0; }
.hsl__rte :deep(a) { color: var(--green); font-weight: 600; text-decoration: none; border-bottom: 1px solid #b9c9bc; }
.hsl__rte :deep(a:hover) { border-color: var(--green); }
.hsl__rte :deep(ul) { padding-left: 1.2em; color: var(--muted); line-height: 1.75; }
.hsl__rte :deep(dl) { display: grid; grid-template-columns: minmax(180px, 34%) 1fr; margin: 0; }
.hsl__rte :deep(dl + p), .hsl__rte :deep(p + dl) { margin-top: 1em; }
.hsl__rte :deep(dt), .hsl__rte :deep(dd) { padding: .7em 0; border-top: 1px solid #f0ebe0; margin: 0; text-align: left; }
.hsl__rte :deep(dt:first-of-type), .hsl__rte :deep(dd:first-of-type) { border-top: 0; }
.hsl__rte :deep(dt) { font-size: .78em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding-right: 1.2em; line-height: 1.6; }
.hsl__rte :deep(dd) { font-size: .98em; line-height: 1.6; color: var(--ink); }

@media (max-width: 640px) {
  .hsl__wrap { padding: 0 1em; }
  .hsl__head { padding-top: 2.5em; }
  .hsl__card { padding: 1.3em 1.2em; }
  .hsl__rte :deep(dl) { grid-template-columns: 1fr; }
  .hsl__rte :deep(dt) { padding-bottom: 0; }
  .hsl__rte :deep(dd) { border-top: 0; padding-top: .2em; }
}
</style>
