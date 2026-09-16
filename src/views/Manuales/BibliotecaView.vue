<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
  manual_carpeta_id: number
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

interface Carpeta {
  id: number
  manual_subcategoria_id: number
  nombre: string
  estado: boolean
  documentos: Manual[]
}

interface Subcategoria {
  id: number
  manual_categoria_id: number
  nombre: string
  estado: boolean
  carpetas: Carpeta[]
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
const selectedSubcategoryId = ref<number | 'all'>('all')
const viewMode = ref<'grid' | 'list'>('grid')

// Accordion state: qué secciones están expandidas
const expandedGavetas = ref<Set<number>>(new Set())
const expandedPortafolios = ref<Set<number>>(new Set())

const toggleGaveta = (id: number) => {
  if (expandedGavetas.value.has(id)) {
    expandedGavetas.value.delete(id)
  } else {
    expandedGavetas.value.add(id)
  }
}

const togglePortafolio = (id: number) => {
  if (expandedPortafolios.value.has(id)) {
    expandedPortafolios.value.delete(id)
  } else {
    expandedPortafolios.value.add(id)
  }
}

const expandAll = () => {
  filteredBiblioteca.value.forEach(cat => {
    expandedGavetas.value.add(cat.id)
    cat.subcategorias.forEach(sub => expandedPortafolios.value.add(sub.id))
  })
}

const collapseAll = () => {
  expandedGavetas.value.clear()
  expandedPortafolios.value.clear()
}

// Reset subcategory when category changes
watch(selectedCategoryId, () => {
  selectedSubcategoryId.value = 'all'
})

const availableSubcategorias = computed(() => {
  if (selectedCategoryId.value === 'all') {
    return biblioteca.value.flatMap(cat => cat.subcategorias)
  }
  const cat = biblioteca.value.find(c => c.id === selectedCategoryId.value)
  return cat ? cat.subcategorias : []
})

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
      // Auto-expandir todo al cargar
      expandAll()
    } else {
      console.error('Error cargando manuales')
    }
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// --- Búsqueda e Indexación Reactiva ---
const filteredBiblioteca = computed(() => {
  if (!biblioteca.value) return []

  let query = searchQuery.value.toLowerCase().trim()
  
  return biblioteca.value.map(cat => {
    // 1. Filtrar por Gaveta Seleccionada
    if (selectedCategoryId.value !== 'all' && cat.id !== selectedCategoryId.value) {
      return null
    }

    const subcats = cat.subcategorias.map(sub => {
      // 2. Filtrar por Portafolio Seleccionado
      if (selectedSubcategoryId.value !== 'all' && sub.id !== selectedSubcategoryId.value) {
        return null
      }

      // 3. Filtrar Carpetas e Indexar por búsqueda
      const carps = sub.carpetas.map(carp => {
        if (query === '') {
          return carp
        }

        const docs = carp.documentos.filter(doc => 
          doc.titulo.toLowerCase().includes(query) || 
          carp.nombre.toLowerCase().includes(query) ||
          sub.nombre.toLowerCase().includes(query) ||
          (doc.numero_acta && doc.numero_acta.toLowerCase().includes(query)) ||
          (doc.actualizaciones && doc.actualizaciones.some(upd => upd.numero_acta.toLowerCase().includes(query)))
        )

        if (docs.length > 0) {
          return { ...carp, documentos: docs }
        }
        return null
      }).filter(c => c !== null) as Carpeta[]

      if (carps.length > 0) {
        return { ...sub, carpetas: carps }
      }
      return null
    }).filter(s => s !== null) as Subcategoria[]

    if (subcats.length > 0) {
      return { ...cat, subcategorias: subcats }
    }
    return null
  }).filter(c => c !== null) as Categoria[]
})

// Estadísticas rápidas
const totalDocumentos = computed(() => {
  let count = 0
  filteredBiblioteca.value.forEach(cat => {
    cat.subcategorias.forEach(sub => {
      sub.carpetas.forEach(carp => {
        count += carp.documentos.length
      })
    })
  })
  return count
})

const totalCarpetas = computed(() => {
  let count = 0
  filteredBiblioteca.value.forEach(cat => {
    cat.subcategorias.forEach(sub => {
      count += sub.carpetas.length
    })
  })
  return count
})

const getVigenciaStatus = (manual: Manual) => {
  if (!manual.fecha_vigencia) {
    return {
      label: 'Vigente',
      class: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10'
    }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vigenciaDate = new Date(manual.fecha_vigencia)
  
  if (today >= vigenciaDate) {
    return {
      label: 'Vigente',
      class: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10'
    }
  } else {
    return {
      label: 'No Vigente',
      class: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/10'
    }
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
    
    <!-- HEADER COMPACTO -->
    <div class="premium-header relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white py-8 px-6 md:px-10 border-b border-white/10 shadow-xl">
      <!-- Decoración abstracta -->
      <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div class="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>
      
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        <div class="min-w-0">
          <span class="text-[0.6rem] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">Centro de Conocimiento</span>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-1.5 text-slate-100 font-['Outfit']">Biblioteca de Normativas</h1>
          <p class="text-xs text-slate-400 mt-1 max-w-xl">Visualiza, busca y lee la documentación, guías de operación y políticas autorizadas.</p>
        </div>
        
        <!-- Buscador + Filtros compactos -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <!-- Buscador -->
          <div class="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 hover:border-white/35 transition-all w-full sm:w-72">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-300 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Buscar manual, acta..." 
              class="w-full bg-transparent border-none outline-none pl-2.5 text-sm text-white placeholder-slate-400"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn-white">×</button>
          </div>

          <!-- Dropdown Gaveta -->
          <select 
            v-model="selectedCategoryId"
            class="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none cursor-pointer hover:border-white/35 transition-all appearance-none select-dark"
          >
            <option value="all" class="bg-slate-900 text-white">📂 Todas las Gavetas</option>
            <option v-for="cat in biblioteca" :key="cat.id" :value="cat.id" class="bg-slate-900 text-white">📁 {{ cat.nombre }}</option>
          </select>

          <!-- Dropdown Portafolio -->
          <select 
            v-if="availableSubcategorias.length > 0"
            v-model="selectedSubcategoryId"
            class="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none cursor-pointer hover:border-white/35 transition-all appearance-none select-dark"
          >
            <option value="all" class="bg-slate-900 text-white">📁 Todos los Portafolios</option>
            <option v-for="sub in availableSubcategorias" :key="sub.id" :value="sub.id" class="bg-slate-900 text-white">📄 {{ sub.nombre }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- BARRA DE CONTROLES -->
    <div class="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 md:px-10">
      <div class="flex items-center justify-between py-3 gap-4">
        <!-- Stats rápidos -->
        <div class="flex items-center gap-4 text-[0.65rem] font-bold text-slate-400 dark:text-slate-500">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            {{ filteredBiblioteca.length }} Gaveta{{ filteredBiblioteca.length !== 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            {{ totalCarpetas }} Carpeta{{ totalCarpetas !== 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            {{ totalDocumentos }} Documento{{ totalDocumentos !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Acciones -->
        <div class="flex items-center gap-2">
          <!-- Expandir / Colapsar -->
          <button 
            @click="expandAll()" 
            class="px-2.5 py-1.5 rounded-lg text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Expandir todo"
          >⬇️ Expandir</button>
          <button 
            @click="collapseAll()" 
            class="px-2.5 py-1.5 rounded-lg text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Colapsar todo"
          >⬆️ Colapsar</button>
          
          <div class="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>

          <!-- Vista -->
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button 
              @click="viewMode = 'grid'" 
              :class="[
                'px-2.5 py-1 rounded-md text-[0.65rem] font-bold transition-all flex items-center gap-1',
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Tarjetas
            </button>
            <button 
              @click="viewMode = 'list'" 
              :class="[
                'px-2.5 py-1 rounded-md text-[0.65rem] font-bold transition-all flex items-center gap-1',
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Lista
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CUERPO PRINCIPAL FULL WIDTH -->
    <div class="px-6 md:px-10 py-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-sm font-bold text-slate-400">Indexando biblioteca de normativas...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredBiblioteca.length === 0" class="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-16 rounded-2xl text-center space-y-4 shadow-sm max-w-lg mx-auto">
        <span class="text-4xl">📚</span>
        <h3 class="text-lg font-black text-slate-800 dark:text-slate-200">No se encontraron normativas</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Es posible que no tengas puestos autorizados asignados a las normativas existentes o que no existan documentos cargados bajo los filtros seleccionados.</p>
        <button @click="searchQuery = ''; selectedCategoryId = 'all'; selectedSubcategoryId = 'all'" class="btn-clear-filters">Restaurar Filtros</button>
      </div>

      <!-- ACCORDION DE GAVETAS -->
      <div v-else class="space-y-4">
        <div v-for="cat in filteredBiblioteca" :key="cat.id" class="gaveta-accordion rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all">
          
          <!-- Header de la Gaveta (clickeable) -->
          <button 
            @click="toggleGaveta(cat.id)" 
            class="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="text-left min-w-0">
                <h2 class="text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate">{{ cat.nombre }}</h2>
                <p class="text-[0.6rem] text-slate-400 dark:text-slate-500 font-bold">{{ cat.subcategorias.length }} portafolio{{ cat.subcategorias.length !== 1 ? 's' : '' }}</p>
              </div>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" 
              class="text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0"
              :class="{ 'rotate-180': expandedGavetas.has(cat.id) }"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <!-- Contenido expandible de la Gaveta -->
          <div v-show="expandedGavetas.has(cat.id)" class="border-t border-slate-100 dark:border-slate-800">
            
            <!-- Portafolios dentro de esta gaveta -->
            <div v-for="sub in cat.subcategorias" :key="sub.id" class="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
              
              <!-- Header del Portafolio -->
              <button 
                @click="togglePortafolio(sub.id)" 
                class="w-full flex items-center justify-between px-5 py-3 pl-10 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{{ sub.nombre }}</span>
                  <span class="text-[0.55rem] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">{{ sub.carpetas.length }} carpeta{{ sub.carpetas.length !== 1 ? 's' : '' }}</span>
                </div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" 
                  class="text-slate-300 dark:text-slate-600 transition-transform duration-200 shrink-0"
                  :class="{ 'rotate-180': expandedPortafolios.has(sub.id) }"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <!-- Carpetas del Portafolio -->
              <div v-show="expandedPortafolios.has(sub.id)" class="px-5 pl-14 pb-5 pt-2 space-y-4">
                <div v-for="carp in sub.carpetas" :key="carp.id">
                  
                  <!-- Título de la carpeta -->
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-amber-500 text-sm">🗂️</span>
                    <h4 class="text-[0.7rem] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{{ carp.nombre }}</h4>
                    <span class="text-[0.55rem] font-bold text-slate-400 dark:text-slate-500">· {{ carp.documentos.length }} doc{{ carp.documentos.length !== 1 ? 's' : '' }}</span>
                  </div>

                  <!-- Grid de Manuales (Documentos de Lectura) -->
                  <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div 
                      v-for="doc in carp.documentos" 
                      :key="doc.id"
                      @click="openManual(doc)"
                      class="manual-card bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 cursor-pointer flex flex-col gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] group hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md"
                    >
                      <div class="flex items-start gap-3 min-w-0">
                        <div class="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/20 transition-all group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/20">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <h4 class="text-[0.72rem] font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-tight" :title="doc.titulo">{{ doc.titulo }}</h4>
                          </div>
                          <div class="flex items-center gap-2 flex-wrap">
                            <span :class="['px-1.5 py-0.5 rounded font-black text-[0.48rem] uppercase tracking-wider shrink-0', getVigenciaStatus(doc).class]">
                              {{ getVigenciaStatus(doc).label }}
                            </span>
                            <span class="text-[0.58rem] text-slate-400 dark:text-slate-500 font-bold">{{ doc.total_paginas }} págs</span>
                          </div>
                        </div>
                      </div>

                      <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.56rem] text-slate-400 dark:text-slate-500">
                        <span v-if="doc.numero_acta" class="bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded font-bold">📜 {{ doc.numero_acta }}</span>
                        <span v-if="doc.fecha_aprobacion">📅 {{ formatDate(doc.fecha_aprobacion) }}</span>
                        <span v-if="doc.fecha_vigencia">⏳ {{ formatDate(doc.fecha_vigencia) }}</span>
                      </div>

                      <div v-if="getLatestActiveUpdate(doc)" class="pt-2 border-t border-slate-100 dark:border-slate-700/40" @click.stop>
                        <div 
                          v-for="upd in [getLatestActiveUpdate(doc)].filter(Boolean) as Actualizacion[]" 
                          :key="upd.id"
                          @click="openManual(doc)"
                          class="flex items-center gap-1.5 text-[0.58rem] text-indigo-500 dark:text-indigo-400 font-bold cursor-pointer hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                          <span>🔄</span>
                          <span>Acta: {{ upd.numero_acta }}</span>
                          <span class="text-[0.5rem] bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-100/20">Ver Hojas 👁️</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Lista de Manuales (Documentos de Lectura) -->
                  <div v-else class="divide-y divide-slate-100 dark:divide-slate-700/40 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/30">
                    <div 
                      v-for="doc in carp.documentos" 
                      :key="doc.id"
                      @click="openManual(doc)"
                      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/20">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div class="min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400">{{ doc.titulo }}</span>
                            <span :class="['px-1.5 py-0.5 rounded font-black text-[0.48rem] uppercase tracking-wider shrink-0', getVigenciaStatus(doc).class]">
                              {{ getVigenciaStatus(doc).label }}
                            </span>
                          </div>
                          <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.56rem] text-slate-400 dark:text-slate-500 mt-0.5">
                            <span class="font-bold text-slate-500 dark:text-slate-400">{{ doc.total_paginas }} págs</span>
                            <span v-if="doc.numero_acta">· Acta: {{ doc.numero_acta }}</span>
                            <span v-if="doc.fecha_aprobacion">· Aprob: {{ formatDate(doc.fecha_aprobacion) }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-3 shrink-0 sm:justify-end">
                        <div v-if="getLatestActiveUpdate(doc)" class="text-[0.56rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/10 px-2 py-1 rounded-lg flex items-center gap-1" @click.stop="openManual(doc)">
                          <span class="font-bold text-indigo-600 dark:text-indigo-400">🔄 Acta: {{ getLatestActiveUpdate(doc)?.numero_acta }}</span>
                        </div>
                        <span class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </span>
                      </div>
                    </div>
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

.select-dark {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='3'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.gaveta-accordion {
  transition: box-shadow 0.2s;
}
.gaveta-accordion:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
:root.dark .gaveta-accordion:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
</style>
