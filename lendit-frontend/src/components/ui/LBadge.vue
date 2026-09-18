<script setup lang="ts">
defineProps({
  variant: { type: String, default: 'neutral' },
})
</script>

<template>
  <span :class="['l-badge', `l-badge--${variant}`]">
    <span class="l-badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.l-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.1875rem 0.5rem;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.4;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-transparent);
  white-space: nowrap;
}
.l-badge__dot {
  width: var(--badge-dot);
  height: var(--badge-dot);
  border-radius: var(--radius-round);
  background: currentColor;
}

.l-badge--neutral {
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border-color: var(--border-strong);
}
.l-badge--accent {
  color: var(--accent-700);
  background: var(--accent-tint);
  border-color: var(--border-transparent);
}
.l-badge--success {
  color: var(--success);
  background: var(--success-tint);
}
.l-badge--warning {
  color: var(--warning);
  background: var(--warning-tint);
}
.l-badge--danger {
  color: var(--danger);
  background: var(--danger-tint);
}
.l-badge--info {
  color: var(--info);
  background: var(--info-tint);
}

.l-badge--pending {
  color: var(--warning);
  background: var(--warning-tint);
}
.l-badge--borrowing {
  color: var(--info);
  background: var(--info-tint);
}
.l-badge--returned {
  color: var(--success);
  background: var(--success-tint);
}
.l-badge--rejected {
  color: var(--danger);
  background: var(--danger-tint);
}
.l-badge--cancelled {
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border-color: var(--border-strong);
}
</style>
