<script setup lang="ts">
defineProps({
  variant: { type: String, default: 'text' },
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  radius: { type: String, default: '' },
})
</script>

<template>
  <span
    class="l-skeleton"
    :class="`l-skeleton--${variant}`"
    :style="{
      width: width || undefined,
      height: height || undefined,
      borderRadius: radius || undefined,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.l-skeleton {
  display: block;

  background: color-mix(in srgb, var(--ink) 9%, var(--surface));
  animation: l-skeleton-pulse 1.2s ease-in-out infinite;
}

.l-skeleton--text {
  height: 0.75rem;
  border-radius: var(--radius-sm);
}
.l-skeleton--block {
  height: 100%;
  border-radius: var(--radius);
}
.l-skeleton--circle {
  border-radius: var(--radius-round);
  aspect-ratio: 1;
}

@keyframes l-skeleton-pulse {
  50% {
    opacity: 0.55;
  }
}
@media (prefers-reduced-motion: reduce) {
  .l-skeleton {
    animation: none;
  }
}
</style>
