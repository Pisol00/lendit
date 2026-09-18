<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },

  optionalText: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const clearLabel = computed(() => t('common.clearSearch'))

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

const uid = useId()
const inputId = `l-input-${uid}`
const descId = `l-input-desc-${uid}`

const showClear = computed(
  () => props.type === 'search' && !props.disabled && String(props.modelValue ?? '') !== '',
)

function clear() {
  emit('update:modelValue', '')

  document.getElementById(inputId)?.focus()
}
</script>

<template>
  <div class="l-field" :class="{ 'has-error': error }">
    <label v-if="label" :for="inputId" class="l-field__label">
      {{ label }}
      <span v-if="required" class="l-field__req" aria-hidden="true">*</span>
      <span v-else-if="optionalText" class="l-field__opt">{{ optionalText }}</span>
    </label>

    <div class="l-field__control">
      <span v-if="$slots.prefix" class="l-field__affix l-field__affix--prefix">
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="hint || error ? descId : undefined"
        class="l-field__input"
        :class="{
          'has-prefix': $slots.prefix,
          'has-suffix': $slots.suffix || (showClear && !$slots.suffix),
        }"
        @input="onInput"
      />

      <span v-if="$slots.suffix" class="l-field__affix l-field__affix--suffix">
        <slot name="suffix" />
      </span>
      <button
        v-else-if="showClear"
        type="button"
        class="l-field__affix l-field__affix--suffix l-field__clear"
        :aria-label="clearLabel"
        :title="clearLabel"
        @click="clear"
      >
        <X :size="15" :stroke-width="2.5" aria-hidden="true" />
      </button>
    </div>

    <p v-if="error" :id="descId" class="l-field__msg l-field__msg--error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="descId" class="l-field__msg">{{ hint }}</p>
  </div>
</template>

<style scoped>
.l-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.l-field__label {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.01em;
}
.l-field__req {
  color: var(--danger);
  margin-left: 2px;
}

.l-field__opt {
  margin-left: 6px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-faint);
}

.l-field__control {
  position: relative;
  display: flex;
  align-items: center;
}

.l-field__input {
  width: 100%;
  min-height: var(--control-md);
  padding: 0 var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--ink);
  background: var(--surface-solid);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  transition:
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.l-field__input.has-prefix {
  padding-left: 2.75rem;
}
.l-field__input.has-suffix {
  padding-right: 2.75rem;
}
.l-field__input::placeholder {
  color: var(--ink-faint);
}

.l-field__input:focus {
  outline: none;
  border-color: var(--control-border-focus);
}
.l-field__input:disabled {
  background: var(--bg-subtle);
  color: var(--ink-faint);
  cursor: not-allowed;
}

.has-error .l-field__input {
  border-color: var(--danger);
}
.has-error .l-field__input:focus {
  border-color: var(--danger);
}

.l-field__affix {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
  pointer-events: none;
}
.l-field__affix--prefix {
  left: var(--space-3);
}
.l-field__affix--suffix {
  right: var(--space-3);
  pointer-events: auto;
}

.l-field__input[type='search']::-webkit-search-cancel-button,
.l-field__input[type='search']::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}
.l-field__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: var(--radius-round);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-field__clear:hover {
  color: var(--ink);
  background: var(--bg-subtle);
}

.l-field__msg {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--ink-soft);
}
.l-field__msg--error {
  color: var(--danger);
  font-weight: 600;
}
</style>
