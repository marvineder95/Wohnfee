<script setup lang="ts">
// Video (YouTube/Vimeo) erst nach Klick laden: vorher keine Verbindung zum Anbieter
// (kein Cookie-Banner nötig – siehe Datenschutzerklärung „Eingebettete Videos").
const props = defineProps<{ el: any }>()
const { t } = useLang()
const embedUrl = computed(() => {
  const u = props.el.videoUrl || ''
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (props.el.type === 'youtube' && m) return `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1`
  const v = u.match(/vimeo\.com\/(\d+)/)
  if (props.el.type === 'vimeo' && v) return `https://player.vimeo.com/video/${v[1]}?autoplay=1&dnt=1`
  return u
})
const provider = computed(() => (props.el.type === 'vimeo' ? 'Vimeo' : 'YouTube'))
const active = ref(false)
</script>

<template>
  <div class="ce_video block">
    <iframe v-if="active" :src="embedUrl" width="560" height="315" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen />
    <button v-else type="button" class="cev__ph" @click="active = true">
      <span class="cev__play" aria-hidden="true">▶</span>
      <span class="cev__txt">{{ t('Video abspielen', 'Play video') }}</span>
      <small>{{ t(`Beim Abspielen wird eine Verbindung zu ${provider} hergestellt.`, `Playing the video connects to ${provider}.`) }}</small>
    </button>
  </div>
</template>

<style scoped>
.cev__ph {
  width: 100%; max-width: 560px; aspect-ratio: 16 / 9; border: 0; border-radius: 14px; cursor: pointer;
  background: linear-gradient(135deg, #2f5d40 0%, #22412d 100%); color: #fff; font: inherit;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5em; padding: 1em;
}
.cev__play { width: 64px; height: 64px; border-radius: 50%; background: rgba(255, 255, 255, .95); color: #2f5d40; display: grid; place-items: center; font-size: 22px; padding-left: 4px; box-sizing: border-box; }
.cev__txt { font-weight: 600; }
.cev__ph small { opacity: .8; font-size: .8em; }
.cev__ph:hover .cev__play { transform: scale(1.06); }
</style>
