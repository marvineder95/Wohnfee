<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  title: 'Benutzer - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

const { user } = useAdminAuth()
const users = ref<any[] | null>(null)
const error = ref('')
const notice = ref('')
const actionMsg = ref<{ ok: boolean; text: string } | null>(null)
const devResetUrl = ref('')

// invite form
const showInvite = ref(false)
const invName = ref('')
const invEmail = ref('')
const invRole = ref<'user' | 'admin'>('user')
const inviting = ref(false)
const inviteError = ref('')
const inviteDevUrl = ref('')

async function loadUsers() {
  error.value = ''
  try {
    const res = await $fetch<{ users: any[] }>('/api/admin/users')
    users.value = res.users
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Benutzer konnten nicht geladen werden'
    users.value = []
  }
}

onMounted(() => {
  if (user.value?.role !== 'superadmin') {
    error.value = 'Nur für Superadmins sichtbar.'
    return
  }
  loadUsers()
})

const statusLabel = (s: string) => s === 'active' ? 'Aktiv' : s === 'pending' ? 'Eingeladen' : 'Deaktiviert'
const roleLabel = (r: string) => r === 'superadmin' ? 'Superadmin' : r === 'admin' ? 'Admin' : 'Mitarbeiter'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function sendInvite() {
  inviteError.value = ''
  notice.value = ''
  inviteDevUrl.value = ''
  if (!invName.value.trim() || !invEmail.value.trim()) {
    inviteError.value = 'Bitte Name und E-Mail ausfüllen.'
    return
  }
  inviting.value = true
  try {
    const res = await $fetch<{ ok: boolean; sent: boolean; devInviteUrl?: string }>('/api/admin/users/invite', {
      method: 'POST',
      body: { displayName: invName.value.trim(), email: invEmail.value.trim(), role: invRole.value }
    })
    notice.value = res.sent
      ? `Einladung an ${invEmail.value.trim()} verschickt.`
      : `Einladung für ${invEmail.value.trim()} erstellt (SMTP nicht konfiguriert — Mail nicht versendet).`
    inviteDevUrl.value = res.devInviteUrl || ''
    showInvite.value = false
    invName.value = ''
    invEmail.value = ''
    invRole.value = 'user'
    await loadUsers()
  } catch (e: any) {
    inviteError.value = e?.data?.statusMessage || 'Einladung fehlgeschlagen'
  } finally {
    inviting.value = false
  }
}

// ---- per-user actions (superadmin) ----
function errText(e: any, fallback: string) {
  return e?.data?.statusMessage || fallback
}

async function resetPassword(u: any) {
  actionMsg.value = null
  devResetUrl.value = ''
  if (!confirm(`Passwort-Reset-Link an ${u.displayName || u.username} (${u.email || 'keine E-Mail'}) senden?`)) return
  try {
    const res = await $fetch<{ sent: boolean; hasEmail: boolean; devResetUrl?: string }>(
      `/api/admin/users/${u.id}/reset`, { method: 'POST' }
    )
    if (!res.hasEmail) {
      actionMsg.value = { ok: false, text: `${u.username} hat keine E-Mail-Adresse hinterlegt.` }
    } else {
      actionMsg.value = { ok: true, text: res.sent ? 'Reset-Link per E-Mail verschickt.' : 'Reset-Link erstellt (SMTP nicht konfiguriert — Mail nicht versendet).' }
      devResetUrl.value = res.devResetUrl || ''
    }
  } catch (e: any) {
    actionMsg.value = { ok: false, text: errText(e, 'Reset fehlgeschlagen') }
  }
}

async function toggleStatus(u: any) {
  actionMsg.value = null
  const target = u.status === 'active' ? 'deactivated' : 'active'
  if (target === 'deactivated' && !confirm(`${u.displayName || u.username} wirklich deaktivieren? Der Login wird gesperrt.`)) return
  try {
    await $fetch(`/api/admin/users/${u.id}/status`, { method: 'PUT', body: { status: target } })
    actionMsg.value = { ok: true, text: target === 'active' ? `${u.username} wurde aktiviert.` : `${u.username} wurde deaktiviert.` }
    await loadUsers()
  } catch (e: any) {
    actionMsg.value = { ok: false, text: errText(e, 'Statusänderung fehlgeschlagen') }
  }
}

async function changeRole(u: any, role: string) {
  actionMsg.value = null
  try {
    await $fetch(`/api/admin/users/${u.id}/role`, { method: 'PUT', body: { role } })
    actionMsg.value = { ok: true, text: `Rolle von ${u.username} auf „${roleLabel(role)}" geändert.` }
    await loadUsers()
  } catch (e: any) {
    actionMsg.value = { ok: false, text: errText(e, 'Rollenänderung fehlgeschlagen') }
    await loadUsers()
  }
}

async function removeUser(u: any) {
  actionMsg.value = null
  if (!confirm(`${u.displayName || u.username} (${u.username || u.email}) wirklich endgültig löschen?`)) return
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    actionMsg.value = { ok: true, text: `${u.username || u.email} wurde gelöscht.` }
    await loadUsers()
  } catch (e: any) {
    actionMsg.value = { ok: false, text: errText(e, 'Löschen fehlgeschlagen') }
  }
}
</script>

<template>
  <div>
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Team</p>
        <h1 class="wf-title">Benutzer</h1>
        <p class="wf-subtitle">Mitarbeiter einladen, Rollen vergeben und Zugriffe verwalten.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-users.jpg" alt="Helles Büro mit zwei Arbeitsplätzen und Pflanzen">
        <button v-if="user?.role === 'superadmin'" class="wf-btn wf-btn--primary wf-hero-cta" @click="showInvite = !showInvite">
          <WfIcon name="plus" :size="15" /> {{ showInvite ? 'Abbrechen' : 'Benutzer einladen' }}
        </button>
      </div>
    </section>

    <div v-if="showInvite" class="adm-card invite-form">
      <h2 class="adm-h2">Neuen Benutzer einladen</h2>
      <p class="adm-note">Der Mitarbeiter erhält eine E-Mail mit einem Link, über den er sich Benutzernamen und Passwort selbst vergibt. Der Link ist 48 Stunden gültig.</p>
      <form class="invite-grid" @submit.prevent="sendInvite">
        <label>
          <span>Name</span>
          <input v-model="invName" type="text" placeholder="z. B. Maria Mustermann" :disabled="inviting">
        </label>
        <label>
          <span>E-Mail</span>
          <input v-model="invEmail" type="email" placeholder="maria@wohnfee.at" :disabled="inviting">
        </label>
        <label>
          <span>Rolle</span>
          <select v-model="invRole" :disabled="inviting">
            <option value="user">Mitarbeiter</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div class="invite-actions">
          <button type="submit" class="wf-btn wf-btn--primary" :disabled="inviting">
            {{ inviting ? 'Wird gesendet …' : 'Einladung senden' }}
          </button>
        </div>
      </form>
      <p v-if="inviteError" class="adm-note adm-note--error" role="alert">{{ inviteError }}</p>
    </div>

    <p v-if="notice" class="adm-note adm-note--ok">{{ notice }}</p>
    <div v-if="inviteDevUrl" class="adm-card dev-url">
      <strong>Dev-Modus:</strong> Der Einladungslink (da kein SMTP konfiguriert):<br>
      <a :href="inviteDevUrl">{{ inviteDevUrl }}</a>
    </div>

    <p v-if="error" class="adm-note adm-note--error">{{ error }}</p>
    <p v-else-if="!users" class="adm-note">Benutzer werden geladen …</p>

    <div v-else class="adm-card table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Benutzername</th>
            <th>E-Mail</th>
            <th>Rolle</th>
            <th>Status</th>
            <th>Mitglied seit</th>
            <th>Eingeladen von</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.displayName || '—' }}</td>
            <td>{{ u.username || '—' }}</td>
            <td>{{ u.email || '—' }}</td>
            <td>
              <select v-if="u.id !== user?.id && u.status !== 'pending'" class="role-select"
                      :value="u.role" @change="changeRole(u, ($event.target as HTMLSelectElement).value)">
                <option value="user">Mitarbeiter</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <span v-else class="wf-pill" :class="u.role === 'superadmin' ? '' : u.role === 'admin' ? 'wf-pill--blue' : 'wf-pill--gray'">{{ roleLabel(u.role) }}</span>
            </td>
            <td><span class="wf-pill" :class="u.status === 'active' ? '' : u.status === 'pending' ? 'wf-pill--amber' : 'wf-pill--gray'">{{ statusLabel(u.status) }}</span></td>
            <td>{{ fmtDate(u.createdAt) }}</td>
            <td>{{ u.invitedByUsername || '—' }}</td>
            <td class="actions">
              <template v-if="u.id !== user?.id">
                <button v-if="u.status === 'active'" class="wf-btn wf-btn--sm" title="Passwort-Reset-Link senden"
                        @click="resetPassword(u)">Reset</button>
                <button class="wf-btn wf-btn--sm" :title="u.status === 'active' ? 'Deaktivieren' : 'Aktivieren'"
                        @click="toggleStatus(u)">
                  {{ u.status === 'active' ? 'Deaktivieren' : 'Aktivieren' }}
                </button>
                <button class="wf-btn wf-btn--sm wf-btn--danger" title="Benutzer endgültig löschen"
                        @click="removeUser(u)">Löschen</button>
              </template>
              <span v-else class="actions__self">du</span>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="8" class="empty">Noch keine Benutzer vorhanden.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="actionMsg" class="adm-note" :class="actionMsg.ok ? 'adm-note--ok' : 'adm-note--error'">{{ actionMsg.text }}</p>
    <div v-if="devResetUrl" class="adm-card dev-url">
      <strong>Dev-Modus:</strong> Der Reset-Link (da kein SMTP konfiguriert):<br>
      <a :href="devResetUrl">{{ devResetUrl }}</a>
    </div>
  </div>
</template>

<style scoped>
.adm-h2 {
  font-family: var(--wf-serif);
  font-weight: 400;
  font-size: 1.2em;
  margin: 0 0 .5em;
}

.adm-card {
  background: var(--wf-card);
  border-radius: var(--wf-radius);
  box-shadow: var(--wf-shadow);
  padding: 1.4em 1.6em;
  margin-bottom: 1.2em;
}

.adm-note {
  color: var(--wf-muted);
  font-size: .92em;
}

.adm-note--error { color: var(--wf-red); }
.adm-note--ok { color: var(--wf-green); }

.invite-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13em, 1fr));
  gap: 1em;
  margin-top: 1em;
  align-items: end;
}

.invite-grid label span {
  display: block;
  font-size: .82em;
  color: var(--wf-muted);
  margin-bottom: .3em;
}

.invite-grid input,
.invite-grid select {
  width: 100%;
  box-sizing: border-box;
  padding: .6em .8em;
  font-size: .95em;
  font-family: inherit;
  color: var(--wf-ink);
  border: 1px solid var(--wf-line);
  border-radius: 10px;
  background: #fff;
}

.invite-grid input:focus,
.invite-grid select:focus {
  outline: none;
  border-color: var(--wf-green);
  box-shadow: 0 0 0 3px rgba(47, 93, 64, .12);
}

.dev-url {
  font-size: .85em;
  word-break: break-all;
  background: #fffbe8;
}

.dev-url a { color: var(--wf-green); }

.table-wrap {
  padding: .5em 0 0;
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .9em;
}

.users-table th {
  text-align: left;
  font-size: .72em;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--wf-muted);
  padding: .8em 1em;
  border-bottom: 1px solid var(--wf-line);
  font-weight: 600;
}

.users-table td {
  padding: .75em 1em;
  border-bottom: 1px solid #f4efe6;
}

.users-table tr:last-child td {
  border-bottom: 0;
}

.users-table .empty {
  text-align: center;
  color: var(--wf-muted);
  padding: 2em;
}
</style>

<style>
/* unscoped additions for the actions column */
.role-select {
  font-size: .85em;
  font-family: inherit;
  padding: .3em .5em;
  border: 1px solid var(--wf-line, #ede6d8);
  border-radius: 8px;
  background: #fff;
  color: var(--wf-ink, #2e2b25);
}

.actions {
  white-space: nowrap;
}

.actions .wf-btn {
  margin-right: .35em;
}

.actions__self {
  font-size: .8em;
  color: var(--wf-muted, #8d8674);
}
</style>
