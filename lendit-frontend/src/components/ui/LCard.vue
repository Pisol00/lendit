<script setup lang="ts">
defineProps({
  padding: { type: String, default: 'md' },
  interactive: { type: Boolean, default: false },
})
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :class="['l-card', `l-card--pad-${padding}`, { 'l-card--interactive': interactive }]"
  >
    <slot />
  </component>
</template>

<style scoped>
.l-card {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: inherit;
  font: inherit;
}
.l-card--pad-none {
  padding: 0;
}
.l-card--pad-sm {
  padding: var(--space-4);
}
.l-card--pad-md {
  padding: var(--space-5);
}
.l-card--pad-lg {
  padding: var(--space-6);
}

.l-card--interactive {
  cursor: pointer;
  transition:
    transform var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
  will-change: transform;
}
.l-card--interactive:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.l-card--interactive:active {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
@media (prefers-reduced-motion: reduce) {
  .l-card--interactive:hover,
  .l-card--interactive:active {
    transform: none;
  }
}
</style>
