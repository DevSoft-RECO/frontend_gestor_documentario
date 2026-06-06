<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PDFViewer from '@/components/Manuales/PDFViewer.vue'

interface Actualizacion {
  id: number
  manual_documento_id: number
  numero_acta: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  descripcion?: string
  file_path: string
  total_paginas: number
  fecha_creacion: string
}

interface Manual {
  id: number
  manual_subcategoria_id: number
  titulo: string
  file_path: string
  total_paginas: number
  fecha_creacion: string
  ultima_actualizacion: string
  numero_acta?: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  actualizaciones?: Actualizacion[]
}

interface Subcategoria {
  id: number
  manual_categoria_id: number
  nombre: string
  estado: boolean
  documentos: Manual[]
}

interface Categoria {
  id: number
  nombre: string
  estado: boolean
  subcategorias: Subcategoria[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const biblioteca = ref<Categoria[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategoryId = ref<number | 'all'>('all')

// Visor PDF State
const showViewer = ref(false)
const selectedManual = ref<Manual | null>(null)

// --- Data Fetching (Biblioteca Filtrada) ---
const loadBiblioteca = async () => {
  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/manuales/biblioteca`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      biblioteca.value = await res.json()
    } else {
      console.error('Error cargando manuales')
    }
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// --- Búsqueda e Indexación Reactiva Extrema (Rendimiento de Bala) ---
const filteredBiblioteca = computed(() => {
  if (!biblioteca.value) return []

  let query = searchQuery.value.toLowerCase().trim()
  
  return biblioteca.value.map(cat => {
    // 1. Filtrar por Categoría Seleccionada en el Menu Lateral
    if (selectedCategoryId.value !== 'all' && cat.id !== selectedCategoryId.value) {
      return null
    }

    // 2. Si no hay búsqueda, retornar completa
    if (query === '') {
      return cat
    }

    const subcats = cat.subcategorias.map(sub => {
      const docs = sub.documentos.filter(doc => 
        doc.titulo.toLowerCase().includes(query) || 
        sub.nombre.toLowerCase().includes(query) ||
        (doc.numero_acta && doc.numero_acta.toLowerCase().includes(query)) ||
        (doc.actualizaciones && doc.actualizaciones.some(upd => upd.numero_acta.toLowerCase().includes(query)))
      )
      
      if (docs.length > 0) {
        return { ...sub, documentos: docs }
      }
      return null
    }).filter(s => s !== null) as Subcategoria[]

    if (subcats.length > 0) {
      return { ...cat, subcategorias: subcats }
    }
    return null
  }).filter(c => c !== null) as Categoria[]
})

const getVigenciaStatus = (manual: Manual) => {
  return { 
    label: manual.id ? 'Vigente' : 'Vigente', 
    class: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10' 
  }
}

const getLatestActiveUpdate = (doc: Manual) => {
  if (!doc.actualizaciones || doc.actualizaciones.length === 0) return null
  const activeUpdates = doc.actualizaciones.filter(u => !!u.file_path)
  if (activeUpdates.length === 0) return null
  return [...activeUpdates].sort((a, b) => b.id - a.id)[0]
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

const openManual = (manual: Manual) => {
  selectedManual.value = manual
  showViewer.value = true
}

onMounted(() => {
  loadBiblioteca()
})
</script>

<template>
  <div class="biblioteca-view min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 font-['Plus_Jakarta_Sans'] transition-colors duration-300">
    
    <!-- HEADER STUNNING -->
    <div class="premium-header relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white py-12 px-8 md:px-12 border-b border-white/10 shadow-xl">
      <!-- Decoración abstracta -->
      <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div class="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>
      
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <span class="text-xs font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Centro de Conocimiento</span>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-slate-100 font-['Outfit']">Biblioteca de Normativas</h1>
          <p class="text-sm text-slate-300 mt-1 max-w-2xl">Visualiza, busca y lee de forma ágil y segura toda la documentación, guías de operación y políticas autorizadas de la organización.</p>
        </div>
        
        <!-- Buscador integrado -->
        <div class="w-full md:w-80 search-premium-wrapper">
          <div class="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-inner hover:border-white/35 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-300 ml-1 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Buscar manual o sección..." 
              class="w-full bg-transparent border-none outline-none pl-3 text-sm text-white placeholder-slate-400"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn-white">×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- CUERPO PRINCIPAL -->
    <div class="max-w-7xl mx-auto py-8 px-6 md:px-8 flex flex-col lg:flex-row gap-8">
      
      <!-- MENU LATERAL: CATEGORIAS (FILTRO ULTRA RÁPIDO) -->
      <aside class="w-full lg:w-64 shrink-0 space-y-3">
        <div class="text-[0.7rem] font-extrabold text-slate-400 dark:text-slate-555 uppercase tracking-widest pl-1 mb-2">Fólderes Principales</div>
        
        <button 
          @click="selectedCategoryId = 'all'" 
          :class="[
            'w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all',
            selectedCategoryId === 'all' 
              ? 'bg-indigo-650 dark:bg-indigo-900 text-white shadow-lg shadow-indigo-600/10' 
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
        >
          <span class="text-base">📂</span>
          <span>Todos los Fólderes</span>
        </button>

        <button 
          v-for="cat in biblioteca" 
          :key="cat.id"
          @click="selectedCategoryId = cat.id"
          :class="[
            'w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all',
            selectedCategoryId === cat.id 
              ? 'bg-indigo-650 dark:bg-indigo-900 text-white shadow-lg shadow-indigo-600/10' 
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
        >
          <span class="text-base">📁</span>
          <span class="truncate">{{ cat.nombre }}</span>
        </button>
      </aside>

      <!-- SECCIÓN DE CARPETAS DE MANUALES -->
      <div class="flex-1 space-y-12">
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-4">
          <div class="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p class="text-sm font-bold text-slate-400">Indexando biblioteca de normativas...</p>
        </div>

        <div v-else-if="filteredBiblioteca.length === 0" class="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-16 rounded-3xl text-center space-y-4 shadow-sm max-w-xl mx-auto">
          <span class="text-4xl">📚</span>
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-200">No se encontraron normativas</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Es posible que no tengas puestos autorizados asignados a las normativas existentes o que no existan documentos cargados bajo los filtros seleccionados.</p>
          <button @click="searchQuery = ''; selectedCategoryId = 'all'" class="btn-clear-filters">Restaurar Filtros</button>
        </div>

        <!-- LISTADO DE CATEGORÍAS/SUBCATEGORÍAS -->
        <div v-else class="space-y-12">
          <div v-for="cat in filteredBiblioteca" :key="cat.id" class="folder-group-wrapper animate-in fade-in slide-in-from-bottom-2">
            <!-- Título de la Carpeta Manila Padre -->
            <div class="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
              <span class="text-xl">📂</span>
              <h2 class="text-base font-extrabold text-slate-800 dark:text-slate-200 tracking-tight font-['Outfit']">{{ cat.nombre }}</h2>
              <span class="text-[0.65rem] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-black uppercase tracking-wider ml-2">Fólder Principal</span>
            </div>

            <!-- Subcategorías (Carpetas Internas) -->
            <div class="space-y-8">
              <div v-for="sub in cat.subcategorias" :key="sub.id" class="subfolder-body bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-base">📁</span>
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ sub.nombre }}</h3>
                </div>

                <!-- Grid de Manuales (Documentos de Lectura) -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div 
                    v-for="doc in sub.documentos" 
                    :key="doc.id"
                    @click="openManual(doc)"
                    class="manual-card bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 cursor-pointer flex items-center justify-between gap-4 transition-all hover:scale-[1.03] active:scale-[0.98] group hover:border-indigo-300 dark:hover:border-indigo-900/60 shadow-sm"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <!-- Icono PDF elegante -->
                      <div class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/20 transition-all group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 class="text-[0.75rem] font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400" :title="doc.titulo">{{ doc.titulo }}</h4>
                          <span :class="['px-1.5 py-0.5 rounded font-black text-[0.5rem] uppercase tracking-wider shrink-0', getVigenciaStatus(doc).class]">
                            {{ getVigenciaStatus(doc).label }}
                          </span>
                        </div>
                        <p class="text-[0.6rem] text-slate-500 dark:text-slate-555 font-medium mb-1">Tamaño: <span class="font-bold">{{ doc.total_paginas }} págs</span></p>
                        <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.6rem] text-slate-400 dark:text-slate-555">
                          <span v-if="doc.numero_acta" class="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-bold">📜 {{ doc.numero_acta }}</span>
                          <span v-if="doc.fecha_aprobacion">📅 Aprob: {{ formatDate(doc.fecha_aprobacion) }}</span>
                          <span v-if="doc.fecha_vigencia">⏳ Vence: {{ formatDate(doc.fecha_vigencia) }}</span>
                        </div>

                        <!-- Mostrar solo la última actualización con archivo cargado (Última Hoja de Cambio Activa) en la tarjeta de la Biblioteca -->
                        <div v-if="getLatestActiveUpdate(doc)" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1" @click.stop>
                          <p class="text-[0.55rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">🔄 Última Hoja de Cambio Activa:</p>
                          <div 
                            v-for="upd in [getLatestActiveUpdate(doc)].filter(Boolean) as Actualizacion[]" 
                            :key="upd.id"
                            @click="openManual(doc)"
                            class="flex flex-col gap-0.5 text-[0.65rem] text-slate-500 bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-150 dark:border-slate-800/80 cursor-pointer transition-all hover:border-indigo-300 dark:hover:border-indigo-900/50"
                          >
                            <div class="flex items-center gap-1.5 w-full">
                              <span class="font-bold shrink-0 text-slate-700 dark:text-slate-350">📜 Acta: {{ upd.numero_acta }}</span>
                              <span class="text-[0.55rem] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-100/10">Ver Hojas 👁️</span>
                              <span v-if="upd.fecha_vigencia" class="px-1.5 py-0.2 rounded text-[0.55rem] font-bold ml-auto shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10">⏳ Vigente</span>
                            </div>
                            <p v-if="upd.descripcion" class="text-[0.58rem] text-slate-400 dark:text-slate-500 italic mt-0.5 max-w-[250px] truncate leading-normal" :title="upd.descripcion">📝 {{ upd.descripcion }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Acción -->
                    <span class="shrink-0 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Componente PDFViewer Modular e Independiente -->
    <PDFViewer 
      v-model:show="showViewer" 
      :manual="selectedManual" 
      :apiUrl="API_URL" 
    />
  </div>
</template>

<style scoped>
.biblioteca-view {
  min-height: calc(100vh - 64px);
}

.premium-header {
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
}

.clear-search-btn-white {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: all 0.2s;
}

.clear-search-btn-white:hover {
  background: white;
  color: #1e1b4b;
}

.btn-clear-filters {
  background: transparent;
  color: #4f46e5;
  border: 1.5px solid #4f46e5;
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-clear-filters:hover {
  background: #4f46e5;
  color: white;
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 20px;
}
:root.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

.bg-indigo-650 {
  background-color: #4f46e5;
}
</style>
