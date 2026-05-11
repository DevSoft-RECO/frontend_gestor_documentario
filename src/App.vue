<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  // Detect '/callback' to avoid premature checkAuth
  const isCallbackRoute = window.location.pathname.startsWith('/callback');

  if (!isCallbackRoute) {
      await authStore.checkAuth() 
  }

  // Remove preloader with fade-out
  const loader = document.getElementById('loading-wrapper');
  if (loader) {
    loader.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.remove();
        }, 500);
    }, 500);
  }
})
</script>

<template>
  <RouterView />
</template>
