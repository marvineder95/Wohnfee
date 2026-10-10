<script setup lang="ts">
// Online-Angebot für Kund:innen – Link aus der Angebotsmail (ohne Login).
// Ansehen, PDF laden, annehmen (Name + Bestätigung) oder ablehnen (optional mit Grund).
// Mietangebote: Hinweis, wie lange die Möbel reserviert sind.

const route = useRoute()
const token = String(route.params.token || '')
const { data, error } = await useFetch<any>(`/api/offer/${token}`, { key: `offer-${token}` })

const en = computed(() => data.value?.lang === 'en')
const t = (de: string, enText: string) => (en.value ? enText : de)

useHead(() => ({
  title: data.value ? `${t('Angebot', 'Offer')} ${data.value.number} – WOHNFEE` : 'WOHNFEE',
  htmlAttrs: { lang: en.value ? 'en' : 'de' },
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
}))

const locale = computed(() => (en.value ? 'en-GB' : 'de-AT'))
const eur = (v: number) => v.toLocaleString(locale.value, { style: 'currency', currency: 'EUR' })
const date = (v: string | null) => v ? new Date(String(v).slice(0, 10) + 'T12:00:00').toLocaleDateString(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const dateTime = (v: string | null) => v ? new Date(v).toLocaleString(locale.value, { timeZone: 'Europe/Vienna', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''
const qty = (n: number) => Number(n.toFixed(2)).toLocaleString(locale.value)

const answered = computed(() => ['angenommen', 'abgelehnt'].includes(data.value?.status))
const canRespond = computed(() => data.value && !answered.value && !data.value.expired)
const pdfUrl = computed(() => `/api/offer/${token}/pdf`)

// Restzeit der Reservierung (nur Anzeige)
const now = ref(Date.now())
let timer: any
onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 60_000) })
onBeforeUnmount(() => clearInterval(timer))
const hoursLeft = computed(() => {
  const until = data.value?.rental?.reservedUntil
  return until ? Math.max(0, Math.round((new Date(until).getTime() - now.value) / 3600000)) : 0
})

// Antwort
const mode = ref<'none' | 'accept' | 'decline'>('none')
const name = ref('')
const confirmed = ref(false)
const reason = ref('')
const busy = ref(false)
const msg = ref('')
const REASONS = computed(() => en.value
  ? ['Too expensive', 'Different time period', 'Found another solution', 'Project postponed']
  : ['Zu teuer', 'Anderer Zeitraum', 'Andere Lösung gefunden', 'Projekt verschoben'])

async function respond(action: 'accept' | 'decline') {
  msg.value = ''
  if (action === 'accept') {
    if (name.value.trim().length < 2) { msg.value = t('Bitte geben Sie Ihren Namen an.', 'Please enter your name.'); return }
    if (!confirmed.value) { msg.value = t('Bitte bestätigen Sie die Annahme.', 'Please confirm the acceptance.'); return }
  }
  busy.value = true
  try {
    data.value = await $fetch<any>(`/api/offer/${token}/respond`, {
      method: 'POST',
      body: action === 'accept' ? { action, name: name.value.trim(), confirm: true } : { action, reason: reason.value.trim() }
    })
    mode.value = 'none'
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    msg.value = e?.data?.statusMessage || t('Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an.', 'Something went wrong. Please try again or give us a call.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="ofr">
    <div v-if="error || !data" class="ofr__wrap">
      <div class="ofr__card ofr__missing">
        <p class="ofr__eyebrow">WOHNFEE</p>
        <p class="ofr__h1">Angebot nicht gefunden</p>
        <p>Der Link ist ungültig oder das Angebot wurde zurückgezogen. Bitte melden Sie sich bei uns:
          <a href="mailto:office@wohnfee.at">office@wohnfee.at</a> · <a href="tel:+436769202236">+43 676 9202236</a></p>
      </div>
    </div>

    <div v-else class="ofr__wrap">
      <!-- Kopf -->
      <div class="ofr__head">
        <p class="ofr__eyebrow">{{ t('Ihr persönliches Angebot', 'Your personal offer') }}</p>
        <p class="ofr__h1">{{ data.subject || t('Angebot', 'Offer') }}</p>
        <p class="ofr__meta">
          {{ t('Angebot', 'Offer') }} {{ data.number }} · {{ t('vom', 'dated') }} {{ date(data.docDate) }}
          <template v-if="data.validUntil"> · {{ t('gültig bis', 'valid until') }} {{ date(data.validUntil) }}</template>
        </p>
        <p class="ofr__for">{{ t('für', 'for') }} <strong>{{ data.customerName }}</strong></p>
      </div>

      <!-- Status -->
      <div v-if="data.status === 'angenommen'" class="ofr__banner is-yes">
        <span class="ofr__bicon">✓</span>
        <span>
          <strong>{{ t('Vielen Dank – Sie haben das Angebot angenommen!', 'Thank you – you have accepted the offer!') }}</strong>
          <small>{{ t('Wir melden uns in Kürze, um den genauen Liefertermin abzustimmen. Eine Bestätigung haben wir Ihnen per E-Mail geschickt.', 'We will be in touch shortly to arrange the exact delivery date. A confirmation has been sent to you by e-mail.') }}</small>
        </span>
      </div>
      <div v-else-if="data.status === 'abgelehnt'" class="ofr__banner is-no">
        <span class="ofr__bicon">×</span>
        <span>
          <strong>{{ t('Danke für Ihre Rückmeldung.', 'Thank you for letting us know.') }}</strong>
          <small>{{ t('Sie haben das Angebot abgelehnt. Wenn wir Ihnen ein angepasstes Angebot machen dürfen, melden Sie sich jederzeit gerne.', 'You have declined the offer. If you would like an adjusted offer, feel free to contact us at any time.') }}</small>
        </span>
      </div>
      <div v-else-if="data.expired" class="ofr__banner is-old">
        <span class="ofr__bicon">!</span>
        <span>
          <strong>{{ t('Dieses Angebot ist abgelaufen.', 'This offer has expired.') }}</strong>
          <small>{{ t('Gerne prüfen wir die Verfügbarkeit erneut und schicken Ihnen ein aktuelles Angebot.', 'We are happy to check availability again and send you an updated offer.') }}
            <a href="mailto:office@wohnfee.at">office@wohnfee.at</a></small>
        </span>
      </div>
      <div v-else-if="data.rental?.reserved" class="ofr__banner is-hold">
        <span class="ofr__bicon">⏱</span>
        <span>
          <strong>{{ t('Ihre Möbel sind reserviert', 'Your furniture is reserved') }}<template v-if="hoursLeft <= 48"> – {{ t('noch', 'another') }} {{ hoursLeft }} {{ t('Std.', 'hrs') }}</template></strong>
          <small>{{ t('Bis', 'Until') }} {{ dateTime(data.rental.reservedUntil) }} {{ t('halten wir alle Stücke exklusiv für Sie frei.', 'we are holding every piece exclusively for you.') }}</small>
        </span>
      </div>

      <div class="ofr__grid">
        <div class="ofr__main">
          <!-- Mietdetails mit Fotos -->
          <section v-if="data.rental" class="ofr__card">
            <p class="ofr__h2">{{ t('Ihre Möbel', 'Your furniture') }}</p>
            <div class="ofr__facts">
              <div><span>{{ t('Mietzeitraum', 'Rental period') }}</span><strong>{{ date(data.rental.startDate) }} – {{ date(data.rental.endDate) }}</strong></div>
              <div><span>{{ t('Mietdauer', 'Duration') }}</span><strong>{{ data.rental.months }} {{ data.rental.months === 1 ? t('Monat', 'month') : t('Monate', 'months') }}</strong></div>
              <div v-if="data.rental.address"><span>{{ t('Lieferadresse', 'Delivery address') }}</span><strong>{{ data.rental.address }}</strong></div>
            </div>
            <ul class="ofr__furn">
              <li v-for="(f, i) in data.rental.furniture" :key="i">
                <span class="ofr__thumb">
                  <img v-if="f.image" :src="f.image" :alt="f.title" loading="lazy">
                  <WfIcon v-else name="box" :size="22" />
                </span>
                <span class="ofr__ftitle">
                  <strong>{{ (en && f.titleEn) || f.title }}</strong>
                  <small>{{ f.quantity }}× <template v-if="f.monthlyPrice !== null">· {{ eur(f.monthlyPrice) }} / {{ t('Monat', 'month') }}</template></small>
                </span>
              </li>
            </ul>
          </section>

          <!-- Positionen -->
          <section class="ofr__card">
            <p class="ofr__h2">{{ t('Positionen', 'Items') }}</p>
            <ul class="ofr__lines">
              <li v-for="(l, i) in data.lines" :key="i">
                <span class="ofr__ldesc">{{ l.description }}<small>{{ qty(l.quantity) }} {{ l.unit }} × {{ eur(l.unitPrice) }}</small></span>
                <span class="ofr__lsum">{{ eur(l.total) }}</span>
              </li>
            </ul>
            <dl class="ofr__sum">
              <div><dt>{{ t('Netto', 'Net') }}</dt><dd>{{ eur(data.netto) }}</dd></div>
              <div v-if="!data.vatFree"><dt>{{ t('USt.', 'VAT') }} {{ data.vatRate }} %</dt><dd>{{ eur(data.vat) }}</dd></div>
              <div v-else><dt>{{ data.vatNote || t('steuerfrei', 'tax exempt') }}</dt><dd>{{ eur(0) }}</dd></div>
              <div class="is-total"><dt>{{ t('Gesamt', 'Total') }}</dt><dd>{{ eur(data.brutto) }}</dd></div>
            </dl>
            <p v-if="data.note" class="ofr__note">{{ data.note }}</p>
          </section>
        </div>

        <!-- Entscheidung -->
        <aside class="ofr__side">
          <div class="ofr__card ofr__decide">
            <p class="ofr__total"><span>{{ t('Gesamtbetrag', 'Total amount') }}</span><strong>{{ eur(data.brutto) }}</strong><small>{{ data.vatFree ? '' : t('inkl. USt.', 'incl. VAT') }}</small></p>

            <template v-if="canRespond">
              <template v-if="mode !== 'decline'">
                <label class="ofr__field">
                  <span>{{ t('Ihr Name', 'Your name') }}</span>
                  <input v-model="name" type="text" autocomplete="name" :placeholder="t('Vor- und Nachname', 'First and last name')" @focus="mode = 'accept'">
                </label>
                <label class="ofr__check">
                  <input v-model="confirmed" type="checkbox" @change="mode = 'accept'">
                  <span>{{ t(`Ich nehme das Angebot ${data.number} verbindlich an.`, `I accept offer ${data.number} as binding.`) }}</span>
                </label>
                <button class="ofr__btn ofr__btn--yes" :disabled="busy" @click="respond('accept')">
                  {{ busy && mode === 'accept' ? t('Wird gesendet …', 'Sending …') : t('Angebot annehmen', 'Accept offer') }}
                </button>
                <button class="ofr__link" :disabled="busy" @click="mode = 'decline'; msg = ''">{{ t('Angebot ablehnen', 'Decline offer') }}</button>
              </template>
              <template v-else>
                <p class="ofr__small">{{ t('Schade! Verraten Sie uns kurz, warum? (optional)', 'What a pity! Would you tell us why? (optional)') }}</p>
                <div class="ofr__chips">
                  <button v-for="r in REASONS" :key="r" class="ofr__chip" :class="{ 'is-on': reason === r }" @click="reason = reason === r ? '' : r">{{ r }}</button>
                </div>
                <textarea v-model="reason" rows="3" class="ofr__area" :placeholder="t('Ihre Nachricht an uns …', 'Your message to us …')" maxlength="2000" />
                <button class="ofr__btn ofr__btn--no" :disabled="busy" @click="respond('decline')">
                  {{ busy ? t('Wird gesendet …', 'Sending …') : t('Ablehnen', 'Decline') }}
                </button>
                <button class="ofr__link" :disabled="busy" @click="mode = 'none'; msg = ''">{{ t('Zurück', 'Back') }}</button>
              </template>
              <p v-if="msg" class="ofr__msg" role="alert">{{ msg }}</p>
            </template>

            <a class="ofr__btn ofr__btn--ghost" :href="pdfUrl" target="_blank" rel="noopener">{{ t('PDF ansehen', 'View PDF') }}</a>
          </div>

          <div class="ofr__card ofr__help">
            <p class="ofr__h3">{{ t('Fragen zum Angebot?', 'Questions about the offer?') }}</p>
            <p>{{ t('Wir passen das Angebot gerne an – rufen Sie an oder schreiben Sie uns.', 'We are happy to adjust the offer – call or write to us.') }}</p>
            <p><a href="tel:+436769202236">+43 676 9202236</a><br><a href="mailto:office@wohnfee.at">office@wohnfee.at</a></p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ofr { background: #f8f5ef; padding: clamp(28px, 5vw, 64px) 16px 80px; color: #3f3c35; }
.ofr__wrap { max-width: 1080px; margin: 0 auto; }
.ofr__eyebrow { display: flex; align-items: center; gap: .7em; margin: 0 0 .6em; font-size: .78rem; letter-spacing: .16em; text-transform: uppercase; color: #2f5d40; text-align: left; }
.ofr__eyebrow::before { content: ''; width: 28px; height: 1px; background: currentColor; }
.ofr__h1 { margin: 0; font-family: var(--font-family-02, Gelasio, serif); font-size: clamp(1.7rem, 3.6vw, 2.6rem); line-height: 1.15; color: #26492f; text-align: left; }
.ofr__h2 { margin: 0 0 .9em; font-family: var(--font-family-02, Gelasio, serif); font-size: 1.3rem; color: #26492f; }
.ofr__h3 { margin: 0 0 .4em; font-weight: 700; color: #26492f; }
.ofr__meta { margin: .7em 0 0; color: #8a857a; font-size: .95rem; }
.ofr__for { margin: .2em 0 0; font-size: .95rem; }
.ofr__head { margin-bottom: 1.6em; }

.ofr__banner { display: flex; gap: 1em; align-items: flex-start; padding: 1em 1.2em; border-radius: 18px; margin-bottom: 1.4em; border: 1px solid; }
.ofr__banner strong { display: block; font-size: 1.02rem; }
.ofr__banner small { display: block; margin-top: .2em; font-size: .9rem; opacity: .9; }
.ofr__bicon { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; color: #fff; }
.ofr__banner.is-yes { background: #e9f1ea; border-color: #c9dccb; color: #26492f; }
.ofr__banner.is-yes .ofr__bicon { background: #2f5d40; }
.ofr__banner.is-no { background: #f6efee; border-color: #e7d3cf; color: #7a3a30; }
.ofr__banner.is-no .ofr__bicon { background: #a5524a; }
.ofr__banner.is-old { background: #f4f1ea; border-color: #e2dccd; color: #5e584b; }
.ofr__banner.is-old .ofr__bicon { background: #8a857a; }
.ofr__banner.is-hold { background: #fff; border-color: #dfe7df; color: #26492f; }
.ofr__banner.is-hold .ofr__bicon { background: #7fa07a; font-size: .9rem; }
.ofr__banner a { color: inherit; }

.ofr__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 340px); gap: 1.4em; align-items: start; }
.ofr__main { display: grid; gap: 1.4em; min-width: 0; }
.ofr__side { display: grid; gap: 1.2em; position: sticky; top: calc(var(--hs-head, 90px) + 16px); }
.ofr__card { background: #fff; border-radius: 22px; padding: clamp(18px, 3vw, 28px); box-shadow: 0 1px 2px rgba(38, 73, 47, .05), 0 12px 32px -18px rgba(38, 73, 47, .25); min-width: 0; }
.ofr__missing { max-width: 560px; }
.ofr__missing a, .ofr__help a { color: #2f5d40; }

.ofr__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .8em 1.2em; margin-bottom: 1.2em; padding-bottom: 1.2em; border-bottom: 1px solid #efeadf; }
.ofr__facts span { display: block; font-size: .74rem; letter-spacing: .08em; text-transform: uppercase; color: #8a857a; }
.ofr__facts strong { font-size: .98rem; }
.ofr__furn { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: .8em; }
.ofr__furn li { display: flex; gap: .8em; align-items: center; padding: .55em; border-radius: 14px; background: #f8f5ef; min-width: 0; }
.ofr__thumb { flex: 0 0 64px; height: 64px; border-radius: 10px; overflow: hidden; background: #ece6da; display: grid; place-items: center; color: #9b9483; }
.ofr__thumb img { width: 100%; height: 100%; object-fit: cover; }
.ofr__ftitle { min-width: 0; display: flex; flex-direction: column; }
.ofr__ftitle strong { font-size: .92rem; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ofr__ftitle small { color: #8a857a; font-size: .8rem; }

.ofr__lines { list-style: none; margin: 0; padding: 0; }
.ofr__lines li { display: flex; justify-content: space-between; gap: 1em; padding: .7em 0; border-bottom: 1px solid #efeadf; }
.ofr__ldesc { min-width: 0; font-size: .94rem; overflow-wrap: anywhere; }
.ofr__ldesc small { display: block; color: #8a857a; font-size: .8rem; margin-top: .15em; }
.ofr__lsum { white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }
.ofr__sum { margin: 1em 0 0 auto; max-width: 320px; display: grid; gap: .3em; }
.ofr__sum div { display: flex; justify-content: space-between; gap: 1em; font-size: .94rem; }
.ofr__sum dt { color: #6f6a5e; }
.ofr__sum dd { margin: 0; font-variant-numeric: tabular-nums; }
.ofr__sum .is-total { margin-top: .3em; padding-top: .5em; border-top: 2px solid #26492f; font-weight: 700; font-size: 1.05rem; color: #26492f; }
.ofr__sum .is-total dt { color: inherit; }
.ofr__note { margin: 1.4em 0 0; padding: 1em 1.1em; border-radius: 14px; background: #f8f5ef; font-size: .88rem; white-space: pre-line; color: #5e584b; }

.ofr__decide { display: grid; gap: .8em; }
.ofr__total { margin: 0 0 .4em; display: flex; flex-direction: column; }
.ofr__total span { font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; color: #8a857a; }
.ofr__total strong { font-family: var(--font-family-02, Gelasio, serif); font-size: 2rem; color: #26492f; line-height: 1.2; }
.ofr__total small { color: #8a857a; font-size: .8rem; }
.ofr__field { display: grid; gap: .3em; font-size: .85rem; color: #6f6a5e; }
.ofr__field input, .ofr__area { font: inherit; font-size: 1rem; padding: .7em .9em; border-radius: 12px; border: 1px solid #ddd5c5; background: #fff; color: #3f3c35; width: 100%; box-sizing: border-box; }
.ofr__field input:focus, .ofr__area:focus { outline: 2px solid #7fa07a; outline-offset: 1px; border-color: transparent; }
.ofr__check { display: flex; gap: .6em; align-items: flex-start; font-size: .9rem; line-height: 1.4; cursor: pointer; }
.ofr__check input { margin-top: .2em; width: 18px; height: 18px; accent-color: #2f5d40; flex: 0 0 auto; }
.ofr__btn { display: block; width: 100%; box-sizing: border-box; text-align: center; border: 0; border-radius: 999px; padding: .95em 1.2em; font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background .2s, transform .1s; }
.ofr__btn:active { transform: translateY(1px); }
.ofr__btn:disabled { opacity: .6; cursor: wait; }
.ofr__btn--yes { background: #2f5d40; color: #fff; }
.ofr__btn--yes:hover { background: #26492f; }
.ofr__btn--no { background: #a5524a; color: #fff; }
.ofr__btn--ghost { background: #fff; color: #2f5d40; border: 1px solid #cfdccf; font-weight: 500; }
.ofr__link { background: none; border: 0; font: inherit; font-size: .88rem; color: #8a857a; text-decoration: underline; cursor: pointer; padding: .2em; justify-self: center; }
.ofr__small { margin: 0; font-size: .92rem; }
.ofr__chips { display: flex; flex-wrap: wrap; gap: .4em; }
.ofr__chip { border: 1px solid #ddd5c5; background: #fff; border-radius: 999px; padding: .4em .85em; font: inherit; font-size: .82rem; cursor: pointer; color: #5e584b; }
.ofr__chip.is-on { background: #26492f; border-color: #26492f; color: #fff; }
.ofr__area { resize: vertical; }
.ofr__msg { margin: 0; color: #a5524a; font-size: .88rem; }
.ofr__help { font-size: .9rem; }
.ofr__help p { margin: 0 0 .5em; }

@media (max-width: 860px) {
  .ofr__grid { grid-template-columns: minmax(0, 1fr); }
  .ofr__side { position: static; }
}
</style>
