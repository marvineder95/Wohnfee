<script setup lang="ts">
</script>

<template>
  <div class="mod_search block">
    <form action="/suche.html" method="get">
      <div class="formbody">
        <div class="widget widget-text">
          <label for="ctrl_keywords" class="invisible">Suchbegriffe</label>
          <input type="search" name="keywords" id="ctrl_keywords" class="text" value="" spellcheck="false">
        </div>
        <div class="widget widget-submit">
          <button type="submit" class="submit">Suchen</button>
        </div>
      </div>
    </form>
  </div>
</template>
