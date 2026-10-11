<script setup lang="ts">
// Detailseite einer Immobilie: Galerie, Eckdaten, Beschreibung, Energieausweis, Ausstattung,
// Anfrage-/Besichtigungsformular (→ Dashboard „Anfragen", mit Objekt verknüpft).
import { PROPERTY_FEATURES, PROPERTY_STATUS, categoryLabel } from '~~/shared/properties'

const props = defineProps<{ property: any }>()
const p = computed(() => props.property)
const { isEn, t, lp, lang } = useLang()

useHead(() => ({
  title: `${p.value.title} – ${t('Immobilien', 'Properties')} – WOHNFEE`,
  meta: [
    { name: 'description', content: p.value.teaser || p.value.title },
    { property: 'og:title', content: p.value.title },
    ...(p.value.images[0] ? [{ property: 'og:image', content: p.value.images[0].src }] : [])
  ]
}))

const loc = computed(() => isEn.value ? 'en-GB' : 'de-AT')
const eur = (v: number | null, d = 0) => v == null ? '' : v.toLocaleString(loc.value, { style: 'currency', currency: 'EUR', maximumFractionDigits: d, minimumFractionDigits: d })
const num = (v: number) => v.toLocaleString(loc.value)
const gallery = computed(() => p.value.images.map((i: any) => ({ src: i.src, alt: i.alt || p.value.title })))
const features = computed(() => PROPERTY_FEATURES.filter(f => p.value.features.includes(f.key)))
const miete = computed(() => p.value.offerType !== 'kauf')
const open = computed(() => ['aktiv', 'reserviert'].includes(p.value.status))
const facts = computed(() => [
  [t('Art', 'Type'), categoryLabel(p.value.category, lang.value)],
  [t('Wohnfläche', 'Living area'), p.value.livingArea ? `${num(p.value.livingArea)} m²` : ''],
  [t('Nutzfläche', 'Usable area'), p.value.usableArea ? `${num(p.value.usableArea)} m²` : ''],
  [t('Zimmer', 'Rooms'), p.value.rooms ? num(p.value.rooms) : ''],
  [t('Stockwerk', 'Floor'), p.value.floor],
  [t('Baujahr', 'Year built'), p.value.yearBuilt],
  [t('Verfügbar ab', 'Available from'), p.value.availableFrom],
  [t('Mindestmietdauer', 'Minimum term'), p.value.minRentMonths ? `${p.value.minRentMonths} ${t('Monate', 'months')}` : ''],
  [t('Objektnummer', 'Reference'), p.value.refNo]
].filter(([, v]) => v))

// Anfrage
const form = reactive({ name: '', email: '', phone: '', message: '', viewing: true, privacy: false, website: '' })
const busy = ref(false)
const sent = ref(false)
const err = ref('')
async function send() {
  err.value = ''
  busy.value = true
  try {
    await $fetch(`/api/properties/${p.value.slug}/inquiry`, { method: 'POST', body: { ...form, lang: lang.value } })
    sent.value = true
  } catch (e: any) {
    err.value = e?.data?.statusMessage || t('Senden fehlgeschlagen – bitte rufen Sie uns an.', 'Sending failed – please give us a call.')
  } finally { busy.value = false }
}
</script>

<template>
  <div class="hsp">
    <div class="hsp__wrap">
      <NuxtLink :to="lp('/immobilien.html')" class="hsp__back">‹ {{ t('Alle Immobilien', 'All properties') }}</NuxtLink>
      <p class="hsp__eyebrow">
        {{ miete ? t('Zur Miete', 'For rent') : t('Zum Kauf', 'For sale') }} · {{ [p.zip, p.city].filter(Boolean).join(' ') }}<template v-if="p.district"> · {{ p.district }}</template>
        <span v-if="p.status !== 'aktiv'" class="hsp__state">{{ (PROPERTY_STATUS[p.status] as any)?.[lang] }}</span>
      </p>
      <h1 class="hsp__h1">{{ p.title }}</h1>
      <p v-if="p.street" class="hsp__addr"><WfIcon name="pin" :size="14" /> {{ p.street }}, {{ p.zip }} {{ p.city }}</p>
    </div>

    <div v-if="gallery.length" class="hsp__wrap hsp__gallery"><HsGallery :images="gallery" :title="p.title" /></div>

    <div class="hsp__wrap hsp__grid">
      <div class="hsp__main">
        <section class="hsp__keys">
          <div v-if="p.price != null"><span>{{ miete ? t('Miete / Monat', 'Rent / month') : t('Kaufpreis', 'Price') }}</span><strong>{{ eur(p.price) }}</strong></div>
          <div v-if="p.livingArea"><span>{{ t('Wohnfläche', 'Living area') }}</span><strong>{{ num(p.livingArea) }} m²</strong></div>
          <div v-if="p.rooms"><span>{{ t('Zimmer', 'Rooms') }}</span><strong>{{ num(p.rooms) }}</strong></div>
        </section>

        <p v-if="p.teaser" class="hsp__teaser">{{ p.teaser }}</p>

        <aside v-if="p.furnishedByWohnfee" class="hsp__wf">
          <WfIcon name="leaf" :size="22" />
          <span>
            <strong>{{ t('Von WOHNFEE eingerichtet', 'Furnished by WOHNFEE') }}</strong>
            <small>{{ t('Ihnen gefallen die Möbel? Viele Stücke können Sie nach dem Einzug weiter mieten – flexibel ab 1 Monat.', 'Like the furniture? You can keep renting many pieces after moving in – flexibly from 1 month.') }}
              <NuxtLink :to="lp('/furniture-leasing.html')">{{ t('Zum Mietshop →', 'Rental shop →') }}</NuxtLink></small>
          </span>
        </aside>

        <section v-if="p.descriptionHtml" class="hsp__sec">
          <h2>{{ t('Beschreibung', 'Description') }}</h2>
          <div class="hsp__rte" v-html="p.descriptionHtml" />
        </section>

        <section class="hsp__sec">
          <h2>{{ t('Eckdaten', 'Key facts') }}</h2>
          <dl class="hsp__facts"><div v-for="[k, v] in facts" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
        </section>

        <section v-if="features.length" class="hsp__sec">
          <h2>{{ t('Ausstattung', 'Features') }}</h2>
          <ul class="hsp__feats"><li v-for="f in features" :key="f.key"><WfIcon name="check" :size="14" /> {{ f[lang] }}</li></ul>
        </section>

        <section class="hsp__sec">
          <h2>{{ t('Kosten', 'Costs') }}</h2>
          <dl class="hsp__facts">
            <div v-if="p.price != null"><dt>{{ miete ? t('Gesamtmiete / Monat', 'Total rent / month') : t('Kaufpreis', 'Purchase price') }}</dt><dd>{{ eur(p.price, 2) }}</dd></div>
            <div v-if="miete && p.operatingCosts != null"><dt>{{ t('davon Betriebskosten', 'of which operating costs') }}</dt><dd>{{ eur(p.operatingCosts, 2) }}</dd></div>
            <div v-if="p.deposit"><dt>{{ t('Kaution', 'Deposit') }}</dt><dd>{{ p.deposit }}</dd></div>
            <div v-if="p.commission"><dt>{{ t('Provision', 'Commission') }}</dt><dd>{{ p.commission }}</dd></div>
          </dl>
        </section>

        <section class="hsp__sec">
          <h2>{{ t('Energieausweis', 'Energy certificate') }}</h2>
          <dl v-if="p.hwb != null || p.fgee != null" class="hsp__facts">
            <div v-if="p.hwb != null"><dt>HWB</dt><dd>{{ num(p.hwb) }} kWh/m²a<template v-if="p.hwbClass"> · {{ t('Klasse', 'class') }} {{ p.hwbClass }}</template></dd></div>
            <div v-if="p.fgee != null"><dt>fGEE</dt><dd>{{ num(p.fgee) }}<template v-if="p.fgeeClass"> · {{ t('Klasse', 'class') }} {{ p.fgeeClass }}</template></dd></div>
          </dl>
          <p v-else class="hsp__muted">{{ t('Ein Energieausweis wird auf Anfrage vorgelegt.', 'An energy certificate is available on request.') }}</p>
        </section>
      </div>

      <aside class="hsp__side">
        <div class="hsp__box">
          <p class="hsp__price"><span>{{ miete ? t('Miete / Monat', 'Rent / month') : t('Kaufpreis', 'Price') }}</span><strong>{{ p.price != null ? eur(p.price) : t('auf Anfrage', 'on request') }}</strong></p>

          <template v-if="!open">
            <p class="hsp__muted">{{ t('Dieses Objekt ist bereits vergeben.', 'This property has already been let or sold.') }}</p>
            <NuxtLink :to="lp('/immobilien.html')" class="hsp__btn">{{ t('Verfügbare Immobilien', 'Available properties') }}</NuxtLink>
          </template>
          <div v-else-if="sent" class="hsp__sent">
            <WfIcon name="check" :size="22" />
            <strong>{{ t('Danke für Ihre Anfrage!', 'Thank you for your inquiry!') }}</strong>
            <small>{{ t('Wir melden uns in Kürze persönlich bei Ihnen.', 'We will get back to you personally shortly.') }}</small>
          </div>
          <form v-else class="hsp__form" @submit.prevent="send">
            <h2>{{ t('Besichtigung anfragen', 'Request a viewing') }}</h2>
            <input v-model="form.name" required :placeholder="t('Name *', 'Name *')" autocomplete="name">
            <input v-model="form.email" required type="email" :placeholder="t('E-Mail *', 'E-mail *')" autocomplete="email">
            <input v-model="form.phone" type="tel" :placeholder="t('Telefon', 'Phone')" autocomplete="tel">
            <textarea v-model="form.message" rows="3" :placeholder="t('Ihre Nachricht (optional)', 'Your message (optional)')" />
            <input v-model="form.website" class="hsp__hp" tabindex="-1" autocomplete="off" aria-hidden="true">
            <label class="hsp__check"><input v-model="form.viewing" type="checkbox"> {{ t('Ich möchte einen Besichtigungstermin', 'I would like a viewing') }}</label>
            <label class="hsp__check"><input v-model="form.privacy" type="checkbox" required> <span>{{ t('Ich habe die', 'I have read the') }} <NuxtLink :to="lp('/datenschutz.html')" target="_blank">{{ t('Datenschutzerklärung', 'privacy policy') }}</NuxtLink> {{ t('gelesen.', '.') }}</span></label>
            <button class="hsp__btn" :disabled="busy">{{ busy ? t('Wird gesendet …', 'Sending …') : t('Anfrage senden', 'Send inquiry') }}</button>
            <p v-if="err" class="hsp__err">{{ err }}</p>
          </form>

          <div class="hsp__contact">
            <strong>{{ p.contactName || 'WOHNFEE' }}</strong><small v-if="p.partnerName">{{ p.partnerName }}</small>
            <a :href="`tel:${(p.contactPhone || '+43 676 9202236').replace(/\s/g, '')}`">{{ p.contactPhone || '+43 676 9202236' }}</a>
            <a :href="`mailto:${p.contactEmail || 'office@wohnfee.at'}`">{{ p.contactEmail || 'office@wohnfee.at' }}</a>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.hsp { --green: #2f5d40; --ink: #2b2b28; --muted: #6f6a5e; --line: #e6e0d2; --cream: #f8f5ef; --serif: var(--font-family-02, Gelasio, Georgia, serif); background: var(--cream); color: var(--ink); padding: 2.4em 0 5em; }
.hsp__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsp h1, .hsp h2 { font-family: var(--serif); font-weight: 500; color: var(--ink); text-align: left; text-transform: none; border: 0; padding: 0; }
.hsp__back { color: var(--green); text-decoration: none; font-weight: 600; font-size: .9em; }
.hsp__eyebrow { margin: 1.4em 0 .5em; font-size: .74em; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; color: var(--green); display: flex; flex-wrap: wrap; gap: .6em; align-items: center; }
.hsp__state { background: #c98a1f; color: #fff; padding: .2em .7em; border-radius: 999px; letter-spacing: .06em; }
.hsp__h1 { font-size: clamp(1.9em, 4vw, 3em) !important; line-height: 1.12; margin: 0 0 .3em; max-width: 52rem; }
.hsp__addr { color: var(--muted); display: flex; gap: .4em; align-items: center; margin: 0; }
.hsp__gallery { margin-top: 1.6em; }
.hsp__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); gap: 2.4em; align-items: start; margin-top: 2em; }
.hsp__keys { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .8em; }
.hsp__keys div { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 1em 1.2em; display: grid; gap: .2em; }
.hsp__keys span { font-size: .74em; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.hsp__keys strong { font-family: var(--serif); font-weight: 500; font-size: 1.6em; color: var(--green); }
.hsp__teaser { font-size: 1.12em; line-height: 1.7; margin: 1.4em 0; }
.hsp__wf { display: flex; gap: .9em; align-items: flex-start; padding: 1em 1.2em; border-radius: 16px; background: #eef3ee; color: var(--green); margin-bottom: 1em; }
.hsp__wf span { display: grid; gap: .2em; }
.hsp__wf small { color: var(--muted); line-height: 1.5; }
.hsp__wf a { color: var(--green); font-weight: 600; }
.hsp__sec { padding: 1.4em 0; border-top: 1px solid var(--line); }
.hsp__sec h2 { font-size: 1.35em; margin: 0 0 .7em; }
.hsp__rte :deep(p) { line-height: 1.8; color: var(--muted); margin: 0 0 1em; text-align: left !important; }
.hsp__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 2em; margin: 0; }
.hsp__facts div { display: flex; justify-content: space-between; gap: 1em; padding: .65em 0; border-bottom: 1px solid #efeadf; }
.hsp__facts dt { color: var(--muted); }
.hsp__facts dd { margin: 0; font-weight: 600; text-align: right; }
.hsp__feats { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .5em; }
.hsp__feats li { display: inline-flex; gap: .4em; align-items: center; padding: .45em .9em; background: #fff; border: 1px solid var(--line); border-radius: 999px; font-size: .9em; color: var(--green); }
.hsp__muted { color: var(--muted); margin: 0; }
.hsp__side { position: sticky; top: calc(var(--hs-head, 100px) + 16px); }
.hsp__box { background: #fff; border-radius: 22px; padding: 1.5em; box-shadow: 0 1px 2px rgba(38, 73, 47, .05), 0 14px 36px -18px rgba(38, 73, 47, .3); display: grid; gap: 1em; }
.hsp__price { margin: 0; display: grid; }
.hsp__price span { font-size: .76em; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.hsp__price strong { font-family: var(--serif); font-weight: 500; font-size: 2em; color: var(--green); }
.hsp__form { display: grid; gap: .55em; }
.hsp__form h2 { font-size: 1.15em; margin: 0 0 .2em; }
.hsp__form input:not([type=checkbox]), .hsp__form textarea { font: inherit; font-size: .95em; padding: .7em .9em; border: 1px solid #ddd5c5; border-radius: 12px; background: #fff; width: 100%; box-sizing: border-box; }
.hsp__hp { position: absolute !important; left: -9999px; }
.hsp__check { display: flex; gap: .5em; align-items: flex-start; font-size: .84em; color: var(--muted); }
.hsp__check input { accent-color: var(--green); margin-top: .2em; }
.hsp__check a { color: var(--green); }
.hsp__btn { display: inline-flex; justify-content: center; border: 0; border-radius: 999px; padding: .9em 1.4em; background: var(--green); color: #fff; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
.hsp__btn:disabled { opacity: .6; }
.hsp__err { color: #a5524a; font-size: .86em; margin: 0; }
.hsp__sent { display: grid; justify-items: center; text-align: center; gap: .3em; padding: 1em; background: #eef3ee; border-radius: 14px; color: var(--green); }
.hsp__sent small { color: var(--muted); }
.hsp__contact { display: grid; gap: .15em; padding-top: 1em; border-top: 1px solid var(--line); font-size: .9em; }
.hsp__contact small { color: var(--muted); }
.hsp__contact a { color: var(--green); text-decoration: none; }
@media (max-width: 900px) { .hsp__grid { grid-template-columns: minmax(0, 1fr); } .hsp__side { position: static; } .hsp__wrap { padding: 0 1em; } }
</style>
