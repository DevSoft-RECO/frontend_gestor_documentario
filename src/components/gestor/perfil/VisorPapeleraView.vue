<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface Documento {
  id: number
  nombre_subcategoria: string
}

const props = defineProps<{
  show: boolean
  documento: Documento
  asociadoNombre: string
}>()

const emit = defineEmits(['close'])

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const totalPaginas = ref(0)
const currentPage = ref(1)
const isRendering = ref(false)
const downloadProgress = ref(0)

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let renderObserver: IntersectionObserver | null = null
let pageTrackerObserver: IntersectionObserver | null = null

const pagesContainer = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)

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
  await nextTick()
  if (!pagesContainer.value) return

  isRendering.value = true
  downloadProgress.value = 0

  try {
    const token = sessionStorage.getItem('access_token')
    const resUrl = await fetch(`${API_URL}/api/gestor/papelera/${props.documento.id}/url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!resUrl.ok) throw new Error("No se pudo obtener la URL firmada del documento")
    const dataUrl = await resUrl.json()
    const url = dataUrl.url

    const pdfData = await downloadPDFWithProgress(url)
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/standard_fonts/',
      wasmUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/wasm/'
    })
    pdfDoc = await loadingTask.promise
    totalPaginas.value = pdfDoc.numPages

    if (pagesContainer.value) pagesContainer.value.innerHTML = ''
    isRendering.value = false

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      let viewport = page.getViewport({ scale: 1.0 })
      const MAX_CANVAS_HEIGHT = 2000
      if (viewport.height > MAX_CANVAS_HEIGHT) {
        const scale = (MAX_CANVAS_HEIGHT / viewport.height)
        viewport = page.getViewport({ scale })
      }

      const pageDiv = document.createElement('div')
      pageDiv.className = 'pdf-page-wrapper'
      pageDiv.dataset.pageNumber = i.toString()
      pageDiv.dataset.rendered = 'false'
      pageDiv.style.width = `${viewport.width}px`
      pageDiv.style.height = `${viewport.height}px`

      const canvas = document.createElement('canvas')
      canvas.height = viewport.height
      canvas.width = viewport.width

      const pageLoader = document.createElement('div')
      pageLoader.className = 'page-skeleton-loader'
      pageLoader.innerHTML = `
        <div class="skeleton-spinner"></div>
        <span>Cargando Página ${i}...</span>
      `

      pageDiv.appendChild(canvas)
      pageDiv.appendChild(pageLoader)
      pagesContainer.value!.appendChild(pageDiv)
    }

    setupIntersectionObserver()
  } catch (e) {
    console.error("[PDF.js] Error cargando PDF de papelera:", e)
    isRendering.value = false
  }
}

const setupIntersectionObserver = () => {
  renderObserver = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      const pageWrapper = entry.target as HTMLElement
      const pageNum = parseInt(pageWrapper.dataset.pageNumber || '1')

      if (entry.isIntersecting && pageWrapper.dataset.rendered === 'false') {
        pageWrapper.dataset.rendered = 'rendering'
        try {
          const canvas = pageWrapper.querySelector('canvas')
          const loader = pageWrapper.querySelector('.page-skeleton-loader')
          if (canvas && pdfDoc) {
            const page = await pdfDoc.getPage(pageNum)
            let viewport = page.getViewport({ scale: 1.0 })
            const MAX_CANVAS_HEIGHT = 2000
            if (viewport.height > MAX_CANVAS_HEIGHT) {
              const scale = (MAX_CANVAS_HEIGHT / viewport.height)
              viewport = page.getViewport({ scale })
            }
            const context = canvas.getContext('2d')
            await page.render({ canvasContext: context!, viewport, canvas }).promise
            
            // Dibujar marca de agua directamente en el lienzo (canvas)
            if (context) {
              context.save()
              const fontSize = Math.max(20, Math.round(canvas.width * 0.07))
              context.font = `bold ${fontSize}px sans-serif`
              context.fillStyle = 'rgba(239, 68, 68, 0.14)'
              context.textAlign = 'center'
              context.textBaseline = 'middle'
              context.translate(canvas.width / 2, canvas.height / 2)
              context.rotate(-45 * Math.PI / 180)
              context.fillText('PAPELERA - ARCHIVO INVÁLIDO', 0, 0)
              context.restore()
            }
            
            pageWrapper.dataset.rendered = 'true'
            if (loader) loader.remove()
          }
        } catch (err) {
          console.error(`Error renderizando página ${pageNum}:`, err)
          pageWrapper.dataset.rendered = 'false'
        }
      }
    })
  }, {
    root: scrollContainer.value,
    threshold: 0.01,
    rootMargin: '400px 0px'
  })

  pageTrackerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const pageWrapper = entry.target as HTMLElement
        currentPage.value = parseInt(pageWrapper.dataset.pageNumber || '1')
      }
    })
  }, {
    root: scrollContainer.value,
    threshold: 0,
    rootMargin: '-50% 0px -50% 0px'
  })

  const pages = pagesContainer.value?.querySelectorAll('.pdf-page-wrapper')
  if (pages) {
    pages.forEach(p => {
      renderObserver!.observe(p)
      pageTrackerObserver!.observe(p)
    })
  }
}

onMounted(() => {
  renderPDF()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="props.show" @contextmenu.prevent class="fixed inset-0 flex flex-col z-[10005] font-['Plus_Jakarta_Sans'] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 select-none">
      <!-- CABECERA -->
      <header class="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shadow-sm z-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <div>
            <h3 class="m-0 text-[0.98rem] font-extrabold tracking-tight truncate max-w-[280px] sm:max-w-none">{{ props.documento.nombre_subcategoria }}</h3>
            <p class="m-0 text-[0.68rem] text-slate-500 dark:text-slate-400">Visor de Papelera: <span class="font-bold text-sky-500">{{ props.asociadoNombre }}</span></p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 min-w-[70px] text-center">
            Pág {{ currentPage }} / {{ totalPaginas }}
          </span>
          <button @click="emit('close')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/10 cursor-pointer">
            Cerrar Visor
          </button>
        </div>
      </header>

      <!-- CONTENEDOR PRINCIPAL -->
      <div class="flex-1 flex overflow-hidden">
        <!-- SIDEBAR DE RESTAURACIÓN -->
        <aside class="w-[340px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col p-6 space-y-6 shadow-md z-45">
          <div class="text-[0.7rem] font-extrabold text-amber-500 uppercase tracking-widest border-b-2 border-amber-500 pb-2">Información de Archivo</div>

          <div class="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
            <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Archivo Resguardado</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
              Este PDF se encuentra en la papelera de reciclaje en modo de Solo Lectura. No se pueden realizar modificaciones.
            </p>
            <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div class="text-[0.62rem] font-extrabold uppercase text-slate-400">ID de Archivo</div>
              <p class="text-xs font-mono font-bold text-slate-850 dark:text-slate-100 m-0">#{{ props.documento.id }}</p>
            </div>
            
            <div class="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <div class="text-[0.62rem] font-extrabold uppercase text-slate-400">Instrucciones de Recuperación</div>
              <p class="text-[0.68rem] text-slate-500 dark:text-slate-400 leading-normal m-0">
                Póngase en contacto con <strong>Soporte Informática</strong> para solicitar que este documento sea asignado a su buzón personal. Una vez asignado, podrá descargarlo y subirlo en la sección correspondiente. En su petición, envíe el <strong>ID de Archivo</strong> y el <strong>nombre del Asociado</strong> para asegurar la asignación del archivo correcto.
              </p>
            </div>
          </div>
        </aside>

        <!-- VISOR DE PÁGINAS -->
        <main ref="scrollContainer" class="flex-1 bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center py-6 relative scroll-smooth bg-gradient-to-br from-slate-200/40 to-slate-300/40 dark:from-slate-950 dark:to-slate-900 custom-scrollbar">
          <!-- Overlay de progreso -->
          <div v-if="isRendering" class="absolute inset-0 z-50 bg-slate-100/80 dark:bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-slate-600 dark:text-slate-350">
            <div class="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500 animate-pulse"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <p class="text-[0.65rem] font-black tracking-wider uppercase mb-3 text-slate-400">Descargando PDF seguro...</p>
            
            <div class="w-56 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                v-if="downloadProgress >= 0"
                class="h-full bg-amber-500 rounded-full transition-all duration-200"
                :style="{ width: downloadProgress + '%' }"
              ></div>
              <div 
                v-else
                class="h-full bg-amber-500 rounded-full animate-pulse"
                style="width: 50%"
              ></div>
            </div>
          </div>

          <div ref="pagesContainer" class="flex flex-col items-center gap-4 drop-shadow-xl"></div>
        </main>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 20px;
}
:root.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

:deep(.pdf-page-wrapper) {
  position: relative;
  background: white;
  margin-bottom: 0.5rem;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: block;
  max-width: 100%;
}

:deep(.pdf-page-wrapper canvas) {
  display: block;
  width: 100% !important;
  height: auto !important;
}

:deep(.page-skeleton-loader) {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  z-index: 10;
}

:root.dark :deep(.page-skeleton-loader) {
  background: #1e293b;
  color: #94a3b8;
}

:deep(.skeleton-spinner) {
  width: 20px;
  height: 20px;
  border: 3px solid #e2e8f0;
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

:root.dark :deep(.skeleton-spinner) {
  border-color: #334155;
  border-top-color: #f59e0b;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
