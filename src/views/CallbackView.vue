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
    class="min-h-screen flex items-center justify-center px-4 transition-all duration-500"
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

      <!-- Loader (Holographic Document Scanner) -->
      <div class="flex justify-center py-4">
        <div class="doc-scanner-wrapper">
          <svg class="doc-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Document Body -->
            <rect class="doc-paper" x="15" y="15" width="70" height="90" rx="6" />
            
            <!-- Folded Corner -->
            <path d="M65 15 L85 35 L65 35 Z" fill="url(#foldGrad)" />
            <path d="M65 35 L85 35 L65 15 Z" stroke="url(#docBorderGrad)" stroke-width="1.5" fill="none" />
            
            <!-- Mock text lines (inside the document) -->
            <rect class="doc-line" x="27" y="42" width="46" height="4" rx="2" fill="url(#lineGrad)" />
            <rect class="doc-line delayed-1" x="27" y="54" width="36" height="4" rx="2" fill="url(#lineGrad)" />
            <rect class="doc-line delayed-2" x="27" y="66" width="42" height="4" rx="2" fill="url(#lineGrad)" />
            <rect class="doc-line delayed-3" x="27" y="78" width="28" height="4" rx="2" fill="url(#lineGrad)" />
            
            <!-- Holographic scanner laser line -->
            <g class="scan-laser">
              <line x1="10" y1="25" x2="90" y2="25" stroke="url(#laserGrad)" stroke-width="2.5" />
              <!-- Soft glow under the laser -->
              <rect x="10" y="24" width="80" height="2" fill="url(#laserGlowGrad)" opacity="0.5" />
            </g>
            
            <!-- Definitions of Gradients -->
            <defs>
              <linearGradient id="docBorderGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--grad-start)" />
                <stop offset="100%" stop-color="var(--grad-end)" />
              </linearGradient>
              <linearGradient id="foldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--grad-start)" stop-opacity="0.9" />
                <stop offset="100%" stop-color="var(--grad-end)" stop-opacity="0.2" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="var(--grad-start)" stop-opacity="0.9" />
                <stop offset="100%" stop-color="var(--grad-end)" stop-opacity="0.3" />
              </linearGradient>
              <linearGradient id="laserGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="transparent" />
                <stop offset="15%" stop-color="var(--laser-color)" />
                <stop offset="50%" stop-color="var(--laser-color)" />
                <stop offset="85%" stop-color="var(--laser-color)" />
                <stop offset="100%" stop-color="transparent" />
              </linearGradient>
              <linearGradient id="laserGlowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--laser-color)" />
                <stop offset="100%" stop-color="transparent" />
              </linearGradient>
            </defs>
          </svg>
          
          <!-- Dashed Outer Data Ring -->
          <div class="glow-ring"></div>
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

<style scoped>
.min-h-screen {
  background: var(--bg-gradient);
  --grad-start: #0284c7;
  --grad-end: #10b981;
  --laser-color: #10b981;
  --paper-fill: rgba(219, 234, 254, 0.7);
  --ring-border: rgba(2, 132, 199, 0.2);
  --ring-dot: #0284c7;
  --svg-glow: rgba(2, 132, 199, 0.25);
  transition: background-color 0.3s ease;
}

:global(.dark) .min-h-screen {
  --grad-start: #00f2fe;
  --grad-end: #00ff87;
  --laser-color: #39ff14;
  --paper-fill: rgba(10, 25, 47, 0.55);
  --ring-border: rgba(0, 242, 254, 0.2);
  --ring-dot: #39ff14;
  --svg-glow: rgba(0, 242, 254, 0.4);
}

.doc-scanner-wrapper {
  position: relative;
  width: 90px;
  height: 105px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.doc-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px var(--svg-glow));
}

.doc-paper {
  fill: var(--paper-fill);
  stroke: url(#docBorderGrad);
  stroke-width: 2;
  transition: fill 0.3s ease;
}

.doc-line {
  animation: pulse-line 2.5s infinite ease-in-out;
  transform-origin: left;
}
.doc-line.delayed-1 { animation-delay: 0.4s; }
.doc-line.delayed-2 { animation-delay: 0.8s; }
.doc-line.delayed-3 { animation-delay: 1.2s; }

@keyframes pulse-line {
  0%, 100% {
    opacity: 0.3;
    transform: scaleX(0.95);
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
  }
}

.scan-laser {
  animation: scan-translation 3s ease-in-out infinite;
}

@keyframes scan-translation {
  0%, 100% {
    transform: translateY(0px);
    opacity: 0.2;
  }
  50% {
    transform: translateY(75px);
    opacity: 1;
    filter: drop-shadow(0 0 4px var(--laser-color));
  }
}

.glow-ring {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 2px dashed var(--ring-border);
  animation: rotate-ring 15s linear infinite;
  pointer-events: none;
}

.glow-ring::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  width: 8px;
  height: 8px;
  background: var(--ring-dot);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--ring-dot);
}

@keyframes rotate-ring {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

