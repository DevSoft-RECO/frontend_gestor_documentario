<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configurar el worker usando el archivo local de la biblioteca
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

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
  manual_subcategoria_id?: number
  manual_carpeta_id?: number
  titulo: string
  file_path: string
  total_paginas: number
  numero_acta?: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  actualizaciones?: Actualizacion[]
}

const props = defineProps<{
  show: boolean
  manual: Manual | null
  apiUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const currentPage = ref(1)
const totalPaginas = ref(0)
const zoomLevel = ref(1.1)
const isRendering = ref(false)
const downloadProgress = ref(0)

// Modo activo del visor de PDF ('original' o el ID de la actualización)
const activeViewerMode = ref<'original' | number>('original')

const pagesContainer = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let currentObserver: IntersectionObserver | null = null

const getVigenciaStatus = () => {
  return { 
    label: 'Vigente', 
    class: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10' 
  }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

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
  if (!props.manual) return
  
  isRendering.value = true
  downloadProgress.value = 0
  
  if (currentObserver) {
    currentObserver.disconnect()
    currentObserver = null
  }
  
  try {
    const token = sessionStorage.getItem('access_token')
    
    // Obtener la URL firmada del backend (Alternando entre el manual principal y las hojas de actualización)
    const urlEndpoint = activeViewerMode.value === 'original'
      ? `${props.apiUrl}/api/manuales/documentos/${props.manual.id}/url`
      : `${props.apiUrl}/api/manuales/actualizaciones/${activeViewerMode.value}/url`

    const resUrl = await fetch(urlEndpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!resUrl.ok) throw new Error("No autorizado o vencido")
    const dataUrl = await resUrl.json()
    
    // Descargar con barra de progreso
    const pdfData = await downloadPDFWithProgress(dataUrl.url)
    
    // Parsear PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfData })
    pdfDoc = await loadingTask.promise
    totalPaginas.value = pdfDoc.numPages
    currentPage.value = 1
    
    await nextTick()
    if (pagesContainer.value) pagesContainer.value.innerHTML = ''
    isRendering.value = false

    // Inyectar placeholders de página para Lazy Loading
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

    setupIntersectionObserver()
  } catch (err) {
    console.error("Error al cargar PDF:", err)
    alert("Error al cargar el manual.")
    closeViewer()
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

const closeViewer = () => {
  emit('update:show', false)
  pdfDoc = null
  if (currentObserver) currentObserver.disconnect()
}

watch(zoomLevel, () => {
  reRenderPages()
})

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    activeViewerMode.value = 'original'
    nextTick(() => {
      renderPDF()
    })
  }
})

watch(activeViewerMode, () => {
  renderPDF()
})
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show && manual" class="fixed inset-0 flex flex-col z-[9999] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-['Plus_Jakarta_Sans']">
      <!-- Header -->
      <header class="h-[72px] flex items-center justify-between px-8 sticky top-0 z-[110] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center gap-5">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="m-0 text-[1rem] font-extrabold tracking-tight">{{ manual.titulo }}</h3>
              <span :class="['px-2 py-0.5 rounded font-black text-[0.55rem] uppercase tracking-wider', getVigenciaStatus().class]">
                {{ getVigenciaStatus().label }}
              </span>

              <!-- Selector de Versión / Hojas de Cambio -->
              <select 
                v-if="manual.actualizaciones && manual.actualizaciones.length > 0"
                v-model="activeViewerMode"
                class="ml-3 text-[0.65rem] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 p-1.5 border border-indigo-200 dark:border-indigo-900 rounded-lg outline-none cursor-pointer"
              >
                <option value="original">📄 Documento Original ({{ manual.total_paginas }} págs)</option>
                <template v-for="upd in manual.actualizaciones" :key="upd.id">
                  <option 
                    v-if="upd.file_path" 
                    :value="upd.id"
                  >
                    🔄 Hojas de Cambio (Acta {{ upd.numero_acta }}) ({{ upd.total_paginas }} págs)
                  </option>
                </template>
              </select>
            </div>
            <div class="flex items-center gap-3 text-[0.65rem] text-slate-500 dark:text-slate-400 font-bold tracking-normal mt-0.5">
              <span v-if="manual.numero_acta" class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">📜 Acta: {{ manual.numero_acta }}</span>
              <span v-if="manual.fecha_aprobacion">📅 Aprobación: {{ formatDate(manual.fecha_aprobacion) }}</span>
              <span v-if="manual.fecha_vigencia">⏳ Vigencia: {{ formatDate(manual.fecha_vigencia) }}</span>
            </div>
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
        <!-- HISTORIAL DE CAMBIOS LATERAL (TIMELINE PREMIUM) -->
        <aside class="w-[320px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shadow-xl z-[100] p-6 overflow-y-auto custom-scrollbar">
          <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850">
            <span class="text-lg">📜</span>
            <h4 class="text-[0.75rem] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-['Outfit']">Historial de Cambios</h4>
          </div>

          <!-- Si no hay actualizaciones -->
          <div v-if="!manual.actualizaciones || manual.actualizaciones.length === 0" class="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span class="text-3xl">📭</span>
            <h5 class="text-xs font-bold text-slate-700 dark:text-slate-350">Sin Cambios Posteriores</h5>
            <p class="text-[0.65rem] text-slate-400 dark:text-slate-500 leading-normal">Este manual se mantiene en su versión original de publicación y no tiene actas de actualización cargadas.</p>
          </div>

          <!-- Listado de Actualizaciones en formato Timeline -->
          <div v-else class="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6 my-2">
            <div 
              v-for="upd in [...(manual.actualizaciones || [])].sort((a, b) => b.id - a.id)" 
              :key="upd.id"
              class="relative space-y-1.5"
            >
              <!-- Punto en el Timeline -->
              <span class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-slate-900" 
                    :class="upd.file_path ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-300 dark:border-slate-700'"></span>
              
              <div class="flex items-center justify-between gap-2">
                <span class="text-[0.7rem] font-extrabold text-slate-850 dark:text-slate-100">📜 Acta {{ upd.numero_acta }}</span>
                <span v-if="upd.file_path" class="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[0.55rem] font-bold select-none">Activo</span>
                <span v-else class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550 text-[0.55rem] font-bold select-none">Integrado</span>
              </div>

              <div class="flex flex-col gap-0.5 text-[0.6rem] text-slate-400 dark:text-slate-500 font-bold">
                <span v-if="upd.fecha_aprobacion">📅 Aprobación: {{ formatDate(upd.fecha_aprobacion) }}</span>
                <span v-if="upd.fecha_vigencia">⏳ Vigente desde: {{ formatDate(upd.fecha_vigencia) }}</span>
              </div>

              <p v-if="upd.descripcion" class="text-[0.62rem] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-850/30 leading-relaxed max-w-[260px] break-words">
                {{ upd.descripcion }}
              </p>

              <!-- Botón de Conmutación de PDF si tiene hojas físicas disponibles -->
              <div v-if="upd.file_path" class="pt-1">
                <button 
                  v-if="activeViewerMode === 'original'"
                  @click="activeViewerMode = upd.id"
                  class="w-full text-center px-2 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-[0.6rem] font-extrabold transition-colors border border-indigo-100/10"
                >
                  👁️ Ver Hojas de Cambio
                </button>
                <button 
                  v-else-if="activeViewerMode === upd.id"
                  @click="activeViewerMode = 'original'"
                  class="w-full text-center px-2 py-1.5 bg-slate-800 text-white hover:bg-slate-750 dark:bg-slate-700 rounded-lg text-[0.6rem] font-extrabold transition-colors"
                >
                  📄 Volver al Manual Original
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- RENDER DE PAGINAS -->
        <main ref="scrollContainer" class="flex-1 bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center py-12 relative scroll-smooth bg-gradient-to-br from-slate-200/50 to-slate-300/50 dark:from-slate-950 dark:to-slate-900 custom-scrollbar">
          <!-- Loader visual progresivo -->
          <div v-if="isRendering" class="absolute inset-0 z-50 bg-slate-100/80 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-slate-600 dark:text-slate-350">
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
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
}
:root.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

/* Estilos de PDF.js para modal de previsualización */
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
</style>
