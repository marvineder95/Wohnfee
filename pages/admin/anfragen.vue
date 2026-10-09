<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({ title: 'Anfragen - WOHNFEE Dashboard' })

interface Inquiry {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string | null
  status: 'neu' | 'gelesen' | 'archiviert'
  messagePreview: string
  createdAt: string
}

const inquiries = ref<Inquiry[]>([])
const counts = ref<Record<string, number>>({ neu: 0, gelesen: 0, archiviert: 0 })
const filter = ref<'alle' | 'neu' | 'gelesen' | 'archiviert'>('alle')
const loading = ref(true)
const error = ref('')
const detail = ref<{ id: number; message: string; createdAt: string } | null>(null)
const detailLoading = ref(false)
const expandedId = ref<number | null>(null)
const actionError = ref('')

const tabs = [
  { value: 'alle', label: 'Alle' },
  { value: 'neu', label: 'Neu' },
  { value: 'gelesen', label: 'Gelesen' },
  { value: 'archiviert', label: 'Archiviert' }
] as const

async function load() {
  loading.value = true
  error.value = ''
  try {
    const q = filter.value === 'alle' ? '' : `?status=${filter.value}`
    const res = await $fetch<{ inquiries: Inquiry[]; counts: Record<string, number> }>(`/api/admin/inquiries${q}`)
    inquiries.value = res.inquiries
    counts.value = res.counts
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Anfragen konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

watch(filter, load)

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

async function toggleDetail(item: Inquiry) {
  actionError.value = ''
  if (expandedId.value === item.id) {
    expandedId.value = null
    detail.value = null
    return
  }
  expandedId.value = item.id
  detailLoading.value = true
  detail.value = null
  // Beim ersten Öffnen automatisch als gelesen markieren
  if (item.status === 'neu') {
    await setStatus(item, 'gelesen', false)
  }
  try {
    const res = await $fetch<{ inquiry: any }>(`/api/admin/inquiries/${item.id}`)
    detail.value = { id: res.inquiry.id, message: res.inquiry.message, createdAt: res.inquiry.createdAt }
  } catch (e: any) {
    detail.value = null
    expandedId.value = null
    actionError.value = e?.data?.statusMessage || 'Details konnten nicht geladen werden.'
  } finally {
    detailLoading.value = false
  }
}

async function setStatus(item: Inquiry, status: string, reload = true) {
  actionError.value = ''
  try {
    await $fetch(`/api/admin/inquiries/${item.id}/status`, { method: 'PUT', body: { status } })
    item.status = status as any
    if (reload) await load()
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || 'Status konnte nicht geändert werden.'
  }
}

async function remove(item: Inquiry) {
  actionError.value = ''
  if (!confirm(`Anfrage #${item.id} von ${item.name} endgültig löschen?`)) return
  try {
    await $fetch(`/api/admin/inquiries/${item.id}`, { method: 'DELETE' })
    if (expandedId.value === item.id) { expandedId.value = null; detail.value = null }
    await load()
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

onMounted(load)
</script>

<template>
  <div class="inquiries">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Posteingang</p>
        <h1 class="wf-title">Kontaktanfragen</h1>
        <p class="wf-subtitle">Anfragen von der Webseite — aufklappen, bearbeiten, archivieren.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/img/admin-hero-anfragen.jpg" alt="Homeoffice-Schreibtisch mit Laptop, Kaffee und Eukalyptus">
      </div>
    </section>

    <div class="inquiries__tabs" role="tablist">
      <button v-for="t in tabs" :key="t.value" class="inquiries__tab"
              :class="{ 'is-active': filter === t.value }" role="tab"
              :aria-selected="filter === t.value" @click="filter = t.value">
        {{ t.label }}
        <span v-if="t.value !== 'alle' && counts[t.value]" class="inquiries__tabcount">
          {{ counts[t.value] }}
        </span>
        <span v-else-if="t.value === 'alle' && (counts.neu || counts.gelesen || counts.archiviert)"
              class="inquiries__tabcount inquiries__tabcount--all">
          {{ counts.neu + counts.gelesen + counts.archiviert }}
        </span>
      </button>
    </div>

    <p v-if="error" class="inquiries__error" role="alert">{{ error }}</p>
    <p v-if="actionError" class="inquiries__error" role="alert">{{ actionError }}</p>

    <p v-if="loading" class="inquiries__loading">Anfragen werden geladen …</p>

    <div v-else-if="!inquiries.length" class="inquiries__empty">
      <template v-if="filter === 'alle'">Noch keine Kontaktanfragen vorhanden.</template>
      <template v-else>Keine Anfragen mit dem Status „{{ tabs.find(t => t.value === filter)?.label }}“.</template>
    </div>

    <ul v-else class="inquiries__list">
      <li v-for="item in inquiries" :key="item.id" class="inquiries__item"
          :class="{ 'is-expanded': expandedId === item.id }">
        <button class="inquiries__row" @click="toggleDetail(item)">
          <span class="wf-pill" :class="item.status === 'neu' ? '' : item.status === 'gelesen' ? 'wf-pill--amber' : 'wf-pill--gray'">{{ item.status }}</span>
          <span class="inquiries__main">
            <strong>{{ item.name }}</strong>
            <span class="inquiries__subject">{{ item.subject || 'Allgemeine Anfrage' }}</span>
            <span class="inquiries__preview">{{ item.messagePreview }}</span>
          </span>
          <span class="inquiries__meta">
            <span class="inquiries__date">{{ formatDate(item.createdAt) }}</span>
            <WfIcon name="chevron" :size="15" class="inquiries__chevron" />
          </span>
        </button>

        <div v-if="expandedId === item.id" class="inquiries__detail">
          <p v-if="detailLoading" class="inquiries__loading">Details werden geladen …</p>
          <template v-else-if="detail">
            <dl class="inquiries__facts">
              <div><dt>E-Mail</dt><dd><a :href="`mailto:${item.email}`">{{ item.email }}</a></dd></div>
              <div v-if="item.phone"><dt>Telefon</dt><dd><a :href="`tel:${item.phone}`">{{ item.phone }}</a></dd></div>
              <div><dt>Eingegangen</dt><dd>{{ formatDate(detail.createdAt) }}</dd></div>
            </dl>
            <p class="inquiries__message">{{ detail.message }}</p>
          </template>

          <div class="inquiries__actions">
            <button v-if="item.status !== 'gelesen'" class="wf-btn wf-btn--sm"
                    @click="setStatus(item, 'gelesen')">Als gelesen markieren</button>
            <button v-if="item.status !== 'archiviert'" class="wf-btn wf-btn--sm"
                    @click="setStatus(item, 'archiviert')">Archivieren</button>
            <button v-if="item.status === 'archiviert'" class="wf-btn wf-btn--sm"
                    @click="setStatus(item, 'neu')">Wiederherstellen</button>
            <button class="wf-btn wf-btn--sm wf-btn--danger" @click="remove(item)">Löschen</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.inquiries__tabs {
  display: flex;
  gap: .5em;
  margin-bottom: 1.4em;
  flex-wrap: wrap;
}

.inquiries__tab {
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

.inquiries__tab:hover { border-color: var(--wf-green); color: var(--wf-green); }

.inquiries__tab.is-active {
  background: var(--wf-green-soft);
  border-color: var(--wf-green-soft);
  color: var(--wf-green);
  font-weight: 600;
}

.inquiries__tabcount {
  background: #fff;
  color: var(--wf-muted);
  border-radius: 999px;
  font-size: .78em;
  padding: .05em .55em;
}

.inquiries__tab.is-active .inquiries__tabcount { background: var(--wf-green); color: #fff; }

.inquiries__loading,
.inquiries__empty {
  color: var(--wf-muted);
  padding: 2em 0;
  text-align: center;
}

.inquiries__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: .6em;
}

.inquiries__item {
  background: var(--wf-card);
  border-radius: var(--wf-radius);
  box-shadow: var(--wf-shadow);
  border: 1px solid rgba(74, 62, 40, .04);
  overflow: hidden;
}

.inquiries__item.is-expanded {
  outline: 2px solid rgba(47, 93, 64, .25);
}

.inquiries__row {
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

.inquiries__row:hover { background: #fbf9f4; }

.inquiries__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: .1em;
}

.inquiries__subject {
  font-size: .85em;
  color: var(--wf-green);
}

.inquiries__preview {
  font-size: .82em;
  color: var(--wf-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inquiries__meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: .6em;
}

.inquiries__date {
  font-size: .8em;
  color: var(--wf-muted);
}

.inquiries__chevron { color: #c9c2b2; }

.inquiries__detail {
  border-top: 1px solid #f4efe6;
  padding: 1.1em 1.2em 1.2em;
}

.inquiries__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 1.4em;
  margin: 0 0 1em;
}

.inquiries__facts dt {
  font-size: .72em;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--wf-muted);
  font-weight: 600;
}

.inquiries__facts dd {
  margin: .15em 0 0;
  font-size: .92em;
}

.inquiries__facts a { color: var(--wf-green); }

.inquiries__message {
  white-space: pre-wrap;
  background: #fbf9f4;
  border-radius: 12px;
  padding: 1em 1.1em;
  font-size: .93em;
  line-height: 1.55;
  margin: 0 0 1.2em;
}

.inquiries__actions {
  display: flex;
  gap: .6em;
  flex-wrap: wrap;
}

.inquiries__error {
  background: var(--wf-red-soft);
  color: var(--wf-red);
  border-radius: 10px;
  padding: .6em .9em;
  font-size: .88em;
  margin: 0 0 1em;
}

@media (max-width: 600px) {
  .inquiries__row { flex-wrap: wrap; }
  .inquiries__meta { width: 100%; justify-content: space-between; }
}
</style>
