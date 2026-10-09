<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.params.id === 'neu')
useHead(() => ({ title: `${isNew.value ? 'Neuer Artikel' : 'Artikel bearbeiten'} - WOHNFEE Dashboard` }))

const PREFIX = '/blogartikel-trends-tipps/'

interface Form {
  title: string
  slug: string
  teaser: string
  bodyHtml: string
  coverImage: string
  coverAlt: string
  metaDescription: string
  status: 'entwurf' | 'veroeffentlicht'
  publishedAt: string // datetime-local (Ortszeit)
}
const empty = (): Form => ({
  title: '', slug: '', teaser: '', bodyHtml: '', coverImage: '', coverAlt: '',
  metaDescription: '', status: 'entwurf', publishedAt: ''
})

const form = reactive<Form>(empty())
const saved = ref('') // JSON-Stand nach dem letzten Speichern/Laden
const loading = ref(!isNew.value)
const saving = ref(false)
const error = ref('')
// Meldung überlebt den Wechsel /neu → /:id (Seite wird dabei neu aufgebaut)
const okMsg = useState('blog-editor-ok', () => '')
const slugTouched = ref(false)
const showPreview = ref(false)
const coverUploading = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)
const authorName = ref('')

const dirty = computed(() => JSON.stringify(form) !== saved.value)
const snapshot = () => { saved.value = JSON.stringify(form) }

// ISO (UTC) ⇄ datetime-local (Ortszeit)
const toLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const toIso = (local: string) => local ? new Date(local).toISOString() : null

// Link-Vorschlag aus dem Titel (gleiche Regeln wie am Server)
const slugify = (s: string) => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' und ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
watch(() => form.title, (t) => { if (!slugTouched.value) form.slug = slugify(t) })

const words = computed(() => form.bodyHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length)
const readMin = computed(() => Math.max(1, Math.round((words.value + form.teaser.split(/\s+/).length) / 200)))
const isScheduled = computed(() => form.status === 'veroeffentlicht' && !!form.publishedAt && new Date(form.publishedAt) > new Date())
const publicUrl = computed(() => `${PREFIX}${form.slug}.html`)
const metaText = computed(() => form.metaDescription || form.teaser)

async function load() {
  if (isNew.value) { snapshot(); return }
  loading.value = true
  try {
    const a = await $fetch<any>(`/api/admin/blog/${route.params.id}`)
    Object.assign(form, {
      title: a.title, slug: a.slug, teaser: a.teaser, bodyHtml: a.bodyHtml, coverImage: a.coverImage,
      coverAlt: a.coverAlt, metaDescription: a.metaDescription, status: a.status, publishedAt: toLocal(a.publishedAt)
    })
    authorName.value = a.authorName
    slugTouched.value = true
    snapshot()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Artikel konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function save(nextStatus?: Form['status']) {
  error.value = ''
  okMsg.value = ''
  if (!form.title.trim()) { error.value = 'Bitte zuerst einen Titel eingeben.'; return }
  if (nextStatus) form.status = nextStatus
  if (form.status === 'veroeffentlicht' && !form.publishedAt) form.publishedAt = toLocal(new Date().toISOString())
  saving.value = true
  try {
    const body = { ...form, section: 'trends-tipps', publishedAt: toIso(form.publishedAt) }
    const a = isNew.value
      ? await $fetch<any>('/api/admin/blog', { method: 'POST', body })
      : await $fetch<any>(`/api/admin/blog/${route.params.id}`, { method: 'PUT', body })
    // Server kann den Link angepasst haben (eindeutig machen)
    form.slug = a.slug
    form.publishedAt = toLocal(a.publishedAt)
    slugTouched.value = true
    snapshot()
    const time = new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
    okMsg.value = form.status === 'veroeffentlicht'
      ? (isScheduled.value ? `Geplant – erscheint am ${new Date(form.publishedAt).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' })}.` : `Veröffentlicht und gespeichert um ${time}.`)
      : `Entwurf gespeichert um ${time}.`
    if (isNew.value) await router.replace(`/admin/artikel/${a.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

async function onCover(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  coverUploading.value = true
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ path: string }>('/api/admin/blog/upload', { method: 'POST', body: fd })
    form.coverImage = res.path
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Titelbild konnte nicht hochgeladen werden.'
  } finally {
    coverUploading.value = false
  }
}

async function remove() {
  if (isNew.value) return
  if (!confirm(`Artikel „${form.title}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return
  try {
    await $fetch(`/api/admin/blog/${route.params.id}`, { method: 'DELETE' })
    snapshot()
    await router.push('/admin/artikel')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen.'
  }
}

// Vorschau im Website-Design (gleiche Komponente wie die öffentliche Artikelseite)
const previewArticle = computed(() => ({
  route: publicUrl.value,
  headline: form.title || 'Titel des Artikels',
  date: String(Math.floor((form.publishedAt ? new Date(form.publishedAt) : new Date()).getTime() / 1000)),
  teaser: form.teaser ? `<p>${form.teaser.replace(/</g, '&lt;')}</p>` : '',
  text: null,
  image: form.coverImage || null,
  imageAlt: form.coverAlt || null,
  elements: form.bodyHtml ? [{ id: 'preview', type: 'text', headline: '', html: form.bodyHtml }] : [],
  section: 'trends-tipps',
  categories: []
}))

// Ungespeicherte Änderungen nicht verlieren
onBeforeRouteLeave(() => {
  if (dirty.value && !confirm('Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen?')) return false
})
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() }
  if (e.key === 'Escape' && showPreview.value) showPreview.value = false
}
onMounted(() => {
  if (!isNew.value && okMsg.value) setTimeout(() => { okMsg.value = '' }, 6000)
  else okMsg.value = ''
  load()
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  window.removeEventListener('keydown', onKey)
})
watch(showPreview, v => { document.body.style.overflow = v ? 'hidden' : '' })
</script>

<template>
  <div class="ed">
    <div class="ed__top">
      <NuxtLink to="/admin/artikel" class="ed__back"><WfIcon name="chevron" :size="14" class="ed__backicon" /> Alle Artikel</NuxtLink>
      <div class="ed__topright">
        <span v-if="dirty" class="ed__dirty">Ungespeicherte Änderungen</span>
        <button type="button" class="wf-btn" :disabled="loading" @click="showPreview = true"><WfIcon name="eye" :size="15" /> Vorschau</button>
      </div>
    </div>

    <p v-if="error" class="ed__error" role="alert">{{ error }}</p>
    <p v-if="okMsg" class="ed__success">
      {{ okMsg }}
      <a v-if="form.status === 'veroeffentlicht' && !isScheduled && !dirty" :href="publicUrl" target="_blank" rel="noopener">Auf der Website ansehen →</a>
    </p>

    <p v-if="loading" class="ed__muted">Artikel wird geladen …</p>

    <div v-else class="ed__grid">
      <!-- ── Inhalt ── -->
      <div class="ed__main">
        <section class="wf-card ed__card">
          <input v-model="form.title" class="ed__title" type="text" maxlength="190" placeholder="Titel des Artikels" aria-label="Titel">
          <label class="ed__field">
            <span>Teaser <em>– kurzer Einstieg, erscheint in der Übersicht und unter dem Titel</em></span>
            <textarea v-model="form.teaser" class="wf-input" rows="3" maxlength="600"
                      placeholder="z. B. Pantone präsentiert auch heuer wieder die „Farbe des Jahres“ …" />
            <small class="ed__count">{{ form.teaser.length }} / 600</small>
          </label>
        </section>

        <section class="ed__editor">
          <AdminRichEditor v-model="form.bodyHtml" placeholder="Hier den Artikel schreiben … Zwischenüberschriften mit H2, Bilder über das Bild-Symbol einfügen." />
          <p class="ed__stats">{{ words }} Wörter · ca. {{ readMin }} Min. Lesezeit · Tipp: <kbd>⌘</kbd>/<kbd>Strg</kbd> + <kbd>S</kbd> speichert</p>
        </section>
      </div>

      <!-- ── Seitenleiste ── -->
      <aside class="ed__side">
        <section class="wf-card ed__card">
          <h2 class="ed__h">Veröffentlichung</h2>
          <p class="ed__state">
            <span v-if="form.status === 'entwurf'" class="wf-pill wf-pill--amber">Entwurf</span>
            <span v-else-if="isScheduled" class="wf-pill wf-pill--blue">Geplant</span>
            <span v-else class="wf-pill wf-pill--green">Veröffentlicht</span>
            <span v-if="authorName" class="ed__muted">von {{ authorName }}</span>
          </p>
          <label class="ed__field">
            <span>Veröffentlichungsdatum <em>– in der Zukunft = geplant</em></span>
            <input v-model="form.publishedAt" type="datetime-local" class="wf-input">
          </label>
          <div class="ed__buttons">
            <template v-if="form.status === 'entwurf'">
              <button type="button" class="wf-btn wf-btn--primary" :disabled="saving" @click="save('veroeffentlicht')">
                <WfIcon name="globe" :size="15" /> {{ form.publishedAt && new Date(form.publishedAt) > new Date() ? 'Einplanen' : 'Veröffentlichen' }}
              </button>
              <button type="button" class="wf-btn" :disabled="saving" @click="save('entwurf')">Entwurf speichern</button>
            </template>
            <template v-else>
              <button type="button" class="wf-btn wf-btn--primary" :disabled="saving" @click="save()">
                <WfIcon name="check" :size="15" /> Änderungen speichern
              </button>
              <button type="button" class="wf-btn" :disabled="saving" @click="save('entwurf')">Zurück auf Entwurf</button>
            </template>
          </div>
          <button v-if="!isNew" type="button" class="ed__delete" @click="remove"><WfIcon name="trash" :size="14" /> Artikel löschen</button>
        </section>

        <section class="wf-card ed__card">
          <h2 class="ed__h">Titelbild</h2>
          <div class="ed__cover" :class="{ 'is-empty': !form.coverImage }">
            <img v-if="form.coverImage" :src="form.coverImage" alt="">
            <button v-else type="button" class="ed__coverpick" :disabled="coverUploading" @click="coverInput?.click()">
              <WfIcon name="camera" :size="22" />
              <span>{{ coverUploading ? 'Wird hochgeladen …' : 'Bild auswählen' }}</span>
              <small>JPEG, PNG oder WebP · max. 10 MB · am besten Querformat</small>
            </button>
          </div>
          <div v-if="form.coverImage" class="ed__coveractions">
            <button type="button" class="wf-btn wf-btn--sm" :disabled="coverUploading" @click="coverInput?.click()">{{ coverUploading ? 'Lädt …' : 'Ersetzen' }}</button>
            <button type="button" class="wf-btn wf-btn--sm wf-btn--danger" @click="form.coverImage = ''">Entfernen</button>
          </div>
          <label v-if="form.coverImage" class="ed__field">
            <span>Bildbeschreibung <em>– für Google &amp; Barrierefreiheit</em></span>
            <input v-model="form.coverAlt" type="text" class="wf-input" maxlength="190" placeholder="z. B. Wohnzimmer in warmem Braunton">
          </label>
          <input ref="coverInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onCover">
        </section>

        <section class="wf-card ed__card">
          <h2 class="ed__h">Link &amp; Google</h2>
          <label class="ed__field">
            <span>Link</span>
            <div class="ed__slug">
              <small>{{ PREFIX }}</small>
              <input v-model="form.slug" type="text" class="wf-input" maxlength="120" @input="slugTouched = true">
              <small>.html</small>
            </div>
            <em v-if="form.status === 'veroeffentlicht'" class="ed__hint">Achtung: Nach dem Veröffentlichen den Link möglichst nicht mehr ändern – bestehende Verweise gehen sonst ins Leere.</em>
          </label>
          <label class="ed__field">
            <span>Beschreibung für Google <em>– optional, sonst wird der Teaser verwendet</em></span>
            <textarea v-model="form.metaDescription" class="wf-input" rows="3" maxlength="300" />
            <small class="ed__count" :class="{ warn: metaText.length > 160 }">{{ metaText.length }} / 160 empfohlen</small>
          </label>
          <div class="ed__serp" aria-label="Google-Vorschau">
            <span class="ed__serpurl">wohnfee.at › blogartikel-trends-tipps › {{ form.slug || '…' }}</span>
            <span class="ed__serptitle">{{ form.title || 'Titel des Artikels' }} - WOHNFEE Home Staging</span>
            <span class="ed__serpdesc">{{ metaText ? (metaText.length > 160 ? metaText.slice(0, 157) + ' …' : metaText) : 'Hier erscheint die Beschreibung …' }}</span>
          </div>
        </section>
      </aside>
    </div>

    <!-- ── Vorschau ── -->
    <Teleport to="body">
      <div v-if="showPreview" class="ed__preview" role="dialog" aria-label="Artikel-Vorschau">
        <div class="ed__previewbar">
          <span><strong>Vorschau</strong> – so erscheint der Artikel auf der Website</span>
          <button type="button" class="wf-btn wf-btn--sm" @click="showPreview = false">Schließen (Esc)</button>
        </div>
        <div class="ed__previewbody">
          <Suspense>
            <HsArticle :article="previewArticle" />
          </Suspense>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ed__top { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.ed__back { display: inline-flex; align-items: center; gap: .3em; color: #55554e; text-decoration: none; font-size: .9em; font-weight: 600; }
.ed__back:hover { color: var(--wf-green); }
.ed__backicon { transform: rotate(180deg); }
.ed__topright { display: flex; align-items: center; gap: .8rem; }
.ed__dirty { font-size: .8em; color: #b07a1c; }

.ed__grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.2rem; align-items: start; }
.ed__main { display: grid; gap: 1.2rem; }
.ed__side { display: grid; gap: 1.2rem; position: sticky; top: 1rem; }
.ed__card { padding: 1.2rem 1.3rem; }
.ed__h { margin: 0 0 .8rem; font-size: 1em; font-weight: 600; color: #2b2b28; text-align: left; font-family: inherit; }

.ed__title {
  width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid #ece7da; padding: .2em 0 .5em; margin-bottom: 1rem;
  font-family: Georgia, 'Times New Roman', serif; font-size: 1.9em; color: #2b2b28; background: none; outline: none;
}
.ed__title:focus { border-bottom-color: var(--wf-green); }
.ed__field { display: block; margin-bottom: .9rem; }
.ed__field:last-child { margin-bottom: 0; }
.ed__field > span { display: block; font-size: .82em; font-weight: 600; color: #55554e; margin-bottom: .35em; }
.ed__field > span em { font-weight: 400; color: #99927f; font-style: normal; }
.ed__count { display: block; text-align: right; font-size: .75em; color: #99927f; margin-top: .25em; }
.ed__count.warn { color: #b07a1c; }
.ed__hint { display: block; font-size: .76em; color: #b07a1c; font-style: normal; margin-top: .4em; line-height: 1.4; }
.ed__stats { margin: .5rem .2rem 0; font-size: .78em; color: #99927f; }
.ed__stats kbd { font-family: inherit; font-size: .9em; padding: .05em .35em; border: 1px solid #e4ddcb; border-radius: 4px; background: #fff; }

.ed__state { display: flex; align-items: center; gap: .6em; margin: 0 0 .9rem; font-size: .9em; }
.ed__buttons { display: grid; gap: .5rem; }
.ed__buttons .wf-btn { justify-content: center; }
.ed__delete {
  display: inline-flex; align-items: center; gap: .4em; margin-top: .9rem; padding: 0; border: 0; background: none;
  color: #a83226; font: inherit; font-size: .82em; cursor: pointer;
}
.ed__delete:hover { text-decoration: underline; }

.ed__cover { border-radius: 10px; overflow: hidden; background: #f4f1ea; aspect-ratio: 16 / 10; margin-bottom: .7rem; }
.ed__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ed__cover.is-empty { border: 2px dashed #d9d2c0; background: #faf8f3; }
.ed__coverpick {
  width: 100%; height: 100%; border: 0; background: none; cursor: pointer; color: #77705f;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35em; font: inherit;
}
.ed__coverpick span { font-weight: 600; color: var(--wf-green); }
.ed__coverpick small { font-size: .75em; color: #99927f; }
.ed__coverpick:hover span { text-decoration: underline; }
.ed__coveractions { display: flex; gap: .5rem; margin-bottom: .9rem; }

.ed__slug { display: flex; align-items: center; gap: .3em; }
.ed__slug small { font-size: .72em; color: #99927f; white-space: nowrap; }
.ed__slug small:first-child { max-width: 46%; overflow: hidden; text-overflow: ellipsis; }
.ed__serp { display: grid; gap: .15em; margin-top: .8rem; padding: .8rem .9rem; border-radius: 10px; background: #faf8f3; border: 1px solid #ece7da; }
.ed__serpurl { font-size: .72em; color: #5f6368; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed__serptitle { font-size: .95em; color: #1a0dab; line-height: 1.3; }
.ed__serpdesc { font-size: .78em; color: #4d5156; line-height: 1.45; }

.ed__error { margin: 0 0 1rem; padding: .6em .9em; background: #fdecea; border-radius: 8px; color: #a83226; font-size: .88em; }
.ed__success { margin: 0 0 1rem; padding: .6em .9em; background: #e8f2e6; border-radius: 8px; color: #26492f; font-size: .88em; }
.ed__success a { color: #26492f; font-weight: 600; margin-left: .5em; }
.ed__muted { color: #99927f; font-size: .85em; }

.ed__preview { position: fixed; inset: 0; z-index: 1000; background: #f8f5ef; display: flex; flex-direction: column; }
.ed__previewbar {
  display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .7rem 1.2rem;
  background: #26492f; color: #fff; font-size: .9em;
}
.ed__previewbody { flex: 1; overflow-y: auto; font-family: 'Open Sans', system-ui, sans-serif; }

@media (max-width: 1100px) {
  .ed__grid { grid-template-columns: minmax(0, 1fr); }
  .ed__side { position: static; }
}
</style>
