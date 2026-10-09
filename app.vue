<script setup lang="ts">
const route = useRoute()
// admin area renders bare (no site header/footer/cookiebar)
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <template v-if="isAdmin">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </template>
  <template v-else>
    <div id="wrapper">
      <div class="headerwrap">
        <AppHeader />
        <AppSubmenu />
      </div>
      <main id="main">
        <NuxtPage />
      </main>
      <AppFooter />
    </div>
    <AppCookiebar />
  </template>
</template>

<style scoped>
/* Header + ggf. Untermenü kleben als Einheit an der Oberkante.
   Ersetzt den alten Mechanismus (sticky-header.js setzte per JS die Klasse
   .sticky → position:fixed + Schrift/Logo/Margins änderten sich), der das
   Springen/Stocken und das Abschneiden von Inhalten verursachte.
   position:sticky benötigt keinen Ausgleich im Inhalt und resizt nichts. */
.headerwrap {
  position: sticky;
  top: 0;
  z-index: 99;
}
</style>
