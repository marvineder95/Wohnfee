<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Beiträge - WOHNFEE Dashboard' })

// Rubriken der Website (Blog-Menü): Aktuell, Projekte, Trends & Tipps, Events
const SECTIONS = [
  { value: 'aktuelles', label: 'Aktuell' },
  { value: 'projekte', label: 'Projekte' },
  { value: 'trends-tipps', label: 'Trends & Tipps' },
  { value: 'events', label: 'Events' }
] as const
const sectionLabel = (s: string) => SECTIONS.find(x => x.value === s)?.label || s

interface Article {
  id: number
  section: string
  title: string
  teaser: string
  coverImage: string
  status: 'entwurf' | 'veroeffentlicht'
  publishedAt: string | null
  authorName: string
  updatedAt: string
  route: string
}

const items = ref<Article[]>([])
const loading = ref(true)
const error = ref('')
const msg = ref('')
const filter = ref<'alle' | 'veroeffentlicht' | 'entwurf'>('alle')
const search = ref('')
const route = useRoute()
const section = ref<string>(SECTIONS.some(s => s.value === route.query.rubrik) ? String(route.query.rubrik) : 'alle')
watch(section, (s) => useRouter().replace({ query: s === 'alle' ? {} : { rubrik: s } }))

// statische Bestandsartikel (aus der alten Website, nicht im Dashboard bearbeitbar)
const legacyCount = computed(() => section.value === 'alle'
  ? SECTIONS.reduce((n, s) => n + blogItems(s.value).length, 0)
  : blogItems(section.value).length)
const sectionCount = (s: string) => items.value.filter(a => s === 'alle' || a.section === s).length
const newLink = computed(() => `/admin/artikel/neu${section.value !== 'alle' ? `?rubrik=${section.value}` : ''}`)

const isScheduled = (a: Article) => a.status === 'veroeffentlicht' && !!a.publishedAt && new Date(a.publishedAt) > new Date()

const inSection = computed(() => items.value.filter(a => section.value === 'alle' || a.section === section.value))
const counts = computed(() => ({
  alle: inSection.value.length,
  veroeffentlicht: inSection.value.filter(a => a.status === 'veroeffentlicht').length,
  entwurf: inSection.value.filter(a => a.status === 'entwurf').length
}))

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return inSection.value
    .filter(a => filter.value === 'alle' || a.status === filter.value)
    .filter(a => !q || a.title.toLowerCase().includes(q) || a.teaser.toLowerCase().includes(q))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ items: Article[] }>('/api/admin/blog')
    items.value = res.items
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Artikel konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function remove(a: Article) {
  if (!confirm(`Artikel „${a.title}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return
  msg.value = ''
  try {
    await $fetch(`/api/admin/blog/${a.id}`, { method: 'DELETE' })
    msg.value = `„${a.title}“ wurde gelöscht.`
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

const fmt = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '–'

onMounted(load)
</script>

<template>
  <div class="bl-admin">
    <section class="wf-hero">
      <div class="wf-hero-text">
        <p class="wf-eyebrow">Website</p>
        <h1 class="wf-title">Beiträge</h1>
        <p class="wf-subtitle">Aktuelles, Projekte, Trends &amp; Tipps und Events schreiben, mit Bildern gestalten und direkt auf der Website veröffentlichen.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/files/wohnfee/bilder/blog/Wohn.Fee Brandingfotos_23-18 Kopie.jpg" alt="">
        <NuxtLink :to="newLink" class="wf-btn wf-btn--primary wf-hero-cta">
          <WfIcon name="plus" :size="15" /> Neuer Beitrag
        </NuxtLink>
      </div>
    </section>

    <p v-if="error" class="bl-admin__error" role="alert">{{ error }}</p>
    <p v-if="msg" class="bl-admin__success">{{ msg }}</p>

    <nav class="bl-admin__sections" aria-label="Rubriken">
      <button v-for="s in [{ value: 'alle', label: 'Alle Rubriken' }, ...SECTIONS]" :key="s.value" type="button"
              :class="{ 'is-active': section === s.value }" @click="section = s.value">
        {{ s.label }} <span>{{ sectionCount(s.value) }}</span>
      </button>
    </nav>

    <section class="wf-card bl-admin__card">
      <div class="bl-admin__toolbar">
        <div class="bl-admin__tabs" role="tablist">
          <button v-for="t in (['alle', 'veroeffentlicht', 'entwurf'] as const)" :key="t" type="button"
                  :class="{ 'is-active': filter === t }" @click="filter = t">
            {{ t === 'alle' ? 'Alle' : t === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwürfe' }}
            <span>{{ counts[t] }}</span>
          </button>
        </div>
        <input v-model="search" type="search" class="wf-input bl-admin__search" placeholder="Artikel suchen …">
      </div>

      <p v-if="loading" class="bl-admin__muted">Artikel werden geladen …</p>

      <div v-else-if="!inSection.length" class="bl-admin__empty">
        <WfIcon name="edit" :size="28" />
        <h2>Noch keine Beiträge im Dashboard</h2>
        <p>Schreib den ersten Beitrag – nach dem Veröffentlichen erscheint er sofort in der gewählten Rubrik auf der Website.</p>
        <NuxtLink :to="newLink" class="wf-btn wf-btn--primary"><WfIcon name="plus" :size="15" /> Ersten Beitrag schreiben</NuxtLink>
      </div>

      <p v-else-if="!visible.length" class="bl-admin__muted">Keine Artikel für diese Auswahl.</p>

      <ul v-else class="bl-admin__list">
        <li v-for="a in visible" :key="a.id" class="bl-admin__row">
          <NuxtLink :to="`/admin/artikel/${a.id}`" class="bl-admin__thumb">
            <img v-if="a.coverImage" :src="a.coverImage" alt="">
            <WfIcon v-else name="camera" :size="20" />
          </NuxtLink>
          <div class="bl-admin__info">
            <NuxtLink :to="`/admin/artikel/${a.id}`" class="bl-admin__title">{{ a.title }}</NuxtLink>
            <p v-if="a.teaser" class="bl-admin__teaser">{{ a.teaser }}</p>
            <p class="bl-admin__meta">
              <span class="bl-admin__sec">{{ sectionLabel(a.section) }}</span>
              <span v-if="isScheduled(a)" class="wf-pill wf-pill--blue">Geplant · {{ fmt(a.publishedAt) }}</span>
              <span v-else-if="a.status === 'veroeffentlicht'" class="wf-pill wf-pill--green">Veröffentlicht · {{ fmt(a.publishedAt) }}</span>
              <span v-else class="wf-pill wf-pill--amber">Entwurf</span>
              <span>{{ a.authorName || '–' }} · zuletzt bearbeitet {{ fmt(a.updatedAt) }}</span>
            </p>
          </div>
          <div class="bl-admin__actions">
            <a v-if="a.status === 'veroeffentlicht' && !isScheduled(a)" :href="a.route" target="_blank" rel="noopener"
               class="wf-iconbtn" title="Auf der Website ansehen"><WfIcon name="eye" :size="15" /></a>
            <NuxtLink :to="`/admin/artikel/${a.id}`" class="wf-iconbtn" title="Bearbeiten"><WfIcon name="edit" :size="15" /></NuxtLink>
            <button type="button" class="wf-iconbtn wf-iconbtn--danger" title="Löschen" @click="remove(a)"><WfIcon name="trash" :size="15" /></button>
          </div>
        </li>
      </ul>

      <p class="bl-admin__legacy">
        <WfIcon name="leaf" :size="14" />
        Zusätzlich sind {{ legacyCount }} ältere Beiträge{{ section !== 'alle' ? ` in „${sectionLabel(section)}“` : '' }} aus der bisherigen Website online. Diese bleiben unverändert und werden hier nicht bearbeitet.
      </p>
    </section>
  </div>
</template>

<style scoped>
.bl-admin__card { padding: 1.2rem 1.3rem; }
.bl-admin__sections { display: flex; gap: .4rem; flex-wrap: wrap; margin: 0 0 1rem; }
.bl-admin__sections button {
  display: inline-flex; align-items: center; gap: .5em; padding: .55em 1.05em; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--wf-line); background: var(--wf-card); color: var(--wf-ink); font: inherit; font-size: .9em; font-weight: 600;
}
.bl-admin__sections button span { font-size: .8em; color: #99927f; font-weight: 500; }
.bl-admin__sections button.is-active { background: var(--wf-green-soft); border-color: #c9d8cc; color: var(--wf-green); }
.bl-admin__sec { font-size: .9em; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--wf-green); }
.bl-admin__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.bl-admin__tabs { display: flex; gap: .35rem; flex-wrap: wrap; }
.bl-admin__tabs button {
  display: inline-flex; align-items: center; gap: .45em; padding: .45em .9em; border-radius: 999px; cursor: pointer;
  border: 1px solid #e4ddcb; background: #fff; color: #55554e; font: inherit; font-size: .85em; font-weight: 600;
}
.bl-admin__tabs button span { font-size: .85em; color: #99927f; font-weight: 500; }
.bl-admin__tabs button.is-active { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.bl-admin__tabs button.is-active span { color: rgba(255, 255, 255, .8); }
.bl-admin__search { max-width: 260px; }

.bl-admin__list { list-style: none; margin: 0; padding: 0; display: block; width: 100%; }
.bl-admin__row {
  display: grid; grid-template-columns: 96px minmax(0, 1fr) auto; gap: 1rem; align-items: center;
  padding: .85rem 0; border-top: 1px solid #f1ece2;
}
.bl-admin__thumb {
  width: 96px; height: 68px; border-radius: 10px; overflow: hidden; background: #f4f1ea; color: #b3ad9f;
  display: flex; align-items: center; justify-content: center;
}
.bl-admin__thumb img { width: 100%; height: 100%; object-fit: cover; }
.bl-admin__title { font-weight: 600; color: #2b2b28; text-decoration: none; font-size: 1em; }
.bl-admin__title:hover { color: var(--wf-green); }
.bl-admin__teaser {
  margin: .2em 0 .4em; font-size: .85em; color: #8a857a; line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.bl-admin__meta { margin: 0; display: flex; align-items: center; gap: .7em; flex-wrap: wrap; font-size: .8em; color: #99927f; }
.bl-admin__actions { display: flex; gap: .35rem; }
.wf-iconbtn {
  display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;
  border: 1px solid #e4ddcb; border-radius: 8px; background: #fff; color: #8a857a; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.wf-iconbtn:hover { color: var(--wf-green); border-color: var(--wf-green); }
.wf-iconbtn--danger:hover { color: #a83226; border-color: #e5b6b0; }

.bl-admin__empty { text-align: center; padding: 2.5rem 1rem; color: #8a857a; }
.bl-admin__empty h2 { margin: .6rem 0 .3rem; font-size: 1.1em; color: #2b2b28; }
.bl-admin__empty p { margin: 0 0 1.1rem; font-size: .9em; }
.bl-admin__muted { color: #99927f; font-size: .9em; padding: .5rem 0; }
.bl-admin__legacy {
  display: flex; align-items: center; gap: .5em; margin: 1rem 0 0; padding-top: .9rem; border-top: 1px solid #f1ece2;
  font-size: .8em; color: #99927f;
}
.bl-admin__error { margin: 0 0 1rem; padding: .6em .9em; background: #fdecea; border-radius: 8px; color: #a83226; font-size: .88em; }
.bl-admin__success { margin: 0 0 1rem; padding: .6em .9em; background: #e8f2e6; border-radius: 8px; color: #26492f; font-size: .88em; }

@media (max-width: 640px) {
  .bl-admin__row { grid-template-columns: 64px minmax(0, 1fr); }
  .bl-admin__thumb { width: 64px; height: 48px; }
  .bl-admin__actions { grid-column: 2; }
  .bl-admin__search { max-width: none; }
}
</style>
