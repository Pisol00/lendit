<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff, Check } from '@lucide/vue'
import LButton from '../components/ui/LButton.vue'
import LInput from '../components/ui/LInput.vue'
import { useToast } from '../composables/useToast'
import { useAuth } from '../composables/useAuth'
import { errorMessage } from '../lib/query'

const emit = defineEmits<{ success: [] }>()
const { t } = useI18n()
const { success, error: toastError } = useToast()
const { register } = useAuth()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

const ERROR_TOAST_MS = 6000

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirm: '',
})
const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirm: '',
})

const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)

watch(
  () => form.email,
  (v) => {
    if (errors.email && EMAIL_RE.test(v.trim())) errors.email = ''
  },
)
watch(
  () => form.password,
  (v) => {
    if (errors.password && v.length >= MIN_PASSWORD) errors.password = ''
  },
)

watch([() => form.password, () => form.confirm], () => {
  if (!form.confirm) {
    errors.confirm = ''
    return
  }
  errors.confirm = form.confirm === form.password ? '' : t('register.passwordMismatch')
})
const confirmMatches = computed(
  () => form.confirm.length > 0 && form.password.length > 0 && form.confirm === form.password,
)

async function onSubmit() {
  const firstName = form.firstName.trim()
  const lastName = form.lastName.trim()
  const email = form.email.trim()

  errors.firstName = firstName ? '' : t('validation.firstName')
  errors.lastName = lastName ? '' : t('validation.lastName')
  errors.email = !email
    ? t('login.emailRequired')
    : EMAIL_RE.test(email)
      ? ''
      : t('validation.emailInvalid')
  errors.password = form.password.length >= MIN_PASSWORD ? '' : t('register.passwordLength')
  errors.confirm = form.confirm === form.password ? '' : t('register.passwordMismatch')
  if (Object.values(errors).some(Boolean)) return

  loading.value = true
  try {
    await register({ firstName, lastName, email, password: form.password })
    success(t('register.success'))
    emit('success')
  } catch (err) {
    toastError(errorMessage(err, t('register.failed')), ERROR_TOAST_MS)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="reg min-h-svh max-h-svh overflow-y-auto">
    <div class="reg__card">
      <header class="reg__head">
        <h1 class="reg__title">{{ t('register.title') }}</h1>
        <p class="reg__sub">{{ t('register.subtitle') }}</p>
      </header>

      <form class="reg__form" novalidate @submit.prevent="onSubmit">
        <div class="reg__row">
          <LInput
            v-model="form.firstName"
            :label="t('profile.firstName')"
            autocomplete="given-name"
            required
            :error="errors.firstName"
          />
          <LInput
            v-model="form.lastName"
            :label="t('profile.lastName')"
            autocomplete="family-name"
            required
            :error="errors.lastName"
          />
        </div>

        <LInput
          v-model="form.email"
          :label="t('login.email')"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
          :error="errors.email"
        />

        <LInput
          v-model="form.password"
          :label="t('login.password')"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="t('register.passwordPlaceholder')"
          autocomplete="new-password"
          required
          :error="errors.password"
        >
          <template #suffix>
            <button
              type="button"
              class="reg__toggle"
              :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="showPassword" :size="18" aria-hidden="true" />
              <EyeOff v-else :size="18" aria-hidden="true" />
            </button>
          </template>
        </LInput>

        <LInput
          v-model="form.confirm"
          :label="t('register.confirmPassword')"
          :type="showConfirm ? 'text' : 'password'"
          autocomplete="new-password"
          required
          :error="errors.confirm"
        >
          <template #suffix>
            <Check
              v-if="confirmMatches"
              class="reg__match"
              :size="17"
              :stroke-width="2.5"
              aria-hidden="true"
            />
            <button
              type="button"
              class="reg__toggle"
              :aria-label="showConfirm ? t('common.hidePassword') : t('common.showPassword')"
              @click="showConfirm = !showConfirm"
            >
              <Eye v-if="showConfirm" :size="18" aria-hidden="true" />
              <EyeOff v-else :size="18" aria-hidden="true" />
            </button>
          </template>
        </LInput>

        <LButton type="submit" size="lg" block :loading="loading">
          {{ t('register.submit') }}
        </LButton>
      </form>

      <p class="reg__foot">
        {{ t('register.haveAccount') }}
        <RouterLink class="reg__link" :to="{ name: 'login' }">{{ t('register.login') }}</RouterLink>
      </p>
    </div>
  </main>
</template>

<style scoped>
.reg {
  min-height: var(--screen-height);
  max-height: var(--screen-height);
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: var(--bg-subtle);
}

.reg__card {
  width: 100%;
  max-width: 28rem;
  padding: var(--space-7) var(--space-6);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.reg__head {
  margin-bottom: var(--space-6);
  text-align: center;
}
.reg__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
}
.reg__sub {
  color: var(--ink-soft);
  font-size: var(--text-sm);
  margin: 0;
}

.reg__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.reg__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.reg__toggle {
  display: inline-flex;
  padding: var(--space-1);
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.reg__toggle:hover {
  color: var(--ink);
}
.reg__match {
  color: var(--success);
  flex-shrink: 0;
}

.reg__foot {
  margin: var(--space-5) 0 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.reg__link {
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 420px) {
  .reg__row {
    grid-template-columns: 1fr;
  }
}
</style>
