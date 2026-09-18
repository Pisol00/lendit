<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import LToaster from './components/ui/LToaster.vue'
import { useToast } from './composables/useToast'
import { useAuth } from './composables/useAuth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { info } = useToast()
const { isAuthenticated, logout, landingRoute } = useAuth()

function onLoginSuccess() {
  router.push(landingRoute())
}

async function onLogout() {
  await logout()
  info(t('nav.signedOut'))
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="app-shell min-h-svh max-h-svh overflow-hidden">
    <RouterView v-if="route.meta.public" v-slot="{ Component }">
      <component :is="Component" @success="onLoginSuccess" />
    </RouterView>

    <AppLayout v-else-if="isAuthenticated" :active="route.name" @logout="onLogout">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </AppLayout>

    <LToaster />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: var(--screen-height);
  max-height: var(--screen-height);
  overflow: hidden;
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 160ms var(--ease),
    transform 160ms var(--ease);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity 160ms var(--ease);
  }
  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}
</style>
