import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

const state = reactive<{ items: Toast[] }>({ items: [] })
let seq = 0

export function useToast() {
  function show(message: string, type: ToastType = 'success', timeout = 3000): number {
    const id = ++seq
    state.items.push({ id, message, type })
    if (timeout) setTimeout(() => dismiss(id), timeout)
    return id
  }
  function dismiss(id: number) {
    const i = state.items.findIndex((t) => t.id === id)
    if (i !== -1) state.items.splice(i, 1)
  }
  return {
    toasts: state.items,
    show,
    dismiss,
    success: (m: string, t?: number) => show(m, 'success', t),
    error: (m: string, t?: number) => show(m, 'error', t),
    info: (m: string, t?: number) => show(m, 'info', t),
  }
}
