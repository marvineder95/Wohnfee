<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  title: 'Übersicht - WOHNFEE Dashboard',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

const { user } = useAdminAuth()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
})
const displayName = computed(() => user.value?.displayName || user.value?.username || '')

interface Inq { id: number; name: string; subject: string | null; status: string; createdAt: string }
interface Inv { id: number; number: string; customer_name: string; doc_date: string; status: string; netto: number | null }
interface Expiring {
  id: number
  category: string
  customer: string | null
  title: string | null
  deadlineDate: string
  deadlineText: string | null
  itemCount: number
}

interface CalendarEvent {
  id: number
  title: string
  type: string
  eventDate: string
  startTime: string | null
  endTime: string | null
  allDay: number
  location: string | null
  projectTitle: string | null
  projectCustomer: string | null
}

const loading = ref(true)
const loadError = ref('')
const inquiryCounts = ref({ neu: 0, gelesen: 0, archiviert: 0 })
const inquiries = ref<Inq[]>([])
const projectCounts = ref<Record<string, number>>({})
const expiring = ref<Expiring[]>([])
const upcomingEvents = ref<CalendarEvent[]>([])
const invoiceStats = ref({ open: 0, openSum: 0, thisMonth: 0, overdue: 0 })
const rentalCounts = ref<Record<string, number>>({ neu: 0, in_bearbeitung: 0 })

const INQ_LABELS: Record<string, string> = { neu: 'Neu', gelesen: 'Gelesen', archiviert: 'Archiviert' }
const CAT_LABELS: Record<string, string> = { staging: 'Staging', leasing: 'Leasing', showroom: 'Showroom' }
const EVT_LABELS: Record<string, string> = { aufbau: 'Aufbau', abholung: 'Abholung', lieferung: 'Lieferung', beratung: 'Beratung', sonstiges: 'Sonstiges' }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return String(iso).slice(0, 10).split('-').reverse().join('.')
}
function fmtEuro(v: number | null) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
// lokales Datum (nicht UTC – sonst kurz nach Mitternacht noch „gestern")
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = localIso(new Date())
const monthKey = todayIso.slice(0, 7)

onMounted(async () => {
  try {
    const [inq, proj, inv, exp, cal, rent] = await Promise.all([
      $fetch<{ inquiries: Inq[]; counts: any }>('/api/admin/inquiries'),
      $fetch<{ counts: Record<string, number> }>('/api/admin/projects'),
      $fetch<{ invoices: Inv[] }>('/api/admin/invoices'),
      $fetch<{ overdue: any[]; deadlines: any[] }>(`/api/admin/logistics?from=${todayIso}&to=${localIso(new Date(Date.now() + 14 * 86400000))}`),
      $fetch<{ events: CalendarEvent[] }>(`/api/admin/calendar?from=${todayIso}&to=${localIso(new Date(Date.now() + 30 * 86400000))}`),
      $fetch<{ counts: Record<string, number> }>('/api/admin/rental-inquiries').catch(() => ({ counts: {} }))
    ])
    rentalCounts.value = { neu: 0, in_bearbeitung: 0, ...rent.counts }
    upcomingEvents.value = (cal.events || []).slice(0, 5)
    inquiryCounts.value = inq.counts
    inquiries.value = inq.inquiries.slice(0, 5)
    projectCounts.value = proj.counts
    // Rückgaben: überfällige zuerst, dann die nächsten 14 Tage (je Projekt einmal)
    const seen = new Set<number>()
    expiring.value = [...exp.overdue, ...exp.deadlines]
      .filter((r: any) => !seen.has(r.projectId) && seen.add(r.projectId))
      .slice(0, 6)
      .map((r: any) => ({
        id: r.projectId, category: r.projectCategory, customer: r.projectCustomer, title: r.projectTitle,
        deadlineDate: String(r.date).slice(0, 10), deadlineText: r.deadlineText || null, itemCount: Number(r.pieceCount || r.itemCount)
      }))
    const openInv = inv.invoices.filter(i => i.status === 'gesendet')
    invoiceStats.value = {
      overdue: (inv.invoices as any[]).filter(i => (i.days_overdue ?? 0) > 0).length,
      open: openInv.length,
      openSum: openInv.reduce((s, i) => s + (Number(i.netto) || 0), 0),
      thisMonth: inv.invoices.filter(i => String(i.doc_date).slice(0, 7) === monthKey).length
    }
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || 'Daten konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
})

function daysUntil(iso: string): number {
  return Math.round((new Date(String(iso).slice(0, 10)).getTime() - new Date(todayIso).getTime()) / 86400000)
}

const stats = computed(() => [
  {
    icon: 'inbox', label: 'Neue Kontaktanfragen', to: '/admin/anfragen',
    value: inquiryCounts.value.neu || 0,
    delta: inquiryCounts.value.gelesen || 0, deltaLabel: 'gelesen, offen', tone: 'green'
  },
  {
    icon: 'bag', label: 'Neue Mietanfragen', to: '/admin/mietanfragen',
    value: rentalCounts.value.neu || 0,
    delta: rentalCounts.value.in_bearbeitung || 0, deltaLabel: 'in Bearbeitung', tone: 'amber'
  },
  {
    icon: 'folder', label: 'Projekte', to: '/admin/projekte',
    value: (projectCounts.value.staging || 0) + (projectCounts.value.leasing || 0) + (projectCounts.value.showroom || 0),
    delta: projectCounts.value.staging || 0, deltaLabel: 'davon Staging', tone: 'green'
  },
  {
    icon: 'receipt', label: 'Offene Rechnungen',
    to: invoiceStats.value.overdue ? '/admin/rechnungen?filter=ueberfaellig' : '/admin/rechnungen',
    value: invoiceStats.value.open,
    delta: invoiceStats.value.open ? fmtEuro(invoiceStats.value.openSum) : null,
    deltaLabel: invoiceStats.value.overdue ? `netto · ${invoiceStats.value.overdue} überfällig` : 'netto ausständig', tone: 'blue'
  }
])

// Schnellzugriffe öffnen direkt den jeweiligen „Neu"-Dialog (?new=1)
const quickActions = [
  { label: 'Neues Projekt', icon: 'folder', to: '/admin/projekte?new=1' },
  { label: 'Termin anlegen', icon: 'calendar', to: '/admin/kalender?new=1' },
  { label: 'Angebot erstellen', icon: 'file', to: '/admin/angebote?new=1' },
  { label: 'Rechnung erstellen', icon: 'receipt', to: '/admin/rechnungen?new=1' },
  { label: 'Kontakt hinzufügen', icon: 'contacts', to: '/admin/kontakte?new=1' },
  { label: 'Möbel erfassen', icon: 'box', to: '/admin/inventar?new=1' }
]
</script>

<template>
  <div>
    <!-- Begrüßung mit Hero-Bild -->
    <section class="dash-hero wf-card">
      <div class="dash-hero__text">
        <p class="wf-eyebrow">{{ greeting }}</p>
        <h1 class="wf-title">Willkommen{{ displayName ? `, ${displayName}` : '' }}</h1>
        <p class="wf-subtitle">Hier ist deine Übersicht über alle aktuellen Aktivitäten der Wohnfee.</p>
      </div>
      <div class="dash-hero__img">
        <img src="/img/admin-hero-dashboard.jpg" alt="Home-staged Wohnzimmer in warmen Tönen">
        <div class="dash-hero__slogan">
          <WfIcon name="leaf" :size="26" />
          <p>Schönere Räume.<br>Einfacher möglich.</p>
        </div>
      </div>
    </section>

    <p v-if="loadError" class="dash-error">{{ loadError }}</p>
    <p v-if="loading" class="dash-loading">Daten werden geladen …</p>

    <!-- Statistik-Karten -->
    <section class="dash-stats">
      <NuxtLink v-for="s in stats" :key="s.label" :to="s.to" class="dash-stat wf-card" :data-tone="s.tone">
        <span class="dash-stat__icon"><WfIcon :name="s.icon" :size="20" /></span>
        <div class="dash-stat__body">
          <strong class="dash-stat__num">{{ s.value }}</strong>
          <span class="dash-stat__label">{{ s.label }}</span>
          <span v-if="s.delta !== null" class="dash-stat__delta">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
            {{ s.delta }} {{ s.deltaLabel }}
          </span>
        </div>
      </NuxtLink>
    </section>

    <!-- Listen -->
    <section class="dash-cols">
      <article class="dash-card wf-card">
        <header class="dash-card__head">
          <h2>Aktuelle Anfragen</h2>
          <NuxtLink to="/admin/anfragen" class="dash-card__all">Alle anzeigen <WfIcon name="chevron" :size="13" /></NuxtLink>
        </header>
        <p v-if="!loading && !inquiries.length" class="dash-empty">Keine Anfragen vorhanden.</p>
        <ul v-else class="dash-list">
          <li v-for="q in inquiries" :key="q.id">
            <NuxtLink to="/admin/anfragen" class="dash-row">
              <span class="wf-thumb"><WfIcon name="home" :size="18" /></span>
              <span class="dash-row__main">
                <strong>{{ q.subject || 'Anfrage' }}</strong>
                <small>{{ q.name }} · {{ fmtDate(q.createdAt) }}</small>
              </span>
              <span class="wf-pill" :data-tone="q.status" :class="q.status === 'neu' ? '' : q.status === 'gelesen' ? 'wf-pill--amber' : 'wf-pill--gray'">
                {{ INQ_LABELS[q.status] || q.status }}
              </span>
              <WfIcon name="chevron" :size="15" class="dash-row__chev" />
            </NuxtLink>
          </li>
        </ul>
      </article>

      <article class="dash-card wf-card">
        <header class="dash-card__head">
          <h2>Rückgaben &amp; Abholungen</h2>
          <NuxtLink to="/admin/touren" class="dash-card__all">Alle anzeigen <WfIcon name="chevron" :size="13" /></NuxtLink>
        </header>
        <p v-if="!loading && !expiring.length" class="dash-empty">Keine Abholungen in den nächsten 14 Tagen.</p>
        <ul v-else class="dash-list">
          <li v-for="p in expiring" :key="p.id">
            <NuxtLink :to="`/admin/projekte?open=${p.id}&cat=${p.category}`" class="dash-row">
              <span class="wf-thumb"><WfIcon name="folder" :size="18" /></span>
              <span class="dash-row__main">
                <strong>{{ p.customer || p.title || 'Projekt #' + p.id }}</strong>
                <small>
                  {{ CAT_LABELS[p.category] || p.category }} ·
                  {{ p.itemCount }} {{ p.itemCount === 1 ? 'Möbelstück' : 'Möbelstücke' }} ·
                  bis {{ fmtDate(p.deadlineDate) }}
                </small>
              </span>
              <span class="wf-pill" :class="daysUntil(p.deadlineDate) < 0 ? 'wf-pill--red' : daysUntil(p.deadlineDate) <= 7 ? 'wf-pill--amber' : ''">
                {{ daysUntil(p.deadlineDate) < 0 ? 'Überfällig' : daysUntil(p.deadlineDate) === 0 ? 'Heute' : 'in ' + daysUntil(p.deadlineDate) + ' Tagen' }}
              </span>
              <WfIcon name="chevron" :size="15" class="dash-row__chev" />
            </NuxtLink>
          </li>
        </ul>
      </article>

      <article class="dash-card wf-card">
        <header class="dash-card__head">
          <h2>Kommende Termine</h2>
          <NuxtLink to="/admin/kalender" class="dash-card__all">Alle anzeigen <WfIcon name="chevron" :size="13" /></NuxtLink>
        </header>
        <p v-if="!loading && !upcomingEvents.length" class="dash-empty">Keine Termine in den nächsten 30 Tagen.</p>
        <ul v-else class="dash-list">
          <li v-for="e in upcomingEvents" :key="e.id">
            <NuxtLink :to="`/admin/kalender?focus=${e.eventDate}`" class="dash-row">
              <span class="wf-thumb"><WfIcon name="calendar" :size="18" /></span>
              <span class="dash-row__main">
                <strong>{{ e.title }}</strong>
                <small>
                  {{ EVT_LABELS[e.type] || e.type }} ·
                  {{ fmtDate(e.eventDate) }}<template v-if="!e.allDay && e.startTime">, {{ e.startTime }} Uhr</template>
                  <template v-if="e.projectCustomer"> · {{ e.projectCustomer }}</template>
                </small>
              </span>
              <span class="wf-pill" :class="daysUntil(e.eventDate) < 0 ? 'wf-pill--red' : daysUntil(e.eventDate) === 0 ? 'wf-pill--green' : daysUntil(e.eventDate) <= 3 ? 'wf-pill--amber' : ''">
                {{ daysUntil(e.eventDate) < 0 ? 'Überfällig' : daysUntil(e.eventDate) === 0 ? 'Heute' : 'in ' + daysUntil(e.eventDate) + ' Tagen' }}
              </span>
              <WfIcon name="chevron" :size="15" class="dash-row__chev" />
            </NuxtLink>
          </li>
        </ul>
      </article>
    </section>

    <!-- Schnellzugriff -->
    <section class="dash-quick wf-card">
      <h2>Schnellzugriff</h2>
      <div class="dash-quick__grid">
        <NuxtLink v-for="a in quickActions" :key="a.to + a.label" :to="a.to" class="dash-quick__btn">
          <WfIcon :name="a.icon" :size="17" />
          {{ a.label }}
          <WfIcon name="chevron" :size="14" class="dash-quick__chev" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Hero */
.dash-hero {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  margin-bottom: 1.4em;
}
.dash-hero__text {
  flex: 1;
  padding: 2em 0 2em 2em;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.dash-hero__img {
  flex: 0 0 42%;
  position: relative;
  min-height: 170px;
}
.dash-hero__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dash-hero__slogan {
  position: absolute;
  right: 1em;
  bottom: 1em;
  background: rgba(38, 73, 47, .92);
  color: #f4f1e8;
  border-radius: 12px;
  padding: .9em 1.1em;
  display: flex;
  align-items: center;
  gap: .7em;
  font-family: var(--wf-serif);
  font-size: .98em;
  line-height: 1.3;
  max-width: 75%;
}
.dash-hero__slogan p { margin: 0; }
.dash-hero__slogan svg { flex-shrink: 0; opacity: .85; }

.dash-error { background: var(--wf-red-soft); color: var(--wf-red); border-radius: 10px; padding: .7em 1em; font-size: .9em; }
.dash-loading { color: var(--wf-muted); }

/* Stats */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1em;
  margin-bottom: 1.4em;
}
.dash-stat {
  text-decoration: none;
  color: inherit;
  transition: transform .15s, box-shadow .15s;
  display: flex;
  align-items: center;
  gap: .9em;
  padding: 1.1em 1.2em;
}
.dash-stat:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(38, 73, 47, .08); }
.dash-stat__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wf-green-soft);
  color: var(--wf-green);
  flex-shrink: 0;
}
.dash-stat[data-tone="amber"] .dash-stat__icon { background: var(--wf-amber-soft); color: var(--wf-amber); }
.dash-stat[data-tone="blue"] .dash-stat__icon { background: var(--wf-blue-soft); color: var(--wf-blue); }
.dash-stat__body { display: flex; flex-direction: column; min-width: 0; }
.dash-stat__num { font-family: var(--wf-serif); font-size: 1.7em; line-height: 1.1; }
.dash-stat__label { font-size: .8em; color: var(--wf-muted); }
.dash-stat__delta {
  display: inline-flex;
  align-items: center;
  gap: .3em;
  font-size: .74em;
  color: var(--wf-green);
  margin-top: .25em;
}

/* Spalten */
.dash-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
  margin-bottom: 1.4em;
}
.dash-card { padding: 1.2em 1.3em; }
.dash-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .8em;
}
.dash-card h2, .dash-quick h2 {
  font-family: var(--wf-serif);
  font-weight: 400;
  font-size: 1.15em;
  margin: 0;
}
.dash-card__all {
  display: inline-flex;
  align-items: center;
  gap: .2em;
  font-size: .8em;
  color: var(--wf-muted);
  text-decoration: none;
}
.dash-card__all:hover { color: var(--wf-green); }
.dash-empty { color: var(--wf-muted); font-size: .88em; }

.dash-list { list-style: none; margin: 0; padding: 0; }
.dash-list li + li { border-top: 1px solid #f4efe6; }
.dash-row {
  display: flex;
  align-items: center;
  gap: .8em;
  padding: .55em .2em;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
}
.dash-row:hover { background: #fbf9f4; }
.dash-row__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dash-row__main strong { font-size: .88em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash-row__main small { color: var(--wf-muted); font-size: .76em; }
.dash-row__amount { font-size: .85em; font-variant-numeric: tabular-nums; color: var(--wf-ink); }
.dash-row__chev { color: #c9c2b2; flex-shrink: 0; }

/* Schnellzugriff */
.dash-quick { padding: 1.2em 1.3em; }
.dash-quick__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8em;
  margin-top: .9em;
}
.dash-quick__btn {
  display: flex;
  align-items: center;
  gap: .6em;
  border: 1px solid var(--wf-line);
  border-radius: 12px;
  padding: .8em 1em;
  font-size: .88em;
  color: var(--wf-ink);
  text-decoration: none;
  transition: border-color .15s, color .15s, background .15s;
}
.dash-quick__btn:hover { border-color: var(--wf-green); color: var(--wf-green); background: #fbfaf6; }
.dash-quick__btn svg:first-child { color: var(--wf-green); }
.dash-quick__chev { margin-left: auto; color: #c9c2b2; }

@media (max-width: 1020px) {
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
  .dash-cols { grid-template-columns: 1fr; }
  .dash-quick__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .dash-hero { flex-direction: column; }
  .dash-hero__text { padding: 1.4em 1.2em .4em; }
  .dash-hero__img { flex-basis: auto; height: 150px; }
  .dash-stats { grid-template-columns: 1fr 1fr; }
  .dash-quick__grid { grid-template-columns: 1fr; }
}
</style>
