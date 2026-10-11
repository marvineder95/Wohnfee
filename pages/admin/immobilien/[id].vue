<script setup lang="ts">
import { PROPERTY_CATEGORIES, PROPERTY_FEATURES, PROPERTY_STATUS, publishWarnings } from '~~/shared/properties'
definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const perms = usePermissions()
const isNew = computed(() => route.params.id === 'neu')
const canEdit = computed(() => perms.canEdit('immobilien'))
useHead({ title: () => `${isNew.value ? 'Neue Immobilie' : 'Immobilie bearbeiten'} - WOHNFEE Dashboard` })

const empty = () => ({
  title: '', slug: '', refNo: '', status: 'entwurf', offerType: 'miete', category: 'wohnung', teaser: '', description: '',
  street: '', showStreet: false, zip: '', city: '', district: '', rooms: '', livingArea: '', usableArea: '', floor: '', yearBuilt: '',
  price: '', operatingCosts: '', deposit: '', commission: 'Provisionsfrei für Mieter', availableFrom: 'sofort', minRentMonths: '',
  hwb: '', hwbClass: '', fgee: '', fgeeClass: '', features: [] as string[], images: [] as Array<{ src: string; alt: string }>,
  furnishedByWohnfee: false, partnerName: '', contactName: '', contactPhone: '', contactEmail: '', willhabenUrl: ''
})
const form = reactive(empty())
const meta = ref<any>(null) // gespeicherter Stand (Route, willhaben-Status, Anfragen)
const loading = ref(!isNew.value)
const saving = ref(false)
const error = ref('')
const ok = ref('')
const saved = ref('')
const dirty = computed(() => JSON.stringify(form) !== saved.value)

// Beschreibung: Klartext im Editor (Leerzeile = neuer Absatz) ↔ HTML in der Datenbank
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toHtml = (t: string) => t.trim() ? t.trim().split(/\n\s*\n/).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('') : ''
const toText = (h: string) => String(h || '').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|h2|h3|li)>/g, '\n\n').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim()
const str = (v: any) => (v === null || v === undefined ? '' : String(v))

function apply(p: any) {
  Object.assign(form, {
    ...empty(), ...Object.fromEntries(Object.keys(empty()).filter(k => k in p).map(k => [k, p[k] ?? (empty() as any)[k]])),
    description: toText(p.descriptionHtml),
    rooms: str(p.rooms), livingArea: str(p.livingArea), usableArea: str(p.usableArea), yearBuilt: str(p.yearBuilt), price: str(p.price),
    operatingCosts: str(p.operatingCosts), minRentMonths: str(p.minRentMonths), hwb: str(p.hwb), fgee: str(p.fgee),
    hwbClass: p.hwbClass || '', fgeeClass: p.fgeeClass || '', refNo: p.refNo || '', features: [...(p.features || [])], images: [...(p.images || [])]
  })
  meta.value = p
  saved.value = JSON.stringify(form)
}

onMounted(async () => {
  if (isNew.value) { saved.value = JSON.stringify(form); return }
  try { apply(await $fetch(`/api/admin/properties/${route.params.id}`)) } catch (e: any) { error.value = e?.data?.statusMessage || 'Nicht gefunden.' } finally { loading.value = false }
})

async function save() {
  saving.value = true; error.value = ''; ok.value = ''
  try {
    const body = { ...form, descriptionHtml: toHtml(form.description) }
    const res: any = isNew.value
      ? await $fetch('/api/admin/properties', { method: 'POST', body })
      : await $fetch(`/api/admin/properties/${route.params.id}`, { method: 'PUT', body })
    const inquiries = meta.value?.inquiries || []
    apply({ ...res, inquiries })
    ok.value = 'Gespeichert.'
    if (isNew.value) await router.replace(`/admin/immobilien/${res.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen.'
  } finally { saving.value = false }
}

async function remove() {
  if (!confirm(`„${form.title}" wirklich löschen? Anfragen dazu bleiben erhalten.`)) return
  await $fetch(`/api/admin/properties/${route.params.id}`, { method: 'DELETE' })
  saved.value = JSON.stringify(form)
  router.push('/admin/immobilien')
}

// Fotos (erstes = Titelbild)
const uploading = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  ;(e.target as HTMLInputElement).value = ''
  for (const file of files.slice(0, 40 - form.images.length)) {
    uploading.value++
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await $fetch<{ path: string }>('/api/admin/properties/upload', { method: 'POST', body: fd })
      form.images.push({ src: r.path, alt: '' })
    } catch (err: any) { error.value = err?.data?.statusMessage || `„${file.name}" konnte nicht hochgeladen werden.` } finally { uploading.value-- }
  }
}
function move(i: number, d: -1 | 1) { const j = i + d; if (j < 0 || j >= form.images.length) return; const [g] = form.images.splice(i, 1); form.images.splice(j, 0, g) }
function toggleFeature(k: string) { form.features = form.features.includes(k) ? form.features.filter(f => f !== k) : [...form.features, k] }

// willhaben
const warnings = computed(() => publishWarnings({ ...form, images: form.images }))
const whBusy = ref(false)
const whMsg = ref('')
const WH_LABEL: Record<string, string> = { exportiert: 'OpenImmo-Datei erstellt – noch manuell bei willhaben hochladen', im_feed: 'Im willhaben-Feed – willhaben übernimmt das Inserat automatisch', online: 'Online auf willhaben', offline: 'Auf willhaben offline' }
async function willhaben(action: 'publish' | 'online' | 'offline', force = false) {
  if (dirty.value) { whMsg.value = 'Bitte zuerst speichern.'; return }
  whBusy.value = true; whMsg.value = ''
  try {
    const url = action === 'online' ? (prompt('Link zum willhaben-Inserat (optional):', form.willhabenUrl || 'https://www.willhaben.at/') || '') : undefined
    const r: any = await $fetch(`/api/admin/properties/${route.params.id}/willhaben`, { method: 'POST', body: { action, force, url } })
    if (r.warnings) {
      if (confirm(`Vor dem Veröffentlichen fehlt noch:\n\n• ${r.warnings.join('\n• ')}\n\nTrotzdem veröffentlichen?`)) return willhaben('publish', true)
      return
    }
    apply({ ...r.property, inquiries: meta.value?.inquiries || [] })
    if (action === 'publish' && !r.feed) window.location.href = `/api/admin/properties/${route.params.id}/openimmo`
    whMsg.value = action === 'publish' ? (r.feed ? 'Im Feed – willhaben holt das Inserat beim nächsten Abgleich.' : 'OpenImmo-Datei wird heruntergeladen – im willhaben-Business-Konto hochladen.') : 'Status aktualisiert.'
  } catch (e: any) { whMsg.value = e?.data?.statusMessage || 'Fehlgeschlagen.' } finally { whBusy.value = false }
}

onBeforeRouteLeave(() => { if (dirty.value && !confirm('Ungespeicherte Änderungen verwerfen?')) return false })
const fmtDT = (v: string) => v ? new Date(v).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
</script>

<template>
  <div class="ime">
    <div class="ime__top">
      <NuxtLink to="/admin/immobilien" class="ime__back">‹ Alle Immobilien</NuxtLink>
      <div class="ime__acts">
        <a v-if="meta?.route && meta.status !== 'entwurf'" :href="meta.route" target="_blank" class="wf-btn wf-btn--sm"><WfIcon name="eye" :size="14" /> Auf der Website</a>
        <button v-if="!isNew && canEdit" class="wf-btn wf-btn--sm wf-btn--danger" @click="remove"><WfIcon name="trash" :size="14" /></button>
        <button v-if="canEdit" class="wf-btn wf-btn--primary" :disabled="saving || !form.title" @click="save">{{ saving ? 'Speichert …' : dirty ? 'Speichern' : 'Gespeichert' }}</button>
      </div>
    </div>
    <p v-if="error" class="ime__error">{{ error }}</p>
    <p v-if="ok && !dirty" class="ime__ok">{{ ok }}</p>
    <p v-if="loading" class="ime__muted">Wird geladen …</p>

    <fieldset v-else :disabled="!canEdit" class="ime__grid">
      <div class="ime__main">
        <section class="wf-card ime__card">
          <h2 class="ime__h">Grunddaten</h2>
          <label class="ime__f"><span>Titel *</span><input v-model="form.title" class="wf-input" maxlength="190" placeholder="z. B. Helle 3-Zimmer-Altbauwohnung mit Balkon"></label>
          <label class="ime__f"><span>Kurzbeschreibung <em>(Vorschau in der Liste, max. 400 Zeichen)</em></span><textarea v-model="form.teaser" class="wf-input" rows="2" maxlength="400" /></label>
          <div class="ime__row">
            <label class="ime__f"><span>Angebot</span><select v-model="form.offerType" class="wf-input"><option value="miete">Miete</option><option value="kauf">Kauf</option></select></label>
            <label class="ime__f"><span>Art</span><select v-model="form.category" class="wf-input"><option v-for="c in PROPERTY_CATEGORIES" :key="c.value" :value="c.value">{{ c.de }}</option></select></label>
            <label class="ime__f"><span>Objektnummer</span><input v-model="form.refNo" class="wf-input" maxlength="32" placeholder="z. B. WF-2026-01"></label>
          </div>
          <label class="ime__f"><span>Beschreibung <em>(Leerzeile = neuer Absatz)</em></span><textarea v-model="form.description" class="wf-input" rows="9" placeholder="Lage, Raumaufteilung, Ausstattung, Besonderheiten …" /></label>
        </section>

        <section class="wf-card ime__card">
          <h2 class="ime__h">Fotos <em class="ime__hs">{{ form.images.length }}/40 · erstes Foto = Titelbild</em></h2>
          <ul v-if="form.images.length" class="ime__imgs">
            <li v-for="(img, i) in form.images" :key="img.src" :class="{ 'is-cover': i === 0 }">
              <img :src="img.src" alt="">
              <span v-if="i === 0" class="ime__cover">Titelbild</span>
              <input v-model="img.alt" class="ime__alt" placeholder="Bildbeschreibung" maxlength="190">
              <span class="ime__imgacts">
                <button type="button" :disabled="i === 0" title="Nach vorne" @click="move(i, -1)">‹</button>
                <button type="button" :disabled="i === form.images.length - 1" title="Nach hinten" @click="move(i, 1)">›</button>
                <button type="button" title="Entfernen" @click="form.images.splice(i, 1)">×</button>
              </span>
            </li>
          </ul>
          <button type="button" class="wf-btn wf-btn--sm" :disabled="uploading > 0" @click="fileInput?.click()"><WfIcon name="camera" :size="14" /> {{ uploading ? `Lädt hoch … (${uploading})` : 'Fotos hinzufügen' }}</button>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="onFiles">
          <label class="ime__check"><input v-model="form.furnishedByWohnfee" type="checkbox"> Von WOHNFEE eingerichtet (Home Staging) – zeigt auf der Website einen Hinweis mit Link zum Furniture Leasing</label>
        </section>

        <section class="wf-card ime__card">
          <h2 class="ime__h">Lage</h2>
          <div class="ime__row">
            <label class="ime__f ime__f--wide"><span>Straße + Nr.</span><input v-model="form.street" class="wf-input"></label>
            <label class="ime__f"><span>PLZ</span><input v-model="form.zip" class="wf-input" maxlength="16"></label>
            <label class="ime__f"><span>Ort</span><input v-model="form.city" class="wf-input"></label>
          </div>
          <div class="ime__row">
            <label class="ime__f"><span>Bezirk / Lage</span><input v-model="form.district" class="wf-input" placeholder="z. B. 1070 Neubau, nahe U3"></label>
            <label class="ime__check ime__check--inline"><input v-model="form.showStreet" type="checkbox"> Straße öffentlich anzeigen</label>
          </div>
        </section>

        <section class="wf-card ime__card">
          <h2 class="ime__h">Flächen &amp; Preis</h2>
          <div class="ime__row">
            <label class="ime__f"><span>Wohnfläche m²</span><input v-model="form.livingArea" class="wf-input" inputmode="decimal"></label>
            <label class="ime__f"><span>Nutzfläche m²</span><input v-model="form.usableArea" class="wf-input" inputmode="decimal"></label>
            <label class="ime__f"><span>Zimmer</span><input v-model="form.rooms" class="wf-input" inputmode="decimal"></label>
            <label class="ime__f"><span>Stockwerk</span><input v-model="form.floor" class="wf-input" placeholder="z. B. 3. OG"></label>
            <label class="ime__f"><span>Baujahr</span><input v-model="form.yearBuilt" class="wf-input" inputmode="numeric"></label>
          </div>
          <div class="ime__row">
            <label class="ime__f"><span>{{ form.offerType === 'kauf' ? 'Kaufpreis €' : 'Miete € / Monat (inkl. BK)' }}</span><input v-model="form.price" class="wf-input" inputmode="decimal"></label>
            <label v-if="form.offerType === 'miete'" class="ime__f"><span>davon Betriebskosten €</span><input v-model="form.operatingCosts" class="wf-input" inputmode="decimal"></label>
            <label v-if="form.offerType === 'miete'" class="ime__f"><span>Kaution</span><input v-model="form.deposit" class="wf-input" placeholder="z. B. 3 Monatsmieten"></label>
            <label class="ime__f"><span>Provision</span><input v-model="form.commission" class="wf-input"></label>
          </div>
          <div class="ime__row">
            <label class="ime__f"><span>Verfügbar ab</span><input v-model="form.availableFrom" class="wf-input" placeholder="sofort / 1.12.2026"></label>
            <label v-if="form.offerType === 'miete'" class="ime__f"><span>Mindestmietdauer (Monate)</span><input v-model="form.minRentMonths" class="wf-input" inputmode="numeric"></label>
          </div>
        </section>

        <section class="wf-card ime__card">
          <h2 class="ime__h">Energieausweis <em class="ime__hs">Pflicht im Inserat (EAVG)</em></h2>
          <div class="ime__row">
            <label class="ime__f"><span>HWB kWh/m²a</span><input v-model="form.hwb" class="wf-input" inputmode="decimal"></label>
            <label class="ime__f"><span>HWB-Klasse</span><select v-model="form.hwbClass" class="wf-input"><option value="">–</option><option v-for="c in ['A++','A+','A','B','C','D','E','F','G']" :key="c">{{ c }}</option></select></label>
            <label class="ime__f"><span>fGEE</span><input v-model="form.fgee" class="wf-input" inputmode="decimal"></label>
            <label class="ime__f"><span>fGEE-Klasse</span><select v-model="form.fgeeClass" class="wf-input"><option value="">–</option><option v-for="c in ['A++','A+','A','B','C','D','E','F','G']" :key="c">{{ c }}</option></select></label>
          </div>
        </section>

        <section class="wf-card ime__card">
          <h2 class="ime__h">Ausstattung</h2>
          <div class="ime__feats">
            <button v-for="f in PROPERTY_FEATURES" :key="f.key" type="button" class="ime__feat" :class="{ 'is-on': form.features.includes(f.key) }" @click="toggleFeature(f.key)">{{ f.de }}</button>
          </div>
        </section>
      </div>

      <aside class="ime__side">
        <section class="wf-card ime__card">
          <h2 class="ime__h">Status</h2>
          <div class="ime__states">
            <button v-for="(v, k) in PROPERTY_STATUS" :key="k" type="button" class="ime__state" :class="{ 'is-on': form.status === k }" @click="form.status = k">{{ v.de }}</button>
          </div>
          <p class="ime__hint">„Entwurf" und „Archiviert" sind nicht öffentlich. „Vergeben" bleibt als Referenz sichtbar.</p>
        </section>

        <section class="wf-card ime__card">
          <h2 class="ime__h">Ansprechpartner</h2>
          <label class="ime__f"><span>Makler / Partner <em>(optional)</em></span><input v-model="form.partnerName" class="wf-input" placeholder="z. B. Musterimmobilien GmbH"></label>
          <label class="ime__f"><span>Name</span><input v-model="form.contactName" class="wf-input" placeholder="leer = WOHNFEE"></label>
          <label class="ime__f"><span>Telefon</span><input v-model="form.contactPhone" class="wf-input"></label>
          <label class="ime__f"><span>E-Mail <em>(bekommt Anfragen in Kopie)</em></span><input v-model="form.contactEmail" class="wf-input" type="email"></label>
        </section>

        <section v-if="!isNew" class="wf-card ime__card ime__wh">
          <h2 class="ime__h">willhaben</h2>
          <p v-if="meta?.willhabenStatus" class="ime__whstate">{{ WH_LABEL[meta.willhabenStatus] || meta.willhabenStatus }}<small v-if="meta.willhabenExportedAt"> · {{ fmtDT(meta.willhabenExportedAt) }}</small></p>
          <ul v-if="warnings.length" class="ime__warn"><li v-for="w in warnings" :key="w">{{ w }}</li></ul>
          <button class="wf-btn wf-btn--primary ime__whbtn" :disabled="whBusy || form.status !== 'aktiv'" @click="willhaben('publish')">
            {{ meta?.willhabenStatus ? 'Erneut an willhaben übergeben' : 'Auf willhaben veröffentlichen' }}
          </button>
          <p v-if="form.status !== 'aktiv'" class="ime__hint">Nur mit Status „Verfügbar".</p>
          <div class="ime__whrow">
            <button class="wf-btn wf-btn--sm" :disabled="whBusy" @click="willhaben('online')">Ist online</button>
            <button class="wf-btn wf-btn--sm" :disabled="whBusy" @click="willhaben('offline')">Offline</button>
            <a class="wf-btn wf-btn--sm" :href="`/api/admin/properties/${route.params.id}/openimmo`">XML</a>
          </div>
          <a v-if="meta?.willhabenUrl" :href="meta.willhabenUrl" target="_blank" rel="noopener" class="ime__whlink">Inserat auf willhaben ansehen ↗</a>
          <p v-if="whMsg" class="ime__hint ime__hint--ok">{{ whMsg }}</p>
        </section>

        <section v-if="meta?.inquiries?.length" class="wf-card ime__card">
          <h2 class="ime__h">Anfragen <em class="ime__hs">{{ meta.inquiries.length }}</em></h2>
          <ul class="ime__inqs">
            <li v-for="q in meta.inquiries" :key="q.id">
              <strong>{{ q.name }}</strong> <small>{{ fmtDT(q.createdAt) }}</small>
              <a :href="`mailto:${q.email}`">{{ q.email }}</a><span v-if="q.phone"> · <a :href="`tel:${q.phone}`">{{ q.phone }}</a></span>
              <p>{{ q.message }}</p>
            </li>
          </ul>
          <NuxtLink to="/admin/anfragen" class="ime__whlink">Alle Kontaktanfragen →</NuxtLink>
        </section>
      </aside>
    </fieldset>
  </div>
</template>

<style scoped>
.ime__top { display: flex; justify-content: space-between; align-items: center; gap: 1em; flex-wrap: wrap; margin-bottom: 1em; }
.ime__back { color: var(--wf-green); text-decoration: none; font-weight: 600; }
.ime__acts { display: flex; gap: .5em; align-items: center; }
.ime__error { color: var(--wf-red); }
.ime__ok { color: var(--wf-green); }
.ime__muted { color: var(--wf-muted); }
.ime__grid { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 330px); gap: 1em; align-items: start; }
.ime__main, .ime__side { display: grid; gap: 1em; min-width: 0; }
.ime__side { position: sticky; top: 1em; }
.ime__card { padding: 1.2em 1.4em; display: grid; gap: .8em; }
.ime__h { margin: 0; font-size: 1.02em; text-align: left; display: flex; align-items: baseline; gap: .6em; }
.ime__hs { font-style: normal; font-weight: 400; font-size: .8em; color: var(--wf-muted); }
.ime__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .7em; align-items: end; }
.ime__f { display: grid; gap: .3em; font-size: .82em; color: var(--wf-muted); min-width: 0; }
.ime__f em { font-style: normal; opacity: .8; }
.ime__f--wide { grid-column: span 2; }
.ime__f .wf-input { width: 100%; box-sizing: border-box; font-size: 1.08em; color: var(--wf-ink); }
.ime__check { display: flex; gap: .5em; align-items: flex-start; font-size: .84em; }
.ime__check--inline { align-self: center; }
.ime__imgs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .7em; }
.ime__imgs li { position: relative; display: grid; gap: .3em; }
.ime__imgs img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; display: block; }
.ime__imgs li.is-cover img { outline: 3px solid var(--wf-green); outline-offset: -3px; }
.ime__cover { position: absolute; top: .4em; left: .4em; background: var(--wf-green); color: #fff; font-size: .68em; padding: .2em .55em; border-radius: 999px; }
.ime__alt { font: inherit; font-size: .76em; padding: .35em .5em; border: 1px solid var(--wf-line); border-radius: 6px; }
.ime__imgacts { position: absolute; top: .4em; right: .4em; display: flex; gap: .2em; }
.ime__imgacts button { width: 24px; height: 24px; border-radius: 50%; border: 0; background: rgba(255, 255, 255, .92); cursor: pointer; font-weight: 700; line-height: 1; }
.ime__imgacts button:disabled { opacity: .4; cursor: default; }
.ime__feats, .ime__states { display: flex; flex-wrap: wrap; gap: .4em; }
.ime__feat, .ime__state { border: 1px solid var(--wf-line); background: #fff; border-radius: 999px; padding: .4em .85em; font: inherit; font-size: .82em; cursor: pointer; }
.ime__feat.is-on, .ime__state.is-on { background: var(--wf-green); border-color: var(--wf-green); color: #fff; }
.ime__hint { margin: 0; font-size: .78em; color: var(--wf-muted); }
.ime__hint--ok { color: var(--wf-green); font-weight: 600; }
.ime__whstate { margin: 0; font-size: .84em; font-weight: 600; color: #2b6cb0; }
.ime__whstate small { font-weight: 400; color: var(--wf-muted); }
.ime__warn { margin: 0; padding: .6em .8em .6em 1.8em; background: #fff6e5; border-radius: 10px; font-size: .78em; color: #8a5a00; display: grid; gap: .25em; }
.ime__whbtn { width: 100%; justify-content: center; }
.ime__whrow { display: flex; gap: .4em; flex-wrap: wrap; }
.ime__whlink { font-size: .82em; color: var(--wf-green); }
.ime__inqs { list-style: none; margin: 0; padding: 0; display: grid; gap: .7em; font-size: .82em; }
.ime__inqs li { padding-bottom: .6em; border-bottom: 1px solid var(--wf-line); display: grid; gap: .15em; }
.ime__inqs small { color: var(--wf-muted); }
.ime__inqs a { color: var(--wf-green); }
.ime__inqs p { margin: .2em 0 0; color: var(--wf-ink); white-space: pre-line; }
@media (max-width: 980px) { .ime__grid { grid-template-columns: minmax(0, 1fr); } .ime__side { position: static; } }
</style>
