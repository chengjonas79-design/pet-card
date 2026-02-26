<template>
  <div id="pet-card-app">
    <router-view v-slot="{ Component }">
      <transition name="slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { trackEvent, trackFunnel, trackViralEntryIfNeeded, EVENTS, FUNNEL_STEPS } from './utils/tracking'

const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    trackEvent(EVENTS.PAGE_VIEW, {
      route_name: route.name || '',
      page_path: route.path
    })

    const step = getRouteFunnelStep(route.path)
    if (step) {
      trackFunnel(step, {
        route_name: route.name || ''
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  trackViralEntryIfNeeded()
})

function getRouteFunnelStep(path) {
  if (path === '/') return FUNNEL_STEPS.LANDING
  if (path === '/info') return FUNNEL_STEPS.INFO_VIEW
  if (path === '/card') return FUNNEL_STEPS.CARD_VIEW
  return ''
}
</script>

<style>
#pet-card-app {
  max-width: 750px;
  margin: 0 auto;
  min-height: 100vh;
  background: #FFF8F5;
  position: relative;
  overflow-x: hidden;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
