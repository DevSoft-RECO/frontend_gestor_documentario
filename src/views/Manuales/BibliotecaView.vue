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

// Accordion state
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

// --- Data Fetching ---
const loadBiblioteca = async () => {
  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/manuales/biblioteca`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      biblioteca.value = await res.json()
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
    if (selectedCategoryId.value !== 'all' && cat.id !== selectedCategoryId.value) {
      return null
    }

    const subcats = cat.subcategorias.map(sub => {
      if (selectedSubcategoryId.value !== 'all' && sub.id !== selectedSubcategoryId.value) {
        return null
      }

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

// Estadísticas
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
      class: 'status-vigente'
    }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vigenciaDate = new Date(manual.fecha_vigencia)
  
  if (today >= vigenciaDate) {
    return {
      label: 'Vigente',
      class: 'status-vigente'
    }
  } else {
    return {
      label: 'No Vigente',
      class: 'status-no-vigente'
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

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedCategoryId.value = 'all'
  selectedSubcategoryId.value = 'all'
}

onMounted(() => {
  loadBiblioteca()
})
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-[#0c0f1a] font-['Plus_Jakarta_Sans'] transition-colors duration-300">
    
    <!-- ═══════════════════════ HEADER ═══════════════════════ -->
    <header class="relative bg-[#0f172a] dark:bg-[#080b14] overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"></div>
      <!-- Gradient orbs -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div class="absolute -bottom-20 -left-20 w-72 h-72 bg-emerald-600/8 rounded-full blur-[100px]"></div>
      
      <div class="relative z-10 px-6 md:px-10 py-7">
        <!-- Top row: Título + Stats -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div class="flex items-center gap-2.5 mb-1">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div>
                <h1 class="text-lg font-extrabold text-white tracking-tight leading-none">Biblioteca de Normativas</h1>
                <p class="text-[0.6rem] text-slate-400 font-medium mt-0.5">Gestor Documental · Módulo de Consulta</p>
              </div>
            </div>
          </div>

          <!-- Mini stats -->
          <div class="flex items-center gap-5">
            <div class="text-center">
              <div class="text-lg font-black text-white leading-none">{{ filteredBiblioteca.length }}</div>
              <div class="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Gavetas</div>
            </div>
            <div class="w-px h-8 bg-white/10"></div>
            <div class="text-center">
              <div class="text-lg font-black text-emerald-400 leading-none">{{ totalCarpetas }}</div>
              <div class="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Carpetas</div>
            </div>
            <div class="w-px h-8 bg-white/10"></div>
            <div class="text-center">
              <div class="text-lg font-black text-indigo-400 leading-none">{{ totalDocumentos }}</div>
              <div class="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Documentos</div>
            </div>
          </div>
        </div>

        <!-- Bottom row: Filtros y búsqueda -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <!-- Search -->
          <div class="relative flex items-center flex-1 max-w-md">
            <div class="absolute left-3 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Buscar por título, acta o sección..." 
              class="w-full bg-white/[0.07] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 w-4 h-4 rounded-full bg-white/15 text-white/60 hover:bg-white/25 hover:text-white flex items-center justify-center text-[0.6rem] font-bold transition-all">×</button>
          </div>
          
          <!-- Gaveta select -->
          <div class="relative">
            <select 
              v-model="selectedCategoryId"
              class="filter-select"
            >
              <option value="all">Todas las Gavetas</option>
              <option v-for="cat in biblioteca" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
            </select>
          </div>

          <!-- Portafolio select -->
          <div v-if="availableSubcategorias.length > 0" class="relative">
            <select 
              v-model="selectedSubcategoryId"
              class="filter-select"
            >
              <option value="all">Todos los Portafolios</option>
              <option v-for="sub in availableSubcategorias" :key="sub.id" :value="sub.id">{{ sub.nombre }}</option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- ═══════════════════ TOOLBAR STICKY ═══════════════════ -->
    <div class="sticky top-0 z-30 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/80">
      <div class="flex items-center justify-between px-6 md:px-10 h-10">
        <div class="flex items-center gap-1">
          <button 
            @click="expandAll()" 
            class="toolbar-btn"
            title="Expandir todo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
            <span class="hidden sm:inline">Expandir</span>
          </button>
          <button 
            @click="collapseAll()" 
            class="toolbar-btn"
            title="Colapsar todo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
            <span class="hidden sm:inline">Colapsar</span>
          </button>
        </div>

        <!-- View toggle -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
          <button 
            @click="viewMode = 'grid'" 
            :class="['view-toggle-btn', viewMode === 'grid' && 'view-toggle-active']"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Tarjetas
          </button>
          <button 
            @click="viewMode = 'list'" 
            :class="['view-toggle-btn', viewMode === 'list' && 'view-toggle-active']"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Lista
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════ BODY ═══════════════════════ -->
    <main class="px-6 md:px-10 py-6">
      
      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="w-9 h-9 border-[3px] border-gray-200 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
        <p class="text-xs font-bold text-gray-400 dark:text-gray-500">Cargando biblioteca de normativas...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredBiblioteca.length === 0" class="flex flex-col items-center justify-center py-24 gap-3">
        <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-gray-400 dark:text-gray-500"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300">Sin resultados</h3>
        <p class="text-xs text-gray-400 dark:text-gray-500 text-center max-w-sm">No se encontraron normativas con los filtros seleccionados.</p>
        <button @click="clearAllFilters" class="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Limpiar filtros</button>
      </div>

      <!-- ═══════════ ACCORDION PRINCIPAL ═══════════ -->
      <div v-else class="space-y-3">

        <div 
          v-for="cat in filteredBiblioteca" 
          :key="cat.id" 
          class="gaveta-card bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <!-- ──── GAVETA HEADER ──── -->
          <button 
            @click="toggleGaveta(cat.id)" 
            class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <!-- Icono -->
            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-600 dark:text-indigo-400"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h2 class="text-[0.8rem] font-extrabold text-gray-800 dark:text-gray-100 truncate uppercase tracking-wide">{{ cat.nombre }}</h2>
              <p class="text-[0.6rem] text-gray-400 dark:text-gray-500 font-medium">{{ cat.subcategorias.length }} portafolio{{ cat.subcategorias.length !== 1 ? 's' : '' }}</p>
            </div>
            <!-- Chevron -->
            <svg 
              xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
              class="text-gray-400 dark:text-gray-600 transition-transform duration-200 shrink-0"
              :class="{ 'rotate-180': expandedGavetas.has(cat.id) }"
            ><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <!-- ──── GAVETA BODY ──── -->
          <div v-show="expandedGavetas.has(cat.id)">
            <div v-for="sub in cat.subcategorias" :key="sub.id" class="border-t border-gray-100 dark:border-gray-800/70">
              
              <!-- PORTAFOLIO HEADER -->
              <button 
                @click="togglePortafolio(sub.id)" 
                class="w-full flex items-center gap-2.5 px-5 py-2.5 pl-12 text-left hover:bg-gray-50/60 dark:hover:bg-white/[0.015] transition-colors"
              >
                <div class="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-600 dark:text-emerald-400"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span class="text-xs font-bold text-gray-600 dark:text-gray-300 truncate flex-1">{{ sub.nombre }}</span>
                <span class="text-[0.55rem] font-bold text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">{{ sub.carpetas.length }}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" 
                  class="text-gray-300 dark:text-gray-700 transition-transform duration-200 shrink-0"
                  :class="{ 'rotate-180': expandedPortafolios.has(sub.id) }"
                ><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              <!-- PORTAFOLIO BODY: CARPETAS -->
              <div v-show="expandedPortafolios.has(sub.id)" class="pl-12 pr-5 pb-5 pt-1 space-y-5">
                <div v-for="carp in sub.carpetas" :key="carp.id">
                  
                  <!-- Carpeta label -->
                  <div class="flex items-center gap-2 mb-2.5 pl-2">
                    <div class="w-1 h-4 rounded-full bg-amber-400 dark:bg-amber-500/70"></div>
                    <span class="text-[0.65rem] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ carp.nombre }}</span>
                    <span class="text-[0.55rem] font-medium text-gray-400 dark:text-gray-600">· {{ carp.documentos.length }} doc{{ carp.documentos.length !== 1 ? 's' : '' }}</span>
                  </div>

                  <!-- ═══════ GRID VIEW ═══════ -->
                  <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 pl-3">
                    <div 
                      v-for="doc in carp.documentos" 
                      :key="doc.id"
                      @click="openManual(doc)"
                      class="doc-card group"
                    >
                      <!-- Card top -->
                      <div class="flex items-start gap-2.5">
                        <div class="doc-icon-wrapper">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4 class="text-[0.7rem] font-bold text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight" :title="doc.titulo">{{ doc.titulo }}</h4>
                          <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span :class="['status-badge', getVigenciaStatus(doc).class]">{{ getVigenciaStatus(doc).label }}</span>
                            <span class="text-[0.55rem] text-gray-400 dark:text-gray-500 font-medium">{{ doc.total_paginas }} págs</span>
                          </div>
                        </div>
                      </div>

                      <!-- Card meta -->
                      <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50 flex flex-wrap gap-x-2.5 gap-y-1 text-[0.55rem] text-gray-400 dark:text-gray-500">
                        <span v-if="doc.numero_acta" class="font-bold">
                          <span class="text-gray-300 dark:text-gray-600">Acta</span> {{ doc.numero_acta }}
                        </span>
                        <span v-if="doc.fecha_aprobacion">
                          <span class="text-gray-300 dark:text-gray-600">Aprob.</span> {{ formatDate(doc.fecha_aprobacion) }}
                        </span>
                        <span v-if="doc.fecha_vigencia">
                          <span class="text-gray-300 dark:text-gray-600">Vig.</span> {{ formatDate(doc.fecha_vigencia) }}
                        </span>
                      </div>

                      <!-- Hoja de cambio -->
                      <div v-if="getLatestActiveUpdate(doc)" class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50" @click.stop>
                        <div 
                          v-for="upd in [getLatestActiveUpdate(doc)].filter(Boolean) as Actualizacion[]" 
                          :key="upd.id"
                          @click="openManual(doc)"
                          class="flex items-center gap-1.5 cursor-pointer group/upd"
                        >
                          <div class="w-4 h-4 rounded bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-500 dark:text-indigo-400"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                          </div>
                          <span class="text-[0.55rem] font-bold text-indigo-600 dark:text-indigo-400 group-hover/upd:text-indigo-700 dark:group-hover/upd:text-indigo-300 transition-colors truncate">Acta {{ upd.numero_acta }}</span>
                        </div>
                      </div>

                      <!-- Hover arrow -->
                      <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="text-indigo-500 dark:text-indigo-400"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                      </div>
                    </div>
                  </div>

                  <!-- ═══════ LIST VIEW ═══════ -->
                  <div v-else class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden ml-3">
                    <div 
                      v-for="(doc, i) in carp.documentos" 
                      :key="doc.id"
                      @click="openManual(doc)"
                      :class="[
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group',
                        i !== carp.documentos.length - 1 && 'border-b border-gray-100 dark:border-gray-800/60'
                      ]"
                    >
                      <!-- Icon -->
                      <div class="w-7 h-7 shrink-0 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <!-- Info -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ doc.titulo }}</span>
                          <span :class="['status-badge shrink-0', getVigenciaStatus(doc).class]">{{ getVigenciaStatus(doc).label }}</span>
                        </div>
                        <div class="flex items-center gap-2 text-[0.55rem] text-gray-400 dark:text-gray-500 mt-0.5">
                          <span class="font-medium">{{ doc.total_paginas }} págs</span>
                          <span v-if="doc.numero_acta" class="font-medium">· {{ doc.numero_acta }}</span>
                          <span v-if="doc.fecha_aprobacion">· {{ formatDate(doc.fecha_aprobacion) }}</span>
                        </div>
                      </div>
                      <!-- Right side -->
                      <div class="flex items-center gap-2.5 shrink-0">
                        <div v-if="getLatestActiveUpdate(doc)" class="hidden sm:flex items-center gap-1 text-[0.55rem] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded" @click.stop="openManual(doc)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                          {{ getLatestActiveUpdate(doc)?.numero_acta }}
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="text-gray-300 dark:text-gray-700 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- PDFViewer -->
    <PDFViewer 
      v-model:show="showViewer" 
      :manual="selectedManual" 
      :apiUrl="API_URL" 
    />
  </div>
</template>

<style scoped>
/* ═══════════ FILTER SELECT ═══════════ */
.filter-select {
  appearance: none;
  background-color: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  outline: none;
  cursor: pointer;
  transition: all 0.15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='3'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.filter-select:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.1);
}
.filter-select:focus {
  border-color: rgba(99, 102, 241, 0.5);
}
.filter-select option {
  background: #1e293b;
  color: white;
}

/* ═══════════ TOOLBAR ═══════════ */
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6rem;
  font-weight: 700;
  color: #9ca3af;
  transition: all 0.15s;
}
.toolbar-btn:hover {
  color: #4f46e5;
  background: #eef2ff;
}
:root.dark .toolbar-btn:hover {
  color: #818cf8;
  background: rgba(99, 102, 241, 0.1);
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6rem;
  font-weight: 700;
  color: #9ca3af;
  transition: all 0.15s;
}
.view-toggle-active {
  background: white;
  color: #4f46e5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
:root.dark .view-toggle-active {
  background: #374151;
  color: #818cf8;
}

/* ═══════════ GAVETA CARD ═══════════ */
.gaveta-card {
  transition: box-shadow 0.15s;
}
.gaveta-card:hover {
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
}
:root.dark .gaveta-card:hover {
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
}

/* ═══════════ DOCUMENT CARD ═══════════ */
.doc-card {
  position: relative;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.doc-card:hover {
  border-color: #c7d2fe;
  background: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  transform: translateY(-1px);
}
.doc-card:active {
  transform: translateY(0);
}
:root.dark .doc-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}
:root.dark .doc-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
}

/* ═══════════ DOC ICON ═══════════ */
.doc-icon-wrapper {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  flex-shrink: 0;
  transition: all 0.15s;
}
.doc-card:hover .doc-icon-wrapper {
  background: #eef2ff;
  color: #4f46e5;
  border-color: #e0e7ff;
}
:root.dark .doc-icon-wrapper {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.15);
}
:root.dark .doc-card:hover .doc-icon-wrapper {
  background: rgba(99, 102, 241, 0.1);
  color: #818cf8;
  border-color: rgba(99, 102, 241, 0.2);
}

/* ═══════════ STATUS BADGES ═══════════ */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.48rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.status-vigente {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #d1fae5;
}
:root.dark .status-vigente {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.15);
}
.status-no-vigente {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fef3c7;
}
:root.dark .status-no-vigente {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.15);
}
</style>
