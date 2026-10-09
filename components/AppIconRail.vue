<script setup lang="ts">
// fixed icon rail (search / email / phone / social), mirrors the live .icon_menu element
</script>

<template>
  <div class="icon_menu content-text">
    <div class="rte">
      <ul>
        <li class="search">
          <div class="mod_search block">
            <form action="/suche.html" method="get">
              <div class="formbody">
                <div class="widget widget-text">
                  <label for="ctrl_keywords_6" class="invisible">Suchbegriffe</label>
                  <input type="search" name="keywords" id="ctrl_keywords_6" class="text" value="" spellcheck="false">
                </div>
                <div class="widget widget-submit">
                  <button type="submit" id="ctrl_submit_6" class="submit">Suchen</button>
                </div>
              </div>
            </form>
          </div>
        </li>
        <li class="email"><a href="mailto:office@wohnfee.at">office@wohnfee.at</a></li>
        <li class="phone"><a href="tel:+436769202236">+43 676 9202236</a></li>
        <li class="fb"><a rel="noopener" href="https://www.facebook.com/wohnfee.homestaging" target="_blank">Find us on Facebook</a></li>
        <li class="instagram"><a rel="noopener" href="https://www.instagram.com/wohnfee.at/" target="_blank">See us on Instagram</a></li>
        <li class="nl-icon"><a rel="noopener" href="https://wohnfee.us7.list-manage.com/subscribe?u=72faf745fb1ebab6bf72b454f&amp;id=41014a8a53" target="_blank">Newsletter</a></li>
      </ul>
    </div>
  </div>
</template>
