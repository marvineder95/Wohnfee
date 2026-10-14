// Sichtbare Partner & Referenzen aus dem Dashboard (/api/partners), seitenweit geteilt.
// Wird im Browser geladen: Viele Seiten sind vorgerendert – so erscheinen neue Einträge
// (Menüpunkt „Partner“, Logo-Leiste) ohne Neu-Build. Solange nichts sichtbar ist, bleibt alles ausgeblendet.
export interface PublicPartner {
  id: number; kind: 'partner' | 'referenz'; name: string; category: string | null
  description: string | null; descriptionEn: string | null; website: string | null; logo: string | null
}

export function usePartners() {
  const data = useState<{ partners: PublicPartner[]; references: PublicPartner[] } | null>('wf-partners', () => null)
  const loading = useState('wf-partners-loading', () => false)
  if (import.meta.client && !data.value && !loading.value) {
    loading.value = true
    $fetch<{ partners: PublicPartner[]; references: PublicPartner[] }>('/api/partners')
      .then((r) => { data.value = r })
      .catch(() => { data.value = { partners: [], references: [] } })
      .finally(() => { loading.value = false })
  }
  return {
    partners: computed(() => data.value?.partners || []),
    references: computed(() => data.value?.references || []),
    /** Nav-Einträge mit "requires" nur zeigen, wenn die Daten dafür existieren */
    navAllowed: (item: any) => !item?.requires || (item.requires === 'partners' && (data.value?.partners.length || 0) > 0)
  }
}
