<script setup lang="ts">
// Glocke in der Kopfzeile: neue Anfragen + persönliche Benachrichtigungen (Tabelle notifications,
// z. B. „Sandra hat einen Termin eingetragen“ / „Marvin hat deinen Termin bestätigt“).
const props = defineProps<{ newInquiries: number; newRental: number }>()

interface Note { id: number; title: string; body: string | null; url: string | null; createdAt: string; isRead: number | boolean }
const items = ref<Note[]>([])
const unread = ref(0)
const open = ref(false)
const root = ref<HTMLElement | null>(null)

async function load() {
  try {
    const res = await $fetch<{ items: Note[]; unread: number }>('/api/admin/notifications')
    items.value = res.items
    unread.value = res.unread
  } catch { /* optional */ }
}
defineExpose({ load })

const total = computed(() => props.newInquiries + props.newRental + unread.value)

async function openNote(n: Note) {
  open.value = false
  if (!n.isRead) {
    n.isRead = true
    unread.value = Math.max(0, unread.value - 1)
    $fetch('/api/admin/notifications/read', { method: 'POST', body: { id: n.id } }).catch(() => {})
  }
  if (n.url) await navigateTo(n.url)
}
async function readAll() {
  items.value.forEach(n => { n.isRead = true })
  unread.value = 0
  await $fetch('/api/admin/notifications/read', { method: 'POST', body: { all: true } }).catch(() => {})
}

function ago(ts: string) {
  const d = new Date(String(ts).replace(' ', 'T'))
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  if (min < 60 * 24) return `vor ${Math.round(min / 60)} Std.`
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })
}

function onDoc(e: MouseEvent) { if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') open.value = false }
let timer: ReturnType<typeof setInterval> | null = null
const onVisible = () => { if (document.visibilityState === 'visible') load() }
onMounted(() => {
  load()
  timer = setInterval(load, 60_000)
  document.addEventListener('click', onDoc)
  document.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('click', onDoc)
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisible)
})
watch(open, (v) => { if (v) load() })
watch(() => useRoute().fullPath, () => { open.value = false })
</script>

<template>
  <div ref="root" class="nb">
    <button type="button" class="nb__btn" :aria-expanded="open" aria-haspopup="true"
            :title="total ? `${total} neue Benachrichtigung(en)` : 'Benachrichtigungen'" @click="open = !open">
      <WfIcon name="bell" :size="19" />
      <span v-if="total > 0" class="nb__badge">{{ total > 9 ? '9+' : total }}</span>
    </button>

    <div v-if="open" class="nb__panel" role="dialog" aria-label="Benachrichtigungen">
      <div class="nb__head">
        <strong>Benachrichtigungen</strong>
        <button v-if="unread" type="button" class="nb__readall" @click="readAll">Alle gelesen</button>
      </div>

      <div v-if="newInquiries || newRental" class="nb__inq">
        <NuxtLink v-if="newInquiries" to="/admin/anfragen" class="nb__inqrow">
          <WfIcon name="mail" :size="15" /> {{ newInquiries }} neue Kontaktanfrage{{ newInquiries === 1 ? '' : 'n' }}
        </NuxtLink>
        <NuxtLink v-if="newRental" to="/admin/mietanfragen" class="nb__inqrow">
          <WfIcon name="bag" :size="15" /> {{ newRental }} neue Mietanfrage{{ newRental === 1 ? '' : 'n' }}
        </NuxtLink>
      </div>

      <ul v-if="items.length" class="nb__list">
        <li v-for="n in items" :key="n.id">
          <button type="button" class="nb__item" :class="{ 'is-unread': !n.isRead }" @click="openNote(n)">
            <span class="nb__dot" aria-hidden="true" />
            <span class="nb__txt">
              <strong>{{ n.title }}</strong>
              <small v-if="n.body">{{ n.body }}</small>
              <em>{{ ago(n.createdAt) }}</em>
            </span>
          </button>
        </li>
      </ul>
      <p v-else-if="!newInquiries && !newRental" class="nb__empty">Keine Benachrichtigungen.</p>
    </div>
  </div>
</template>

<style scoped>
.nb { position: relative; }
.nb__btn {
  position: relative; border: 0; background: none; color: #6e6858; cursor: pointer; padding: .4em; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
}
.nb__btn:hover, .nb__btn[aria-expanded="true"] { background: #f3eee2; color: var(--wf-green); }
.nb__badge {
  position: absolute; top: 0; right: -2px; background: var(--wf-red); color: #fff; font-size: .62em; font-weight: 700;
  border-radius: 999px; padding: .1em .38em; border: 2px solid var(--wf-bg);
}
.nb__panel {
  position: absolute; right: 0; top: calc(100% + .5em); z-index: 60; width: 23em; max-width: calc(100vw - 1.5em);
  max-height: min(32em, 75vh); overflow: auto; background: #fff; border: 1px solid var(--wf-line); border-radius: 16px;
  box-shadow: 0 18px 40px rgba(40, 35, 20, .14);
}
.nb__head { display: flex; justify-content: space-between; align-items: center; padding: .85em 1em .6em; border-bottom: 1px solid var(--wf-line); position: sticky; top: 0; background: #fff; }
.nb__head strong { font-size: .92em; }
.nb__readall { border: 0; background: none; color: var(--wf-green); font: inherit; font-size: .8em; cursor: pointer; padding: 0; }
.nb__readall:hover { text-decoration: underline; }
.nb__inq { display: grid; gap: .3em; padding: .6em .7em; border-bottom: 1px solid var(--wf-line); background: #fbf8f1; }
.nb__inqrow { display: flex; align-items: center; gap: .5em; padding: .45em .5em; border-radius: 10px; font-size: .86em; font-weight: 600; color: var(--wf-ink); text-decoration: none; }
.nb__inqrow:hover { background: #f3eee2; color: var(--wf-green); }
.nb__list { list-style: none; margin: 0; padding: .35em; }
.nb__item { display: flex; gap: .6em; width: 100%; text-align: left; border: 0; background: none; font: inherit; padding: .6em .55em; border-radius: 10px; cursor: pointer; color: var(--wf-ink); }
.nb__item:hover { background: #f6f3ec; }
.nb__dot { flex: none; width: .5em; height: .5em; margin-top: .45em; border-radius: 50%; background: transparent; }
.nb__item.is-unread .nb__dot { background: var(--wf-green); }
.nb__txt { display: grid; gap: .15em; min-width: 0; }
.nb__txt strong { font-size: .86em; font-weight: 500; line-height: 1.3; }
.nb__item.is-unread .nb__txt strong { font-weight: 700; }
.nb__txt small { font-size: .78em; color: var(--wf-muted); white-space: pre-line; overflow-wrap: anywhere; }
.nb__txt em { font-style: normal; font-size: .72em; color: #a39d8e; }
.nb__empty { margin: 0; padding: 1.4em 1em; text-align: center; color: var(--wf-muted); font-size: .86em; }
</style>
