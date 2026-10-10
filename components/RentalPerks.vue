<script setup lang="ts">
// Fortschrittsanzeige im Warenkorb/Checkout: Mindestmietwert → Gratis-Transport.
// Regeln & Schwellen: shared/rental-perks.ts
import {
  rentalPerks, MIN_MONTHLY, FREE_TRANSPORT_FROM, FREE_MIN_MONTHS, OTHER_STATES_DISCOUNT,
  type PerkLine
} from '~~/shared/rental-perks'

// months: gewählte Mietdauer (nur im Checkout bekannt) – Vorteile erst ab 3 Monaten
const props = defineProps<{ lines: PerkLine[]; months?: number | null }>()
const { isEn, t } = useLang()

const p = computed(() => rentalPerks(props.lines, props.months))
const hasShortLines = computed(() => !props.months && props.lines.some((l) => l.durationMonths < FREE_MIN_MONTHS))
const discountPct = Math.round(OTHER_STATES_DISCOUNT * 100)
// Position des Mindestwert-Markers auf dem Balken (0–350)
const minMarker = `${(MIN_MONTHLY / FREE_TRANSPORT_FROM) * 100}%`

function eur(v: number) {
  return v.toLocaleString(isEn.value ? 'en-IE' : 'de-AT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: v % 1 ? 2 : 0
  })
}
</script>

<template>
  <div class="rp" :class="{ 'is-done': p.transportUnlocked }">
    <!-- Statuszeile -->
    <p v-if="p.transportUnlocked" class="rp__msg rp__msg--done">
      <span class="rp__ico"><WfIcon name="truck" :size="15" /></span>
      <span>
        <strong>{{ t('Gratis-Transport in Wien freigeschaltet!', 'Free transport in Vienna unlocked!') }}</strong>
        {{ t(`Für alle anderen Bundesländer: −${discountPct} % auf Lieferung & Abholung.`, `All other Austrian states: −${discountPct}% on delivery & pick-up.`) }}
      </span>
    </p>
    <p v-else-if="!p.minReached" class="rp__msg rp__msg--warn">
      <span class="rp__ico"><WfIcon name="bag" :size="14" /></span>
      <span>
        {{ t('Noch', 'Add') }} <strong>{{ eur(p.missingMin) }}</strong>
        {{ t(`bis zum Mindestmietwert von ${eur(MIN_MONTHLY)} / Monat.`, `more to reach the minimum rental value of ${eur(MIN_MONTHLY)} / month.`) }}
      </span>
    </p>
    <p v-else-if="p.tooShort" class="rp__msg">
      <span class="rp__ico"><WfIcon name="truck" :size="15" /></span>
      <span>
        {{ t(`Gratis-Transport in Wien bzw. −${discountPct} % gibt es ab einer Mietdauer von ${FREE_MIN_MONTHS} Monaten.`, `Free transport in Vienna or −${discountPct}% applies from a rental period of ${FREE_MIN_MONTHS} months.`) }}
      </span>
    </p>
    <p v-else class="rp__msg">
      <span class="rp__ico"><WfIcon name="truck" :size="15" /></span>
      <span>
        {{ t('Noch', 'Only') }} <strong>{{ eur(p.missingTransport) }}</strong>
        {{ t(`bis zum Gratis-Transport in Wien – und −${discountPct} % in allen anderen Bundesländern.`, `more for free transport in Vienna – and −${discountPct}% in all other Austrian states.`) }}
      </span>
    </p>

    <!-- Balken mit zwei Meilensteinen -->
    <div class="rp__bar" role="progressbar" :aria-valuenow="Math.round(p.progress * 100)" aria-valuemin="0" aria-valuemax="100">
      <span class="rp__fill rp__fill--total" :style="{ width: `${Math.min(1, p.monthly / FREE_TRANSPORT_FROM) * 100}%` }" />
      <span class="rp__fill" :style="{ width: `${p.progress * 100}%` }" />
      <span class="rp__mark" :class="{ 'is-hit': p.minReached }" :style="{ left: minMarker }" />
      <span class="rp__mark rp__mark--end" :class="{ 'is-hit': p.transportUnlocked }" />
    </div>
    <div class="rp__legend">
      <span :style="{ left: minMarker }" :class="{ 'is-hit': p.minReached }">
        <WfIcon v-if="p.minReached" name="check" :size="10" /> {{ t('Mindestwert', 'Minimum') }} {{ eur(MIN_MONTHLY) }}
      </span>
      <span class="rp__legend-end" :class="{ 'is-hit': p.transportUnlocked }">
        <WfIcon v-if="p.transportUnlocked" name="check" :size="10" /> {{ t('Gratis-Transport', 'Free transport') }} {{ eur(FREE_TRANSPORT_FROM) }}
      </span>
    </div>

    <p v-if="hasShortLines && !p.transportUnlocked" class="rp__hint">
      {{ t(`Für den Gratis-Transport zählen nur Mieten ab ${FREE_MIN_MONTHS} Monaten.`, `Only rentals of ${FREE_MIN_MONTHS}+ months count towards free transport.`) }}
    </p>
  </div>
</template>

<style scoped>
.rp {
  --green: #2f5d40; --ink: #2b2b28; --muted: #7a7568; --line: #e6e0d2;
  border: 1px solid var(--line); border-radius: 14px; padding: .85em 1em .7em; margin: 0 0 1em;
  background: #fbf9f4; transition: background .3s, border-color .3s;
}
.rp.is-done { background: #eef3ee; border-color: #c9d8cc; }
.rp__msg { display: flex; gap: .6em; align-items: flex-start; margin: 0 0 .75em; font-size: .8em; line-height: 1.45; color: var(--ink); text-align: left; }
.rp__msg strong { font-weight: 700; }
.rp__msg--done strong { display: block; color: var(--green); }
.rp__ico {
  flex: 0 0 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: #fff; color: var(--green); border: 1px solid var(--line);
}
.rp__msg--warn .rp__ico { color: #a86a1d; }
.rp__msg--done .rp__ico { background: var(--green); color: #fff; border-color: var(--green); }

.rp__bar { position: relative; height: 6px; border-radius: 999px; background: #e9e3d6; }
.rp__fill { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--green); transition: width .45s cubic-bezier(.2, .7, .2, 1); }
.rp__fill--total { background: #b9cdbd; }
.rp__mark {
  position: absolute; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%;
  background: #fff; border: 2px solid #d3cbb9; box-sizing: border-box; transition: background .3s, border-color .3s;
}
.rp__mark--end { left: 100%; }
.rp__mark.is-hit { background: var(--green); border-color: var(--green); }

.rp__legend { position: relative; height: 1.5em; margin-top: .45em; font-size: .66em; color: var(--muted); }
.rp__legend span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; display: inline-flex; align-items: center; gap: .25em; }
.rp__legend .rp__legend-end { right: 0; left: auto; transform: none; }
.rp__legend .is-hit { color: var(--green); font-weight: 700; }
.rp__hint { margin: .3em 0 0; font-size: .7em; color: var(--muted); text-align: left; }
</style>
