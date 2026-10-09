<script setup lang="ts">
// „Cookie-Einstellungen"-Knopf (Footer) — öffnet die Cookiebar-Einstellungen
const route = useRoute()
const isEn = computed(() => route.path.startsWith('/en/'))
</script>

<template>
  <p class="cookie-settings">
    <button type="button" class="cookiebar-opener" @click="$emit('open-cookiebar')">
      {{ isEn ? 'Cookie settings' : 'Cookie-Einstellungen' }}
    </button>
  </p>
</template>
