import { sickNoteReminders } from '../utils/absences'

// Erinnerung an fehlende Krankmeldungen (stündlich)
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  setTimeout(() => { sickNoteReminders() }, 40_000)
  setInterval(() => { sickNoteReminders() }, 60 * 60 * 1000)
})
