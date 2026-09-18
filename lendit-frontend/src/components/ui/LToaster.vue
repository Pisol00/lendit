<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckCircle2, AlertCircle, Info, X } from '@lucide/vue'
import { useToast } from '../../composables/useToast'

const { t } = useI18n()
const { toasts, dismiss } = useToast()
const icons = { success: CheckCircle2, error: AlertCircle, info: Info }
</script>

<template>
  <div class="toaster" role="region" :aria-label="t('ui.notifications')">
    <div class="sr-only" aria-live="polite">
      <span v-for="toast in toasts" :key="toast.id">{{ toast.message }}</span>
    </div>

    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.type}`">
        <component
          :is="icons[toast.type]"
          :size="18"
          :stroke-width="2.25"
          class="toast__icon"
          aria-hidden="true"
        />
        <span class="toast__msg">{{ toast.message }}</span>
        <button
          type="button"
          class="toast__close"
          :aria-label="t('common.close')"
          @click="dismiss(toast.id)"
        >
          <X :size="15" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toaster {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  width: max-content;
  max-width: calc(100vw - var(--space-6));
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .toast {
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  }
}
.toast__icon {
  flex-shrink: 0;
}
.toast--success .toast__icon {
  color: var(--success);
}
.toast--error .toast__icon {
  color: var(--danger);
}
.toast--info .toast__icon {
  color: var(--accent);
}
.toast__msg {
  font-weight: 500;
}
.toast__close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: var(--space-1);
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    color var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.toast__close:hover {
  color: var(--ink);
  background: var(--bg-subtle);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity var(--dur) var(--ease);
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
