<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({ title: 'Mietanfragen - WOHNFEE Dashboard' })

interface Inquiry {
  id: number
  number: string
  status: 'neu' | 'in_bearbeitung' | 'beantwortet' | 'archiviert'
  firstName: string | null
  lastName: string | null
  company: string | null
  email: string
  phone: string | null
  city: string | null
  startDate: string | null
  endDate: string | null
  durationMonths: number | null
  monthlyTotal: string | null
  reservationStatus: string | null
  reservedUntil: string | null
  projectId: number | null
  offerStatus: string | null
  createdAt: string
}

interface Item {
  id: number
  itemId: number | null
  title: string
  quantity: number
  durationMonths: number | null
  monthlyPrice: string | null
}

interface Detail extends Inquiry {
  street: string | null
  zip: string | null
  country: string | null
  deliveryOption: string | null
  deliveryNotes: string | null
  notes: string | null
  offerId: number | null
  offerNumber: string | null
  transportCalc: string | null
}

const inquiries = ref<Inquiry[]>([])
const counts = ref<Record<string, number>>({ neu: 0, in_bearbeitung: 0, beantwortet: 0, archiviert: 0 })
const filter = ref<'alle' | 'neu' | 'in_bearbeitung' | 'beantwortet' | 'archiviert'>('alle')
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const expandedId = ref<number | null>(null)
const detail = ref<Detail | null>(null)
const items = ref<Item[]>([])
const detailLoading = ref(false)

const perms = usePermissions()
const tabs = [
  { value: 'alle', label: 'Alle' },
  { value: 'neu', label: 'Neu' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung' },
  { value: 'beantwortet', label: 'Beantwortet' },
  { value: 'archiviert', label: 'Archiviert' }
] as const

const STATUS_LABELS: Record<string, string> = {
  neu: 'Neu', in_bearbeitung: 'In Bearbeitung', beantwortet: 'Beantwortet', archiviert: 'Archiviert'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const q = filter.value === 'alle' ? '' : `?status=${filter.value}`
    const res = await $fetch<{ inquiries: Inquiry[]; counts: Record<string, number> }>(`/api/admin/rental-inquiries${q}`)
    inquiries.value = res.inquiries
    counts.value = res.counts
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Mietanfragen konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

// Beim Wechsel des Filters aufklappte Details schließen – sonst bleibt die
// Detailansicht einer Anfrage sichtbar, die der neue Filter aus der Liste
// ausblendet (z. B. „Neu" nach automatischer „In Bearbeitung"-Markierung).
watch(filter, () => {
  expandedId.value = null
  detail.value = null
  items.value = []
  load()
})

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function money(v: string | number | null) {
  if (v === null || v === undefined) return '—'
  return Number(v).toFixed(2).replace('.', ',') + ' €'
}

function displayName(i: Inquiry) {
  return [i.firstName, i.lastName].filter(Boolean).join(' ') || i.email
}

function period(i: Inquiry) {
  if (!i.startDate) return '—'
  return `${formatDate(i.startDate)} – ${formatDate(i.endDate)}`
}

function transport(d: Detail) {
  if (!d.transportCalc) return null
  try { return JSON.parse(d.transportCalc) } catch { return null }
}

function pillClass(status: string) {
  if (status === 'neu') return ''
  if (status === 'in_bearbeitung') return 'wf-pill--amber'
  return 'wf-pill--gray'
}

async function toggleDetail(item: Inquiry) {
  actionError.value = ''
  if (expandedId.value === item.id) {
    expandedId.value = null
    detail.value = null
    items.value = []
    return
  }
  expandedId.value = item.id
  detailLoading.value = true
  detail.value = null
  items.value = []
  // Beim ersten Öffnen automatisch als „in Bearbeitung" markieren
  if (item.status === 'neu' && perms.canEdit('mietanfragen')) {
    await setStatus(item, 'in_bearbeitung', false)
  }
  try {
    const res = await $fetch<{ inquiry: Detail; items: Item[] }>(`/api/admin/rental-inquiries/${item.id}`)
    detail.value = res.inquiry
    items.value = res.items
  } catch (e: any) {
    expandedId.value = null
    actionError.value = e?.data?.statusMessage || 'Details konnten nicht geladen werden.'
  } finally {
    detailLoading.value = false
  }
}

async function setStatus(item: Inquiry, status: string, reload = true) {
  actionError.value = ''
  try {
    await $fetch(`/api/admin/rental-inquiries/${item.id}/status`, { method: 'PUT', body: { status } })
    item.status = status as any
    if (detail.value && detail.value.id === item.id) detail.value.status = status as any
    if (reload) await load()
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || 'Status konnte nicht geändert werden.'
  }
}

// Angebot aus der Anfrage erstellen (oder vorhandenes öffnen)
const offerBusy = ref(false)
async function makeOffer(item: Inquiry) {
  if (!detail.value) return
  if (detail.value.offerId) return navigateTo(`/admin/angebote?open=${detail.value.offerId}`)
  offerBusy.value = true
  actionError.value = ''
  try {
    const res = await $fetch<{ offerId: number }>(`/api/admin/rental-inquiries/${item.id}/offer`, { method: 'POST' })
    await navigateTo(`/admin/angebote?open=${res.offerId}`)
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || 'Angebot konnte nicht erstellt werden.'
  } finally {
    offerBusy.value = false
  }
}

// Reservierung der Möbel (3 Tage ab Anfrage bzw. bis „gültig bis" des versendeten Angebots)
function reservation(i: Inquiry): { label: string; tone: string } | null {
  const active = i.reservationStatus === 'aktiv' && i.reservedUntil && new Date(i.reservedUntil).getTime() > Date.now()
  if (active) {
    const h = Math.max(1, Math.round((new Date(i.reservedUntil!).getTime() - Date.now()) / 3600000))
    return { label: `Reserviert · noch ${h >= 48 ? Math.round(h / 24) + ' Tage' : h + ' Std.'}`, tone: 'wf-pill--blue' }
  }
  if (i.reservationStatus === 'angenommen') return { label: 'Angenommen · im Projekt', tone: 'wf-pill--green' }
  if (i.reservationStatus === 'abgelehnt') return { label: 'Abgelehnt · freigegeben', tone: 'wf-pill--red' }
  if (i.reservationStatus === 'aktiv' || i.reservationStatus === 'abgelaufen') return { label: 'Reservierung abgelaufen', tone: 'wf-pill--gray' }
  if (i.reservationStatus === 'freigegeben') return { label: 'Freigegeben', tone: 'wf-pill--gray' }
  return null
}
const resBusy = ref(false)
async function changeReservation(item: Inquiry, action: 'extend' | 'release') {
  if (action === 'release' && !confirm('Reservierung aufheben? Die Möbel sind dann sofort wieder im Shop – auch wenn der Kunde das Angebot noch annehmen möchte.')) return
  resBusy.value = true
  actionError.value = ''
  try {
    const r = await $fetch<{ reservationStatus: string; reservedUntil: string }>(`/api/admin/rental-inquiries/${item.id}/reservation`, { method: 'POST', body: { action } })
    item.reservationStatus = r.reservationStatus
    item.reservedUntil = r.reservedUntil
    if (detail.value && detail.value.id === item.id) Object.assign(detail.value, r)
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || 'Reservierung konnte nicht geändert werden.'
  } finally {
    resBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="rental-inquiries">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Furniture Leasing</p>
        <h1 class="wf-title">Mietanfragen</h1>
        <p class="wf-subtitle">Anfragen aus dem Leasing-Shop — aufklappen, bearbeiten, beantworten.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-mietanfragen.jpg" alt="Hell eingerichtetes Wohnzimmer mit Umzugskartons und Schlüsselübergabe">
      </div>
    </section>

    <div class="rental-inquiries__tabs" role="tablist">
      <button v-for="t in tabs" :key="t.value" class="rental-inquiries__tab"
              :class="{ 'is-active': filter === t.value }" role="tab"
              :aria-selected="filter === t.value" @click="filter = t.value">
        {{ t.label }}
        <span v-if="t.value !== 'alle' && counts[t.value]" class="rental-inquiries__tabcount">
          {{ counts[t.value] }}
        </span>
        <span v-else-if="t.value === 'alle'"
              class="rental-inquiries__tabcount rental-inquiries__tabcount--all">
          {{ counts.neu + counts.in_bearbeitung + counts.beantwortet + counts.archiviert }}
        </span>
      </button>
    </div>

    <p v-if="error" class="rental-inquiries__error" role="alert">{{ error }}</p>
    <p v-if="actionError" class="rental-inquiries__error" role="alert">{{ actionError }}</p>

    <p v-if="loading" class="rental-inquiries__loading">Mietanfragen werden geladen …</p>

    <div v-else-if="!inquiries.length" class="rental-inquiries__empty">
      <template v-if="filter === 'alle'">Noch keine Mietanfragen vorhanden.</template>
      <template v-else>Keine Anfragen mit dem Status „{{ tabs.find(t => t.value === filter)?.label }}“.</template>
    </div>

    <ul v-else class="rental-inquiries__list">
      <li v-for="item in inquiries" :key="item.id" class="rental-inquiries__item"
          :class="{ 'is-expanded': expandedId === item.id }">
        <button class="rental-inquiries__row" @click="toggleDetail(item)">
          <span class="wf-pill" :class="pillClass(item.status)">{{ STATUS_LABELS[item.status] }}</span>
          <span class="rental-inquiries__main">
            <strong>{{ displayName(item) }}</strong>
            <span class="rental-inquiries__number">{{ item.number }}<template v-if="item.company"> · {{ item.company }}</template></span>
            <span class="rental-inquiries__preview">
              {{ period(item) }}<template v-if="item.durationMonths"> ({{ item.durationMonths }} Mon.)</template>
              <template v-if="item.city"> · {{ item.city }}</template>
            </span>
          </span>
          <span v-if="reservation(item)" class="wf-pill rental-inquiries__res" :class="reservation(item)!.tone">{{ reservation(item)!.label }}</span>
          <span class="rental-inquiries__total">{{ money(item.monthlyTotal) }}<small>/Mon.</small></span>
          <span class="rental-inquiries__meta">
            <span class="rental-inquiries__date">{{ formatDateTime(item.createdAt) }}</span>
            <WfIcon name="chevron" :size="15" class="rental-inquiries__chevron" />
          </span>
        </button>

        <div v-if="expandedId === item.id" class="rental-inquiries__detail">
          <p v-if="detailLoading" class="rental-inquiries__loading">Details werden geladen …</p>
          <template v-else-if="detail">
            <div class="rental-inquiries__cols">
              <dl class="rental-inquiries__facts">
                <div><dt>Anfragenummer</dt><dd>{{ detail.number }}</dd></div>
                <div><dt>E-Mail</dt><dd><a :href="`mailto:${detail.email}`">{{ detail.email }}</a></dd></div>
                <div v-if="detail.phone"><dt>Telefon</dt><dd><a :href="`tel:${detail.phone}`">{{ detail.phone }}</a></dd></div>
                <div><dt>Adresse</dt><dd>{{ [detail.street, detail.zip && detail.city ? `${detail.zip} ${detail.city}` : detail.city, detail.country].filter(Boolean).join(', ') || '—' }}</dd></div>
                <div><dt>Mietzeitraum</dt><dd>{{ period(detail) }}<template v-if="detail.durationMonths"> ({{ detail.durationMonths }} Monate)</template></dd></div>
                <div><dt>Abwicklung</dt><dd>{{ detail.deliveryOption || '—' }}</dd></div>
                <div v-if="detail.deliveryNotes"><dt>Lieferhinweise</dt><dd>{{ detail.deliveryNotes }}</dd></div>
                <div><dt>Eingegangen</dt><dd>{{ formatDateTime(detail.createdAt) }}</dd></div>
              </dl>

              <div class="rental-inquiries__items">
                <h4>Positionen</h4>
                <table>
                  <thead>
                    <tr><th>Menge</th><th>Position</th><th>Dauer</th><th class="is-right">Preis</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="it in items" :key="it.id">
                      <td>{{ it.quantity }}×</td>
                      <td>{{ it.title }}</td>
                      <td>{{ it.durationMonths }} Mon.</td>
                      <td class="is-right">{{ money(it.monthlyPrice) }}<small>/Mon.</small></td>
                    </tr>
                  </tbody>
                  <tfoot v-if="detail.monthlyTotal !== null">
                    <tr>
                      <td colspan="3">Monatliche Gesamtsumme</td>
                      <td class="is-right"><strong>{{ money(detail.monthlyTotal) }}</strong></td>
                    </tr>
                  </tfoot>
                </table>
                <p v-if="!items.length" class="rental-inquiries__noitems">Keine Positionen hinterlegt.</p>
              </div>
            </div>

            <div v-if="transport(detail)" class="rental-inquiries__transport">
              <strong><WfIcon name="truck" :size="14" /> Transport (automatisch berechnet)</strong>
              <span v-if="!transport(detail).ok">{{ transport(detail).error }} – bitte im Angebot ergänzen.</span>
              <span v-else>
                {{ transport(detail).km.toLocaleString('de-AT') }} km · ca. {{ transport(detail).driveMinutes }} Min. je Strecke ·
                Lieferung {{ money(transport(detail).delivery.cost) }} + Abholung {{ money(transport(detail).pickup.cost) }}
                <template v-if="transport(detail).kmCost"> + km {{ money(transport(detail).kmCost) }}</template>
                <template v-if="transport(detail).perk !== 'none'"> · {{ transport(detail).perk === 'free' ? 'gratis (Wien)' : '−50 %' }}</template>
                = <b>{{ money(transport(detail).total) }}</b> netto
              </span>
            </div>
            <p v-if="detail.notes" class="rental-inquiries__notes">
              <strong>Anmerkungen:</strong> {{ detail.notes }}
            </p>

            <div v-if="reservation(item)" class="rental-inquiries__reserve">
              <span>
                <strong><WfIcon name="lock" :size="14" /> {{ reservation(item)!.label }}</strong>
                <small v-if="item.reservationStatus === 'aktiv' && item.reservedUntil && new Date(item.reservedUntil).getTime() > Date.now()">
                  bis {{ new Date(item.reservedUntil).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }} –
                  so lange sind die Möbel nicht im Shop. Danach automatisch wieder frei.
                </small>
                <small v-else-if="item.reservationStatus === 'angenommen'">Die Möbel sind dem Projekt zugewiesen, bis die Abholung in „Touren" erledigt ist.</small>
                <small v-else-if="!['abgelehnt'].includes(item.reservationStatus || '')">Die Möbel sind wieder im Shop. Wird das Angebot trotzdem angenommen, prüfen wir vorher die Verfügbarkeit.</small>
              </span>
              <span v-if="perms.canEdit('mietanfragen') && !['angenommen', 'abgelehnt'].includes(item.reservationStatus || '')" class="rental-inquiries__resacts">
                <button class="wf-btn wf-btn--sm" :disabled="resBusy" @click="changeReservation(item, 'extend')">+3 Tage</button>
                <button v-if="item.reservationStatus === 'aktiv'" class="wf-btn wf-btn--sm" :disabled="resBusy" @click="changeReservation(item, 'release')">Freigeben</button>
              </span>
              <NuxtLink v-if="item.projectId" :to="`/admin/projekte?open=${item.projectId}&cat=leasing`" class="wf-btn wf-btn--sm">Projekt öffnen</NuxtLink>
            </div>

            <div class="rental-inquiries__actions">
              <button v-if="perms.canEdit('angebote')" class="wf-btn wf-btn--sm wf-btn--primary" :disabled="offerBusy" @click="makeOffer(item)">
                <WfIcon name="file" :size="13" />
                {{ detail.offerId ? `Angebot ${detail.offerNumber || ''} öffnen` : (offerBusy ? 'Erstelle …' : 'Angebot erstellen') }}
              </button>
              <template v-if="perms.canEdit('mietanfragen')">
              <a v-if="item.status !== 'beantwortet'" class="wf-btn wf-btn--sm"
                 :href="`mailto:${detail.email}?subject=Ihre Mietanfrage ${detail.number} – WOHNFEE Furniture Leasing`">Per E-Mail antworten</a>
              <button v-if="item.status !== 'in_bearbeitung' && item.status !== 'archiviert'" class="wf-btn wf-btn--sm"
                      @click="setStatus(item, 'in_bearbeitung')">In Bearbeitung</button>
              <button v-if="item.status !== 'beantwortet'" class="wf-btn wf-btn--sm"
                      @click="setStatus(item, 'beantwortet')">Als beantwortet markieren</button>
              <button v-if="item.status !== 'archiviert'" class="wf-btn wf-btn--sm"
                      @click="setStatus(item, 'archiviert')">Archivieren</button>
              <button v-if="item.status === 'archiviert'" class="wf-btn wf-btn--sm"
                      @click="setStatus(item, 'neu')">Wiederherstellen</button>
              </template>
            </div>
          </template>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.rental-inquiries__res { white-space: nowrap; font-size: .74em; }
.rental-inquiries__reserve { display: flex; align-items: center; gap: .8em; flex-wrap: wrap; margin: 1em 0 0; padding: .75em 1em; border-radius: 12px; background: #eef3f8; border: 1px solid #d5e1ec; }
.rental-inquiries__reserve > span:first-child { flex: 1; min-width: 14em; display: flex; flex-direction: column; gap: .15em; }
.rental-inquiries__reserve strong { display: inline-flex; align-items: center; gap: .4em; font-size: .9em; }
.rental-inquiries__reserve small { color: var(--wf-muted); font-size: .8em; }
.rental-inquiries__resacts { display: flex; gap: .4em; }

.rental-inquiries__tabs {
  display: flex;
  gap: .5em;
  margin-bottom: 1.4em;
  flex-wrap: wrap;
}

.rental-inquiries__tab {
  display: inline-flex;
  align-items: center;
  gap: .5em;
  border: 1px solid var(--wf-line);
  background: var(--wf-card);
  border-radius: 999px;
  font-family: inherit;
  font-size: .88em;
  color: var(--wf-muted);
  padding: .5em 1.1em;
  cursor: pointer;
  transition: border-color .15s, color .15s, background .15s;
}

.rental-inquiries__tab:hover { border-color: var(--wf-green); color: var(--wf-green); }

.rental-inquiries__tab.is-active {
  background: var(--wf-green-soft);
  border-color: var(--wf-green-soft);
  color: var(--wf-green);
  font-weight: 600;
}

.rental-inquiries__tabcount {
  background: #fff;
  color: var(--wf-muted);
  border-radius: 999px;
  font-size: .78em;
  padding: .05em .55em;
}

.rental-inquiries__tab.is-active .rental-inquiries__tabcount { background: var(--wf-green); color: #fff; }

.rental-inquiries__loading,
.rental-inquiries__empty {
  color: var(--wf-muted);
  padding: 2em 0;
  text-align: center;
}

.rental-inquiries__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: .6em;
}

.rental-inquiries__item {
  background: var(--wf-card);
  border-radius: var(--wf-radius);
  box-shadow: var(--wf-shadow);
  border: 1px solid rgba(74, 62, 40, .04);
  overflow: hidden;
}

.rental-inquiries__item.is-expanded {
  outline: 2px solid rgba(47, 93, 64, .25);
}

.rental-inquiries__row {
  display: flex;
  align-items: center;
  gap: 1em;
  width: 100%;
  border: 0;
  background: none;
  font-family: inherit;
  text-align: left;
  padding: .9em 1.1em;
  cursor: pointer;
  color: inherit;
}

.rental-inquiries__row:hover { background: #fbf9f4; }

.rental-inquiries__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: .1em;
}

.rental-inquiries__number {
  font-size: .85em;
  color: var(--wf-green);
}

.rental-inquiries__preview {
  font-size: .82em;
  color: var(--wf-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rental-inquiries__total {
  flex-shrink: 0;
  font-weight: 600;
  font-size: .95em;
  white-space: nowrap;
}

.rental-inquiries__total small {
  font-weight: 400;
  color: var(--wf-muted);
  margin-left: .2em;
}

.rental-inquiries__meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: .6em;
}

.rental-inquiries__date {
  font-size: .8em;
  color: var(--wf-muted);
}

.rental-inquiries__chevron { color: #c9c2b2; }

.rental-inquiries__detail {
  border-top: 1px solid #f4efe6;
  padding: 1.1em 1.2em 1.2em;
}

.rental-inquiries__cols {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 1.4em;
  margin-bottom: 1em;
}

@media (max-width: 900px) {
  .rental-inquiries__cols { grid-template-columns: 1fr; }
}

.rental-inquiries__facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: .55em;
}

.rental-inquiries__facts dt {
  font-size: .72em;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--wf-muted);
  font-weight: 600;
}

.rental-inquiries__facts dd {
  margin: .1em 0 0;
  font-size: .92em;
}

.rental-inquiries__facts a { color: var(--wf-green); }

.rental-inquiries__items h4 {
  margin: 0 0 .5em;
  font-size: .78em;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--wf-muted);
}

.rental-inquiries__items table {
  width: 100%;
  border-collapse: collapse;
  font-size: .9em;
}

.rental-inquiries__items th {
  text-align: left;
  font-size: .78em;
  color: var(--wf-muted);
  padding: .4em .6em;
  border-bottom: 2px solid #ece7da;
  font-weight: 600;
}

.rental-inquiries__items td {
  padding: .45em .6em;
  border-bottom: 1px solid #f4efe6;
  vertical-align: top;
}

.rental-inquiries__items .is-right { text-align: right; white-space: nowrap; }

.rental-inquiries__items tfoot td {
  border-bottom: 0;
  border-top: 2px solid #ece7da;
  padding-top: .6em;
}

.rental-inquiries__items small {
  color: var(--wf-muted);
  font-weight: 400;
}

.rental-inquiries__noitems {
  color: var(--wf-muted);
  font-size: .88em;
  margin: .4em 0 0;
}

.rental-inquiries__notes {
  background: #fbf9f4;
  border-radius: 12px;
  padding: .9em 1.1em;
  font-size: .93em;
  line-height: 1.55;
  margin: 0 0 1.2em;
}

.rental-inquiries__actions {
  display: flex;
  gap: .6em;
  flex-wrap: wrap;
}

.rental-inquiries__actions a { text-decoration: none; }

.rental-inquiries__error {
  background: var(--wf-red-soft);
  color: var(--wf-red);
  border-radius: 10px;
  padding: .6em .9em;
  font-size: .88em;
  margin: 0 0 1em;
}

@media (max-width: 600px) {
  .rental-inquiries__row { flex-wrap: wrap; }
  .rental-inquiries__meta { width: 100%; justify-content: space-between; }
  .rental-inquiries__total { margin-left: auto; }
}
.rental-inquiries__transport { display: flex; flex-direction: column; gap: .25em; margin: 0 0 .9em; padding: .7em .9em; border-radius: 10px; background: var(--wf-green-soft); font-size: .86em; }
.rental-inquiries__transport strong { display: flex; align-items: center; gap: .4em; color: var(--wf-green); }
</style>
