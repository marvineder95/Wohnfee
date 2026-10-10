<script setup lang="ts">
defineProps<{ elements: any[] }>()
</script>

<template>
  <template v-for="(el, i) in elements" :key="el.id || i">
    <CeText v-if="el.type === 'text'" :el="el" />
    <CeHeadline v-else-if="el.type === 'headline'" :el="el" />
    <CeImage v-else-if="el.type === 'image'" :el="el" />
    <CeSwiper v-else-if="el.type === 'swiper' || el.type === 'contentslider'" :el="el" />
    <CeGallery v-else-if="el.type === 'gallery'" :el="el" />
    <CeHtml v-else-if="el.type === 'html'" :el="el" />
    <CeHyperlink v-else-if="el.type === 'hyperlink'" :el="el" />
    <CeVideo v-else-if="el.type === 'youtube' || el.type === 'vimeo'" :el="el" />
    <CeList v-else-if="el.type === 'list'" :el="el" />
    <CeAccordion v-else-if="el.type === 'accordion'" :el="el" />
    <div v-else-if="el.type === 'wrapper'" :class="el.cssClass">
      <ContentElements :elements="el.children" />
    </div>
    <ModuleNewslist v-else-if="el.type === 'newslist'" :el="el" />
    <ModuleCategories v-else-if="el.type === 'categories'" :el="el" />
    <ModuleSearchbox v-else-if="el.type === 'searchbox'" :el="el" />
    <ModuleSearch v-else-if="el.type === 'search'" :el="el" />
    <ModuleNewsletter v-else-if="el.type === 'newsletter'" :el="el" />
    <!-- cookiebutton: kein Cookie-Banner mehr (keine Analyse/Tracking) → nichts anzeigen -->
    <template v-else-if="el.type === 'cookiebutton'" />
    <div v-else-if="el.type === 'article'" class="article-insert mod_article block" :class="el.cssClass">
      <ContentElements :elements="el.elements" />
    </div>
  </template>
</template>
