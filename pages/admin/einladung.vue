<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Einladung - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }],
  bodyAttrs: { class: 'admin-login-body' }
})

const route = useRoute()
const router = useRouter()
const token = String(route.query.token || '')

const checking = ref(true)
const valid = ref(false)
const invalidReason = ref('')
const displayName = ref('')

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
    const res = await $fetch<{ valid: boolean; reason?: string; displayName?: string }>(
      '/api/admin/invite/validate', { query: { token } }
    )
    valid.value = res.valid
    invalidReason.value = res.reason || ''
    displayName.value = res.displayName || ''
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
    await $fetch('/api/admin/invite/accept', {
      method: 'POST',
      body: { token, username: username.value.trim(), password: password.value }
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
  <div class="invite-page">
    <div class="invite-page__card">
      <div class="invite-page__brand">WOHN<span>FEE</span> Dashboard</div>

      <p v-if="checking" class="invite-page__hint">Einladung wird geprüft …</p>

      <template v-else-if="!valid">
        <h1 class="invite-page__title">Einladung ungültig</h1>
        <p class="invite-page__hint">
          Dieser Einladungslink ist {{ invalidReason === 'abgelaufen' ? 'abgelaufen' : 'nicht gültig' }}
          {{ invalidReason === 'bereits verwendet' ? 'oder wurde bereits verwendet' : '' }}.
          Bitte neue Einladung anfordern.
        </p>
      </template>

      <template v-else-if="!done">
        <h1 class="invite-page__title">Willkommen{{ displayName ? `, ${displayName}` : '' }}!</h1>
        <p class="invite-page__hint">Vergebe deinen Benutzernamen und dein Passwort für das WOHNFEE Dashboard.</p>

        <form class="invite-page__form" @submit.prevent="submit">
          <label>
            <span>Benutzername</span>
            <input v-model="username" type="text" autocomplete="username"
                   placeholder="3–32 Zeichen" :disabled="submitting">
          </label>
          <label>
            <span>Passwort</span>
            <input v-model="password" :type="showPassword ? 'text' : 'password'"
                   autocomplete="new-password" placeholder="mind. 8 Zeichen" :disabled="submitting">
          </label>
          <label>
            <span>Passwort wiederholen</span>
            <input v-model="password2" :type="showPassword ? 'text' : 'password'"
                   autocomplete="new-password" :disabled="submitting">
          </label>
          <label class="invite-page__showpw">
            <input v-model="showPassword" type="checkbox" :disabled="submitting">
            <span>Passwort anzeigen</span>
          </label>

          <p v-if="error" class="invite-page__error" role="alert">{{ error }}</p>

          <button type="submit" class="invite-page__submit" :disabled="submitting">
            {{ submitting ? 'Wird gespeichert …' : 'Konto erstellen' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h1 class="invite-page__title invite-page__title--ok">✓ Konto erstellt</h1>
        <p class="invite-page__hint">
          Dein Benutzerkonto ist aktiv. Du wirst gleich zum Login weitergeleitet …
        </p>
        <NuxtLink to="/admin" class="invite-page__submit invite-page__submit--link">Zum Login</NuxtLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.invite-page {
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

.invite-page__card {
  width: 100%;
  max-width: 26em;
  background: #fefefe;
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(51, 51, 51, .18);
  padding: 2.4em 2.2em 2.2em;
}

.invite-page__brand {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-size: 1.35em;
  letter-spacing: .04em;
  text-align: center;
  margin-bottom: 1.2em;
}

.invite-page__brand span {
  color: var(--deco-color-01, #317046);
}

.invite-page__title {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-weight: 400;
  font-size: 1.4em;
  text-align: center;
  margin: 0 0 .4em;
}

.invite-page__title--ok {
  color: var(--deco-color-01, #317046);
}

.invite-page__hint {
  text-align: center;
  font-size: .9em;
  color: var(--text-color-05, #999);
  margin: 0 0 1.6em;
}

.invite-page__form label {
  display: block;
  margin-bottom: 1em;
}

.invite-page__form label > span {
  display: block;
  font-size: .85em;
  color: var(--text-color-04, #666);
  margin-bottom: .3em;
}

.invite-page__form input[type='text'],
.invite-page__form input[type='password'] {
  width: 100%;
  box-sizing: border-box;
  padding: .7em .9em;
  font-size: 1em;
  font-family: inherit;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
}

.invite-page__form input:focus {
  outline: none;
  border-color: var(--deco-color-02, #77ad96);
  box-shadow: 0 0 0 3px var(--deco-color-03tr, #bad9b4aa);
}

.invite-page__showpw {
  display: flex !important;
  align-items: center;
  gap: .5em;
  font-size: .88em;
  color: var(--text-color-04, #666);
}

.invite-page__showpw span {
  margin: 0 !important;
}

.invite-page__error {
  background: #fdecea;
  color: #a83226;
  border-radius: 6px;
  padding: .6em .9em;
  font-size: .88em;
  margin: 0 0 1em;
}

.invite-page__submit {
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

.invite-page__submit:hover:not(:disabled) {
  background: #265c38;
}

.invite-page__submit:disabled {
  opacity: .65;
}

@media (max-width: 480px) {
  .invite-page { padding: 0; }
  .invite-page__card {
    min-height: 100dvh;
    border-radius: 0;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>
