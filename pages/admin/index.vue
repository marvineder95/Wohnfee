<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Login - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }],
  bodyAttrs: { class: 'admin-login-body' }
})

const { login } = useAdminAuth()
const router = useRouter()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'Bitte Benutzername und Passwort eingeben.'
    return
  }
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    await router.push('/admin/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Login fehlgeschlagen. Bitte erneut versuchen.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="admin-login__card">
      <div class="admin-login__brand">
        <img src="/files/wohnfee/layout/img/20231106_wohnfee_logo_web.svg" alt="WOHNFEE" class="admin-login__logo"
             onerror="this.style.display='none'">
        <div class="admin-login__wordmark">WOHN<span>FEE</span></div>
      </div>
      <h1 class="admin-login__title">Dashboard</h1>
      <p class="admin-login__sub">Bitte melde dich an, um fortzufahren.</p>

      <form class="admin-login__form" :class="{ 'is-loading': loading }" @submit.prevent="submit">
        <label class="admin-login__field">
          <span>Benutzername</span>
          <input v-model="username" type="text" name="username" autocomplete="username"
                 :disabled="loading" autofocus>
        </label>

        <label class="admin-login__field">
          <span>Passwort</span>
          <div class="admin-login__password">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" name="password"
                   autocomplete="current-password" :disabled="loading">
            <button type="button" class="admin-login__toggle" :aria-label="showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'"
                    @click="showPassword = !showPassword">
              {{ showPassword ? 'verbergen' : 'anzeigen' }}
            </button>
          </div>
        </label>

        <p v-if="error" class="admin-login__error" role="alert">{{ error }}</p>

        <button type="submit" class="admin-login__submit" :disabled="loading">
          {{ loading ? 'Anmeldung läuft …' : 'Anmelden' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.admin-login {
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

.admin-login__card {
  width: 100%;
  max-width: 26em;
  background: #fefefe;
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(51, 51, 51, .18);
  padding: 2.5em 2.2em 2.2em;
}

.admin-login__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .6em;
  margin-bottom: .4em;
}

.admin-login__logo {
  height: 2.6em;
  width: auto;
}

.admin-login__wordmark {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-size: 1.9em;
  letter-spacing: .04em;
  color: var(--text-color-01, #333);
}

.admin-login__wordmark span {
  color: var(--deco-color-01, #317046);
}

.admin-login__title {
  font-family: var(--font-family-02, Gelasio, Georgia, serif);
  font-size: 1.35em;
  font-weight: 400;
  text-align: center;
  margin: .2em 0 0;
  color: var(--text-color-04, #666);
}

.admin-login__sub {
  text-align: center;
  font-size: .9em;
  color: var(--text-color-05, #999);
  margin: .5em 0 1.8em;
}

.admin-login__field {
  display: block;
  margin-bottom: 1.1em;
}

.admin-login__field > span {
  display: block;
  font-size: .85em;
  margin-bottom: .35em;
  color: var(--text-color-04, #666);
}

.admin-login__field input {
  width: 100%;
  box-sizing: border-box;
  padding: .7em .9em;
  font-size: 1em;
  font-family: inherit;
  color: inherit;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}

.admin-login__field input:focus {
  outline: none;
  border-color: var(--deco-color-02, #77ad96);
  box-shadow: 0 0 0 3px var(--deco-color-03tr, #bad9b4aa);
}

.admin-login__field input:disabled {
  background: #f5f5f5;
}

.admin-login__password {
  position: relative;
}

.admin-login__toggle {
  position: absolute;
  right: .5em;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: none;
  font-size: .78em;
  color: var(--deco-color-01, #317046);
  cursor: pointer;
  padding: .3em .4em;
}

.admin-login__error {
  background: #fdecea;
  color: #a83226;
  border-radius: 6px;
  padding: .6em .9em;
  font-size: .88em;
  margin: 0 0 1em;
}

.admin-login__submit {
  width: 100%;
  padding: .8em 1em;
  font-size: 1.02em;
  font-family: inherit;
  color: #fff;
  background: var(--deco-color-01, #317046);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background .15s, opacity .15s;
}

.admin-login__submit:hover:not(:disabled) {
  background: #265c38;
}

.admin-login__submit:disabled {
  opacity: .65;
  cursor: default;
}

.is-loading {
  pointer-events: none;
}

@media (max-width: 480px) {
  .admin-login {
    padding: 0;
  }
  .admin-login__card {
    min-height: 100dvh;
    border-radius: 0;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>

