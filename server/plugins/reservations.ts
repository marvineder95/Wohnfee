import { processReservations } from '../utils/reservation-job'

// Reservierungen ablaufen lassen + Erinnerungen verschicken (alle 15 Minuten)
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  setTimeout(() => { processReservations() }, 25_000)
  setInterval(() => { processReservations() }, 15 * 60 * 1000)
})
