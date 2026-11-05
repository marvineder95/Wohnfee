<script setup lang="ts">
// Gegenstück zu composables/useConfirm.ts – einmal im Admin-Layout eingebunden.
const state = useConfirmState()
const okBtn = ref<HTMLButtonElement | null>(null)

watch(() => state.value.open, async (open) => {
  if (open) { await nextTick(); okBtn.value?.focus() }
})
function onKey(e: KeyboardEvent) {
  if (!state.value.open) return
  if (e.key === 'Escape') { e.stopImmediatePropagation(); settleConfirm(false) }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Transition name="wfc">
    <div v-if="state.open" class="wfc" @click.self="settleConfirm(false)">
      <div class="wfc__box" role="alertdialog" aria-modal="true" :aria-label="state.title">
        <span class="wfc__icon" :class="{ 'is-danger': state.danger }">
          <WfIcon :name="state.icon || (state.danger ? 'trash' : 'alert')" :size="20" />
        </span>
        <h2 class="wfc__title">{{ state.title }}</h2>
        <p v-if="state.message" class="wfc__msg">{{ state.message }}</p>
        <ul v-if="state.points?.length" class="wfc__points">
          <li v-for="p in state.points" :key="p">{{ p }}</li>
        </ul>
        <div class="wfc__actions">
          <button type="button" class="wf-btn" @click="settleConfirm(false)">{{ state.cancelText || 'Abbrechen' }}</button>
          <button ref="okBtn" type="button" class="wf-btn wfc__ok" :class="state.danger ? 'wfc__ok--danger' : 'wf-btn--primary'" @click="settleConfirm(true)">
            {{ state.confirmText || 'OK' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.wfc {
  position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 1em;
  background: rgba(46, 43, 37, .45); backdrop-filter: blur(3px);
}
.wfc__box {
  width: 100%; max-width: 27em; background: var(--wf-card); border-radius: 20px;
  padding: 1.8em 1.8em 1.4em; box-shadow: 0 24px 70px rgba(46, 43, 37, .3); text-align: left;
}
.wfc__icon {
  width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 1em;
  background: var(--wf-green-soft); color: var(--wf-green);
}
.wfc__icon.is-danger { background: var(--wf-red-soft); color: var(--wf-red); }
.wfc__title { font-family: var(--wf-serif); font-weight: 400; font-size: 1.35em; line-height: 1.25; margin: 0 0 .45em; text-align: left; }
.wfc__msg { margin: 0; color: var(--wf-muted); font-size: .92em; line-height: 1.55; }
.wfc__points { margin: .9em 0 0; padding: .8em 1em .8em 2.1em; background: #fbf9f4; border: 1px solid var(--wf-line); border-radius: 12px; display: grid; gap: .35em; font-size: .86em; line-height: 1.45; }
.wfc__actions { display: flex; justify-content: flex-end; gap: .5em; margin-top: 1.5em; flex-wrap: wrap; }
.wfc__actions .wf-btn { padding: .6em 1.2em; }
.wfc__ok--danger { background: var(--wf-red); border-color: var(--wf-red); color: #fff; }
.wfc__ok--danger:hover:not(:disabled) { background: #8f2a20; border-color: #8f2a20; color: #fff; }
.wfc__ok:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(47, 93, 64, .25); }
.wfc__ok--danger:focus-visible { box-shadow: 0 0 0 3px rgba(168, 50, 38, .25); }

.wfc-enter-active, .wfc-leave-active { transition: opacity .18s; }
.wfc-enter-active .wfc__box, .wfc-leave-active .wfc__box { transition: transform .18s; }
.wfc-enter-from, .wfc-leave-to { opacity: 0; }
.wfc-enter-from .wfc__box, .wfc-leave-to .wfc__box { transform: translateY(8px) scale(.98); }
</style>
