import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/index.html',
    redirect: '/'
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue')
  },
  {
    path: '/info',
    name: 'InfoForm',
    component: () => import('../views/InfoForm.vue')
  },
  {
    path: '/card',
    name: 'CardPreview',
    component: () => import('../views/CardPreview.vue')
  },
  {
    path: '/private',
    name: 'PrivateEntry',
    component: () => import('../views/PrivateEntry.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
