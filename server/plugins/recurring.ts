import { generateDueRecurring } from '../utils/recurring'

// Prüft stündlich (und kurz nach dem Start), ob wiederkehrende Mietrechnungen fällig sind.
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  setTimeout(() => { generateDueRecurring() }, 20_000)
  setInterval(() => { generateDueRecurring() }, 60 * 60 * 1000)
})
