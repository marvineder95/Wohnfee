<script setup lang="ts">
// Schlanker Rich-Text-Editor für Blog-Artikel (contenteditable).
// Erzeugt nur einfache Auszeichnung (Absätze, Zwischenüberschriften, Listen,
// Zitate, Links, Bilder) – der Server bereinigt das HTML zusätzlich.
const props = defineProps<{ modelValue: string, placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const el = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const state = reactive({ bold: false, italic: false, block: 'p', ul: false, ol: false })

const isEmpty = ref(true)
function syncOut() {
  if (!el.value) return
  const html = el.value.innerHTML
  isEmpty.value = !el.value.textContent?.trim() && !el.value.querySelector('img')
  emit('update:modelValue', isEmpty.value ? '' : html)
}

// Wert von außen (Laden eines Artikels) übernehmen – nicht bei jeder Eingabe,
// sonst springt der Cursor
watch(() => props.modelValue, (v) => {
  if (el.value && v !== el.value.innerHTML && document.activeElement !== el.value) {
    el.value.innerHTML = v || ''
    isEmpty.value = !el.value.textContent?.trim() && !el.value.querySelector('img')
  }
})

function exec(cmd: string, value?: string) {
  el.value?.focus()
  document.execCommand(cmd, false, value)
  syncOut()
  updateState()
}
const block = (tag: string) => exec('formatBlock', `<${tag}>`)
const toggleBlock = (tag: string) => block(state.block === tag ? 'p' : tag)

function addLink() {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) { alert('Bitte zuerst den Text markieren, der verlinkt werden soll.'); return }
  const range = sel.getRangeAt(0).cloneRange()
  const url = prompt('Link-Adresse (z. B. https://… oder /kontakt.html):', 'https://')
  if (!url || url === 'https://') return
  sel.removeAllRanges(); sel.addRange(range)
  exec('createLink', url.trim())
}

async function onImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  uploadError.value = ''
  // Cursorposition merken – der Datei-Dialog nimmt den Fokus weg
  const sel = window.getSelection()
  const range = sel && sel.rangeCount && el.value?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ path: string }>('/api/admin/blog/upload', { method: 'POST', body: fd })
    const caption = (prompt('Bildunterschrift (optional – leer lassen für keine):') || '').trim()
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const html = `<figure><img src="${res.path}" alt="${esc(caption)}">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure><p><br></p>`
    el.value?.focus()
    if (range) { sel!.removeAllRanges(); sel!.addRange(range) }
    document.execCommand('insertHTML', false, html)
    syncOut()
  } catch (err: any) {
    uploadError.value = err?.data?.statusMessage || 'Bild-Upload fehlgeschlagen.'
  } finally {
    uploading.value = false
  }
}

// Eingefügter Text ohne Fremdformatierung (Word, Webseiten …); Absätze bleiben erhalten
function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain')
  if (text == null) return
  e.preventDefault()
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const paras = text.replace(/\r/g, '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (paras.length <= 1) document.execCommand('insertText', false, text)
  else document.execCommand('insertHTML', false, paras.map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''))
  syncOut()
}

function updateState() {
  if (!el.value || !el.value.contains(window.getSelection()?.anchorNode || null)) return
  state.bold = document.queryCommandState('bold')
  state.italic = document.queryCommandState('italic')
  state.ul = document.queryCommandState('insertUnorderedList')
  state.ol = document.queryCommandState('insertOrderedList')
  state.block = String(document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, '') || 'p'
}

function onKeydown(e: KeyboardEvent) {
  // Enter in leerem Editor: immer mit <p> starten statt <div>
  if (e.key === 'Enter' && !e.shiftKey && el.value && !el.value.innerHTML.trim()) {
    document.execCommand('formatBlock', false, '<p>')
  }
}

onMounted(() => {
  document.execCommand('defaultParagraphSeparator', false, 'p')
  if (el.value) {
    el.value.innerHTML = props.modelValue || ''
    isEmpty.value = !el.value.textContent?.trim() && !el.value.querySelector('img')
  }
  document.addEventListener('selectionchange', updateState)
})
onUnmounted(() => document.removeEventListener('selectionchange', updateState))
</script>

<template>
  <div class="rich">
    <div class="rich__bar" role="toolbar" aria-label="Textformatierung">
      <button type="button" :class="{ on: state.block === 'h2' }" title="Zwischenüberschrift" @mousedown.prevent @click="toggleBlock('h2')">H2</button>
      <button type="button" :class="{ on: state.block === 'h3' }" title="Kleine Überschrift" @mousedown.prevent @click="toggleBlock('h3')">H3</button>
      <button type="button" :class="{ on: state.block === 'p' }" title="Normaler Absatz" @mousedown.prevent @click="block('p')">¶</button>
      <span class="rich__sep" />
      <button type="button" :class="{ on: state.bold }" title="Fett (⌘B)" @mousedown.prevent @click="exec('bold')"><strong>B</strong></button>
      <button type="button" :class="{ on: state.italic }" title="Kursiv (⌘I)" @mousedown.prevent @click="exec('italic')"><em>I</em></button>
      <span class="rich__sep" />
      <button type="button" :class="{ on: state.ul }" title="Aufzählung" @mousedown.prevent @click="exec('insertUnorderedList')">
        <svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
      </button>
      <button type="button" :class="{ on: state.ol }" title="Nummerierte Liste" @mousedown.prevent @click="exec('insertOrderedList')">
        <svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 5h1v4M4 9h2M4 14.5c0-.8.7-1.5 1.5-1.5S7 13.7 7 14.5c0 1.2-3 2-3 3.5h3" /></svg>
      </button>
      <button type="button" :class="{ on: state.block === 'blockquote' }" title="Zitat" @mousedown.prevent @click="toggleBlock('blockquote')">
        <svg viewBox="0 0 24 24"><path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" /></svg>
      </button>
      <span class="rich__sep" />
      <button type="button" title="Link setzen" @mousedown.prevent @click="addLink">
        <svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></svg>
      </button>
      <button type="button" title="Link entfernen" @mousedown.prevent @click="exec('unlink')">
        <svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1M4 4l16 16" /></svg>
      </button>
      <button type="button" :disabled="uploading" title="Bild einfügen" @mousedown.prevent @click="fileInput?.click()">
        <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4V5Zm0 11 5-5 4 4 2-2 5 5M15.5 9.5h.01" /></svg>
      </button>
      <button type="button" title="Trennlinie" @mousedown.prevent @click="exec('insertHorizontalRule')">—</button>
      <span class="rich__sep" />
      <button type="button" title="Rückgängig (⌘Z)" @mousedown.prevent @click="exec('undo')">
        <svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
      </button>
      <button type="button" title="Wiederholen" @mousedown.prevent @click="exec('redo')">
        <svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></svg>
      </button>
      <span v-if="uploading" class="rich__status">Bild wird hochgeladen …</span>
    </div>
    <div
      ref="el" class="rich__area" :class="{ 'is-empty': isEmpty }" contenteditable="true" role="textbox"
      aria-multiline="true" :data-placeholder="placeholder || 'Artikeltext schreiben …'"
      @input="syncOut" @paste="onPaste" @keydown="onKeydown" @keyup="updateState" @mouseup="updateState"
    />
    <p v-if="uploadError" class="rich__error">{{ uploadError }}</p>
    <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onImage">
  </div>
</template>

<style scoped>
.rich { border: 1px solid #d9d2c0; border-radius: 12px; background: #fff; overflow: hidden; }
.rich:focus-within { border-color: #77ad96; box-shadow: 0 0 0 3px rgba(119, 173, 150, .2); }
.rich__bar {
  position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: .2rem;
  padding: .45rem .5rem; background: #faf8f3; border-bottom: 1px solid #ece7da;
}
.rich__bar button {
  min-width: 32px; height: 32px; padding: 0 .45rem; border: 1px solid transparent; border-radius: 7px;
  background: none; color: #55554e; font: inherit; font-size: .85em; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.rich__bar button:hover:not(:disabled) { background: #fff; border-color: #e4ddcb; color: #2b2b28; }
.rich__bar button.on { background: #eef3ee; border-color: #cfdccf; color: #2f5d40; }
.rich__bar button:disabled { opacity: .45; cursor: default; }
.rich__bar svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.rich__sep { width: 1px; height: 20px; background: #e4ddcb; margin: 0 .25rem; }
.rich__status { font-size: .8em; color: #2f5d40; margin-left: .4rem; }

.rich__area {
  min-height: 380px; padding: 1.1rem 1.3rem 1.4rem; outline: none;
  font-family: Georgia, 'Times New Roman', serif; font-size: 1.02em; line-height: 1.75; color: #33312b;
}
.rich__area.is-empty::before { content: attr(data-placeholder); color: #b3ad9f; pointer-events: none; }
/* globale Website-Styles (zentrierte Überschriften etc.) im Editor neutralisieren */
.rich__area :deep(*) { text-align: left; }
.rich__area :deep(figcaption) { text-align: center; }
.rich__area :deep(h2), .rich__area :deep(h3) { font-family: inherit; color: #2b2b28; padding: 0; border: 0; text-transform: none; }
.rich__area :deep(p) { margin: 0 0 .9em; }
.rich__area :deep(h2) { font-size: 1.45em; font-weight: 500; margin: 1.2em 0 .5em; line-height: 1.3; }
.rich__area :deep(h3) { font-size: 1.2em; font-weight: 500; margin: 1.1em 0 .45em; }
.rich__area :deep(ul), .rich__area :deep(ol) { padding-left: 1.4em; margin: 0 0 .9em; }
.rich__area :deep(blockquote) { margin: 1em 0; padding: .2em 0 .2em 1em; border-left: 3px solid #2f5d40; color: #55554e; font-style: italic; }
.rich__area :deep(a) { color: #2f5d40; text-decoration: underline; }
.rich__area :deep(figure) { margin: 1.2em 0; }
.rich__area :deep(img) { max-width: 100%; height: auto; border-radius: 10px; display: block; }
.rich__area :deep(figcaption) { font-size: .82em; color: #8a857a; text-align: center; margin-top: .4em; font-family: system-ui, sans-serif; }
.rich__area :deep(hr) { border: 0; border-top: 1px solid #e4ddcb; margin: 1.6em 0; }
.rich__error { margin: 0; padding: .5em .9em; background: #fdecea; color: #a83226; font-size: .85em; }
</style>
