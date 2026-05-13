<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
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
  usuario_id: number
}

interface Documento {
  id: number
  file_path: string
  subcategoria: { nombre: string }
}

const props = defineProps<{
  documento: Documento
  asociadoNombre: string
}>()

const emit = defineEmits(['close'])

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const indicesActuales = ref<IndicePagina[]>([])
const totalPaginas = ref(0)
const currentPage = ref(1)
const zoomLevel = ref(1.2)
const isRendering = ref(false)
const authStore = useAuthStore()

// Operaciones manuales
const actionType = ref<'insert' | 'replace' | 'delete'>('insert')
const targetPage = ref<number>(1) // Se sincronizará con la página actual que ve el usuario
const opForm = ref({
  etiqueta: '',
  numero_documento: '',
  fecha_vencimiento: '',
  file: null as File | null
})
const isProcessing = ref(false)

// Gestión de permisos para edición
const availableActions = computed(() => {
  const actions = []
  if (authStore.hasPermission('insertar_hoja')) actions.push('insert')
  if (authStore.hasPermission('reemplazar_hoja')) actions.push('replace')
  if (authStore.hasPermission('eliminar_hoja')) actions.push('delete')
  return actions as ('insert' | 'replace' | 'delete')[]
})

// Ajustar el tipo de acción inicial según permisos
watch(availableActions, (newActions) => {
  if (newActions.length > 0 && !newActions.includes(actionType.value)) {
    actionType.value = newActions[0]
  }
}, { immediate: true })

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
  await nextTick() // Asegurar que el DOM esté listo
  
  if (!pagesContainer.value) {
    console.warn("[PDF.js] Contenedor no encontrado aún")
    return
  }
  
  isRendering.value = true
  console.log("[PDF.js] Iniciando renderizado de:", props.documento.file_path)
  
  try {
    const token = sessionStorage.getItem('access_token')
    const url = `${API_URL}${props.documento.file_path}?t=${new Date().getTime()}`
    
    // PDF.js con Headers de Autorización
    const loadingTask = pdfjsLib.getDocument({
      url,
      httpHeaders: { 'Authorization': `Bearer ${token}` }
    })
    pdfDoc = await loadingTask.promise
    totalPaginas.value = pdfDoc.numPages

    // Limpiar contenedor
    if (pagesContainer.value) pagesContainer.value.innerHTML = ''

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

      await page.render({ 
        canvasContext: context!, 
        viewport,
        canvas: canvas // Requerido en versiones nuevas de PDF.js
      }).promise
    }

    setupIntersectionObserver()
  } catch (e) {
    console.error("[PDF.js] Error crítico renderizando PDF:", e)
  } finally {
    isRendering.value = false
  }
}

const setupIntersectionObserver = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt((entry.target as HTMLElement).dataset.pageNumber || '1')
        currentPage.value = pageNum
        // Sincronizar automáticamente el campo de "Página" para operaciones
        targetPage.value = pageNum
      }
    })
  }, {
    root: scrollContainer.value,
    threshold: 0.5
  })

  const pages = document.querySelectorAll('.pdf-page-wrapper')
  pages.forEach(p => observer.observe(p))
}

const jumpToPage = (pageNum: number) => {
  const pageElement = pagesContainer.value?.querySelector(`[data-page-number="${pageNum}"]`)
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: 'smooth' })
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    opForm.value.file = target.files[0]
  }
}

const executeOperation = async () => {
  if (!targetPage.value) {
    alert('Ingresa el número de página para operar.')
    return
  }
  if (actionType.value !== 'delete' && !opForm.value.file) {
    alert('Selecciona un archivo PDF.')
    return
  }
  if (actionType.value === 'delete') {
    if (!confirm(`¿Eliminar físicamente la página ${targetPage.value}? Esto no se puede deshacer.`)) return
  }

  isProcessing.value = true
  const formData = new FormData()
  formData.append('target_page', targetPage.value.toString())
  
  if (actionType.value !== 'delete' && opForm.value.file) {
    formData.append('documento', opForm.value.file)
  }
  if (actionType.value === 'insert') {
    formData.append('etiqueta', opForm.value.etiqueta)
    if (opForm.value.numero_documento) {
      formData.append('numero_documento', opForm.value.numero_documento)
    }
    if (opForm.value.fecha_vencimiento) {
      formData.append('fecha_vencimiento', opForm.value.fecha_vencimiento)
    }
  }

  let endpoint = ''
  let method = 'POST'
  if (actionType.value === 'insert') endpoint = 'insertar'
  else if (actionType.value === 'replace') endpoint = 'reemplazar'
  else if (actionType.value === 'delete') {
    endpoint = 'eliminar'
    method = 'DELETE'
  }

  try {
    const token = sessionStorage.getItem('access_token') || ''
    const res = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    if (res.ok) {
      await loadIndices()
      await renderPDF() // Re-renderizar el PDF físico
      
      // Reset form
      opForm.value = { etiqueta: '', numero_documento: '', fecha_vencimiento: '', file: null }
      const fileInput = document.getElementById('opFileInput') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } else {
      const errData = await res.json()
      alert(`Error: ${errData.error || errData.detalle}`)
    }
  } catch (e) {
    console.error(e)
  } finally {
    isProcessing.value = false
  }
}

const downloadPDF = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    const url = `${API_URL}${props.documento.file_path}`
    
    // Descargamos el archivo como blob para forzar la descarga directa
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', `${props.documento.subcategoria?.nombre || 'documento'}.pdf`)
    document.body.appendChild(link)
    link.click()
    
    // Limpieza
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (e) {
    console.error("Error al descargar:", e)
    // Fallback básico
    window.open(`${API_URL}${props.documento.file_path}`, '_blank')
  }
}

const printPDF = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    const url = `${API_URL}${props.documento.file_path}`
    
    // 1. Descargamos el archivo como Blob para evitar errores de Cross-Origin (CORS)
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    // 2. Creamos el iframe con la URL local (misma procedencia)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = blobUrl
    
    document.body.appendChild(iframe)
    
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        
        // Limpieza
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(blobUrl)
        }, 2000)
      }, 500)
    }
  } catch (e) {
    console.error("Error al intentar imprimir:", e)
    // Fallback: abrir en pestaña nueva si falla el blob
    window.open(`${API_URL}${props.documento.file_path}`, '_blank')
  }
}

watch(() => props.documento, () => {
  loadIndices()
  renderPDF()
}, { immediate: true })

watch(zoomLevel, () => {
  renderPDF()
})

</script>

<template>
  <div class="fixed inset-0 flex flex-col z-[9999] font-['Plus_Jakarta_Sans'] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
    <!-- Header Corporativo Ocean Glass -->
    <header class="h-[72px] flex items-center justify-between px-8 sticky top-0 z-[110] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div class="flex items-center gap-5">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div>
          <h3 class="m-0 text-[1.05rem] font-extrabold tracking-tight">{{ props.documento.subcategoria?.nombre }}</h3>
          <p class="m-0 text-xs text-slate-500 dark:text-slate-400">Expediente: <span class="font-bold text-sky-600 dark:text-sky-400">{{ props.asociadoNombre }}</span></p>
        </div>
      </div>
      
      <div class="hidden md:flex items-center gap-3 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <button @click="jumpToPage(currentPage - 1)" :disabled="currentPage <= 1" 
                class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-8 h-8 flex items-center justify-center transition-all hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-40">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-xs font-extrabold min-w-[80px] text-center">{{ currentPage }} / {{ totalPaginas }}</span>
        <button @click="jumpToPage(currentPage + 1)" :disabled="currentPage >= totalPaginas" 
                class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-8 h-8 flex items-center justify-center transition-all hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-40">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex gap-2">
          <button v-if="authStore.hasPermission('descargar_pdf')" @click="downloadPDF" class="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center justify-center" title="Descargar">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button v-if="authStore.hasPermission('imprimir_pdf')" @click="printPDF" class="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center justify-center" title="Imprimir">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>
        </div>
        <div class="bg-slate-900 text-white px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs font-bold border border-slate-700 shadow-lg">
          <button @click="zoomLevel -= 0.1" :disabled="zoomLevel <= 0.5" class="hover:text-sky-400 disabled:opacity-30">−</button>
          <span class="min-w-[40px] text-center">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomLevel += 0.1" :disabled="zoomLevel >= 3" class="hover:text-sky-400 disabled:opacity-30">+</button>
        </div>
        <button @click="emit('close')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all">
          <span>Cerrar</span>
          <kbd class="opacity-70 text-lg">×</kbd>
        </button>
      </div>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
      <!-- SIDEBAR: ÍNDICES Y OPERACIONES -->
      <aside class="w-[360px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shadow-xl z-[100]">
        <div class="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="text-[0.7rem] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-widest border-b-2 border-sky-600 pb-2">Navegación e Índices</div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <!-- SECCIÓN DE OPERACIONES -->
          <div v-if="availableActions.length > 0" class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div class="p-4 bg-slate-100 dark:bg-slate-900/80 flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              <span>Edición de Documento</span>
            </div>
            
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase mb-2 tracking-wider">Página Destino</label>
                <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner">
                  <button @click="targetPage > 1 ? targetPage-- : null" class="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700">−</button>
                  <input type="number" v-model="targetPage" min="1" :max="totalPaginas" class="flex-1 bg-transparent text-center font-extrabold text-sm outline-none" />
                  <button @click="targetPage < totalPaginas ? targetPage++ : null" class="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700">+</button>
                </div>
              </div>

              <div class="flex bg-slate-200 dark:bg-slate-950 p-1 rounded-xl gap-1">
                <button v-for="type in availableActions" :key="type"
                        @click="actionType = type"
                        :class="[
                          'flex-1 py-2 text-[0.65rem] font-bold rounded-lg transition-all capitalize',
                          actionType === type ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700'
                        ]">
                  {{ type === 'insert' ? 'Insertar' : type === 'replace' ? 'Cambiar' : 'Eliminar' }}
                </button>
              </div>

              <div v-if="actionType !== 'delete'" class="space-y-3">
                <label for="opFileInput" class="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 rounded-xl cursor-pointer hover:border-sky-500 transition-all group">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 group-hover:text-sky-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span class="text-[0.7rem] text-slate-500 dark:text-slate-400 text-center truncate max-w-full px-2">{{ opForm.file ? opForm.file.name : 'Subir nuevo PDF' }}</span>
                </label>
                <input type="file" id="opFileInput" accept="application/pdf" @change="handleFileSelect" hidden />
              </div>

              <div v-if="actionType === 'insert'" class="space-y-3 animate-in fade-in slide-in-from-top-2">
                <input type="text" v-model="opForm.etiqueta" placeholder="Etiqueta del índice..." class="w-full p-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20" />
                <div class="space-y-3">
                  <input type="text" v-model="opForm.numero_documento" placeholder="Número de Documento" class="w-full p-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20" />
                  <div class="space-y-1">
                    <label class="block text-[0.6rem] font-bold text-slate-400 uppercase ml-1">Fecha de Vencimiento</label>
                    <input type="date" v-model="opForm.fecha_vencimiento" class="w-full p-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20" />
                  </div>
                </div>
              </div>

              <button @click="executeOperation" 
                      class="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      :class="actionType === 'delete' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'">
                <span v-if="isProcessing" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                {{ isProcessing ? 'Procesando...' : (actionType === 'delete' ? 'Confirmar Eliminación' : 'Aplicar Cambios') }}
              </button>
            </div>
          </div>

          <!-- LISTA DE ÍNDICES -->
          <div class="space-y-4">
            <h4 class="text-[0.7rem] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Índices Generados</h4>
            <div class="space-y-2.5">
              <div v-for="indice in indicesActuales" :key="indice.id" 
                   @click="jumpToPage(indice.pagina_inicio)"
                   :class="[
                     'group p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]',
                     currentPage >= indice.pagina_inicio ? 'bg-sky-50/50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800/50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-sm'
                   ]">
                <div class="flex gap-4">
                  <span class="text-[0.6rem] font-black text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30 px-2 py-1 rounded-md h-fit">Pág {{ indice.pagina_inicio }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">{{ indice.etiqueta }}</p>
                    <p class="text-[0.65rem] text-slate-500 dark:text-slate-400 flex items-center gap-2 italic">
                      <span class="font-mono">#{{ indice.numero_documento || 'S/N' }}</span>
                      <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{{ indice.tipo_movimiento }}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="indicesActuales.length === 0" class="py-10 text-center space-y-3 opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M10 10.375c0 .903.672 1.625 1.5 1.625h1c.828 0 1.5.722 1.5 1.625s-.672 1.625-1.5 1.625h-1"/><path d="M12 9v1"/><path d="M12 15v1"/><path d="m9 15 3-3 3 3"/></svg>
                <p class="text-[0.7rem] font-bold">Sin índices registrados</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- VISOR PDF CON FONDO OCEAN -->
      <main ref="scrollContainer" class="flex-1 bg-slate-200 dark:bg-slate-950 overflow-y-auto flex flex-col items-center py-12 relative scroll-smooth bg-gradient-to-br from-slate-200/50 to-slate-300/50 dark:from-slate-950 dark:to-slate-900 custom-scrollbar">
        <!-- Overlay de carga Premium -->
        <div v-if="isRendering" class="absolute inset-0 z-50 bg-slate-100/60 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-600 dark:text-slate-300">
          <div class="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4"></div>
          <p class="text-xs font-black tracking-widest uppercase animate-pulse">Renderizando Calidad HD</p>
        </div>
        
        <div ref="pagesContainer" class="flex flex-col items-center gap-10 drop-shadow-2xl"></div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* Estilos necesarios para la integración con PDF.js */
:deep(.pdf-page-wrapper) {
  background: white;
  margin-bottom: 2.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  transition: transform 0.3s ease;
}

:deep(.pdf-page-wrapper:hover) {
  transform: translateY(-5px);
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
