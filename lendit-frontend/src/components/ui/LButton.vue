<script setup lang="ts">
import type { ButtonVariant } from './types'

withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    block: false,
    loading: false,
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
    :class="[
      'l-btn',
      `l-btn--${variant}`,
      `l-btn--${size}`,
      { 'l-btn--block': block, 'is-loading': loading },
    ]"
  >
    <span v-if="loading" class="l-btn__spinner" aria-hidden="true" />
    <span class="l-btn__content"><slot /></span>
  </button>
</template>

<style scoped>
.l-btn {
  --btn-fg: var(--fg-inverse);
  --btn-bg: var(--primary);
  --btn-bg-hover: var(--primary-700);
  --btn-border: var(--border-transparent);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-ui);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1;
  color: var(--btn-fg);
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  border-radius: var(--radius);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}

.l-btn__content {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.l-btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
}
.l-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.l-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.l-btn.is-loading {
  cursor: progress;
}

.l-btn--sm {
  min-height: var(--control-sm);
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}
.l-btn--md {
  min-height: var(--control-md);
  padding: 0 var(--space-5);
  font-size: var(--text-base);
}
.l-btn--lg {
  min-height: var(--control-lg);
  padding: 0 var(--space-6);
  font-size: var(--text-lg);
}

.l-btn--block {
  width: 100%;
}

.l-btn--primary {
  --btn-bg: var(--primary);
  --btn-bg-hover: var(--primary-700);
  box-shadow: var(--shadow-sm);
}
.l-btn--secondary {
  --btn-fg: var(--primary);
  --btn-bg: var(--surface);
  --btn-bg-hover: var(--bg-subtle);
  --btn-border: var(--border-strong);
}
.l-btn--ghost {
  --btn-fg: var(--ink);
  --btn-bg: var(--transparent);
  --btn-bg-hover: var(--bg-subtle);
}
.l-btn--danger {
  --btn-bg: var(--danger);
  --btn-bg-hover: var(--danger-700);
}

.l-btn__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: var(--border-transparent);
  border-radius: var(--radius-round);
  animation: l-btn-spin 0.6s linear infinite;
}
@keyframes l-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .l-btn__spinner {
    animation-duration: 1.2s;
  }
  .l-btn:active:not(:disabled) {
    transform: none;
  }
}
.l-btn {
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
</style>
