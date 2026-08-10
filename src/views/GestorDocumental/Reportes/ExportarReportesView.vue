<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 fade-in relative overflow-hidden">
    
    <!-- Background Decorators (Gradients) -->
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-400/20 via-purple-400/20 to-transparent blur-3xl -z-10 pointer-events-none"></div>
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-emerald-400/20 via-teal-400/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>

    <div class="max-w-5xl mx-auto z-10 relative">
      
      <!-- Encabezado con efecto Glass -->
      <div class="mb-10 p-6 rounded-3xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div class="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
            Reporte Unificado
          </h1>
          <p class="text-base font-medium text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
            Genere un reporte maestro que consolida todos los expedientes, su tamaño en disco y el estado de vencimiento de sus documentos anexos.
          </p>
        </div>
      </div>

      <!-- Tarjeta Principal Unificada -->
      <div class="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-black/40 border border-white/50 dark:border-gray-700/50 overflow-hidden transition-all duration-300">
        <!-- Brillo superior -->
        <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-90"></div>
        
        <div class="p-8 md:p-10">
          
          <div class="space-y-6">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <svg class="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filtros Opcionales
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div class="relative">
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Fecha Inicio (Creación)</label>
                <input type="date" v-model="filtros.startDate" 
                       class="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500/50 sm:text-base p-4 transition-all outline-none" />
              </div>
              <div class="relative">
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Fecha Fin (Creación)</label>
                <input type="date" v-model="filtros.endDate" 
                       class="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500/50 sm:text-base p-4 transition-all outline-none" />
              </div>
            </div>
            
            <p class="text-sm text-gray-500 dark:text-gray-400 px-2 italic">
              * Si deja los campos vacíos, se descargará la base de datos completa. El reporte incluye columnas para el tamaño del archivo y el estado de vencimiento.
            </p>
          </div>

          <div class="mt-10 pt-8 border-t border-gray-100 dark:border-gray-700">
            <button
              @click="descargarUnificado"
              :disabled="isDownloading"
              class="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-70 text-white rounded-2xl transition-all shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 font-bold text-lg tracking-wide transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg v-if="isDownloading" class="animate-spin -ml-1 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {{ isDownloading ? 'Procesando Base de Datos...' : 'Descargar Reporte Único (CSV)' }}
            </button>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

const isDownloading = ref(false);

const filtros = ref({
    startDate: '',
    endDate: ''
});

const descargarCSV = async (endpoint: string, filename: string) => {
    try {
        const response = await fetch(`${API_URL}/gestor/exportar/${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${authStore.token}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            alert(`Error: ${data.detail || 'No se pudo descargar el reporte'}`);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error descargando CSV:', error);
        alert('Ocurrió un error inesperado al intentar descargar el archivo.');
    }
};

const descargarUnificado = async () => {
    isDownloading.value = true;
    let url = 'unificado?';
    if (filtros.value.startDate) url += `start_date=${filtros.value.startDate}&`;
    if (filtros.value.endDate) url += `end_date=${filtros.value.endDate}&`;
    
    await descargarCSV(url, `reporte_maestro_documentos_${new Date().toISOString().slice(0,10)}.csv`);
    isDownloading.value = false;
};
</script>

<style scoped>
.fade-in { animation: fadeIn 0.5s ease-out forwards; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>
