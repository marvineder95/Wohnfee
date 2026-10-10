<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  title: 'Mein Profil - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

const { user, fetchSession } = useAdminAuth()

// ---------- Header ----------
const initials = computed(() => {
  const parts = String(user.value?.displayName || user.value?.username || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
})
const since = computed(() => {
  const raw = user.value?.createdAt
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
})
const ROLE_LABELS: Record<string, string> = { superadmin: 'Superadmin', admin: 'Admin', user: 'Mitarbeiter' }
const ROLE_TEXTS: Record<string, string> = {
  superadmin: 'Du hast vollständigen Zugriff auf alle Bereiche des Systems.',
  admin: 'Du kannst Projekte, Kunden, Inventar und Dokumente verwalten.',
  user: 'Du hast Zugriff auf die für dich freigegebenen Bereiche.'
}

// ---------- Tabs ----------
type TabKey = 'daten' | 'sicherheit' | 'einstellungen' | 'benachrichtigungen' | 'rollen'
const tab = ref<TabKey>('daten')
const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'daten', label: 'Persönliche Daten', icon: 'users' },
  { key: 'sicherheit', label: 'Account & Sicherheit', icon: 'key' },
  { key: 'einstellungen', label: 'Einstellungen', icon: 'settings' },
  { key: 'benachrichtigungen', label: 'Benachrichtigungen', icon: 'bell' },
  { key: 'rollen', label: 'Zugriffe & Rollen', icon: 'shield' }
]

// ---------- Persönliche Daten ----------
const form = reactive({ displayName: '', email: '', phone: '', position: '', bio: '' })
watchEffect(() => {
  if (user.value && !form.displayName && !form.email && !form.phone && !form.position && !form.bio) {
    form.displayName = user.value.displayName || ''
    form.email = user.value.email || ''
    form.phone = user.value.phone || ''
    form.position = user.value.position || ''
    form.bio = user.value.bio || ''
  }
})
const saving = ref(false)
const saveMsg = ref<{ ok: boolean; text: string } | null>(null)

async function saveProfile() {
  saveMsg.value = null
  saving.value = true
  try {
    await $fetch('/api/admin/profile', { method: 'PUT', body: { ...form } })
    saveMsg.value = { ok: true, text: 'Profil gespeichert.' }
    await fetchSession()
  } catch (e: any) {
    saveMsg.value = { ok: false, text: e?.data?.statusMessage || 'Speichern fehlgeschlagen' }
  } finally {
    saving.value = false
  }
}

// ---------- Passwort ----------
const currentPassword = ref('')
const newPassword = ref('')
const newPassword2 = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showNew2 = ref(false)
const savingPw = ref(false)
const pwMsg = ref<{ ok: boolean; text: string } | null>(null)

async function changePassword() {
  pwMsg.value = null
  if (newPassword.value !== newPassword2.value) {
    pwMsg.value = { ok: false, text: 'Die neuen Passwörter stimmen nicht überein.' }
    return
  }
  savingPw.value = true
  try {
    await $fetch('/api/admin/profile/password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value }
    })
    pwMsg.value = { ok: true, text: 'Passwort geändert.' }
    currentPassword.value = ''
    newPassword.value = ''
    newPassword2.value = ''
  } catch (e: any) {
    pwMsg.value = { ok: false, text: e?.data?.statusMessage || 'Ändern fehlgeschlagen' }
  } finally {
    savingPw.value = false
  }
}

// ---------- Profilbild ----------
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarBusy = ref(false)
const avatarMsg = ref('')
const avatarUrl = computed(() => {
  const p = user.value?.avatarPath
  return p ? `${p}?v=${Date.now()}` : ''
})

async function onAvatarPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  avatarMsg.value = ''
  avatarBusy.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch('/api/admin/profile/avatar', { method: 'POST', body: fd })
    await fetchSession()
  } catch (err: any) {
    avatarMsg.value = err?.data?.statusMessage || 'Upload fehlgeschlagen'
  } finally {
    avatarBusy.value = false
  }
}

// ---------- Sessions & Geräte ----------
const deviceInfo = computed(() => {
  const ua = import.meta.client ? navigator.userAgent : ''
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : 'Unbekannt'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser'
  return `${os} · ${browser}`
})
const nowStr = new Date().toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const push = usePush()
onMounted(() => push.refresh())
</script>

<template>
  <div class="prof">
    <!-- Kopf-Karte -->
    <section class="prof__head">
      <span v-if="avatarUrl" class="prof__avatar prof__avatar--img"><img :src="avatarUrl" alt="Profilbild"></span>
      <span v-else class="prof__avatar">{{ initials }}</span>
      <div class="prof__id">
        <h1 class="prof__name">{{ user?.displayName || user?.username }}</h1>
        <p class="prof__meta">
          <span class="prof__role">{{ ROLE_LABELS[user?.role || ''] || user?.role }}</span>
          <template v-if="since">· Seit {{ since }} im Team</template>
        </p>
        <p class="prof__contact">
          <span v-if="user?.email" class="prof__fact"><WfIcon name="mail" :size="13" /> {{ user.email }}</span>
          <span v-if="form.phone || user?.phone" class="prof__fact"><WfIcon name="phone" :size="13" /> {{ form.phone || user?.phone }}</span>
        </p>
      </div>
      <button class="wf-btn prof__headbtn" :disabled="avatarBusy" @click="avatarInput?.click()">
        <WfIcon name="camera" :size="14" /> Profilbild ändern
      </button>
      <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onAvatarPick">
    </section>

    <!-- Tabs -->
    <nav class="prof__tabs" role="tablist">
      <button v-for="t in TABS" :key="t.key" class="prof__tab" role="tab"
              :class="{ 'is-active': tab === t.key }" :aria-selected="tab === t.key"
              @click="tab = t.key">
        <WfIcon :name="t.icon" :size="14" /> {{ t.label }}
      </button>
    </nav>

    <div class="prof__cols">
      <!-- Hauptspalte -->
      <div class="prof__main">
        <!-- Persönliche Daten -->
        <section v-if="tab === 'daten'" class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="users" :size="15" /> Persönliche Daten</h2>
          <div class="prof__grid">
            <label class="prof__field">
              <span>Anzeigename *</span>
              <input v-model="form.displayName" type="text" maxlength="128" :disabled="saving">
            </label>
            <label class="prof__field">
              <span>E-Mail *</span>
              <input v-model="form.email" type="email" maxlength="190" :disabled="saving">
            </label>
            <label class="prof__field">
              <span>Telefonnummer</span>
              <input v-model="form.phone" type="tel" maxlength="64" placeholder="+43 …" :disabled="saving">
            </label>
            <label class="prof__field">
              <span>Position</span>
              <input v-model="form.position" type="text" maxlength="128" placeholder="z. B. Geschäftsführung" :disabled="saving">
            </label>
          </div>
          <label class="prof__field">
            <span>Über mich (optional)</span>
            <textarea v-model="form.bio" rows="3" maxlength="500" :disabled="saving" />
            <span class="prof__count">{{ form.bio.length }}/500</span>
          </label>
          <div class="prof__actions">
            <button class="wf-btn wf-btn--primary" :disabled="saving || !form.displayName.trim()" @click="saveProfile">
              {{ saving ? 'Speichert …' : 'Änderungen speichern' }}
            </button>
            <span v-if="saveMsg" class="prof__msg" :class="saveMsg.ok ? 'is-ok' : 'is-err'">{{ saveMsg.text }}</span>
          </div>
        </section>

        <!-- Account & Sicherheit -->
        <section v-else-if="tab === 'sicherheit'" class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="lock" :size="15" /> Passwort ändern</h2>
          <form class="prof__pwform" @submit.prevent="changePassword">
            <label class="prof__field">
              <span>Aktuelles Passwort</span>
              <span class="prof__pw">
                <input v-model="currentPassword" :type="showCurrent ? 'text' : 'password'" autocomplete="current-password" :disabled="savingPw">
                <button type="button" class="prof__eye" :aria-label="showCurrent ? 'Verbergen' : 'Anzeigen'" @click="showCurrent = !showCurrent">
                  <WfIcon name="eye" :size="15" />
                </button>
              </span>
            </label>
            <label class="prof__field">
              <span>Neues Passwort (mind. 8 Zeichen)</span>
              <span class="prof__pw">
                <input v-model="newPassword" :type="showNew ? 'text' : 'password'" autocomplete="new-password" :disabled="savingPw">
                <button type="button" class="prof__eye" :aria-label="showNew ? 'Verbergen' : 'Anzeigen'" @click="showNew = !showNew">
                  <WfIcon name="eye" :size="15" />
                </button>
              </span>
            </label>
            <label class="prof__field">
              <span>Neues Passwort wiederholen</span>
              <span class="prof__pw">
                <input v-model="newPassword2" :type="showNew2 ? 'text' : 'password'" autocomplete="new-password" :disabled="savingPw">
                <button type="button" class="prof__eye" :aria-label="showNew2 ? 'Verbergen' : 'Anzeigen'" @click="showNew2 = !showNew2">
                  <WfIcon name="eye" :size="15" />
                </button>
              </span>
            </label>
            <div class="prof__actions">
              <button type="submit" class="wf-btn wf-btn--primary" :disabled="savingPw || !currentPassword || !newPassword">
                {{ savingPw ? 'Wird geändert …' : 'Passwort ändern' }}
              </button>
              <span v-if="pwMsg" class="prof__msg" :class="pwMsg.ok ? 'is-ok' : 'is-err'">{{ pwMsg.text }}</span>
            </div>
          </form>
        </section>

        <!-- Platzhalter-Tabs -->
        <section v-else-if="tab === 'einstellungen'" class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="settings" :size="15" /> Einstellungen</h2>
          <p class="prof__placeholder">Hier kommen künftig persönliche Einstellungen hin — z. B. Sprache und Startseite.</p>
        </section>
        <section v-else-if="tab === 'benachrichtigungen'" class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="bell" :size="15" /> Benachrichtigungen</h2>
          <p class="prof__pushintro">
            Push-Benachrichtigungen bei <strong>neuen Kontakt- und Mietanfragen</strong> – auch wenn das Dashboard geschlossen ist.
            Die Einstellung gilt je Gerät (Handy, Laptop …).
          </p>
          <div class="prof__pushstate" :class="{ 'is-on': push.subscribed.value }">
            <WfIcon :name="push.subscribed.value ? 'check' : 'bell'" :size="16" />
            <span v-if="!push.supported.value && !push.iosNeedsInstall.value">Dieser Browser unterstützt keine Push-Benachrichtigungen.</span>
            <span v-else-if="push.iosNeedsInstall.value">Auf iPhone/iPad: Dashboard zuerst über <em>Teilen → Zum Home-Bildschirm</em> installieren und dort öffnen – dann hier aktivieren.</span>
            <span v-else-if="push.permission.value === 'denied'">Benachrichtigungen sind im Browser blockiert – bitte in den Website-Einstellungen erlauben.</span>
            <span v-else-if="push.subscribed.value">Auf diesem Gerät aktiv.</span>
            <span v-else>Auf diesem Gerät noch nicht aktiviert.</span>
          </div>
          <div v-if="push.supported.value && push.permission.value !== 'denied'" class="prof__pushbtns">
            <button v-if="!push.subscribed.value" class="wf-btn wf-btn--primary" :disabled="push.busy.value" @click="push.enable().then(ok => ok && push.test())">
              <WfIcon name="bell" :size="14" /> Auf diesem Gerät aktivieren
            </button>
            <template v-else>
              <button class="wf-btn" :disabled="push.busy.value" @click="push.test()">Test senden</button>
              <button class="wf-btn wf-btn--danger" :disabled="push.busy.value" @click="push.disable()">Deaktivieren</button>
            </template>
          </div>
          <p v-if="push.error.value" class="prof__pusherr">{{ push.error.value }}</p>
        </section>

        <!-- Zugriffe & Rollen -->
        <section v-else class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="shield" :size="15" /> Zugriffe &amp; Rollen</h2>
          <dl class="prof__facts">
            <div><dt>Benutzername</dt><dd>{{ user?.username }}</dd></div>
            <div><dt>Rolle</dt><dd>{{ ROLE_LABELS[user?.role || ''] || user?.role }}</dd></div>
          </dl>
          <p class="prof__rolebox">{{ ROLE_TEXTS[user?.role || ''] || '' }}</p>
        </section>
      </div>

      <!-- Seitenspalte -->
      <aside class="prof__side">
        <section class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="camera" :size="15" /> Profilbild</h2>
          <button class="prof__upload" :disabled="avatarBusy" @click="avatarInput?.click()">
            <span v-if="avatarUrl" class="prof__uploadpreview"><img :src="avatarUrl" alt="Profilbild-Vorschau"></span>
            <span v-else class="prof__uploadicon"><WfIcon name="camera" :size="22" /></span>
            <strong>{{ avatarBusy ? 'Lädt hoch …' : 'Profilbild hochladen' }}</strong>
            <small>JPG, PNG oder WebP · max. 5 MB</small>
          </button>
          <p v-if="avatarMsg" class="prof__msg is-err">{{ avatarMsg }}</p>
        </section>

        <section class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="shield" :size="15" /> Rolle &amp; Berechtigungen</h2>
          <dl class="prof__facts">
            <div><dt>Rolle</dt><dd>{{ ROLE_LABELS[user?.role || ''] || user?.role }}</dd></div>
          </dl>
          <p class="prof__rolebox">{{ ROLE_TEXTS[user?.role || ''] || '' }}</p>
        </section>

        <section class="prof__card">
          <h2 class="prof__cardtitle"><WfIcon name="monitor" :size="15" /> Sessions &amp; Geräte</h2>
          <div class="prof__session">
            <div class="prof__sessioninfo">
              <strong>{{ deviceInfo }}</strong>
              <small>{{ nowStr }}</small>
            </div>
            <span class="prof__pill">Aktiv</span>
          </div>
          <p class="prof__placeholder">Nur diese Sitzung ist derzeit aktiv.</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.prof__pushintro { margin: 0 0 1em; color: var(--wf-muted); font-size: .9em; line-height: 1.6; }
.prof__pushstate { display: flex; align-items: center; gap: .6em; padding: .8em 1em; border-radius: 12px; background: #f6f3ec; font-size: .9em; margin-bottom: 1em; }
.prof__pushstate.is-on { background: var(--wf-green-soft); color: var(--wf-green); font-weight: 600; }
.prof__pushbtns { display: flex; gap: .5em; flex-wrap: wrap; }
.prof__pusherr { color: var(--wf-red); font-size: .85em; margin: .8em 0 0; }
/* ---------- Kopf ---------- */
.prof__head {
  display: flex; align-items: center; gap: 1.3em; flex-wrap: wrap;
  background: var(--wf-card); border: 1px solid var(--wf-line);
  border-radius: var(--wf-radius); box-shadow: var(--wf-shadow);
  padding: 1.4em 1.6em; margin-bottom: 1.1em;
}
.prof__avatar {
  flex-shrink: 0; width: 5.2em; height: 5.2em; border-radius: 50%;
  background: var(--wf-green); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--wf-serif); font-size: 1.15em; letter-spacing: .04em;
  overflow: hidden;
}
.prof__avatar--img img { width: 100%; height: 100%; object-fit: cover; }
.prof__id { flex: 1; min-width: 12em; }
.prof__name { font-family: var(--wf-serif); font-weight: 400; font-size: 1.55em; margin: 0; }
.prof__meta { margin: .3em 0 0; font-size: .86em; color: var(--wf-muted); display: flex; align-items: center; gap: .45em; flex-wrap: wrap; }
.prof__role {
  background: var(--wf-green-soft); color: var(--wf-green);
  font-size: .68em; font-weight: 700; letter-spacing: .1em;
  border-radius: 5px; padding: .2em .55em; text-transform: uppercase;
}
.prof__contact { margin: .45em 0 0; display: flex; gap: 1.2em; flex-wrap: wrap; font-size: .86em; color: var(--wf-muted); }
.prof__fact { display: inline-flex; align-items: center; gap: .35em; }
.prof__headbtn { flex-shrink: 0; }

/* ---------- Tabs ---------- */
.prof__tabs { display: flex; gap: .4em; flex-wrap: wrap; margin-bottom: 1.1em; border-bottom: 1px solid var(--wf-line); }
.prof__tab {
  display: inline-flex; align-items: center; gap: .45em;
  background: none; border: 0; cursor: pointer; font-family: inherit;
  font-size: .9em; color: var(--wf-muted); padding: .6em .9em;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .15s, border-color .15s;
}
.prof__tab:hover { color: var(--wf-green); }
.prof__tab.is-active { color: var(--wf-green); border-bottom-color: var(--wf-green); font-weight: 600; }

/* ---------- Spalten ---------- */
.prof__cols { display: grid; grid-template-columns: 1.9fr 1fr; gap: 1.2em; align-items: start; }
.prof__card {
  background: var(--wf-card); border: 1px solid var(--wf-line);
  border-radius: var(--wf-radius); box-shadow: var(--wf-shadow);
  padding: 1.3em 1.5em; margin-bottom: 1.2em;
}
.prof__cardtitle {
  display: flex; align-items: center; gap: .5em;
  font-family: var(--wf-serif); font-weight: 400; font-size: 1.12em;
  margin: 0 0 1em; color: var(--wf-ink);
}
.prof__cardtitle svg { color: var(--wf-green); }

/* ---------- Formulare ---------- */
.prof__grid { display: grid; grid-template-columns: 1fr 1fr; gap: .9em 1.1em; }
.prof__field { display: block; margin-bottom: .9em; }
.prof__field > span:first-child { display: block; font-size: .8em; margin-bottom: .25em; color: var(--wf-muted); }
.prof__field input, .prof__field textarea {
  width: 100%; box-sizing: border-box; padding: .6em .8em; font-size: .92em; font-family: inherit;
  color: var(--wf-ink); border: 1px solid var(--wf-line); border-radius: 10px; outline: none; background: #fff;
}
.prof__field input:focus, .prof__field textarea:focus { border-color: var(--wf-green); box-shadow: 0 0 0 3px rgba(47, 93, 64, .12); }
.prof__count { display: block; text-align: right; font-size: .75em; color: var(--wf-muted); margin-top: .2em; }
.prof__actions { display: flex; align-items: center; gap: .9em; margin-top: .2em; flex-wrap: wrap; }
.prof__msg { font-size: .86em; }
.prof__msg.is-ok { color: var(--wf-green); }
.prof__msg.is-err { color: var(--wf-red); }

.prof__pw { position: relative; display: block; }
.prof__pw input { padding-right: 2.5em; }
.prof__eye {
  position: absolute; right: .4em; top: 50%; transform: translateY(-50%);
  width: 1.9em; height: 1.9em; border: 0; background: none; color: var(--wf-muted);
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
}
.prof__eye:hover { color: var(--wf-green); }
.prof__pwform { max-width: 26em; }

/* ---------- Upload ---------- */
.prof__upload {
  width: 100%; border: 1.5px dashed var(--wf-line); border-radius: 12px;
  background: #fbf9f4; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; align-items: center; gap: .35em;
  padding: 1.2em 1em; color: var(--wf-muted);
  transition: border-color .15s, color .15s;
}
.prof__upload:hover { border-color: var(--wf-green); color: var(--wf-green); }
.prof__upload strong { font-size: .9em; color: var(--wf-ink); font-weight: 600; }
.prof__upload small { font-size: .76em; }
.prof__uploadicon {
  width: 3.2em; height: 3.2em; border-radius: 50%; background: var(--wf-green-soft); color: var(--wf-green);
  display: inline-flex; align-items: center; justify-content: center; margin-bottom: .2em;
}
.prof__uploadpreview { width: 4.5em; height: 4.5em; border-radius: 50%; overflow: hidden; display: inline-block; margin-bottom: .2em; }
.prof__uploadpreview img { width: 100%; height: 100%; object-fit: cover; }

/* ---------- Karten-Inhalte ---------- */
.prof__facts { display: flex; gap: 2.5em; margin: 0 0 1em; flex-wrap: wrap; }
.prof__facts dt { font-size: .75em; text-transform: uppercase; letter-spacing: .05em; color: var(--wf-muted); }
.prof__facts dd { margin: .2em 0 0; font-size: .95em; }
.prof__rolebox {
  background: var(--wf-green-soft); color: var(--wf-green);
  border-radius: 10px; padding: .7em .95em; font-size: .86em; margin: 0;
}
.prof__placeholder { color: var(--wf-muted); font-size: .88em; margin: 0; }
.prof__session { display: flex; align-items: center; justify-content: space-between; gap: .8em; margin-bottom: .8em; }
.prof__sessioninfo { display: flex; flex-direction: column; gap: .15em; }
.prof__sessioninfo strong { font-size: .9em; }
.prof__sessioninfo small { color: var(--wf-muted); font-size: .78em; }
.prof__pill {
  flex-shrink: 0; background: var(--wf-green-soft); color: var(--wf-green);
  font-size: .72em; font-weight: 700; border-radius: 999px; padding: .25em .7em;
}

@media (max-width: 900px) {
  .prof__cols { grid-template-columns: 1fr; }
  .prof__grid { grid-template-columns: 1fr; }
}
</style>
