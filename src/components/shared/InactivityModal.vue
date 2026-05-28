<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Formatear segundos a MM:SS
const formattedTime = computed(() => {
  const minutes = Math.floor(authStore.inactivityCountdown / 60)
  const seconds = authStore.inactivityCountdown % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const keepAlive = async () => {
  await authStore.sendHeartbeatPing()
}
</script>

<template>
  <div v-if="authStore.showInactivityModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
      <div class="p-6">
        <div class="flex items-center justify-center w-16 h-16 mx-auto bg-amber-100 rounded-full mb-4">
          <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-center text-slate-800 mb-2">Tu sesión está a punto de expirar</h3>
        <p class="text-slate-600 text-center mb-6">
          Por tu seguridad, cerraremos tu sesión por inactividad en:
        </p>
        <div class="text-5xl font-mono font-bold text-center text-amber-500 mb-8 tracking-wider">
          {{ formattedTime }}
        </div>
        <div class="flex flex-col space-y-3">
          <button 
            @click="keepAlive" 
            :disabled="authStore.isHeartbeatLoading"
            class="w-full flex justify-center items-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-blue-300 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
            <svg v-if="authStore.isHeartbeatLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ authStore.isHeartbeatLoading ? 'Renovando sesión...' : 'Continuar trabajando' }}
          </button>
          <button 
            @click="authStore.logout" 
            :disabled="authStore.isHeartbeatLoading"
            class="w-full py-3 px-4 font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer">
            Cerrar sesión ahora
          </button>
        </div>
      </div>
      <div class="bg-slate-50 px-6 py-4 border-t border-slate-100">
        <p class="text-xs text-center text-slate-500">
          Yamankutx SSO Enterprise Security
        </p>
      </div>
    </div>
  </div>
</template>
