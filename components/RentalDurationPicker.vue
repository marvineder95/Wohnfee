<script setup lang="ts">
// Mietdauer-Auswahl (eine Dauer für den ganzen Warenkorb) mit Rabatt je Stufe.
// Rabattstaffel aus den Konditionen (shared/rental-pricing.ts, useRentalCatalog().tiers).
import { DURATION_CHOICES, discountFor } from '~~/shared/rental-pricing'

const props = withDefaults(defineProps<{ compact?: boolean; label?: boolean }>(), { compact: false, label: true })
const { isEn, t } = useLang()
const cart = useRentalCart()
const { tiers } = useRentalCatalog()

// Schnellwahl + aktuell gewählte Dauer (falls im Checkout frei gewählt, z. B. 9 Monate)
const choices = computed(() => [...new Set([...DURATION_CHOICES, cart.months.value])].sort((a, b) => a - b))
const pct = (m: number) => discountFor(m, tiers.value)
const label = (m: number) => m % 12 === 0 && m >= 12
  ? (isEn.value ? `${m / 12} yr${m > 12 ? 's' : ''}` : `${m / 12} J.`)
  : (isEn.value ? `${m} mo.` : `${m} Mon.`)
const best = computed(() => Math.max(0, ...tiers.value.map(x => x.pct)))
</script>

<template>
  <div class="rdp" :class="{ 'is-compact': props.compact }">
    <p v-if="props.label" class="rdp__label">
      <span>{{ t('Mietdauer', 'Rental period') }}</span>
      <small v-if="best">{{ t(`Je länger, desto günstiger – bis −${best} %`, `The longer, the cheaper – up to −${best}%`) }}</small>
    </p>
    <div class="rdp__chips" role="radiogroup" :aria-label="t('Mietdauer', 'Rental period')">
      <button v-for="m in choices" :key="m" type="button" role="radio" class="rdp__chip"
              :class="{ 'is-on': cart.months.value === m }" :aria-checked="cart.months.value === m"
              @click="cart.setMonths(m)">
        <span>{{ label(m) }}</span>
        <em v-if="pct(m)">−{{ pct(m).toLocaleString(isEn ? 'en-IE' : 'de-AT') }} %</em>
      </button>
    </div>
  </div>
</template>

<style scoped>
.rdp { --green: #2f5d40; --green-soft: #eef3ee; --ink: #2b2b28; --muted: #7a7568; --line: #e6e0d2; --gold: #a8741f; min-width: 0; }
.rdp__label { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2em .7em; margin: 0 0 .5em; font-size: .82em; font-weight: 600; color: var(--ink); text-align: left; }
.rdp__label small { font-weight: 400; color: var(--muted); font-size: .92em; }
.rdp__chips { display: flex; flex-wrap: wrap; gap: .4em; }
.rdp__chip {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: .05em;
  min-width: 4.4em; padding: .45em .7em; border: 1px solid var(--line); border-radius: 12px; background: #fff;
  font: inherit; font-size: .82em; color: var(--ink); cursor: pointer; line-height: 1.25;
  transition: border-color .15s, background .15s, color .15s;
}
.rdp__chip span { font-weight: 600; white-space: nowrap; }
.rdp__chip em { font-style: normal; font-size: .82em; font-weight: 700; color: var(--gold); white-space: nowrap; }
.rdp__chip:hover { border-color: var(--green); }
.rdp__chip.is-on { border-color: var(--green); background: var(--green); color: #fff; }
.rdp__chip.is-on em { color: #f3dcae; }
.rdp__chip:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.rdp.is-compact .rdp__chip { min-width: 3.6em; padding: .35em .5em; font-size: .76em; }
</style>
