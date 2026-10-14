<script setup lang="ts">
// Zahlen & Fakten für Bauträger (Seite „Für Bauträger“) – aus dem Dashboard, nur wenn freigeschaltet.
const { t, isEn, lp } = useLang()
const { developer } = useSiteContent()
</script>

<template>
  <ClientOnly>
    <section v-if="developer.length" class="hsdf">
      <div class="hsdf__wrap">
        <div class="hsdf__intro">
          <p class="hsdf__eyebrow">{{ t('Für Bauträger', 'For developers') }}</p>
          <h2 class="hsdf__h2">{{ t('Musterwohnungen, die sich rechnen', 'Show flats that pay off') }}</h2>
          <NuxtLink :to="lp('/kontakt.html')" class="hsdf__btn">{{ t('Projekt besprechen', 'Discuss your project') }}</NuxtLink>
        </div>
        <ul class="hsdf__facts">
          <li v-for="(f, i) in developer" :key="i">
            <strong>{{ (isEn && f.valueEn) || f.value }}</strong>
            <span>{{ (isEn && f.labelEn) || f.label }}</span>
          </li>
        </ul>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.hsdf { --green: #2f5d40; --ink: #2b2b28; --line: #e6e0d2; background: #fff; border-block: 1px solid var(--line); padding: 3.6em 0; }
.hsdf__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.4fr); gap: 2.4em 3.5em; align-items: center; }
.hsdf__eyebrow { display: flex; align-items: center; gap: 1em; margin: 0 0 1em; font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink); }
.hsdf__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsdf__h2 { font-family: var(--font-family-02, Gelasio, Georgia, serif) !important; font-weight: 500 !important; font-size: clamp(1.6em, 2.8vw, 2.1em) !important; margin: 0 0 1em !important; text-align: left !important; border: 0 !important; padding: 0 !important; color: var(--ink) !important; text-transform: none !important; }
.hsdf__btn { display: inline-flex; padding: .8em 1.7em; border-radius: 999px; background: var(--green); color: #fff; font-weight: 600; font-size: .9em; text-decoration: none; }
.hsdf__btn:hover { background: #26492f; color: #fff; }
.hsdf__facts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 1.4em; }
.hsdf__facts li { display: grid; gap: .35em; padding: 1.3em 1.2em; border-radius: 18px; background: #f3f7f3; }
.hsdf__facts strong { font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500; font-size: 1.9em; line-height: 1.05; color: var(--green); }
.hsdf__facts span { font-size: .88em; line-height: 1.45; color: #4f4b43; }
@media (max-width: 820px) { .hsdf__wrap { grid-template-columns: 1fr; } }
</style>
