<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Passwort zurücksetzen - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }],
  bodyAttrs: { class: 'admin-login-body' }
})

const route = useRoute()
const router = useRouter()
const token = String(route.query.token || '')

const checking = ref(true)
const valid = ref(false)
const invalidReason = ref('')
const username = ref('')

const password = ref('')
const password2 = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')
const done = ref(false)

onMounted(async () => {
  if (!token) {
    checking.value = false
    invalidReason.value = 'ungültig'
    return
  }
  try {
    const res = await $fetch<{ valid: boolean; reason?: string; username?: string }>(
      '/api/admin/password/validate', { query: { token } }
    )
    valid.value = res.valid
    invalidReason.value = res.reason || ''
    username.value = res.username || ''
  } catch {
    invalidReason.value = 'ungültig'
  } finally {
    checking.value = false
  }
})

async function submit() {
  error.value = ''
  if (password.value !== password2.value) {
    error.value = 'Die Passwörter stimmen nicht überein.'
    return
  }
  submitting.value = true
  try {
    await $fetch('/api/admin/password/reset', {
      method: 'POST',
      body: { token, password: password.value }
    })
    done.value = true
    setTimeout(() => router.push('/admin'), 2500)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen. Bitte erneut versuchen.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="pwreset">
    <div class="pwreset__card">
      <div class="pwreset__brand">WOHN<span>FEE</span> Dashboard</div>

      <p v-if="checking" class="pwreset__hint">Link wird geprüft …</p>

      <template v-else-if="!valid">
        <h1 class="pwreset__title">Link ungültig</h1>
        <p class="pwreset__hint">
          Dieser Link ist {{ invalidReason === 'abgelaufen' ? 'abgelaufen' : 'nicht gültig' }}.
          Bitte fordere einen neuen an.
        </p>
        <NuxtLink to="/admin" class="pwreset__submit pwreset__submit--link">Zum Login</NuxtLink>
      </template>

      <template v-else-if="!done">
        <h1 class="pwreset__title">Neues Passwort vergeben</h1>
        <p class="pwreset__hint">für Benutzerkonto <strong>{{ username }}</strong></p>

        <form class="pwreset__form" @submit.prevent="submit">
          <label>
            <span>Neues Passwort (mind. 8 Zeichen)</span>
            <input v-model="password" :type="showPassword ? 'text' : 'password'"
                   autocomplete="new-password" :disabled="submitting">
          </label>
          <label>
            <span>Neues Passwort wiederholen</span>
            <input v-model="password2" :type="showPassword ? 'text' : 'password'"
                   autocomplete="new-password" :disabled="submitting">
          </label>
          <label class="pwreset__showpw">
            <input v-model="showPassword" type="checkbox" :disabled="submitting">
            <span>Passwort anzeigen</span>
          </label>

          <p v-if="error" class="pwreset__error" role="alert">{{ error }}</p>

          <button type="submit" class="pwreset__submit" :disabled="submitting">
            {{ submitting ? 'Wird gespeichert …' : 'Passwort speichern' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h1 class="pwreset__title pwreset__title--ok">✓ Passwort geändert</h1>
        <p class="pwreset__hint">Du wirst gleich zum Login weitergeleitet …</p>
        <NuxtLink to="/admin" class="pwreset__submit pwreset__submit--link">Zum Login</NuxtLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pwreset {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5em;
  background: linear-gradient(160deg, #f0f0f0 0%, #dddde5 100%);
  font-family: var(--font-family-01, 'Open Sans', sans-serif);
  color: var(--text-color-01, #333);
}

.pwreset__card {
  width: 100%;
  max-width: 26em;
  background: #fefefe;
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(51, 51, 51, .18);
  padding: 2.4em 2.2em 2.2em;
}

.pwreset__brand {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-size: 1.35em;
  letter-spacing: .04em;
  text-align: center;
  margin-bottom: 1.2em;
}

.pwreset__brand span {
  color: var(--deco-color-01, #317046);
}

.pwreset__title {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-weight: 400;
  font-size: 1.4em;
  text-align: center;
  margin: 0 0 .4em;
}

.pwreset__title--ok {
  color: var(--deco-color-01, #317046);
}

.pwreset__hint {
  text-align: center;
  font-size: .9em;
  color: var(--text-color-05, #999);
  margin: 0 0 1.6em;
}

.pwreset__form label {
  display: block;
  margin-bottom: 1em;
}

.pwreset__form label > span {
  display: block;
  font-size: .85em;
  color: var(--text-color-04, #666);
  margin-bottom: .3em;
}

.pwreset__form input[type='password'],
.pwreset__form input[type='text'] {
  width: 100%;
  box-sizing: border-box;
  padding: .7em .9em;
  font-size: 1em;
  font-family: inherit;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
}

.pwreset__form input:focus {
  outline: none;
  border-color: var(--deco-color-02, #77ad96);
  box-shadow: 0 0 0 3px var(--deco-color-03tr, #bad9b4aa);
}

.pwreset__showpw {
  display: flex !important;
  align-items: center;
  gap: .5em;
  font-size: .88em;
  color: var(--text-color-04, #666);
}

.pwreset__showpw span {
  margin: 0 !important;
}

.pwreset__error {
  background: #fdecea;
  color: #a83226;
  border-radius: 6px;
  padding: .6em .9em;
  font-size: .88em;
  margin: 0 0 1em;
}

.pwreset__submit {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  padding: .8em 1em;
  font-size: 1.02em;
  font-family: inherit;
  color: #fff;
  background: var(--deco-color-01, #317046);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
}

.pwreset__submit:hover:not(:disabled) {
  background: #265c38;
}

.pwreset__submit:disabled {
  opacity: .65;
}

@media (max-width: 480px) {
  .pwreset { padding: 0; }
  .pwreset__card {
    min-height: 100dvh;
    border-radius: 0;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>
