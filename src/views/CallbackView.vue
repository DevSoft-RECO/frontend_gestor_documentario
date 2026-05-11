<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const status = ref('Validando acceso institucional')
const subStatus = ref(
  'Estamos verificando tu identidad con los sistemas de la Cooperativa YAMAN KUTX.'
)

// Semáforo Global para evitar race-conditions si Vue monta doble
let isProcessingCallback = false;

onMounted(async () => {
  console.log(">>> [PKCE Callback] Iniciando procesamiento...");
  if (isProcessingCallback) {
    console.warn(">>> [PKCE Callback] YA SE ESTÁ PROCESANDO. CANCELANDO DUPLICADO.");
    return;
  }
  isProcessingCallback = true;

  const code = route.query.code as string;
  console.log(">>> [PKCE Callback] Código recibido de la Madre:", code);
  
  if (!code) {
    console.error(">>> [PKCE Callback] ERROR: No hay código en la URL.");
    status.value = 'Código no encontrado'
    subStatus.value = 'No se recibió el código de autorización necesario.'
    return;
  }


  // Limpiar URL
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    status.value = 'Canjeando credenciales'
    subStatus.value = 'Iniciando intercambio seguro de llaves (PKCE)...'

    // 2. Procesar el intercambio de código en el store
    await authStore.handlePKCECallback(code);

    status.value = 'Acceso autorizado'
    subStatus.value = 'Bienvenido a los sistemas internos de la Cooperativa YAMAN KUTX.'

    // Redirección Dinámica: Volver a donde el usuario intentaba entrar
    const redirectUrl = sessionStorage.getItem('auth_redirect_to') || { name: 'dashboard' };
    if (sessionStorage.getItem('auth_redirect_to')) {
       sessionStorage.removeItem('auth_redirect_to');
    }

    // --- REDIRECCIÓN AUTOMÁTICA ---
    // Si necesitas ver errores en consola ANTES de la redirección, 
    // comenta las siguientes líneas de 'setTimeout' y 'router.push'.
    setTimeout(() => { 
      router.push(redirectUrl as any) 
    }, 900);

  } catch (e) {

    console.error(">>> [PKCE Callback] FATAL ERROR INTERCAMBIO:", e);
    status.value = 'Error de autenticación'

    subStatus.value = 'No fue posible validar tu sesión. Por favor, intenta nuevamente.'
  }
})
</script>
<template>
  <div
    class="min-h-screen flex items-center justify-center px-4
           bg-gradient-to-br from-[#0B3C5D]/10 to-[#1FAF8B]/10
           dark:from-gray-900 dark:to-gray-950"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900
             shadow-2xl border border-gray-200 dark:border-gray-800
             p-8 text-center space-y-6"
    >
      <!-- Marca -->
      <div class="space-y-2">
        <div class="flex justify-center">
          <img src="@/assets/logoyk.svg" alt="Logo Yaman Kutx" class="brand-logo" />
        </div>

        <h1 class="text-lg font-semibold text-[#0B3C5D] dark:text-white">
          Cooperativa YAMAN KUTX
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Plataforma Corporativa
        </p>
      </div>

      <!-- Loader -->
      <div class="flex justify-center py-2">
        <div class="relative h-10 w-10">
          <div
            class="absolute inset-0 rounded-full border-2
                   border-gray-300 dark:border-gray-700"
          ></div>
          <div
            class="absolute inset-0 rounded-full border-2
                   border-t-[#1FAF8B] animate-spin"
          ></div>
        </div>
      </div>

      <!-- Estado -->
      <div class="space-y-2">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">
          {{ status }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ subStatus }}
        </p>
      </div>

      <!-- Mensaje institucional -->
      <div
        class="text-xs text-gray-400 dark:text-gray-500
               border-t border-gray-200 dark:border-gray-800 pt-4"
      >
        Este proceso garantiza un acceso seguro a los sistemas internos de la
        <span class="font-medium text-[#0B3C5D] dark:text-[#1FAF8B]">
          Cooperativa YAMAN KUTX
        </span>.
        <br />
        Por favor, no cierres ni recargues esta ventana.
      </div>
    </div>
  </div>
</template>

