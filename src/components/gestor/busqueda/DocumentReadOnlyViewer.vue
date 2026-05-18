<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configurar el worker usando el archivo local del paquete
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface IndicePagina {
  id: number
  documento_id: number
  pagina_inicio: number
  tipo_movimiento: string
  etiqueta: string
  numero_documento: string | null
  fecha_vencimiento: string | null
  fecha_operacion: string
}

interface Documento {
  id: number
  file_path: string
  subcategoria: { nombre: string }
}

const props = defineProps<{
  documento: Documento
  asociadoNombre: string
  initialPage?: number
}>()

const emit = defineEmits(['close'])

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const indicesActuales = ref<IndicePagina[]>([])
const totalPaginas = ref(0)
const currentPage = ref(1)
const zoomLevel = ref(1.1)
const isRendering = ref(false)
const authStore = useAuthStore()

// PDF.js State
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
const pagesContainer = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)

const loadIndices = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/indices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      indicesActuales.value = data.indices || []
      totalPaginas.value = data.total_paginas || 0
    }
  } catch (e) {
    console.error("Error al obtener índices", e)
  }
}

const renderPDF = async () => {
  await nextTick()
  if (!pagesContainer.value) return
  isRendering.value = true
  
  try {
    const token = sessionStorage.getItem('access_token')
    
    // Obtener la URL firmada temporal de GCS desde el backend
    const resUrl = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!resUrl.ok) {
      throw new Error("No se pudo obtener la URL firmada del documento")
    }
    const dataUrl = await resUrl.json()
    const url = dataUrl.url
    
    // PDF.js con la URL firmada (no necesita headers de auth porque la URL ya tiene firma de GCS!)
    const loadingTask = pdfjsLib.getDocument({ url })
    pdfDoc = await loadingTask.promise
    totalPaginas.value = pdfDoc.numPages

    pagesContainer.value.innerHTML = ''

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const viewport = page.getViewport({ scale: zoomLevel.value })
      const pageDiv = document.createElement('div')
      pageDiv.className = 'pdf-page-wrapper'
      pageDiv.dataset.pageNumber = i.toString()
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width
      pageDiv.appendChild(canvas)
      pagesContainer.value.appendChild(pageDiv)
      await page.render({ canvasContext: context!, viewport, canvas }).promise
    }

    setupIntersectionObserver()
    
    if (props.initialPage) {
      setTimeout(() => jumpToPage(props.initialPage!), 500)
    }
  } catch (e) {
    console.error("Error renderizando PDF:", e)
  } finally {
    isRendering.value = false
  }
}

const setupIntersectionObserver = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        currentPage.value = parseInt((entry.target as HTMLElement).dataset.pageNumber || '1')
      }
    })
  }, {
    root: scrollContainer.value,
    threshold: 0.5
  })

  document.querySelectorAll('.pdf-page-wrapper').forEach(p => observer.observe(p))
}

const jumpToPage = (pageNum: number) => {
  const pageElement = pagesContainer.value?.querySelector(`[data-page-number="${pageNum}"]`)
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: 'smooth' })
  }
}

const downloadPDF = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    
    // Obtener la URL firmada temporal de GCS desde el backend
    const resUrl = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!resUrl.ok) throw new Error("No se pudo obtener la URL firmada del documento")
    const dataUrl = await resUrl.json()
    const url = dataUrl.url
    
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', `${props.documento.subcategoria?.nombre || 'documento'}.pdf`)
    link.click()
    URL.revokeObjectURL(blobUrl)
  } catch (e) {
    console.error("Error al descargar:", e)
  }
}

const printPDF = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    
    // Obtener la URL firmada GCS temporal del backend
    const resUrl = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!resUrl.ok) throw new Error("No se pudo obtener la URL firmada del documento")
    const dataUrl = await resUrl.json()
    const url = dataUrl.url
    
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = blobUrl
    document.body.appendChild(iframe)
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(blobUrl)
        }, 2000)
      }, 500)
    }
  } catch (e) {
    console.error("Error al imprimir:", e)
  }
}

watch(() => props.documento, () => {
  loadIndices()
  renderPDF()
}, { immediate: true })

watch(zoomLevel, renderPDF)
</script>

<template>
  <div class="fixed inset-0 flex flex-col z-[9999] font-['Plus_Jakarta_Sans'] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
    <!-- Header Premium Ocean Glass -->
    <header class="h-[72px] flex items-center justify-between px-8 sticky top-0 z-[110] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div class="flex items-center gap-5">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <div>
          <div class="flex items-center gap-3">
            <h3 class="m-0 text-base font-extrabold tracking-tight">{{ props.documento.subcategoria?.nombre }}</h3>
            <span class="bg-sky-500 text-white text-[0.65rem] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm shadow-sky-500/20">Modo Lectura</span>
          </div>
          <p class="m-0 text-[0.7rem] text-slate-500 dark:text-slate-400">Expediente: <span class="font-bold text-sky-600 dark:text-sky-400">{{ props.asociadoNombre }}</span></p>
        </div>
      </div>
      
      <div class="hidden lg:flex items-center gap-3 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <button @click="jumpToPage(currentPage - 1)" :disabled="currentPage <= 1" 
                class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-8 h-8 flex items-center justify-center transition-all hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-40">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-[0.7rem] font-extrabold min-w-[80px] text-center tracking-widest text-slate-700 dark:text-slate-200">{{ currentPage }} / {{ totalPaginas }}</span>
        <button @click="jumpToPage(currentPage + 1)" :disabled="currentPage >= totalPaginas" 
                class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-8 h-8 flex items-center justify-center transition-all hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-40">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="flex items-center gap-4">
        <div class="hidden sm:flex gap-2">
          <button v-if="authStore.hasPermission('descargar_pdf')" @click="downloadPDF" class="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center justify-center" title="Descargar">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button v-if="authStore.hasPermission('imprimir_pdf')" @click="printPDF" class="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center justify-center" title="Imprimir">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>
        </div>
        <div class="bg-slate-900 text-white px-3 py-1.5 rounded-xl flex items-center gap-3 text-[0.7rem] font-bold border border-slate-700 shadow-lg">
          <button @click="zoomLevel -= 0.1" :disabled="zoomLevel <= 0.5" class="hover:text-sky-400 disabled:opacity-30">−</button>
          <span class="min-w-[40px] text-center">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomLevel += 0.1" :disabled="zoomLevel >= 3" class="hover:text-sky-400 disabled:opacity-30">+</button>
        </div>
        <button @click="emit('close')" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2">
          <span>Salir</span>
          <kbd class="opacity-50">×</kbd>
        </button>
      </div>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
      <!-- SIDEBAR DE ÍNDICES (SOLO LECTURA) -->
      <aside class="w-[420px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shadow-xl z-[100]">
        <div class="p-5 pb-3">
          <h4 class="text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">Índices del Documento</h4>
          <div class="space-y-2">
            <div v-for="indice in indicesActuales" :key="indice.id" 
                 @click="jumpToPage(indice.pagina_inicio)"
                 :class="[
                   'p-3 rounded-xl border cursor-pointer transition-all hover:translate-x-1 active:scale-[0.98]',
                   currentPage >= indice.pagina_inicio ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-300 dark:border-sky-700 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
                 ]">
              <div class="flex items-center gap-4">
                <span class="text-[0.6rem] font-black text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30 px-2 py-1 rounded-md min-w-[50px] text-center">Pág {{ indice.pagina_inicio }}</span>
                
                <div class="flex-1 min-w-0 flex items-center justify-between gap-3">
                  <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1">{{ indice.etiqueta }}</p>
                  
                  <div class="flex items-center gap-2 shrink-0">
                    <span v-if="indice.numero_documento" class="text-[0.6rem] font-mono text-slate-400 dark:text-slate-500">#{{ indice.numero_documento }}</span>
                    <span v-if="indice.fecha_vencimiento" class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" title="Tiene vencimiento"></span>
                  </div>
                </div>
              </div>
              
              <div v-if="indice.fecha_vencimiento" class="mt-2 pl-16 flex items-center gap-2 text-[0.6rem] text-amber-600 dark:text-amber-400 font-bold italic">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Vence el {{ new Date(indice.fecha_vencimiento).toLocaleDateString() }}
              </div>
            </div>
            
            <div v-if="indicesActuales.length === 0" class="py-20 text-center opacity-30 flex flex-col items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p class="text-[0.7rem] font-bold">Sin marcas registradas</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- VISOR PDF -->
      <main ref="scrollContainer" class="flex-1 bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center py-12 relative scroll-smooth bg-gradient-to-br from-slate-200/50 to-slate-300/50 dark:from-slate-950 dark:to-slate-900 custom-scrollbar">
        <div v-if="isRendering" class="absolute inset-0 z-50 bg-slate-100/60 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div class="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p class="text-[0.65rem] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em]">Visor de Seguridad Activo</p>
        </div>
        <div ref="pagesContainer" class="flex flex-col items-center gap-10 drop-shadow-2xl"></div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:deep(.pdf-page-wrapper) {
  background: white;
  margin-bottom: 2.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
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

@media (max-width: 768px) {
  .viewer-sidebar { display: none; }
}
</style>
