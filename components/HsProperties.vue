<script setup lang="ts">
// Immobilien-Übersicht (/immobilien.html): Objekte aus dem Dashboard, Filter Miete/Kauf, Zimmer, Preis, Ort.
// Unten: Angebot für Eigentümer & Makler (inserieren + Home Staging).
import { PROPERTY_CATEGORIES, PROPERTY_STATUS, categoryLabel } from '~~/shared/properties'

const { isEn, t, lp, lang } = useLang()
const { data } = await useAsyncData('properties-list', () => $fetch<{ items: any[] }>('/api/properties').catch(() => ({ items: [] })))
const all = computed(() => data.value?.items || [])

const type = ref<'alle' | 'miete' | 'kauf'>('alle')
const cat = ref('')
const rooms = ref(0)
const q = ref('')
const filtered = computed(() => all.value.filter(p =>
  (type.value === 'alle' || p.offerType === type.value) &&
  (!cat.value || p.category === cat.value) &&
  (!rooms.value || (p.rooms || 0) >= rooms.value) &&
  (!q.value.trim() || [p.city, p.zip, p.district, p.title].join(' ').toLowerCase().includes(q.value.trim().toLowerCase()))))
const available = computed(() => filtered.value.filter(p => p.status !== 'vergeben'))
const references = computed(() => filtered.value.filter(p => p.status === 'vergeben'))

const eur = (v: number | null) => v == null ? t('Preis auf Anfrage', 'Price on request')
  : v.toLocaleString(isEn.value ? 'en-GB' : 'de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const num = (v: number) => v.toLocaleString(isEn.value ? 'en-GB' : 'de-AT')
const statusLabel = (s: string) => (PROPERTY_STATUS[s] as any)?.[lang.value] || s
const href = (p: any) => (isEn.value ? '/en' : '') + p.route
</script>

<template>
  <div class="hsi">
    <section class="hsi__hero">
      <div class="hsi__wrap">
        <p class="hsi__eyebrow">{{ t('Immobilien', 'Properties') }}</p>
        <h1 class="hsi__h1">{{ t('Wohnen, das schon fertig ist.', 'Homes that are ready to live in.') }}</h1>
        <p class="hsi__lead">{{ t('Ausgewählte Wohnungen und Häuser zur Miete und zum Kauf – viele davon von uns eingerichtet. Einziehen, Koffer abstellen, ankommen.', 'Selected apartments and houses for rent and sale – many of them furnished by us. Move in, put down your suitcase, feel at home.') }}</p>

        <div class="hsi__filters" role="search">
          <div class="hsi__seg" role="tablist">
            <button v-for="o in (['alle', 'miete', 'kauf'] as const)" :key="o" :class="{ 'is-on': type === o }" @click="type = o">
              {{ o === 'alle' ? t('Alle', 'All') : o === 'miete' ? t('Mieten', 'Rent') : t('Kaufen', 'Buy') }}
            </button>
          </div>
          <select v-model="cat" :aria-label="t('Art', 'Type')">
            <option value="">{{ t('Alle Arten', 'All types') }}</option>
            <option v-for="c in PROPERTY_CATEGORIES" :key="c.value" :value="c.value">{{ c[lang] }}</option>
          </select>
          <select v-model.number="rooms" :aria-label="t('Zimmer', 'Rooms')">
            <option :value="0">{{ t('Zimmer egal', 'Any rooms') }}</option>
            <option v-for="r in [1, 2, 3, 4, 5]" :key="r" :value="r">{{ t(`ab ${r} Zimmer`, `${r}+ rooms`) }}</option>
          </select>
          <input v-model="q" type="search" :placeholder="t('Ort, PLZ oder Bezirk', 'City, postcode or district')">
        </div>
      </div>
    </section>

    <section class="hsi__list">
      <div class="hsi__wrap">
        <p class="hsi__count">{{ available.length }} {{ available.length === 1 ? t('Objekt verfügbar', 'property available') : t('Objekte verfügbar', 'properties available') }}</p>

        <div v-if="!available.length" class="hsi__empty">
          <WfIcon name="pin" :size="30" />
          <h2>{{ all.length ? t('Keine passenden Objekte', 'No matching properties') : t('Gerade ist alles vergeben', 'Everything is currently taken') }}</h2>
          <p>{{ t('Sagen Sie uns, was Sie suchen – wir melden uns, sobald etwas Passendes frei wird.', 'Tell us what you are looking for – we will get in touch as soon as something suitable becomes available.') }}</p>
          <NuxtLink :to="lp('/kontakt.html')" class="hsi__btn">{{ t('Suchauftrag senden', 'Send a search request') }}</NuxtLink>
        </div>

        <ul v-else class="hsi__grid">
          <li v-for="p in available" :key="p.slug">
            <NuxtLink :to="href(p)" class="hsi__card">
              <span class="hsi__img">
                <HsImg v-if="p.images[0]" :src="p.images[0].src" :alt="p.images[0].alt || p.title" sizes="xs:100vw sm:100vw md:50vw lg:400px xl:400px xxl:400px 2xl:400px" />
                <WfIcon v-else name="camera" :size="30" />
                <span class="hsi__tag">{{ p.offerType === 'kauf' ? t('Kauf', 'Sale') : t('Miete', 'Rent') }}</span>
                <span v-if="p.status === 'reserviert'" class="hsi__tag hsi__tag--res">{{ statusLabel('reserviert') }}</span>
                <span v-if="p.furnishedByWohnfee" class="hsi__wf">{{ t('Eingerichtet von WOHNFEE', 'Furnished by WOHNFEE') }}</span>
              </span>
              <span class="hsi__body">
                <small>{{ categoryLabel(p.category, lang) }} · {{ [p.zip, p.city].filter(Boolean).join(' ') }}<template v-if="p.district"> · {{ p.district }}</template></small>
                <strong>{{ p.title }}</strong>
                <span class="hsi__facts">
                  <span v-if="p.livingArea">{{ num(p.livingArea) }} m²</span>
                  <span v-if="p.rooms">{{ num(p.rooms) }} {{ t('Zimmer', 'rooms') }}</span>
                  <span v-if="p.floor">{{ p.floor }}</span>
                </span>
                <span class="hsi__price">{{ eur(p.price) }}<small v-if="p.offerType === 'miete' && p.price"> / {{ t('Monat', 'month') }}</small></span>
              </span>
            </NuxtLink>
          </li>
        </ul>

        <template v-if="references.length">
          <h2 class="hsi__h2">{{ t('Zuletzt vergeben', 'Recently let or sold') }}</h2>
          <ul class="hsi__grid hsi__grid--ref">
            <li v-for="p in references.slice(0, 6)" :key="p.slug" class="hsi__ref">
              <span class="hsi__img"><HsImg v-if="p.images[0]" :src="p.images[0].src" :alt="p.title" sizes="xs:50vw md:25vw lg:300px" /><span class="hsi__tag hsi__tag--done">{{ statusLabel('vergeben') }}</span></span>
              <small>{{ [p.zip, p.city].filter(Boolean).join(' ') }}</small>
              <strong>{{ p.title }}</strong>
            </li>
          </ul>
        </template>
      </div>
    </section>

    <section class="hsi__owner">
      <div class="hsi__wrap hsi__ownerbox">
        <div>
          <p class="hsi__eyebrow hsi__eyebrow--light">{{ t('Für Eigentümer & Makler', 'For owners & agents') }}</p>
          <h2 class="hsi__h2 hsi__h2--light">{{ t('Ihre Immobilie – inszeniert und vermarktet.', 'Your property – staged and marketed.') }}</h2>
          <p>{{ t('Wir richten Ihre Immobilie mit Home Staging ein, fotografieren sie und präsentieren sie hier und auf willhaben. Eingerichtete Objekte werden schneller und zu besseren Konditionen vergeben.', 'We furnish your property with home staging, photograph it and present it here and on willhaben. Furnished properties are let or sold faster and on better terms.') }}</p>
        </div>
        <div class="hsi__owneracts">
          <NuxtLink :to="lp('/kontakt.html')" class="hsi__btn hsi__btn--light">{{ t('Immobilie anbieten', 'Offer your property') }}</NuxtLink>
          <NuxtLink :to="lp('/home-staging.html')" class="hsi__link">{{ t('Mehr zu Home Staging →', 'More about home staging →') }}</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsi { --green: #2f5d40; --ink: #2b2b28; --muted: #6f6a5e; --line: #e6e0d2; --cream: #f8f5ef; --serif: var(--font-family-02, Gelasio, Georgia, serif); background: var(--cream); color: var(--ink); }
.hsi__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsi h1, .hsi h2 { font-family: var(--serif); font-weight: 500; color: var(--ink); text-align: left; text-transform: none; border: 0; padding: 0; }
.hsi__hero { padding: 4em 0 2.2em; background: radial-gradient(circle at 85% 0%, #efe9dc 0%, var(--cream) 60%); }
.hsi__eyebrow { display: flex; align-items: center; gap: 1em; margin: 0 0 1em; font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; }
.hsi__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsi__eyebrow--light { color: rgba(255, 255, 255, .85); }
.hsi__eyebrow--light::after { background: rgba(255, 255, 255, .6); }
.hsi__h1 { font-size: clamp(2.3em, 5vw, 3.6em) !important; line-height: 1.08; margin: 0 0 .4em; }
.hsi__lead { max-width: 40rem; color: var(--muted); line-height: 1.7; margin: 0 0 2em; }
.hsi__filters { display: flex; flex-wrap: wrap; gap: .6em; align-items: center; padding: .7em; background: #fff; border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 10px 30px -18px rgba(60, 50, 30, .3); }
.hsi__seg { display: inline-flex; padding: 3px; background: var(--cream); border-radius: 999px; }
.hsi__seg button { border: 0; background: none; font: inherit; font-size: .9em; height: 2.4em; padding: 0 1.1em; border-radius: 999px; cursor: pointer; color: var(--ink); }
.hsi__seg button.is-on { background: var(--green); color: #fff; }
/* Dropdowns + Suche im Stil der Segment-Schalter: Pillenform, Creme, eigener Pfeil */
.hsi__filters select, .hsi__filters input {
  font: inherit; font-size: .9em; height: 2.75em; box-sizing: border-box; padding: 0 1.1em; min-width: 0;
  border: 1px solid transparent; border-radius: 999px; background-color: var(--cream); color: var(--ink);
  transition: border-color .15s, background-color .15s, box-shadow .15s; outline: none;
}
.hsi__filters select {
  -webkit-appearance: none; appearance: none; cursor: pointer; padding-right: 2.6em; font-weight: 500;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232f5d40' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 1em center; background-size: 1em;
}
.hsi__filters select:hover, .hsi__filters input:hover { background-color: #f1ece2; }
.hsi__filters select:focus-visible, .hsi__filters input:focus { border-color: var(--green); background-color: #fff; box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.hsi__filters input { flex: 1; min-width: 12em; padding-left: 2.7em;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236f6a5e' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m21 21-5.2-5.2'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: left 1em center; background-size: 1em; }
.hsi__filters input::placeholder { color: #9b9483; }
.hsi__list { padding: 1.5em 0 4em; }
.hsi__count { color: var(--muted); font-size: .9em; margin: 0 0 1em; }
.hsi__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 1.4em; }
.hsi__card { display: flex; flex-direction: column; height: 100%; background: #fff; border-radius: 22px; overflow: hidden; text-decoration: none; color: inherit; border: 1px solid var(--line); transition: transform .25s, box-shadow .25s; }
.hsi__card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -16px rgba(60, 50, 30, .3); }
.hsi__img { position: relative; aspect-ratio: 4 / 3; background: #ece6da; display: grid; place-items: center; color: #9b9483; overflow: hidden; }
.hsi__img :deep(img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hsi__tag { position: absolute; top: .8em; left: .8em; background: rgba(255, 255, 255, .92); color: var(--green); font-size: .74em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .3em .8em; border-radius: 999px; }
.hsi__tag--res { left: auto; right: .8em; background: #c98a1f; color: #fff; }
.hsi__tag--done { background: var(--ink); color: #fff; }
.hsi__wf { position: absolute; left: .8em; bottom: .8em; background: var(--green); color: #fff; font-size: .74em; padding: .35em .8em; border-radius: 999px; }
.hsi__body { padding: 1.1em 1.3em 1.3em; display: flex; flex-direction: column; gap: .35em; flex: 1; }
.hsi__body small { color: var(--muted); font-size: .8em; }
.hsi__body strong { font-family: var(--serif); font-weight: 500; font-size: 1.18em; line-height: 1.3; }
.hsi__facts { display: flex; gap: .4em 1em; flex-wrap: wrap; font-size: .86em; color: var(--muted); }
.hsi__price { margin-top: auto; padding-top: .5em; font-weight: 700; font-size: 1.1em; color: var(--green); }
.hsi__price small { font-weight: 400; color: var(--muted); font-size: .8em; }
.hsi__empty { display: grid; justify-items: center; text-align: center; gap: .6em; padding: 3em 1em; background: #fff; border: 1px solid var(--line); border-radius: 22px; color: var(--green); }
.hsi__empty h2 { margin: 0; font-size: 1.5em; text-align: center; }
.hsi__empty p { color: var(--muted); max-width: 32rem; margin: 0 0 .6em; }
.hsi__btn { display: inline-flex; padding: .85em 1.8em; border-radius: 999px; background: var(--green); color: #fff; text-decoration: none; font-weight: 600; }
.hsi__h2 { font-size: clamp(1.5em, 3vw, 2.1em); margin: 2.2em 0 .8em; }
.hsi__grid--ref { grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 1em; }
.hsi__ref { display: grid; gap: .25em; opacity: .85; }
.hsi__ref .hsi__img { border-radius: 14px; aspect-ratio: 3 / 2; }
.hsi__ref small { color: var(--muted); font-size: .78em; margin-top: .4em; }
.hsi__ref strong { font-size: .9em; font-weight: 600; }
.hsi__owner { padding: 0 0 5em; }
.hsi__ownerbox { display: grid; grid-template-columns: 1.4fr 1fr; gap: 2em; align-items: center; padding: 3em 3.2em; border-radius: 26px; color: #fff; background: radial-gradient(circle at 15% 20%, #3c7350 0%, var(--green) 45%, #22412d 100%); }
.hsi__h2--light { color: #fff !important; margin: 0 0 .5em; }
.hsi__ownerbox p:not(.hsi__eyebrow) { color: rgba(255, 255, 255, .86); line-height: 1.7; margin: 0; }
.hsi__owneracts { display: grid; justify-items: start; gap: .8em; }
.hsi__btn--light { background: #fff; color: var(--green); }
.hsi__link { color: #fff; font-size: .9em; }
@media (max-width: 860px) { .hsi__ownerbox { grid-template-columns: 1fr; padding: 2.2em 1.6em; } .hsi__wrap { padding: 0 1em; } .hsi__hero { padding-top: 2.6em; } }
</style>
