// Bestätigungs-Dialog im Dashboard-Design statt window.confirm().
// Aufruf: const ask = useConfirm(); if (!await ask({ title: '…', message: '…', danger: true })) return
// Angezeigt von components/admin/ConfirmDialog.vue (im Admin-Layout eingebunden).

export interface ConfirmOptions {
  title: string
  message?: string
  /** zusätzliche Hinweise als Liste (z. B. was mitgelöscht wird) */
  points?: string[]
  confirmText?: string
  cancelText?: string
  danger?: boolean
  icon?: string
}

interface ConfirmState extends ConfirmOptions { open: boolean }

let resolver: ((ok: boolean) => void) | null = null

export function useConfirmState() {
  return useState<ConfirmState>('wf-confirm', () => ({ open: false, title: '' }))
}

export function useConfirm() {
  const state = useConfirmState()
  return (opts: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver?.(false) // offener Dialog wird verworfen
    resolver = resolve
    state.value = { ...opts, open: true }
  })
}

export function settleConfirm(ok: boolean) {
  const state = useConfirmState()
  state.value = { ...state.value, open: false }
  const r = resolver
  resolver = null
  r?.(ok)
}
