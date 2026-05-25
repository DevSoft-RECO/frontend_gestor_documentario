<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configurar el worker usando el archivo local de la biblioteca
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface Manual {
  id: number
  manual_subcategoria_id: number
  titulo: string
  file_path: string
  total_paginas: number
  fecha_creacion: string
  ultima_actualizacion: string
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
const currentPage = ref(1)
const totalPaginas = ref(0)
const zoomLevel = ref(1.1)
const isRendering = ref(false)
const downloadProgress = ref(0)

const pagesContainer = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let currentObserver: IntersectionObserver | null = null

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

    // 3. Filtrar subcategorías e items con búsqueda difusa
    const subcats = cat.subcategorias.map(sub => {
      const docs = sub.documentos.filter(doc => 
        doc.titulo.toLowerCase().includes(query) || 
        sub.nombre.toLowerCase().includes(query)
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

// --- LÓGICA ULTRA-OPTIMIZADA DE PDF.JS CON LAZY LOADING ---

const downloadPDFWithProgress = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url)
  const contentLength = response.headers.get('Content-Length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (!total || !response.body) {
    downloadProgress.value = -1
    const buffer = await response.arrayBuffer()
    downloadProgress.value = 100
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    downloadProgress.value = Math.round((received / total) * 100)
  }

  const fullArray = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    fullArray.set(chunk, offset)
    offset += chunk.length
  }
  return fullArray.buffer
}

const renderPDF = async () => {
  if (!selectedManual.value) return
  
  isRendering.value = true
  downloadProgress.value = 0
  
  if (currentObserver) {
    currentObserver.disconnect()
    currentObserver = null
  }
  
  try {
    const token = sessionStorage.getItem('access_token')
    
    // 1. Obtener la URL firmada del backend
    const resUrl = await fetch(`${API_URL}/api/manuales/documentos/${selectedManual.value.id}/url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!resUrl.ok) throw new Error("No autorizado o vencido")
    const dataUrl = await resUrl.json()
    
    // 2. Descargar con barra de progreso
    const pdfData = await downloadPDFWithProgress(dataUrl.url)
    
    // 3. Parsear PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfData })
    pdfDoc = await loadingTask.promise
    totalPaginas.value = pdfDoc.numPages
    currentPage.value = 1
    
    await nextTick()
    if (pagesContainer.value) pagesContainer.value.innerHTML = ''
    isRendering.value = false

    // 4. Inyectar estructuras vacías de página (Placeholders con spinners)
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const viewport = page.getViewport({ scale: zoomLevel.value })
      
      const pageDiv = document.createElement('div')
      pageDiv.className = 'pdf-page-wrapper'
      pageDiv.dataset.pageNumber = i.toString()
      pageDiv.dataset.rendered = 'false'
      
      const canvas = document.createElement('canvas')
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      const loader = document.createElement('div')
      loader.className = 'page-skeleton-loader'
      loader.innerHTML = `
        <div class="skeleton-spinner"></div>
        <span>Cargando Página ${i}...</span>
      `
      
      pageDiv.appendChild(canvas)
      pageDiv.appendChild(loader)
      pagesContainer.value!.appendChild(pageDiv)
    }

    // 5. Encender Lazy Loader
    setupIntersectionObserver()
  } catch (err) {
    console.error("Error al cargar PDF:", err)
    alert("Error al cargar el manual. Verifica tus permisos.")
    showViewer.value = false
    isRendering.value = false
  }
}

const reRenderPages = async () => {
  if (!pdfDoc || !pagesContainer.value) return
  if (currentObserver) currentObserver.disconnect()
  
  pagesContainer.value.innerHTML = ''
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: zoomLevel.value })
    
    const pageDiv = document.createElement('div')
    pageDiv.className = 'pdf-page-wrapper'
    pageDiv.dataset.pageNumber = i.toString()
    pageDiv.dataset.rendered = 'false'
    
    const canvas = document.createElement('canvas')
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    const loader = document.createElement('div')
    loader.className = 'page-skeleton-loader'
    loader.innerHTML = `<div class="skeleton-spinner"></div><span>Cargando Página ${i}...</span>`
    
    pageDiv.appendChild(canvas)
    pageDiv.appendChild(loader)
    pagesContainer.value.appendChild(pageDiv)
  }
  
  setupIntersectionObserver()
}

const setupIntersectionObserver = () => {
  currentObserver = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      const pageWrapper = entry.target as HTMLElement
      const pageNum = parseInt(pageWrapper.dataset.pageNumber || '1')
      
      if (entry.isIntersecting) {
        currentPage.value = pageNum
        
        if (pageWrapper.dataset.rendered === 'false') {
          pageWrapper.dataset.rendered = 'rendering'
          
          try {
            const canvas = pageWrapper.querySelector('canvas')
            const loader = pageWrapper.querySelector('.page-skeleton-loader')
            
            if (canvas && pdfDoc) {
              const page = await pdfDoc.getPage(pageNum)
              const viewport = page.getViewport({ scale: zoomLevel.value })
              const context = canvas.getContext('2d')
              
              await page.render({ 
                canvasContext: context!, 
                viewport,
                canvas: canvas
              }).promise
              
              pageWrapper.dataset.rendered = 'true'
              if (loader) loader.remove()
            }
          } catch (err) {
            console.error(err)
            pageWrapper.dataset.rendered = 'false'
          }
        }
      }
    })
  }, {
    root: scrollContainer.value,
    threshold: 0.01,
    rootMargin: '600px 0px'
  })

  pagesContainer.value?.querySelectorAll('.pdf-page-wrapper').forEach(p => currentObserver!.observe(p))
}

const jumpToPage = (pageNum: number) => {
  const el = pagesContainer.value?.querySelector(`[data-page-number="${pageNum}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

const openManual = (manual: Manual) => {
  selectedManual.value = manual
  showViewer.value = true
}

const closeViewer = () => {
  showViewer.value = false
  selectedManual.value = null
  pdfDoc = null
  if (currentObserver) currentObserver.disconnect()
}

// Watchers
watch(zoomLevel, () => {
  reRenderPages()
})

watch(showViewer, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      renderPDF()
    })
  }
})

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
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-slate-100 font-['Outfit']">Biblioteca de Manuales</h1>
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
        <div class="text-[0.7rem] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 mb-2">Fólderes Principales</div>
        
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
          <p class="text-sm font-bold text-slate-400">Indexando biblioteca de manuales...</p>
        </div>

        <div v-else-if="filteredBiblioteca.length === 0" class="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-16 rounded-3xl text-center space-y-4 shadow-sm max-w-xl mx-auto">
          <span class="text-4xl">📚</span>
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-200">No se encontraron manuales</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Es posible que no tengas puestos autorizados asignados a los manuales existentes o que no existan documentos cargados bajo los filtros seleccionados.</p>
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
                      <div class="min-w-0">
                        <h4 class="text-[0.75rem] font-bold text-slate-800 dark:text-slate-100 mb-1 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400" :title="doc.titulo">{{ doc.titulo }}</h4>
                        <p class="text-[0.6rem] text-slate-500 dark:text-slate-500 font-medium">Tamaño: <span class="font-bold">{{ doc.total_paginas }} págs</span></p>
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

    <!-- VISOR ULTRA OPTIMIZADO (FULLSCREEN MODAL) -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showViewer && selectedManual" class="fixed inset-0 flex flex-col z-[9999] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <!-- Header -->
        <header class="h-[72px] flex items-center justify-between px-8 sticky top-0 z-[110] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center gap-5">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            </div>
            <div>
              <h3 class="m-0 text-[1rem] font-extrabold tracking-tight">{{ selectedManual.titulo }}</h3>
              <p class="m-0 text-[0.65rem] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Modo de Lectura e Inducción</p>
            </div>
          </div>
          
          <!-- Paginador -->
          <div class="hidden md:flex items-center gap-3 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button @click="jumpToPage(currentPage - 1)" :disabled="currentPage <= 1" 
                    class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-8 h-8 flex items-center justify-center transition-all hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="text-xs font-extrabold min-w-[80px] text-center">{{ currentPage }} / {{ totalPaginas }}</span>
            <button @click="jumpToPage(currentPage + 1)" :disabled="currentPage >= totalPaginas" 
                    class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-8 h-8 flex items-center justify-center transition-all hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="flex items-center gap-4">
            <!-- Zoom -->
            <div class="bg-slate-900 text-white px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs font-bold border border-slate-700 shadow-lg">
              <button @click="zoomLevel -= 0.1" :disabled="zoomLevel <= 0.5" class="hover:text-indigo-400 disabled:opacity-30">−</button>
              <span class="min-w-[40px] text-center">{{ Math.round(zoomLevel * 100) }}%</span>
              <button @click="zoomLevel += 0.1" :disabled="zoomLevel >= 3.5" class="hover:text-indigo-400 disabled:opacity-30">+</button>
            </div>
            
            <button @click="closeViewer" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all">
              <span>Cerrar</span>
              <kbd class="opacity-70 text-lg">×</kbd>
            </button>
          </div>
        </header>

        <div class="flex-1 flex overflow-hidden">
          <!-- INDICE RAPIDO LATERAL -->
          <aside class="w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shadow-xl z-[100] p-6 overflow-y-auto custom-scrollbar">
            <h4 class="text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Índice del Manual</h4>
            <div class="space-y-1">
              <button 
                v-for="i in totalPaginas" 
                :key="i"
                @click="jumpToPage(i)"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all',
                  currentPage === i 
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                ]"
              >
                📄 Página {{ i }}
              </button>
            </div>
          </aside>

          <!-- RENDER DE PAGINAS -->
          <main ref="scrollContainer" class="flex-1 bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center py-12 relative scroll-smooth bg-gradient-to-br from-slate-200/50 to-slate-300/50 dark:from-slate-950 dark:to-slate-900 custom-scrollbar">
            <!-- Loader visual progresivo -->
            <div v-if="isRendering" class="absolute inset-0 z-50 bg-slate-100/80 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-slate-600 dark:text-slate-300">
              <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center mb-5 border border-slate-200 dark:border-slate-700 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <p class="text-[0.65rem] font-extrabold tracking-widest uppercase mb-4">Descargando manual de forma segura...</p>
              
              <!-- Progreso -->
              <div class="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  v-if="downloadProgress >= 0"
                  class="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-300 ease-out"
                  :style="{ width: downloadProgress + '%' }"
                ></div>
                <div v-else class="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full animate-indeterminate"></div>
              </div>
              <p class="text-[0.7rem] font-bold mt-2 text-slate-400">{{ downloadProgress >= 0 ? downloadProgress + '%' : 'Cargando...' }}</p>
            </div>
            
            <div ref="pagesContainer" class="flex flex-col items-center gap-10 drop-shadow-2xl"></div>
          </main>
        </div>
      </div>
    </Transition>
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

/* Estilos de PDF.js */
:deep(.pdf-page-wrapper) {
  position: relative;
  background: white;
  margin-bottom: 2.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  transition: transform 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 800px;
}

:deep(.page-skeleton-loader) {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
  z-index: 10;
}

:root.dark :deep(.page-skeleton-loader) {
  background: #1e293b;
  color: #94a3b8;
}

:deep(.skeleton-spinner) {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-indeterminate {
  width: 40%;
  animation: indeterminate 1.5s ease-in-out infinite;
}

@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
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
