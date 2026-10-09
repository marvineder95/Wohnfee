<script setup lang="ts">
// Kontaktformular für /kontakt.html — sendet an /api/contact
const props = withDefaults(defineProps<{ lang?: string }>(), { lang: 'de' })
const isEn = computed(() => props.lang === 'en')

const DE = {
  title: 'Schreib uns',
  intro: 'Du hast eine Frage oder möchtest ein Projekt besprechen? Schick uns eine Nachricht — wir melden uns in der Regel innerhalb von 24 Stunden.',
  name: 'Name *',
  email: 'E-Mail *',
  phone: 'Telefon',
  subject: 'Betreff',
  message: 'Deine Nachricht *',
  privacyPre: 'Ich habe die',
  privacyLabel: 'Datenschutzerklärung',
  privacyPost: 'gelesen und bin mit der Verarbeitung meiner Daten zur Beantwortung der Anfrage einverstanden. *',
  errRequired: 'Bitte fülle alle Pflichtfelder aus.',
  errPrivacy: 'Bitte bestätige die Datenschutzerklärung.',
  errSend: 'Senden fehlgeschlagen. Bitte versuche es erneut.',
  sending: 'Wird gesendet …',
  submit: 'Nachricht senden',
  successTitle: 'Vielen Dank!',
  successText: 'Deine Nachricht ist bei uns eingegangen. Wir melden uns so bald wie möglich bei dir.'
}
const EN = {
  title: 'Write to us',
  intro: 'Have a question or want to discuss a project? Send us a message — we usually get back to you within 24 hours.',
  name: 'Name *',
  email: 'E-mail *',
  phone: 'Phone',
  subject: 'Subject',
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
      <div class="contact-form__row">
        <label class="contact-form__field">
          <span>{{ t.name }}</span>
          <input v-model="form.name" type="text" name="name" autocomplete="name" maxlength="128" required>
        </label>
        <label class="contact-form__field">
          <span>{{ t.email }}</span>
          <input v-model="form.email" type="email" name="email" autocomplete="email" maxlength="190" required>
        </label>
      </div>

      <div class="contact-form__row">
        <label class="contact-form__field">
          <span>{{ t.phone }}</span>
          <input v-model="form.phone" type="tel" name="phone" autocomplete="tel" maxlength="64">
        </label>
        <label class="contact-form__field">
          <span>{{ t.subject }}</span>
          <select v-model="form.subject" name="subject">
            <option v-for="s in subjects" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
      </div>

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
  max-width: 46em;
  margin: 2.5em auto 0;
  padding: 2em 2em 2.2em;
  background: #f7f7f5;
  border-radius: 8px;
}

.contact-form__title {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-weight: 400;
  font-size: 1.5em;
  text-align: center;
  margin: 0 0 .4em;
  color: var(--text-color-01, #333);
}

.contact-form__intro {
  text-align: center;
  font-size: .92em;
  color: var(--text-color-04, #666);
  margin: 0 0 1.6em;
}

.contact-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
}

@media (max-width: 600px) {
  .contact-form__row {
    grid-template-columns: 1fr;
  }
  .contact-form {
    padding: 1.4em 1.2em 1.6em;
  }
}

.contact-form__field {
  display: block;
  margin-bottom: 1em;
}

.contact-form__field > span {
  display: block;
  font-size: .82em;
  margin-bottom: .3em;
  color: var(--text-color-04, #666);
}

.contact-form__field input,
.contact-form__field select,
.contact-form__field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: .65em .85em;
  font-size: .95em;
  font-family: var(--font-family-01, 'Open Sans', sans-serif);
  color: var(--text-color-01, #333);
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: border-color .15s, box-shadow .15s;
}

.contact-form__field input:focus,
.contact-form__field select:focus,
.contact-form__field textarea:focus {
  outline: none;
  border-color: var(--deco-color-02, #77ad96);
  box-shadow: 0 0 0 3px var(--deco-color-03tr, #bad9b4aa);
}

.contact-form__field textarea {
  resize: vertical;
  min-height: 7em;
}

/* Honeypot: für Menschen unsichtbar */
.contact-form__hp {
  position: absolute !important;
  left: -9999px !important;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.contact-form__privacy {
  display: flex;
  gap: .6em;
  align-items: flex-start;
  font-size: .82em;
  color: var(--text-color-04, #666);
  margin: .2em 0 1.2em;
  cursor: pointer;
}

.contact-form__privacy input {
  margin-top: .2em;
  accent-color: var(--deco-color-01, #317046);
}

.contact-form__privacy a {
  color: var(--deco-color-01, #317046);
}

.contact-form__error {
  background: #fdecea;
  color: #a83226;
  border-radius: 4px;
  padding: .6em .9em;
  font-size: .88em;
  margin: 0 0 1em;
}

.contact-form__success {
  background: #eef7ee;
  border: 1px solid var(--deco-color-03, #90c685);
  color: #265c38;
  border-radius: 6px;
  padding: 1em 1.2em;
  font-size: .95em;
  text-align: center;
}

.contact-form__submit {
  display: inline-block;
  padding: .8em 2.2em;
  font-size: 1em;
  font-family: var(--font-family-01, 'Open Sans', sans-serif);
  color: #fff;
  background: var(--deco-color-01, #317046);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background .15s, opacity .15s;
}

.contact-form__submit:hover:not(:disabled) {
  background: #265c38;
}

.contact-form__submit:disabled {
  opacity: .65;
  cursor: default;
}

.is-sending {
  pointer-events: none;
  opacity: .8;
}
</style>
