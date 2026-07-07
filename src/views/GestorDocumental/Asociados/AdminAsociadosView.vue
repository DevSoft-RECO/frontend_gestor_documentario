<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

interface Asociado {
  id: number
  codigo_cliente: string | null
  dpi: string
  nombre_completo: string
  direccion: string
  fecha_registro: string
  total_documentos: number
}

const authStore = useAuthStore()
const router = useRouter()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const asociados = ref<Asociado[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const currentPage = ref(1)
const totalAsociados = ref(0)
const itemsPerPage = ref(10)

// Control del Modal de Confirmación
const showConfirmModal = ref(false)
const selectedAsociado = ref<Asociado | null>(null)
const confirmInputText = ref('')
const isDeleting = ref(false)

const getHeaders = () => {
  const token = sessionStorage.getItem('access_token')
  return { 'Authorization': `Bearer ${token}` }
}

const loadAsociados = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`${API_URL}/api/gestor/admin/asociados?page=${currentPage.value}&limit=${itemsPerPage.value}&search=${encodeURIComponent(searchQuery.value)}`, {
      headers: getHeaders()
    })
    if (res.ok) {
      const data = await res.json()
      asociados.value = data.asociados
      totalAsociados.value = data.total
    } else {
      if (res.status === 403) {
        router.push('/unauthorized')
      }
    }
  } catch (err) {
    console.error('Error al cargar asociados de administración:', err)
  } finally {
    isLoading.value = false
  }
}

// Filtro por búsqueda del lado del servidor
const asociadosFiltrados = computed(() => asociados.value)

// Recargar al buscar
watch(searchQuery, () => {
  currentPage.value = 1
  loadAsociados()
})

const changePage = (page: number) => {
  currentPage.value = page
  loadAsociados()
}

// Abrir diálogo de eliminación
const triggerDelete = (asociado: Asociado) => {
  selectedAsociado.value = asociado
  confirmInputText.value = ''
  showConfirmModal.value = true
}

// Confirmar y realizar borrado en backend
const executeDelete = async () => {
  if (!selectedAsociado.value || confirmInputText.value !== 'confirmar') return

  isDeleting.value = true
  try {
    const res = await fetch(`${API_URL}/api/gestor/admin/asociados/${selectedAsociado.value.id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (res.ok) {
      showConfirmModal.value = false
      selectedAsociado.value = null
      confirmInputText.value = ''
      loadAsociados()
    } else {
      const err = await res.json()
      alert(err.error || 'Error al eliminar asociado')
    }
  } catch (err) {
    console.error(err)
    alert('Ocurrió un error al intentar eliminar el asociado')
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  if (!authStore.hasRole('Super Admin')) {
    router.push('/unauthorized')
    return
  }
  loadAsociados()
})
</script>

<template>
  <div class="admin-asociados-view min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 font-['Plus_Jakarta_Sans'] p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300">
    <div class="w-full space-y-8">
      
      <!-- ENCABEZADO -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span class="text-xs font-black tracking-widest text-red-600 dark:text-red-400 uppercase">Sección de Alta Seguridad</span>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 font-['Outfit']">Administrar Portafolio de Asociados</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Supervisa las cuentas de clientes asociadas, accede directamente a sus expedientes o realiza eliminaciones definitivas en cascada.</p>
        </div>
        
        <!-- Stats rápidos -->
        <div class="flex gap-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-5 py-3 rounded-2xl shadow-sm text-center">
            <p class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider">Total Asociados</p>
            <p class="text-lg font-black mt-0.5 text-indigo-600 dark:text-indigo-400 font-mono">{{ totalAsociados }}</p>
          </div>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-5 py-3 rounded-2xl shadow-sm text-center">
            <p class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider">Buscados / Filtrados</p>
            <p class="text-lg font-black mt-0.5 text-emerald-500 font-mono">{{ totalAsociados }}</p>
          </div>
        </div>
      </div>

      <!-- BARRA DE ACCIÓN Y BÚSQUEDA -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div class="relative w-full md:max-w-md">
          <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Buscar por Nombre, DPI o Código de Cliente..." 
            class="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div class="text-[0.7rem] text-slate-400 italic">
          * Para crear un nuevo asociado, usa la vista de <strong>Buscador de Asociados</strong>.
        </div>
      </div>

      <!-- CARGADORES Y TABLA -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin"></div>
        <p class="text-sm font-bold text-slate-400">Cargando base de datos de asociados...</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[0.65rem] font-extrabold uppercase text-slate-400 tracking-wider">
                <th class="p-4">DPI / Código</th>
                <th class="p-4">Nombre Completo</th>
                <th class="p-4">Dirección</th>
                <th class="p-4">Documentos Cargados</th>
                <th class="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-150 dark:divide-slate-800">
              <tr v-for="asociado in asociadosFiltrados" :key="asociado.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all">
                <td class="p-4 font-mono text-slate-500 dark:text-slate-400">
                  <p class="font-extrabold text-slate-700 dark:text-slate-355">{{ asociado.dpi }}</p>
                  <p class="text-[0.6rem] text-slate-400">{{ asociado.codigo_cliente || 'N/A' }}</p>
                </td>
                <td class="p-4 font-bold text-slate-800 dark:text-slate-100">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-sm">👤</div>
                    <div>
                      <p class="font-extrabold text-slate-800 dark:text-slate-100 hover:text-indigo-650 cursor-pointer" @click="router.push(`/admin/gestor/asociados/${asociado.id}`)">
                        {{ asociado.nombre_completo }}
                      </p>
                      <p class="text-[0.6rem] text-slate-400 font-normal">Registrado: {{ new Date(asociado.fecha_registro).toLocaleDateString() }}</p>
                    </div>
                  </div>
                </td>
                <td class="p-4 text-slate-500 dark:text-slate-400 max-w-[280px] truncate">
                  {{ asociado.direccion || 'Sin dirección registrada.' }}
                </td>
                <td class="p-4">
                  <span 
                    :class="[
                      'px-3 py-1 rounded-full font-black font-mono text-[0.65rem] border',
                      asociado.total_documentos > 5 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/10'
                        : asociado.total_documentos > 0
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900/10'
                        : 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/10'
                    ]"
                  >
                    📂 {{ asociado.total_documentos }} docs
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex items-center justify-center gap-3">
                    <button 
                      @click="router.push(`/admin/gestor/asociados/${asociado.id}`)" 
                      class="btn-portfolio" 
                      title="Administrar Portafolio"
                    >
                      📁 Ver Portafolio
                    </button>
                    <button 
                      @click="triggerDelete(asociado)" 
                      class="btn-delete" 
                      title="Eliminar Asociado"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="asociadosFiltrados.length === 0">
                <td colspan="5" class="p-20 text-center text-slate-400">
                  <p class="text-base mb-2">👤 No se encontraron asociados</p>
                  <p class="text-xs text-slate-500">Prueba con otro término de búsqueda o registra nuevos clientes.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINACIÓN -->
        <div v-if="totalAsociados > itemsPerPage" class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
          <div class="text-xs text-slate-500 dark:text-slate-400">
            Mostrando <span class="font-bold text-slate-800 dark:text-slate-200">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> a 
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ Math.min(currentPage * itemsPerPage, totalAsociados) }}</span> de 
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ totalAsociados }}</span> asociados
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="changePage(currentPage - 1)" 
              :disabled="currentPage === 1"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Anterior
            </button>
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Pág. {{ currentPage }} de {{ Math.ceil(totalAsociados / itemsPerPage) }}
            </span>
            <button 
              @click="changePage(currentPage + 1)" 
              :disabled="currentPage >= Math.ceil(totalAsociados / itemsPerPage)"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>

      </div>

    </div>

    <!-- MODAL DE CONFIRMACIÓN DE ALTA SEGURIDAD -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showConfirmModal && selectedAsociado" class="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 text-center">
          
          <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center text-3xl mx-auto shadow-inner border border-red-150 dark:border-red-900/10">
            ⚠️
          </div>

          <div class="space-y-2">
            <h3 class="font-extrabold text-lg tracking-tight font-['Outfit'] text-slate-900 dark:text-white">¿Confirmar Acción Destructiva?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Estás a punto de borrar definitivamente al asociado <strong class="text-red-500 font-extrabold">{{ selectedAsociado.nombre_completo }}</strong>.
            </p>
            <div class="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 p-4 rounded-2xl text-[0.68rem] text-red-600 dark:text-red-400 font-bold text-left space-y-1">
              <p>Esta acción es irreversible y realizará lo siguiente:</p>
              <ul class="list-disc pl-4 space-y-0.5">
                <li>Eliminará el portafolio del cliente completo.</li>
                <li>Eliminará todos los documentos PDF asociados en la nube (GCS).</li>
                <li>Borrará todos los índices y metadatos del expediente.</li>
              </ul>
            </div>
          </div>

          <div class="space-y-3">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-widest">
              Escribe la palabra <span class="text-red-500 underline">confirmar</span> para validar la identidad:
            </label>
            <input 
              type="text" 
              v-model="confirmInputText" 
              placeholder="Escribe 'confirmar' aquí..." 
              class="w-full p-3 text-center text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 font-bold tracking-widest text-red-500 uppercase"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showConfirmModal = false" :disabled="isDeleting" class="btn-cancel-modal">
              <span>Cancelar</span>
            </button>
            <button 
              @click="executeDelete" 
              :disabled="confirmInputText !== 'confirmar' || isDeleting" 
              class="btn-confirm-modal"
            >
              <span v-if="isDeleting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></span>
              <span>{{ isDeleting ? 'Borrando...' : 'Sí, Eliminar Todo' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.btn-portfolio {
  background: #4f46e5;
  color: white;
  border: none;
  font-weight: 800;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.55rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-portfolio:hover {
  background: #4338ca;
  transform: translateY(-1px);
}

.btn-delete {
  background: #fef2f2;
  color: #ef4444;
  border: 1.5px solid #fee2e2;
  font-weight: 800;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.52rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-delete:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
  transform: translateY(-1px);
}

:root.dark .btn-delete {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.15);
}
:root.dark .btn-delete:hover {
  background: #ef4444;
  color: white;
}

.btn-cancel-modal {
  flex: 1;
  background: transparent;
  color: #64748b;
  border: 1.5px solid #cbd5e1;
  font-weight: 800;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel-modal:hover {
  background: #f1f5f9;
  color: #334155;
}
:root.dark .btn-cancel-modal {
  border-color: #334155;
  color: #94a3b8;
}
:root.dark .btn-cancel-modal:hover {
  background: #1e293b;
  color: white;
}

.btn-confirm-modal {
  flex: 1;
  background: #ef4444;
  color: white;
  border: none;
  font-weight: 800;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-confirm-modal:hover:not(:disabled) {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}
.btn-confirm-modal:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
