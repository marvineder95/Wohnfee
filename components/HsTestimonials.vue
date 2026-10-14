<script setup lang="ts">
// „Das sagen unsere Kunden“ – Kundenstimmen aus dem Dashboard. audience: nur Stimmen für diese
// Zielgruppe + „alle Seiten“ (Startseite: alle). Ohne sichtbare Stimmen wird nichts gerendert.
const props = withDefaults(defineProps<{ audience?: 'alle' | 'bautraeger' | 'makler' | 'privat' }>(), { audience: 'alle' })
const { t, isEn } = useLang()
const { testimonials } = useSiteContent()
const list = computed(() => testimonials.value
  .filter(x => props.audience === 'alle' || x.audience === 'alle' || x.audience === props.audience)
  .slice(0, 6))
</script>

<template>
  <ClientOnly>
    <section v-if="list.length" class="hstm">
      <div class="hstm__wrap">
        <p class="hstm__eyebrow">{{ t('Kundenstimmen', 'Testimonials') }}</p>
        <h2 class="hstm__h2">{{ t('Das sagen unsere Kunden', 'What our clients say') }}</h2>
        <ul class="hstm__grid">
          <li v-for="q in list" :key="q.id" class="hstm__card">
            <span v-if="q.rating" class="hstm__stars" :aria-label="`${q.rating} / 5`">{{ '★'.repeat(q.rating) }}</span>
            <blockquote>{{ (isEn && q.quoteEn) || q.quote }}</blockquote>
            <p class="hstm__who"><strong>{{ q.name }}</strong><span v-if="q.role">{{ q.role }}</span></p>
          </li>
        </ul>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.hstm { --green: #2f5d40; --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef; background: var(--cream); padding: 4.5em 0; }
.hstm__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hstm__eyebrow { display: flex; align-items: center; gap: 1em; margin: 0 0 1em; font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); }
.hstm__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hstm__h2 { font-family: var(--font-family-02, Gelasio, Georgia, serif) !important; font-weight: 500 !important; font-size: clamp(1.7em, 3vw, 2.3em) !important; margin: 0 0 1.4em !important; text-align: left !important; border: 0 !important; padding: 0 !important; color: var(--ink) !important; text-transform: none !important; }
.hstm__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 1.2em; }
.hstm__card { display: flex; flex-direction: column; gap: .9em; padding: 1.8em 1.7em; background: #fff; border: 1px solid var(--line); border-radius: 22px; }
.hstm__stars { color: #c8913a; letter-spacing: .12em; font-size: .9em; }
.hstm__card blockquote { margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important; box-shadow: none !important; font-style: normal !important; text-align: left !important; font-family: var(--font-family-02, Gelasio, Georgia, serif); font-size: 1.08em; line-height: 1.6; color: var(--ink); quotes: "„" "“"; }
.hstm__card blockquote::before { content: open-quote; }
.hstm__card blockquote::after { content: close-quote; }
.hstm__who { margin: auto 0 0; display: grid; gap: .1em; font-size: .9em; }
.hstm__who span { color: var(--muted); font-size: .92em; }
</style>
