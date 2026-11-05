<script setup lang="ts">
// Alte Adresse: Benutzer sind jetzt Teil der Mitarbeiter (Reiter „Dashboard-Zugang“)
definePageMeta({ layout: 'admin' })
await navigateTo('/admin/mitarbeiter', { replace: true })
</script>

<template>
  <div />
</template>
