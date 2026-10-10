<script setup lang="ts">
// WOHNFEE cookie consent — first layer (decision) and second layer (granular settings).
// Both main actions carry equal visual weight; optional categories are never
// pre-selected; nothing non-essential loads before an explicit choice.
const { visible, view, consent, init, persist, open } = useCookiebar()
const card = ref<HTMLElement | null>(null)
const webanalyse = ref(false)

// Sprache anhand der Route (EN-Seiten liegen unter /en/…)
const route = useRoute()
const isEn = computed(() => route.path.startsWith('/en/'))

const DE = {
  title: 'Cookies & Datenschutz',
  text: 'Wir verwenden Cookies und ähnliche Technologien, um unsere Website technisch bereitzustellen und – sofern Sie zustimmen – die Nutzung unserer Website zu analysieren und unser Angebot zu verbessern.',
  hintPre: 'Weitere Informationen finden Sie in unserer',
  privacyLabel: 'Datenschutzerklärung',
  privacyHref: '/datenschutz.html',
  acceptAll: 'Alle akzeptieren',
  necessaryOnly: 'Nur notwendige',
  settings: 'Einstellungen',
  settingsTitle: 'Cookie-Einstellungen',
  essential: 'Essenziell',
  alwaysActive: 'Immer aktiv',
  essentialText: 'Diese Cookies und Technologien sind für den technischen Betrieb der Website erforderlich und können nicht deaktiviert werden.',
  analytics: 'Webanalyse & Statistik',
  analyticsOn: 'Aktiv',
  analyticsOff: 'Aus',
  analyticsText: 'Hilft uns zu verstehen, wie Besucher unsere Website nutzen und wie wir unser Angebot verbessern können.',
  save: 'Auswahl speichern',
  back: 'Zurück'
}
const EN = {
  title: 'Cookies & Privacy',
  text: 'We use cookies and similar technologies to provide our website and – if you consent – to analyse how it is used and improve our offering.',
  hintPre: 'For more information, please see our',
  privacyLabel: 'Privacy Policy',
  privacyHref: '/en/datenschutz.html',
  acceptAll: 'Accept all',
  necessaryOnly: 'Necessary only',
  settings: 'Settings',
  settingsTitle: 'Cookie settings',
  essential: 'Essential',
  alwaysActive: 'Always active',
  essentialText: 'These cookies and technologies are required for the technical operation of the website and cannot be disabled.',
  analytics: 'Web analytics & statistics',
  analyticsOn: 'On',
  analyticsOff: 'Off',
  analyticsText: 'Helps us understand how visitors use our website and how we can improve our offering.',
  save: 'Save selection',
  back: 'Back'
}
const t = computed(() => (isEn.value ? EN : DE))

onMounted(() => {
  init()
  webanalyse.value = !!consent.value?.webanalyse
})

watch(visible, (v) => {
  if (!v) return
  webanalyse.value = !!consent.value?.webanalyse
  // move keyboard focus into the dialog
  nextTick(() => card.value?.focus())
})

// lock page scroll while the dialog is open
watch(visible, (v) => {
  if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})

const saveSelection = () => persist(webanalyse.value)
</script>

<template>
  <div v-if="visible" class="wf-cb" data-nosnippet>
    <!-- first layer: decision -->
    <div v-if="view === 'banner'" ref="card" class="wf-cb-card" role="dialog" aria-modal="true"
         aria-labelledby="wf-cb-title" tabindex="-1">
      <h2 id="wf-cb-title" class="wf-cb-title">{{ t.title }}</h2>
      <p class="wf-cb-text">{{ t.text }}</p>
      <p class="wf-cb-hint">
        {{ t.hintPre }}
        <a :href="t.privacyHref">{{ t.privacyLabel }}</a>.
      </p>
      <div class="wf-cb-actions">
        <button type="button" class="wf-cb-btn" @click="persist(true)">{{ t.acceptAll }}</button>
        <button type="button" class="wf-cb-btn" @click="persist(false)">{{ t.necessaryOnly }}</button>
        <button type="button" class="wf-cb-more" @click="open('settings')">{{ t.settings }}</button>
      </div>
    </div>

    <!-- second layer: granular settings -->
    <div v-else ref="card" class="wf-cb-card" role="dialog" aria-modal="true"
         aria-labelledby="wf-cb-settings-title" tabindex="-1">
      <h2 id="wf-cb-settings-title" class="wf-cb-title">{{ t.settingsTitle }}</h2>

      <div class="wf-cb-group">
        <div class="wf-cb-group-head">
          <h3>{{ t.essential }}</h3>
          <span class="wf-cb-status">{{ t.alwaysActive }}</span>
        </div>
        <p class="wf-cb-group-text">{{ t.essentialText }}</p>
      </div>

      <div class="wf-cb-group">
        <div class="wf-cb-group-head">
          <h3>{{ t.analytics }}</h3>
          <label class="wf-cb-switch">
            <input v-model="webanalyse" type="checkbox" role="switch">
            <span class="wf-cb-track" aria-hidden="true"><span class="wf-cb-knob" /></span>
            <span class="wf-cb-switch-label">{{ webanalyse ? t.analyticsOn : t.analyticsOff }}</span>
          </label>
        </div>
        <p class="wf-cb-group-text">{{ t.analyticsText }}</p>
      </div>

      <div class="wf-cb-actions">
        <button type="button" class="wf-cb-btn wf-cb-btn-wide" @click="saveSelection">{{ t.save }}</button>
        <button type="button" class="wf-cb-more" @click="open('banner')">{{ t.back }}</button>
      </div>
    </div>
  </div>
</template>
