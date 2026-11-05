import { purgeOldSpam } from '../utils/spam'

// Spam-Anfragen nach 30 Tagen löschen (einmal täglich)
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  setTimeout(() => { purgeOldSpam() }, 60_000)
  setInterval(() => { purgeOldSpam() }, 24 * 60 * 60 * 1000)
})
