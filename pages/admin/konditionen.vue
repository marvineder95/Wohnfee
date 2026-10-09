<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Konditionen - WOHNFEE Dashboard', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

// Konditionen für Furniture-Leasing-Angebote: daraus berechnet das Dashboard
// die Transportkosten jeder Mietanfrage automatisch (server/utils/transport.ts).

interface Settings {
  depotAddress: string; depotLat: number | null; depotLon: number | null
  hourlyRate: number; drivers: number; designers: number
  onSiteDeliveryMin: number; onSitePickupMin: number
  truckFactor: number; freeKm: number; kmRate: number; roundMinutes: number
}

const form = reactive<Settings>({
  depotAddress: '', depotLat: null, depotLon: null, hourlyRate: 0, drivers: 2, designers: 1,
  onSiteDeliveryMin: 90, onSitePickupMin: 60, truckFactor: 15, freeKm: 30, kmRate: 0.5, roundMinutes: 15
})
const loading = ref(true)
const saving = ref(false)
const msg = ref('')
const error = ref('')

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ settings: Settings }>('/api/admin/transport/settings')
    Object.assign(form, res.settings)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Konditionen konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}
async function save() {
  saving.value = true
  msg.value = ''
  error.value = ''
  try {
    const res = await $fetch<{ settings: Settings }>('/api/admin/transport/settings', { method: 'PUT', body: form })
    Object.assign(form, res.settings)
    msg.value = 'Gespeichert – neue Angebote werden ab jetzt mit diesen Konditionen berechnet.'
    if (test.zip || test.city) runTest()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}
onMounted(load)

const crew = computed(() => (Number(form.drivers) || 0) + (Number(form.designers) || 0))
const mapUrl = computed(() => form.depotLat !== null
  ? `https://www.openstreetmap.org/?mlat=${form.depotLat}&mlon=${form.depotLon}#map=16/${form.depotLat}/${form.depotLon}` : '')

// ---------- Probe-Berechnung ----------
const test = reactive({ street: '', zip: '', city: 'Wien', monthly: '' as string | number })
const quote = ref<any>(null)
const testing = ref(false)
async function runTest() {
  testing.value = true
  quote.value = null
  try {
    quote.value = await $fetch('/api/admin/transport/quote', { method: 'POST', body: { ...test, monthly: Number(test.monthly) || 0 } })
  } catch (e: any) {
    quote.value = { ok: false, error: e?.data?.statusMessage || 'Berechnung fehlgeschlagen.' }
  } finally {
    testing.value = false
  }
}
const eur = (v: number) => Number(v || 0).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const num = (v: number) => Number(v || 0).toLocaleString('de-AT')
</script>

<template>
  <div class="kond">
    <section class="kond__head wf-card">
      <div>
        <p class="wf-eyebrow">Furniture Leasing</p>
        <h1 class="wf-title">Konditionen</h1>
        <p class="wf-subtitle">
          Grundlage für die automatische Preisberechnung: Jede Mietanfrage bekommt sofort ein Angebot
          mit Monatsmieten und berechneten Transportkosten.
        </p>
      </div>
      <div class="kond__formula">
        <strong>So wird gerechnet</strong>
        <span>Lieferung &amp; Abholung je: Team × Stundensatz × (2 × Fahrzeit + Zeit vor Ort)</span>
        <span>+ Kilometergeld für jeden km über {{ num(form.freeKm) }} km (einfache Strecke) × 4 Strecken</span>
        <span>− Gratis-Transport Wien bzw. −50 % (Transportvorteile laut Warenkorb)</span>
      </div>
    </section>

    <p v-if="loading" class="kond__muted">Wird geladen …</p>
    <div v-else class="kond__grid">
      <form class="kond__form" @submit.prevent="save">
        <section class="kond__card wf-card">
          <h2 class="kond__h2"><WfIcon name="pin" :size="16" /> Möbelstandort</h2>
          <label class="kond__fld">
            <span>Adresse des Lagers (Start &amp; Ziel jeder Tour)</span>
            <input v-model="form.depotAddress" type="text" placeholder="Feldgasse 7, 2203 Eibesbrunn, Österreich">
          </label>
          <p class="kond__hint">
            <template v-if="mapUrl">Auf der Karte gefunden · <a :href="mapUrl" target="_blank" rel="noopener">Standort ansehen ↗</a></template>
            <template v-else>Wird beim Speichern auf der Karte gesucht.</template>
          </p>
        </section>

        <section class="kond__card wf-card">
          <h2 class="kond__h2"><WfIcon name="users" :size="16" /> Team &amp; Stundensatz</h2>
          <div class="kond__row">
            <label class="kond__fld"><span>Spediteure je Auftrag</span><input v-model.number="form.drivers" type="number" min="0" max="20"></label>
            <label class="kond__fld"><span>Designerinnen je Auftrag</span><input v-model.number="form.designers" type="number" min="0" max="20"></label>
            <label class="kond__fld"><span>Stundensatz je Person</span>
              <span class="kond__unit"><input v-model.number="form.hourlyRate" type="number" min="0" step="0.5"><em>€ / Std.</em></span>
            </label>
          </div>
          <p class="kond__hint">Team: {{ crew }} Person{{ crew === 1 ? '' : 'en' }} · {{ eur(crew * form.hourlyRate) }} je Teamstunde</p>
        </section>

        <section class="kond__card wf-card">
          <h2 class="kond__h2"><WfIcon name="clock" :size="16" /> Zeiten</h2>
          <div class="kond__row">
            <label class="kond__fld"><span>Aufbau beim Kunden</span>
              <span class="kond__unit"><input v-model.number="form.onSiteDeliveryMin" type="number" min="0" step="5"><em>Min.</em></span>
            </label>
            <label class="kond__fld"><span>Abbau beim Kunden</span>
              <span class="kond__unit"><input v-model.number="form.onSitePickupMin" type="number" min="0" step="5"><em>Min.</em></span>
            </label>
          </div>
          <div class="kond__row">
            <label class="kond__fld"><span>Fahrzeit-Zuschlag Transporter</span>
              <span class="kond__unit"><input v-model.number="form.truckFactor" type="number" min="0" max="200"><em>%</em></span>
            </label>
            <label class="kond__fld"><span>Zeit je Tour aufrunden auf</span>
              <span class="kond__unit"><input v-model.number="form.roundMinutes" type="number" min="1" max="120"><em>Min.</em></span>
            </label>
          </div>
          <p class="kond__hint">Die Fahrzeit kommt von OpenStreetMap (PKW) – der Zuschlag gleicht das langsamere Fahren mit dem Transporter aus.</p>
        </section>

        <section class="kond__card wf-card">
          <h2 class="kond__h2"><WfIcon name="truck" :size="16" /> Kilometer</h2>
          <div class="kond__row">
            <label class="kond__fld"><span>Kilometergeld ab</span>
              <span class="kond__unit"><input v-model.number="form.freeKm" type="number" min="0"><em>km einfach</em></span>
            </label>
            <label class="kond__fld"><span>Kilometergeld</span>
              <span class="kond__unit"><input v-model.number="form.kmRate" type="number" min="0" step="0.01"><em>€ / km</em></span>
            </label>
          </div>
          <p class="kond__hint">Beispiel 45 km: (45 − {{ num(form.freeKm) }}) km × 4 Strecken × {{ eur(form.kmRate) }} = {{ eur(Math.max(0, 45 - form.freeKm) * 4 * form.kmRate) }}</p>
        </section>

        <p v-if="error" class="kond__error" role="alert">{{ error }}</p>
        <p v-if="msg" class="kond__ok">{{ msg }}</p>
        <div class="kond__actions">
          <button type="submit" class="wf-btn wf-btn--primary" :disabled="saving">{{ saving ? 'Speichere …' : 'Konditionen speichern' }}</button>
        </div>
      </form>

      <!-- Probe-Berechnung -->
      <aside class="kond__test wf-card">
        <h2 class="kond__h2"><WfIcon name="euro" :size="16" /> Probe-Berechnung</h2>
        <p class="kond__hint">Mit den gespeicherten Konditionen – so erscheint es im Angebot.</p>
        <label class="kond__fld"><span>Straße (optional)</span><input v-model="test.street" type="text" placeholder="z. B. Rossauer Lände 17"></label>
        <div class="kond__row kond__row--zip">
          <label class="kond__fld"><span>PLZ</span><input v-model="test.zip" type="text" placeholder="1090"></label>
          <label class="kond__fld"><span>Ort</span><input v-model="test.city" type="text"></label>
        </div>
        <label class="kond__fld"><span>Monatsmiete Warenkorb (für Transportvorteile)</span>
          <span class="kond__unit"><input v-model="test.monthly" type="number" min="0" placeholder="0"><em>€</em></span>
        </label>
        <button class="wf-btn wf-btn--primary kond__testbtn" :disabled="testing || !(test.zip || test.city)" @click="runTest">
          {{ testing ? 'Berechne Route …' : 'Berechnen' }}
        </button>

        <div v-if="quote" class="kond__result">
          <p v-if="!quote.ok" class="kond__error">{{ quote.error }}</p>
          <template v-else>
            <p class="kond__route">
              <strong>{{ num(quote.km) }} km</strong> · ca. {{ quote.driveMinutes }} Min. je Strecke
              <small>{{ quote.resolvedAddress }}</small>
            </p>
            <table class="kond__table">
              <tr><td>Lieferung inkl. Aufbau<small>{{ num(quote.delivery.hours) }} Std. × {{ quote.crew }} Pers.</small></td><td>{{ eur(quote.delivery.cost) }}</td></tr>
              <tr><td>Abholung inkl. Abbau<small>{{ num(quote.pickup.hours) }} Std. × {{ quote.crew }} Pers.</small></td><td>{{ eur(quote.pickup.cost) }}</td></tr>
              <tr><td>Kilometergeld<small>{{ quote.extraKm ? `${num(quote.extraKm)} km` : `unter ${num(quote.settings.freeKm)} km – entfällt` }}</small></td><td>{{ eur(quote.kmCost) }}</td></tr>
              <tr v-if="quote.perk !== 'none'" class="is-perk">
                <td>{{ quote.perk === 'free' ? 'Gratis-Transport Wien' : '−50 % Transportvorteil' }}</td>
                <td>−{{ eur(quote.subtotal - quote.total) }}</td>
              </tr>
              <tr class="is-total"><td>Transport gesamt (netto)</td><td>{{ eur(quote.total) }}</td></tr>
            </table>
          </template>
        </div>
        <p class="kond__privacy">Für die Route wird die Adresse an OpenStreetMap übermittelt (bitte in der Datenschutzerklärung erwähnen).</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.kond__head { display: flex; justify-content: space-between; gap: 1.5em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1.2em; }
.kond__head > div:first-child { flex: 1 1 26em; }
.kond__formula { flex: 1 1 22em; display: flex; flex-direction: column; gap: .35em; padding: 1em 1.2em; border-radius: 14px; background: var(--wf-green-soft); font-size: .84em; color: var(--wf-ink); }
.kond__formula strong { color: var(--wf-green); margin-bottom: .2em; }
.kond__muted { color: var(--wf-muted); }
.kond__grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 1.2em; align-items: start; }
.kond__form { display: grid; gap: 1em; }
.kond__card, .kond__test { padding: 1.3em 1.4em; }
.kond__test { position: sticky; top: 5em; }
.kond__h2 { display: flex; align-items: center; gap: .5em; margin: 0 0 1em; font-size: 1em; font-weight: 600; color: var(--wf-ink); }
.kond__h2 svg { color: var(--wf-green); }
.kond__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(10em, 1fr)); gap: 0 .9em; }
.kond__row--zip { grid-template-columns: 7em 1fr; }
.kond__fld { display: flex; flex-direction: column; gap: .3em; margin-bottom: .9em; }
.kond__fld > span:first-child { font-size: .78em; font-weight: 600; color: #6e6858; }
.kond__fld input { width: 100%; box-sizing: border-box; padding: .6em .8em; font: inherit; font-size: .92em; border: 1px solid var(--wf-line); border-radius: 10px; background: #fff; }
.kond__fld input:focus { outline: none; border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .1); }
.kond__unit { position: relative; display: block; }
.kond__unit input { padding-right: 5.5em; }
.kond__unit em { position: absolute; right: .8em; top: 50%; transform: translateY(-50%); font-style: normal; font-size: .78em; color: var(--wf-muted); pointer-events: none; }
.kond__hint { margin: -.3em 0 0; font-size: .8em; color: var(--wf-muted); }
.kond__hint a { color: var(--wf-green); }
.kond__error { color: var(--wf-red); background: var(--wf-red-soft); border-radius: 10px; padding: .6em .9em; font-size: .88em; margin: 0; }
.kond__ok { color: var(--wf-green); background: var(--wf-green-soft); border-radius: 10px; padding: .6em .9em; font-size: .88em; margin: 0; }
.kond__actions { display: flex; justify-content: flex-end; }
.kond__testbtn { width: 100%; justify-content: center; }
.kond__result { margin-top: 1.1em; padding-top: 1em; border-top: 1px solid var(--wf-line); }
.kond__route { margin: 0 0 .8em; font-size: .92em; }
.kond__route small { display: block; margin-top: .2em; font-size: .78em; color: var(--wf-muted); line-height: 1.4; }
.kond__table { width: 100%; border-collapse: collapse; font-size: .88em; }
.kond__table td { padding: .5em 0; border-bottom: 1px solid #f0ebe0; vertical-align: top; }
.kond__table td:last-child { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.kond__table small { display: block; font-size: .8em; color: var(--wf-muted); }
.kond__table .is-perk td { color: var(--wf-green); font-weight: 600; }
.kond__table .is-total td { border-bottom: 0; font-weight: 700; font-size: 1.05em; padding-top: .7em; }
.kond__privacy { margin: 1em 0 0; font-size: .74em; color: var(--wf-muted); }
@media (max-width: 960px) {
  .kond__grid { grid-template-columns: 1fr; }
  .kond__test { position: static; }
}
</style>
