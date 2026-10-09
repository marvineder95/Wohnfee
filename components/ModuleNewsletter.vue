<script setup lang="ts">
const sent = ref(false)
const email = ref('')
function submit() {
  // Placeholder: wire to the newsletter service used by the customer.
  sent.value = true
}
</script>

<template>
  <div class="mod_newsletter block">
    <form v-if="!sent" @submit.prevent="submit">
      <div class="formbody">
        <div class="widget widget-text">
          <label for="nl_email" class="invisible">E-Mail-Adresse</label>
          <input type="email" id="nl_email" v-model="email" class="text" placeholder="E-Mail-Adresse" required>
        </div>
        <div class="widget widget-submit">
          <button type="submit" class="submit">Newsletter abonnieren</button>
        </div>
      </div>
    </form>
    <p v-else class="confirm">Danke für Ihre Anmeldung!</p>
  </div>
</template>
