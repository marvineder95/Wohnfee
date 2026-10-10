<script setup lang="ts">
// Sanfter Upsell im Warenkorb: Fehlt noch etwas bis zum Mindestmietwert oder zum
// Gratis-Transport, schlagen wir bis zu 3 Artikel vor, die die Lücke möglichst genau
// füllen – bevorzugt „Passt dazu"-Artikel der Möbel im Warenkorb. Kein Popup, ein Klick.
import { rentalPerks, FREE_MIN_MONTHS, type PerkLine } from '~~/shared/rental-perks'
import type { CatalogItem } from '~/composables/useRentalCatalog'

const props = defineProps<{ lines: Array<PerkLine & { id: number }> }>()
const emit = defineEmits<{ add: [item: CatalogItem, durationMonths: number] }>()
const { isEn, t } = useLang()
const { items, load } = useRentalCatalog()
onMounted(load)

const perks = computed(() => rentalPerks(props.lines))
// Ziel: erst Mindestwert, dann Gratis-Transport (zählt nur der 3-Monats-Tarif)
const goal = computed<'min' | 'transport' | null>(() => {
  if (!props.lines.length) return null
  if (!perks.value.minReached) return 'min'
  if (!perks.value.transportUnlocked) return 'transport'
  return null
})
const gap = computed(() => goal.value === 'min' ? perks.value.missingMin : perks.value.missingTransport)

const suggestions = computed(() => {
  if (!goal.value || !items.value.length) return []
  const inCart = new Set(props.lines.map(l => l.id))
  const matchSet = new Set(items.value.filter(i => inCart.has(i.id)).flatMap(i => i.matches || []))
  return items.value
    .filter(i => !inCart.has(i.id) && i.quantity > 0)
    .map(i => {
      const dur = goal.value === 'transport' ? FREE_MIN_MONTHS : (i.rentPrice3m !== null ? FREE_MIN_MONTHS : 1)
      const price = dur === FREE_MIN_MONTHS ? i.rentPrice3m : i.rentPrice1m
      return { item: i, dur, price }
    })
    .filter(c => c.price !== null && c.price > 0)
    .map(c => {
      const p = c.price as number
      // knapp über der Lücke ist ideal, darunter zählt jeder fehlende Euro doppelt
      let score = p >= gap.value ? p - gap.value : (gap.value - p) * 2 + 50
      if (matchSet.has(c.item.id)) score -= 60
      return { ...c, score, isMatch: matchSet.has(c.item.id) }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
})

const eur = (v: number) => v.toLocaleString(isEn.value ? 'en-IE' : 'de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: v % 1 ? 2 : 0 })
const title = (i: CatalogItem) => (isEn.value && i.titleEn) || i.title
</script>

<template>
  <div v-if="suggestions.length" class="cs">
    <p class="cs__head">
      {{ t('Würde gut dazupassen:', 'Would go well with it:') }}
    </p>
    <ul class="cs__list">
      <li v-for="s in suggestions" :key="s.item.id" class="cs__item">
        <span class="cs__img">
          <img v-if="s.item.imagePath" :src="s.item.imagePath" alt="" loading="lazy">
          <WfIcon v-else name="bag" :size="16" />
        </span>
        <span class="cs__main">
          <strong :title="title(s.item)">{{ title(s.item) }}</strong>
          <small>{{ eur(s.price as number) }}/{{ t('Mon.', 'mo.') }}<template v-if="s.isMatch"> · {{ t('passt dazu', 'matches') }}</template></small>
        </span>
        <button type="button" class="cs__add" :aria-label="t('Hinzufügen: ', 'Add: ') + title(s.item)" @click="emit('add', s.item, s.dur)">
          <WfIcon name="plus" :size="14" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.cs { --green: #2f5d40; --ink: #2b2b28; --muted: #7a7568; --line: #e6e0d2; margin: -.4em 0 .9em; min-width: 0; max-width: 100%; }
.cs__head { margin: 0 0 .5em; font-size: .76em; color: var(--muted); line-height: 1.45; text-align: left; }
/* minmax(0, 1fr): lange Produktnamen dürfen die Liste nicht über den Warenkorb hinaus dehnen */
.cs__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: .4em; }
.cs__item { min-width: 0; box-sizing: border-box; display: flex; align-items: center; gap: .6em; padding: .45em .5em; border: 1px dashed #d8d0bd; border-radius: 12px; background: #fff; margin: 0; }
.cs__img { flex: none; width: 38px; height: 38px; border-radius: 9px; overflow: hidden; background: #f7f4ec; color: #b4ab97; display: flex; align-items: center; justify-content: center; }
.cs__img img { width: 100%; height: 100%; object-fit: cover; }
.cs__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .05em; text-align: left; }
.cs__main strong { font-size: .8em; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cs__main small { font-size: .72em; color: var(--muted); }
.cs__add {
  flex: none; width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid var(--green); background: #fff; color: var(--green);
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: background .15s, color .15s;
}
.cs__add:hover { background: var(--green); color: #fff; }
</style>
