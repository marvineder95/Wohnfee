// Spam-Schutz: Token beim Öffnen des Formulars holen und beim Absenden mitschicken (server/utils/spam.ts).
export function useFormToken() {
  const token = ref('')
  const fetchedAt = ref(0)
  async function refresh() {
    try {
      token.value = (await $fetch<{ token: string }>('/api/form-token')).token
      fetchedAt.value = Date.now()
    } catch { /* ohne Token landet die Anfrage höchstens im Spam-Ordner */ }
  }
  onMounted(refresh)
  /** Token für den Versand; nach >20 h neu holen (Server akzeptiert max. 24 h). */
  async function get() {
    if (!token.value || Date.now() - fetchedAt.value > 20 * 3600 * 1000) await refresh()
    return token.value
  }
  return { get, refresh }
}
