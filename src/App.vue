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
import { onMounted } from 'vue'
import { trackEvent, EVENTS } from './utils/tracking'

onMounted(() => {
  trackEvent(EVENTS.PAGE_VIEW)
})
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
