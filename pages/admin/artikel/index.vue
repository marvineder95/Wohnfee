<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Blog-Artikel - WOHNFEE Dashboard' })

interface Article {
  id: number
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

// statische Bestandsartikel (aus der alten Website, nicht im Dashboard bearbeitbar)
const legacyCount = blogItems('trends-tipps').length

const isScheduled = (a: Article) => a.status === 'veroeffentlicht' && !!a.publishedAt && new Date(a.publishedAt) > new Date()

const counts = computed(() => ({
  alle: items.value.length,
  veroeffentlicht: items.value.filter(a => a.status === 'veroeffentlicht').length,
  entwurf: items.value.filter(a => a.status === 'entwurf').length
}))

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value
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
        <h1 class="wf-title">Blog-Artikel</h1>
        <p class="wf-subtitle">Neue Beiträge für „Trends &amp; Tipps“ schreiben, mit Bildern gestalten und direkt auf der Website veröffentlichen.</p>
      </div>
      <div class="wf-hero-img">
        <img src="/files/wohnfee/bilder/blog/Wohn.Fee Brandingfotos_23-18 Kopie.jpg" alt="">
        <NuxtLink to="/admin/artikel/neu" class="wf-btn wf-btn--primary wf-hero-cta">
          <WfIcon name="plus" :size="15" /> Neuer Artikel
        </NuxtLink>
      </div>
    </section>

    <p v-if="error" class="bl-admin__error" role="alert">{{ error }}</p>
    <p v-if="msg" class="bl-admin__success">{{ msg }}</p>

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

      <div v-else-if="!items.length" class="bl-admin__empty">
        <WfIcon name="edit" :size="28" />
        <h2>Noch keine Artikel im Dashboard</h2>
        <p>Schreiben Sie den ersten Beitrag – er erscheint nach dem Veröffentlichen sofort unter „Trends &amp; Tipps“.</p>
        <NuxtLink to="/admin/artikel/neu" class="wf-btn wf-btn--primary"><WfIcon name="plus" :size="15" /> Ersten Artikel schreiben</NuxtLink>
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
        Zusätzlich sind {{ legacyCount }} ältere Beiträge aus der bisherigen Website online. Diese bleiben unverändert und werden hier nicht bearbeitet.
      </p>
    </section>
  </div>
</template>

<style scoped>
.bl-admin__card { padding: 1.2rem 1.3rem; }
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
