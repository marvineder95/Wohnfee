<script setup lang="ts">
// Nachhaltigkeit – fester Text, nur Aussagen, die WOHNFEE bestätigt hat (Okt. 2026):
// Möbel werden in vielen Projekten wiederverwendet, nach jedem Einsatz gereinigt und geprüft,
// Reinigung und kleine Reparaturen im eigenen Haus, Lieferung mit eigener Spedition.
const { t } = useLang()
const points = computed(() => [
  { icon: 'leaf', title: t('Wiederverwenden statt neu kaufen', 'Reuse instead of buying new'), text: t('Unsere Möbel und Accessoires sind nicht für einen einzigen Einsatz gedacht – sie richten Projekt für Projekt neue Räume ein.', 'Our furniture and decor are not made for a single use – they furnish new spaces project after project.') },
  { icon: 'check', title: t('Nach jedem Einsatz gepflegt', 'Cared for after every use'), text: t('Jedes Stück wird nach der Abholung gereinigt und geprüft, damit es so lange wie möglich im Einsatz bleibt.', 'Every piece is cleaned and checked after pick-up so it stays in use for as long as possible.') },
  { icon: 'truck', title: t('Alles aus einer Hand', 'All in one hand'), text: t('Reinigung, kleine Reparaturen und Transport erledigen wir selbst – mit eigenem Team und eigener Spedition.', 'We handle cleaning, minor repairs and transport ourselves – with our own team and our own logistics.') }
])
</script>

<template>
  <section class="hssu">
    <div class="hssu__wrap">
      <div class="hssu__intro">
        <p class="hssu__eyebrow">{{ t('Nachhaltigkeit', 'Sustainability') }}</p>
        <h2 class="hssu__h2">{{ t('Schön eingerichtet – und immer wieder verwendet', 'Beautifully furnished – and used again and again') }}</h2>
        <p class="hssu__lead">{{ t('Mieten statt kaufen heißt bei uns: Möbel, die lange leben. Was heute eine Musterwohnung einrichtet, macht morgen das nächste Zuhause wohnlich.', 'Renting instead of buying means furniture that lives long. What furnishes a show flat today makes the next home cosy tomorrow.') }}</p>
      </div>
      <ul class="hssu__points">
        <li v-for="p in points" :key="p.title">
          <span class="hssu__icon"><WfIcon :name="p.icon" :size="18" /></span>
          <div><strong>{{ p.title }}</strong><p>{{ p.text }}</p></div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.hssu { --green: #2f5d40; --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; background: #eef3ee; padding: 4.2em 0; }
.hssu__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 2.4em 4em; align-items: center; }
.hssu__eyebrow { display: flex; align-items: center; gap: 1em; margin: 0 0 1em; font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); }
.hssu__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hssu__h2 { font-family: var(--font-family-02, Gelasio, Georgia, serif) !important; font-weight: 500 !important; font-size: clamp(1.7em, 3vw, 2.3em) !important; line-height: 1.2 !important; margin: 0 0 .6em !important; text-align: left !important; border: 0 !important; padding: 0 !important; color: var(--ink) !important; text-transform: none !important; text-wrap: balance; }
.hssu__lead { margin: 0; color: var(--muted); line-height: 1.7; max-width: 34em; }
.hssu__points { list-style: none; margin: 0; padding: 0; display: grid; gap: 1em; }
.hssu__points li { display: flex; gap: 1em; align-items: flex-start; padding: 1.2em 1.3em; background: #fff; border-radius: 18px; }
.hssu__icon { flex: none; width: 2.6em; height: 2.6em; border-radius: 12px; display: grid; place-items: center; background: #eef3ee; color: var(--green); }
.hssu__points strong { display: block; margin-bottom: .2em; color: var(--ink); }
.hssu__points p { margin: 0; color: var(--muted); font-size: .92em; line-height: 1.6; }
@media (max-width: 820px) { .hssu__wrap { grid-template-columns: 1fr; } }
</style>
