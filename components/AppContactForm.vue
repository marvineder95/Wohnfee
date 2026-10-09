<script setup lang="ts">
// Kontaktformular für /kontakt.html — sendet an /api/contact
const props = withDefaults(defineProps<{ lang?: string }>(), { lang: 'de' })
const isEn = computed(() => props.lang === 'en')

const DE = {
  title: 'Schreiben Sie uns',
  intro: 'Sie haben eine Frage oder möchten ein Projekt besprechen? Schicken Sie uns eine Nachricht – wir melden uns in der Regel innerhalb von 24 Stunden.',
  name: 'Name *',
  email: 'E-Mail *',
  phone: 'Telefon',
  subject: 'Worum geht es?',
  message: 'Ihre Nachricht *',
  privacyPre: 'Ich habe die',
  privacyLabel: 'Datenschutzerklärung',
  privacyPost: 'gelesen und bin mit der Verarbeitung meiner Daten zur Beantwortung der Anfrage einverstanden. *',
  errRequired: 'Bitte füllen Sie alle Pflichtfelder aus.',
  errPrivacy: 'Bitte bestätigen Sie die Datenschutzerklärung.',
  errSend: 'Senden fehlgeschlagen. Bitte versuchen Sie es erneut.',
  sending: 'Wird gesendet …',
  submit: 'Nachricht senden',
  successTitle: 'Vielen Dank!',
  successText: 'Ihre Nachricht ist bei uns eingegangen. Wir melden uns so bald wie möglich bei Ihnen.'
}
const EN = {
  title: 'Write to us',
  intro: 'Have a question or want to discuss a project? Send us a message — we usually get back to you within 24 hours.',
  name: 'Name *',
  email: 'E-mail *',
  phone: 'Phone',
  subject: 'What is it about?',
  message: 'Your message *',
  privacyPre: 'I have read the',
  privacyLabel: 'Privacy Policy',
  privacyPost: 'and agree to my data being processed to answer my enquiry. *',
  errRequired: 'Please fill in all required fields.',
  errPrivacy: 'Please confirm the privacy policy.',
  errSend: 'Sending failed. Please try again.',
  sending: 'Sending …',
  submit: 'Send message',
  successTitle: 'Thank you!',
  successText: 'Your message has been received. We will get back to you as soon as possible.'
}
const t = computed(() => (isEn.value ? EN : DE))

const form = reactive({
  name: '',
  email: '',
  phone: '',
  subject: 'allgemein',
  message: '',
  privacy: false
})
// Vorbelegung über Links, z. B. /kontakt.html?thema=staging&nachricht=Anfrage%20zu%20PAKET%202
const route = useRoute()
onMounted(() => {
  const thema = String(route.query.thema || '')
  if (subjects.value.some(x => x.value === thema)) form.subject = thema
  const msg = String(route.query.nachricht || '').slice(0, 300)
  if (msg && !form.message) form.message = msg + '\n\n'
})

// Honeypot — für Menschen unsichtbar
const website = ref('')

const sending = ref(false)
const success = ref(false)
const error = ref('')

const subjects = computed(() => [
  { value: 'allgemein', label: isEn.value ? 'General enquiry' : 'Allgemeine Anfrage' },
  { value: 'staging', label: 'Home Staging' },
  { value: 'redesign', label: 'Redesign' },
  { value: 'leasing', label: isEn.value ? 'Furniture Leasing' : 'Furniture Leasing' },
  { value: 'presse', label: isEn.value ? 'Press / partnership' : 'Presse / Kooperation' },
  { value: 'sonstiges', label: isEn.value ? 'Other' : 'Sonstiges' }
])

async function submit() {
  error.value = ''
  success.value = false
  if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
    error.value = t.value.errRequired
    return
  }
  if (!form.privacy) {
    error.value = t.value.errPrivacy
    return
  }
  sending.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: { ...form, website: website.value, lang: props.lang } })
    success.value = true
    form.name = ''; form.email = ''; form.phone = ''
    form.subject = 'allgemein'; form.message = ''; form.privacy = false
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t.value.errSend
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="contact-form block">
    <h2 class="contact-form__title">{{ t.title }}</h2>
    <p class="contact-form__intro">{{ t.intro }}</p>

    <div v-if="success" class="contact-form__success" role="status">
      <strong>{{ t.successTitle }}</strong> {{ t.successText }}
    </div>

    <form v-else class="contact-form__form" :class="{ 'is-sending': sending }"
          @submit.prevent="submit" novalidate>
      <div class="contact-form__row contact-form__row--3">
        <label class="contact-form__field">
          <span>{{ t.name }}</span>
          <input v-model="form.name" type="text" name="name" autocomplete="name" maxlength="128" required>
        </label>
        <label class="contact-form__field">
          <span>{{ t.email }}</span>
          <input v-model="form.email" type="email" name="email" autocomplete="email" maxlength="190" required>
        </label>
        <label class="contact-form__field">
          <span>{{ t.phone }}</span>
          <input v-model="form.phone" type="tel" name="phone" autocomplete="tel" maxlength="64">
        </label>
      </div>

      <fieldset class="contact-form__topics">
        <legend>{{ t.subject }}</legend>
        <label v-for="s in subjects" :key="s.value" class="contact-form__topic" :class="{ 'is-active': form.subject === s.value }">
          <input v-model="form.subject" type="radio" name="subject" :value="s.value">
          <span>{{ s.label }}</span>
        </label>
      </fieldset>

      <label class="contact-form__field">
        <span>{{ t.message }}</span>
        <textarea v-model="form.message" name="message" rows="6" maxlength="5000" required />
      </label>

      <!-- Honeypot: nicht ausfüllen! -->
      <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off"
             class="contact-form__hp" aria-hidden="true">

      <label class="contact-form__privacy">
        <input v-model="form.privacy" type="checkbox" required>
        <span>
          {{ t.privacyPre }}
          <NuxtLink :to="isEn ? '/en/datenschutz.html' : '/datenschutz.html'" target="_blank">{{ t.privacyLabel }}</NuxtLink>
          {{ t.privacyPost }}
        </span>
      </label>

      <p v-if="error" class="contact-form__error" role="alert">{{ error }}</p>

      <button type="submit" class="contact-form__submit" :disabled="sending">
        {{ sending ? t.sending : t.submit }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.contact-form {
  --green: #2f5d40; --green-dark: #26492f; --green-soft: #eef3ee;
  --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  background: #fff; border: 1px solid var(--line); border-radius: 24px;
  padding: 2.2em 2.3em 2.3em; box-shadow: 0 18px 44px rgba(60, 50, 30, .08);
  color: var(--ink); text-align: left;
}
.contact-form__title {
  font-family: var(--font-family-02, Gelasio, Georgia, serif); font-weight: 500;
  font-size: clamp(1.5em, 2.6vw, 1.9em) !important; line-height: 1.2; margin: 0 0 .3em; padding: 0; border: 0;
  text-align: left !important; color: var(--ink);
}
.contact-form__intro { margin: 0 0 1.6em; line-height: 1.65; color: var(--muted); font-size: .95em; text-align: left; }

.contact-form__form { display: grid; gap: 1.1em; }
.contact-form__form.is-sending { opacity: .7; pointer-events: none; }
.contact-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
.contact-form__row--3 { grid-template-columns: repeat(3, 1fr); }
.contact-form__field { display: grid; gap: .4em; margin: 0; }
.contact-form__field > span, .contact-form__topics legend {
  font-size: .78em; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
}
.contact-form__field input,
.contact-form__field textarea {
  width: 100%; box-sizing: border-box; padding: .85em 1em; border: 1px solid var(--line); border-radius: 12px;
  background: var(--cream); color: var(--ink); font: inherit; font-size: .95em;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.contact-form__field input:focus,
.contact-form__field textarea:focus {
  outline: none; background: #fff; border-color: var(--green); box-shadow: 0 0 0 4px rgba(47, 93, 64, .12);
}
.contact-form__field textarea { resize: vertical; min-height: 8.5em; line-height: 1.6; }

.contact-form__topics { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .45em; }
.contact-form__topics legend { margin-bottom: .55em; padding: 0; }
.contact-form__topic { position: relative; cursor: pointer; }
.contact-form__topic input { position: absolute; opacity: 0; pointer-events: none; }
.contact-form__topic span {
  display: inline-block; padding: .55em 1.05em; border-radius: 999px; border: 1px solid var(--line);
  background: #fff; font-size: .86em; font-weight: 600; color: var(--ink); transition: background .15s, color .15s, border-color .15s;
}
.contact-form__topic:hover span { border-color: var(--green); color: var(--green); }
.contact-form__topic.is-active span { background: var(--green); border-color: var(--green); color: #fff; }
.contact-form__topic input:focus-visible + span { outline: 2px solid var(--green); outline-offset: 2px; }

.contact-form__hp { position: absolute !important; left: -9999px !important; width: 1px; height: 1px; opacity: 0; }

.contact-form__privacy { display: flex; gap: .7em; align-items: flex-start; font-size: .84em; line-height: 1.55; color: var(--muted); cursor: pointer; }
.contact-form__privacy input { margin-top: .25em; width: 1.1em; height: 1.1em; accent-color: var(--green); flex: none; }
.contact-form__privacy a { color: var(--green); }

.contact-form__error { margin: 0; padding: .7em 1em; border-radius: 12px; background: #fdecea; color: #a83226; font-size: .9em; }
.contact-form__success {
  padding: 1.4em 1.5em; border-radius: 16px; background: var(--green-soft); border: 1px solid #d9e5da;
  color: var(--green-dark); line-height: 1.6;
}
.contact-form__success strong { display: block; font-family: var(--font-family-02, Gelasio, Georgia, serif); font-size: 1.3em; font-weight: 500; margin-bottom: .2em; }

.contact-form__submit {
  justify-self: start; display: inline-flex; align-items: center; gap: .5em; padding: .95em 2.2em; border: 0; border-radius: 999px;
  background: var(--green); color: #fff; font: inherit; font-weight: 600; font-size: .95em; cursor: pointer;
  box-shadow: 0 10px 24px rgba(47, 93, 64, .25); transition: background .15s, transform .15s;
}
.contact-form__submit:hover:not(:disabled) { background: var(--green-dark); transform: translateY(-1px); }
.contact-form__submit:disabled { opacity: .6; cursor: default; }

@media (max-width: 760px) {
  .contact-form { padding: 1.6em 1.3em; border-radius: 18px; }
  .contact-form__row, .contact-form__row--3 { grid-template-columns: 1fr; }
  .contact-form__submit { justify-self: stretch; justify-content: center; }
}
</style>
