<script setup lang="ts">
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  hint: { type: String, default: '' },

  compact: { type: Boolean, default: false },

  tone: { type: String, default: 'empty' },
})
</script>

<template>
  <div
    class="l-empty"
    :class="{ 'l-empty--compact': compact, 'l-empty--error': tone === 'error' }"
    :role="tone === 'error' ? 'alert' : undefined"
  >
    <span v-if="icon" class="l-empty__icon" aria-hidden="true">
      <component :is="icon" :size="compact ? 20 : 28" :stroke-width="1.5" />
    </span>
    <h3 class="l-empty__title">{{ title }}</h3>
    <p v-if="hint" class="l-empty__hint">{{ hint }}</p>
    <div v-if="$slots.action" class="l-empty__action"><slot name="action" /></div>
  </div>
</template>

<style scoped>
.l-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-8) var(--space-4);
}
.l-empty--compact {
  padding: var(--space-5) var(--space-3);
}

.l-empty--error .l-empty__icon {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.l-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  margin-bottom: var(--space-4);
  color: var(--accent);
  background: var(--accent-tint);
  border-radius: var(--radius-round);
}

.l-empty--compact .l-empty__icon {
  width: 2.25rem;
  height: 2.25rem;
  margin-bottom: var(--space-3);
}
.l-empty--compact .l-empty__title {
  font-size: var(--text-sm);
}
.l-empty--compact .l-empty__hint {
  font-size: var(--text-xs);
}

.l-empty__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--ink);
}
.l-empty__hint {
  max-width: 28rem;
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  color: var(--ink-soft);
}
.l-empty__action {
  margin-top: var(--space-5);
}
</style>
