<script setup lang="ts">
const props = defineProps<{ el: any }>()
const embedUrl = computed(() => {
  const u = props.el.videoUrl || ''
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (props.el.type === 'youtube' && m) return `https://www.youtube-nocookie.com/embed/${m[1]}`
  const v = u.match(/vimeo\.com\/(\d+)/)
  if (props.el.type === 'vimeo' && v) return `https://player.vimeo.com/video/${v[1]}`
  return u
})
</script>

<template>
  <div class="ce_video block">
    <iframe :src="embedUrl" width="560" height="315" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen loading="lazy" />
  </div>
</template>
