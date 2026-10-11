<script setup lang="ts">
import { PROPERTY_STATUS, categoryLabel } from '~~/shared/properties'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Immobilien - WOHNFEE Dashboard' })

// Immobilien, die WOHNFEE bzw. Partner-Makler vermieten/verkaufen – Website /immobilien.html + willhaben
const perms = usePermissions()
const route = useRoute()
const items = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const filter = ref<'alle' | string>('alle')

async function load() {
  loading.value = true
  try {
    items.value = (await $fetch<{ items: any[] }>('/api/admin/properties')).items
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Immobilien konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  await load()
  const open = Number(route.query.open)
  if (open > 0) navigateTo(`/admin/immobilien/${open}`, { replace: true })
  loadSettings()
})

const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const i of items.value) c[i.status] = (c[i.status] || 0) + 1
  return c
})
const visible = computed(() => filter.value === 'alle' ? items.value : items.value.filter(i => i.status === filter.value))
const eur = (v: number | null) => v == null ? '–' : v.toLocaleString('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const TONE: Record<string, string> = { aktiv: 'wf-pill--green', reserviert: 'wf-pill--amber', vergeben: 'wf-pill--gray', entwurf: '', archiviert: 'wf-pill--gray' }
const WH: Record<string, string> = { exportiert: 'willhaben: XML erstellt', im_feed: 'willhaben: im Feed', online: 'willhaben: online', offline: 'willhaben: offline' }

// willhaben-Schnittstelle (OpenImmo-Feed)
const settings = ref<{ feed: boolean; feedUrl: string | null } | null>(null)
const showSettings = ref(false)
const copied = ref(false)
async function loadSettings() {
  try { settings.value = await $fetch('/api/admin/properties/settings') } catch { /* keine Rechte */ }
}
async function saveSettings(feed: boolean, renewKey = false) {
  await $fetch('/api/admin/properties/settings', { method: 'PUT', body: { feed, renewKey } })
  await loadSettings()
}
async function copyFeed() {
  if (!settings.value?.feedUrl) return
  try { await navigator.clipboard.writeText(settings.value.feedUrl); copied.value = true; setTimeout(() => (copied.value = false), 2000) } catch { /* */ }
}
</script>

<template>
  <div class="imo">
    <section class="imo__head wf-card">
      <div>
        <p class="wf-eyebrow">Website</p>
        <h1 class="wf-title">Immobilien</h1>
        <p class="wf-subtitle">Objekte für <NuxtLink to="/immobilien.html" target="_blank">wohnfee.at/immobilien</NuxtLink> – mit einem Klick auch auf willhaben.</p>
      </div>
      <div class="imo__tools">
        <button v-if="settings" class="wf-btn wf-btn--sm" @click="showSettings = !showSettings"><WfIcon name="settings" :size="14" /> willhaben-Schnittstelle</button>
        <NuxtLink v-if="perms.canEdit('immobilien')" to="/admin/immobilien/neu" class="wf-btn wf-btn--sm wf-btn--primary"><WfIcon name="plus" :size="14" /> Neue Immobilie</NuxtLink>
      </div>
    </section>

    <section v-if="showSettings && settings" class="imo__settings wf-card">
      <h2 class="imo__h2">willhaben-Schnittstelle</h2>
      <p class="imo__muted">
        willhaben übernimmt Inserate von Maklern über die <strong>OpenImmo-Schnittstelle</strong> (Business-Konto nötig – bei willhaben anfragen).
        Sobald ihr Zugang habt, gebt ihr willhaben diese <strong>Feed-Adresse</strong>: Alle Objekte, bei denen ihr „Auf willhaben veröffentlichen" klickt,
        erscheinen darin automatisch – Änderungen und Fotos inklusive, „Vergeben" nimmt sie wieder raus.
        Bis dahin erzeugt der Button eine OpenImmo-Datei zum manuellen Hochladen.
      </p>
      <label class="imo__switch">
        <input type="checkbox" :checked="settings.feed" :disabled="!perms.canEdit('immobilien')" @change="saveSettings(($event.target as HTMLInputElement).checked)">
        <span>Feed für willhaben aktiv</span>
      </label>
      <div v-if="settings.feed && settings.feedUrl" class="imo__feed">
        <code>{{ settings.feedUrl }}</code>
        <button class="wf-btn wf-btn--sm" @click="copyFeed">{{ copied ? 'Kopiert ✓' : 'Kopieren' }}</button>
        <button v-if="perms.canEdit('immobilien')" class="wf-btn wf-btn--sm" @click="saveSettings(true, true)">Neuen Schlüssel erzeugen</button>
      </div>
    </section>

    <div class="imo__chips">
      <button class="imo__chip" :class="{ 'is-on': filter === 'alle' }" @click="filter = 'alle'">Alle <small>{{ items.length }}</small></button>
      <button v-for="(v, k) in PROPERTY_STATUS" :key="k" class="imo__chip" :class="{ 'is-on': filter === k }" @click="filter = k">{{ v.de }} <small>{{ counts[k] || 0 }}</small></button>
    </div>

    <p v-if="error" class="imo__error">{{ error }}</p>
    <p v-if="loading" class="imo__muted">Wird geladen …</p>
    <div v-else-if="!visible.length" class="imo__empty wf-card">
      <WfIcon name="pin" :size="28" />
      <p>Noch keine Immobilien{{ filter !== 'alle' ? ' mit diesem Status' : '' }}.</p>
      <NuxtLink v-if="perms.canEdit('immobilien')" to="/admin/immobilien/neu" class="wf-btn wf-btn--primary">Erste Immobilie anlegen</NuxtLink>
    </div>

    <ul v-else class="imo__grid">
      <li v-for="p in visible" :key="p.id">
        <NuxtLink :to="`/admin/immobilien/${p.id}`" class="imo__card wf-card">
          <span class="imo__img">
            <img v-if="p.images[0]" :src="p.images[0].src" alt="" loading="lazy">
            <WfIcon v-else name="camera" :size="26" />
            <span class="wf-pill imo__status" :class="TONE[p.status]">{{ PROPERTY_STATUS[p.status]?.de }}</span>
          </span>
          <span class="imo__body">
            <small>{{ categoryLabel(p.category) }} · {{ p.offerType === 'kauf' ? 'Kauf' : 'Miete' }}<template v-if="p.refNo"> · {{ p.refNo }}</template></small>
            <strong>{{ p.title }}</strong>
            <span class="imo__facts">
              <span>{{ [p.zip, p.city].filter(Boolean).join(' ') || 'Ort fehlt' }}</span>
              <span v-if="p.livingArea">{{ p.livingArea.toLocaleString('de-AT') }} m²</span>
              <span v-if="p.rooms">{{ p.rooms.toLocaleString('de-AT') }} Zi.</span>
              <span><b>{{ eur(p.price) }}</b>{{ p.offerType === 'miete' && p.price ? ' / Monat' : '' }}</span>
            </span>
            <span class="imo__meta">
              <span v-if="p.willhabenStatus" class="imo__wh">{{ WH[p.willhabenStatus] || p.willhabenStatus }}</span>
              <span v-if="p.inquiryCount" class="imo__inq"><WfIcon name="inbox" :size="12" /> {{ p.inquiryCount }} Anfrage{{ p.inquiryCount === 1 ? '' : 'n' }}</span>
            </span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.imo__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1em; flex-wrap: wrap; padding: 1.6em 1.8em; margin-bottom: 1em; }
.imo__head .wf-subtitle a { color: var(--wf-green); }
.imo__head .wf-title { text-align: left; margin: 0; }
.imo__tools { display: flex; gap: .5em; flex-wrap: wrap; }
.imo__settings { padding: 1.2em 1.4em; margin-bottom: 1em; display: grid; gap: .7em; }
.imo__h2 { margin: 0; font-size: 1.05em; text-align: left; }
.imo__muted { color: var(--wf-muted); font-size: .88em; margin: 0; line-height: 1.55; }
.imo__switch { display: inline-flex; gap: .5em; align-items: center; font-weight: 600; font-size: .9em; }
.imo__feed { display: flex; gap: .5em; align-items: center; flex-wrap: wrap; }
.imo__feed code { flex: 1; min-width: 16em; font-size: .78em; padding: .55em .7em; background: #f4f1ea; border-radius: 8px; overflow-wrap: anywhere; }
.imo__chips { display: flex; gap: .4em; flex-wrap: wrap; margin-bottom: 1em; }
.imo__chip { border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .4em .9em; font: inherit; font-size: .84em; cursor: pointer; }
.imo__chip small { color: var(--wf-muted); margin-left: .2em; }
.imo__chip.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.imo__chip.is-on small { color: rgba(255, 255, 255, .8); }
.imo__error { color: var(--wf-red); }
.imo__empty { padding: 2.4em; display: grid; justify-items: center; gap: .8em; color: var(--wf-muted); text-align: center; }
.imo__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 1em; }
.imo__card { display: flex; flex-direction: column; overflow: hidden; padding: 0; text-decoration: none; color: inherit; height: 100%; transition: transform .2s, box-shadow .2s; }
.imo__card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(60, 50, 30, .12); }
.imo__img { position: relative; aspect-ratio: 16 / 10; background: #ece6da; display: grid; place-items: center; color: #9b9483; }
.imo__img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.imo__status { position: absolute; top: .7em; left: .7em; }
.imo__body { padding: .9em 1.1em 1.1em; display: flex; flex-direction: column; gap: .3em; min-width: 0; }
.imo__body small { color: var(--wf-muted); font-size: .76em; }
.imo__body strong { font-size: .98em; line-height: 1.35; }
.imo__facts { display: flex; flex-wrap: wrap; gap: .2em .8em; font-size: .82em; color: var(--wf-ink); }
.imo__meta { display: flex; gap: .6em; flex-wrap: wrap; font-size: .76em; margin-top: .2em; }
.imo__wh { color: #2b6cb0; }
.imo__inq { color: var(--wf-green); display: inline-flex; align-items: center; gap: .25em; font-weight: 600; }
</style>
