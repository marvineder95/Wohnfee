<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({ title: 'Newsletter - WOHNFEE Dashboard' })

interface Subscriber {
  id: number
  email: string
  lang: string
  status: string
  created_at: string
}
interface Send {
  id: number
  subject: string
  recipient_count: number
  sent_by: string | null
  created_at: string
}

const subscribers = ref<Subscriber[]>([])
const sends = ref<Send[]>([])
const activeCount = ref(0)
const loading = ref(true)
const error = ref('')
const actionMsg = ref('')

// Editor
const subject = ref('')
const body = ref('')
const sending = ref(false)
const sendResult = ref('')
const sendError = ref('')
const confirmSend = ref(false)

// Vorschau: gleiche Mail-Vorlage wie der Versand (nachgebaut clientseitig)
const previewHtml = computed(() => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const paragraphs = body.value
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
  const bodyHtml = paragraphs
    .map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#45423a">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<div style="margin:0;padding:24px 12px;background:#f4f3ee;font-family:Georgia,'Times New Roman',serif">` +
    `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden">` +
    `<div style="background:#26492f;padding:22px 32px">` +
    `<span style="color:#ffffff;font-size:22px;letter-spacing:.06em;font-weight:600">WOHN<span style="color:#cfe0c3">FEE</span></span>` +
    `<span style="display:block;color:#a9c2a0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-top:2px">Home Staging &amp; Furniture Leasing</span>` +
    `</div>` +
    `<div style="height:3px;background:#c9a86a"></div>` +
    `<div style="padding:28px 32px 8px">` +
    `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#26492f;font-weight:600">${esc(subject.value || 'Betreff')}</h1>` +
    (bodyHtml || `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#a8a396;font-style:italic">Hier erscheint dein Text …</p>`) +
    `</div>` +
    `<div style="padding:18px 32px 24px;border-top:1px solid #ece7da;background:#faf8f2">` +
    `<p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#8a857a"><strong style="color:#55554e">WOHNFEE – Eder &amp; Steiner GmbH</strong><br>` +
    `Obersdorferstraße 5, 2201 Seyring<br>office@wohnfee.at | +43 676 9202236 | wohnfee.at</p>` +
    `<p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#a8a396">Du erhältst diese E-Mail, weil du dich beim WOHNFEE-Newsletter angemeldet hast. <u>Vom Newsletter abmelden</u></p>` +
    `</div></div></div>`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ subscribers: Subscriber[]; sends: Send[]; activeCount: number }>('/api/admin/newsletter')
    subscribers.value = res.subscribers
    sends.value = res.sends
    activeCount.value = res.activeCount
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Abonnenten konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function removeSubscriber(s: Subscriber) {
  if (!confirm(`„${s.email}“ wirklich aus dem Newsletter entfernen?`)) return
  actionMsg.value = ''
  try {
    await $fetch('/api/admin/newsletter/remove', { method: 'POST', body: { id: s.id } })
    actionMsg.value = `${s.email} wurde entfernt.`
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Entfernen fehlgeschlagen.'
  }
}

async function send() {
  sendError.value = ''
  sendResult.value = ''
  if (!subject.value.trim() || !body.value.trim()) {
    sendError.value = 'Bitte Betreff und Text ausfüllen.'
    return
  }
  sending.value = true
  try {
    const res = await $fetch<{ sent: number; simulated: boolean }>('/api/admin/newsletter/send', {
      method: 'POST',
      body: { subject: subject.value.trim(), body: body.value.trim() }
    })
    sendResult.value = res.simulated
      ? `Versand simuliert (SMTP noch nicht konfiguriert) – ${res.sent} Empfänger. Sobald SMTP eingerichtet ist, geht die Mail wirklich raus.`
      : `Newsletter an ${res.sent} Empfänger versendet.`
    confirmSend.value = false
    await load()
  } catch (e: any) {
    sendError.value = e?.data?.statusMessage || 'Versand fehlgeschlagen.'
  } finally {
    sending.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

onMounted(load)
</script>

<template>
  <div class="nl-admin">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Kommunikation</p>
        <h1 class="wf-title">Newsletter</h1>
        <p class="wf-subtitle">Alle Abonnenten aus dem Footer-Formular – übersichtlich verwalten und im Wohnfee-Design versenden.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-newsletter.jpg" alt="Schreibtisch mit Laptop und Kaffee">
      </div>
    </section>

    <p v-if="error" class="nl-admin__error" role="alert">{{ error }}</p>
    <p v-if="actionMsg" class="nl-admin__success">{{ actionMsg }}</p>

    <div class="nl-admin__grid">
      <!-- Editor + Vorschau -->
      <section class="wf-card nl-admin__compose">
        <h2 class="wf-card-title">Neuer Newsletter</h2>
        <label class="nl-admin__field">
          <span>Betreff</span>
          <input v-model="subject" type="text" maxlength="190" placeholder="z. B. Neuigkeiten im Herbst – neue Möbel im Sortiment">
        </label>
        <label class="nl-admin__field">
          <span>Text <em>(Absätze mit Leerzeile trennen)</em></span>
          <textarea v-model="body" rows="9" placeholder="Liebe WOHNFEE-Freunde,&#10;&#10;hier ist, was es Neues gibt …"></textarea>
        </label>

        <div class="nl-admin__sendbar">
          <label class="nl-admin__confirm">
            <input v-model="confirmSend" type="checkbox">
            <span>An <strong>{{ activeCount }}</strong> {{ activeCount === 1 ? 'Abonnenten' : 'Abonnenten' }} versenden</span>
          </label>
          <button class="wf-btn wf-btn--primary" :disabled="sending || !confirmSend" @click="send">
            <WfIcon name="mail" :size="15" />
            {{ sending ? 'Wird versendet …' : 'Newsletter versenden' }}
          </button>
        </div>
        <p v-if="sendError" class="nl-admin__error" role="alert">{{ sendError }}</p>
        <p v-if="sendResult" class="nl-admin__success">{{ sendResult }}</p>

        <div v-if="sends.length" class="nl-admin__history">
          <h3>Letzte Versände</h3>
          <ul>
            <li v-for="s in sends" :key="s.id">
              <span class="nl-admin__history-subject">{{ s.subject }}</span>
              <span class="nl-admin__history-meta">{{ s.recipient_count }} Empf. · {{ s.sent_by || '–' }} · {{ formatDate(s.created_at) }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Vorschau -->
      <section class="wf-card nl-admin__preview">
        <h2 class="wf-card-title">Vorschau</h2>
        <iframe class="nl-admin__preview-frame" :srcdoc="previewHtml" title="Newsletter-Vorschau" />
      </section>

      <!-- Abonnenten -->
      <section class="wf-card nl-admin__subs">
        <h2 class="wf-card-title">Abonnenten <span class="nl-admin__count">{{ activeCount }} aktiv</span></h2>
        <p class="nl-admin__hint">Neue Anmeldungen müssen ihre Adresse per E-Mail bestätigen (Double-Opt-in) – erst dann bekommen sie den Newsletter. Jede Mail enthält einen persönlichen Abmeldelink.</p>
        <p v-if="loading" class="nl-admin__loading">Abonnenten werden geladen …</p>
        <p v-else-if="!subscribers.length" class="nl-admin__empty">
          Noch keine Anmeldungen – sie erscheinen hier, sobald sich jemand über das Footer-Formular einträgt.
        </p>
        <table v-else class="wf-table nl-admin__table">
          <thead>
            <tr><th>E-Mail</th><th>Status</th><th>Sprache</th><th>Angemeldet</th><th aria-label="Aktionen" /></tr>
          </thead>
          <tbody>
            <tr v-for="s in subscribers" :key="s.id">
              <td><a :href="`mailto:${s.email}`">{{ s.email }}</a></td>
              <td>
                <span class="wf-pill" :class="s.status === 'aktiv' ? '' : s.status === 'ausstehend' ? 'wf-pill--amber' : 'wf-pill--gray'"
                      :title="s.status === 'ausstehend' ? 'Hat den Link in der Bestätigungsmail noch nicht geklickt – bekommt keinen Newsletter' : ''">
                  {{ s.status === 'aktiv' ? 'Bestätigt' : s.status === 'ausstehend' ? 'Unbestätigt' : 'Abgemeldet' }}
                </span>
              </td>
              <td>{{ s.lang === 'en' ? 'EN' : 'DE' }}</td>
              <td>{{ formatDate(s.created_at) }}</td>
              <td class="nl-admin__rowactions">
                <button class="wf-iconbtn" :aria-label="`Entfernen: ${s.email}`" @click="removeSubscriber(s)">
                  <WfIcon name="trash" :size="15" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.nl-admin__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.2rem;
  margin-top: 1.2rem;
}
.nl-admin__subs { grid-column: 1 / -1; }
.nl-admin__hint { margin: -.4rem 0 1rem; font-size: .82em; color: var(--wf-muted); }
.nl-admin .wf-card { padding: 1.2rem 1.3rem; }
.nl-admin .wf-card-title { margin: 0 0 1rem; font-size: 1.02em; color: var(--wf-ink); font-weight: 600; }

.nl-admin__field { display: block; margin-bottom: .9rem; }
.nl-admin__field > span { display: block; font-size: .85em; font-weight: 600; color: #55554e; margin-bottom: .3em; }
.nl-admin__field > span em { font-weight: 400; color: #99927f; font-style: normal; }
.nl-admin__field input,
.nl-admin__field textarea {
  width: 100%; box-sizing: border-box;
  padding: .55em .75em;
  border: 1px solid #d9d2c0; border-radius: 8px;
  background: #fff; color: #33312b;
  font: inherit; font-size: .92em;
}
.nl-admin__field textarea { resize: vertical; line-height: 1.55; }
.nl-admin__field input:focus, .nl-admin__field textarea:focus {
  outline: none; border-color: #77ad96; box-shadow: 0 0 0 3px rgba(119, 173, 150, .25);
}

.nl-admin__sendbar {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  flex-wrap: wrap; margin-top: .4rem;
}
.nl-admin__confirm { display: flex; align-items: center; gap: .5em; font-size: .88em; color: #55554e; }
.nl-admin__sendbar .wf-btn { display: inline-flex; align-items: center; gap: .4em; }
.nl-admin__sendbar .wf-btn:disabled { opacity: .5; cursor: not-allowed; }

.nl-admin__error {
  margin: .8rem 0 0; padding: .6em .9em;
  background: #fdecea; border-radius: 8px; color: #a83226; font-size: .88em;
}
.nl-admin__success {
  margin: .8rem 0 0; padding: .6em .9em;
  background: #e8f2e6; border-radius: 8px; color: #26492f; font-size: .88em;
}

.nl-admin__preview-frame {
  width: 100%; height: 480px; border: 1px solid #e4ddcb; border-radius: 8px; background: #f4f3ee;
}

.nl-admin__count { font-weight: 400; font-size: .75em; color: #99927f; margin-left: .5em; }
.nl-admin__table { display: block; overflow-x: auto; white-space: nowrap; }
.nl-admin__table td { vertical-align: middle; }
.nl-admin__rowactions { text-align: right; white-space: nowrap; }
.wf-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border: 1px solid #e4ddcb; border-radius: 7px;
  background: #fff; color: #8a857a; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.wf-iconbtn:hover { color: #a83226; border-color: #e5b6b0; }

.nl-admin__history { margin-top: 1.4rem; border-top: 1px solid #ece7da; padding-top: 1rem; }
.nl-admin__history h3 { margin: 0 0 .5rem; font-size: .92em; color: #55554e; }
.nl-admin__history ul { list-style: none; margin: 0; padding: 0; }
.nl-admin__history li {
  display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  padding: .45em 0; border-bottom: 1px solid #f4efe6; font-size: .86em;
}
.nl-admin__history-subject { font-weight: 600; color: #33312b; }
.nl-admin__history-meta { color: #99927f; }

.nl-admin__loading, .nl-admin__empty { color: #99927f; font-size: .92em; padding: .5rem 0; }

@media (max-width: 980px) {
  .nl-admin__grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
