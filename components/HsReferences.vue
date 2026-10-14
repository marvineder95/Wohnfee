<script setup lang="ts">
// Logo-Leiste „Diese Unternehmen vertrauen uns“ (Startseite, Für Bauträger).
// Kunden-Logos aus dem Dashboard (Partner → Referenzen, „Auf der Website zeigen“).
// Ohne sichtbare Referenzen wird nichts gerendert.
const { t } = useLang()
const { references } = usePartners()
</script>

<template>
  <ClientOnly>
    <section v-if="references.length" class="hsref" :aria-label="t('Referenzen', 'References')">
      <div class="hsref__wrap">
        <p class="hsref__eyebrow">{{ t('Diese Unternehmen vertrauen uns', 'Trusted by') }}</p>
        <ul class="hsref__logos">
          <li v-for="r in references" :key="r.id">
            <component :is="r.website ? 'a' : 'span'" :href="r.website || undefined" :target="r.website ? '_blank' : undefined"
                       :rel="r.website ? 'noopener' : undefined" class="hsref__item" :title="r.name">
              <img v-if="r.logo" :src="r.logo" :alt="r.name" loading="lazy">
              <span v-else class="hsref__name">{{ r.name }}</span>
            </component>
          </li>
        </ul>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.hsref { --green: #2f5d40; --ink: #2b2b28; --line: #e6e0d2; background: #fff; border-block: 1px solid var(--line); padding: 2.4em 0; }
.hsref__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsref__eyebrow {
  display: flex; align-items: center; justify-content: center; gap: 1.2em; margin: 0 0 1.6em;
  font-size: .7em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink);
}
.hsref__eyebrow::before, .hsref__eyebrow::after { content: ""; width: 3em; height: 1px; background: var(--green); }
.hsref__logos { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 1.6em 3em; }
.hsref__item { display: flex; align-items: center; justify-content: center; height: 3.4em; text-decoration: none; }
.hsref__item img {
  max-height: 100%; max-width: 9.5em; object-fit: contain;
  filter: grayscale(1); opacity: .7; transition: filter .25s, opacity .25s;
}
.hsref__item:hover img, .hsref__item:focus-visible img { filter: none; opacity: 1; }
.hsref__name { font-family: var(--font-family-02, Gelasio, Georgia, serif); font-size: 1.15em; color: #6f6a5e; }
@media (max-width: 560px) { .hsref__logos { gap: 1.2em 2em; } .hsref__item { height: 2.6em; } .hsref__item img { max-width: 7.5em; } }
</style>
