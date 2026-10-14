<script setup lang="ts">
// Kennzahlen-Leiste (Startseite) – Werte aus dem Dashboard (Website-Inhalte → Zahlen & Fakten).
// Ohne Freischaltung wird nichts gerendert.
const { t, isEn } = useLang()
const { stats } = useSiteContent()
</script>

<template>
  <ClientOnly>
    <section v-if="stats.length" class="hsst" :aria-label="t('WOHNFEE in Zahlen', 'WOHNFEE in numbers')">
      <ul class="hsst__wrap">
        <li v-for="(s, i) in stats" :key="i">
          <strong>{{ (isEn && s.valueEn) || s.value }}</strong>
          <span>{{ (isEn && s.labelEn) || s.label }}</span>
        </li>
      </ul>
    </section>
  </ClientOnly>
</template>

<style scoped>
.hsst { --green: #2f5d40; background: var(--green); color: #fff; padding: 2.6em 0; }
.hsst__wrap {
  list-style: none; max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 1.6em 2em;
}
.hsst li { display: grid; gap: .3em; padding-left: 1.1em; border-left: 1px solid rgba(255, 255, 255, .28); }
.hsst strong { font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500; font-size: clamp(2em, 3.4vw, 2.7em); line-height: 1.05; font-variant-numeric: tabular-nums; }
.hsst span { font-size: .9em; line-height: 1.45; color: rgba(255, 255, 255, .82); }
</style>
