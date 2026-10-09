// Schnellzugriffe der Übersicht verlinken auf z. B. /admin/angebote?new=1 –
// die Seite öffnet dann direkt den „Neu"-Dialog. Muss im Setup aufgerufen werden;
// `consume()` nach dem ersten Laden aufrufen, entfernt den Parameter wieder.
export function useNewParam() {
  const route = useRoute()
  const router = useRouter()
  const requested = route.query.new === '1'
  return {
    consume(open: () => unknown) {
      if (!requested) return
      open()
      const { new: _drop, ...rest } = route.query
      router.replace({ query: rest })
    }
  }
}
