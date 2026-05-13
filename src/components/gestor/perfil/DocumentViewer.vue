<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

// PDF.js State
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
const pagesContainer = ref<HTMLElement | null>(null)

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
    root: pagesContainer.value,
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
  <div class="viewer-overlay">
    <div class="viewer-header">
      <div class="header-titles">
        <div class="title-with-badge">
          <h3>{{ props.documento.subcategoria?.nombre }}</h3>
          <span class="page-count-badge">{{ currentPage }} / {{ totalPaginas }} Páginas</span>
        </div>
        <span class="doc-meta">Asociado a {{ props.asociadoNombre }}</span>
      </div>
      
      <div class="viewer-controls">
        <div class="action-buttons">
          <button @click="downloadPDF" class="btn-action" title="Descargar PDF">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Descargar
          </button>
          <button @click="printPDF" class="btn-action" title="Imprimir PDF">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir
          </button>
        </div>

        <div class="zoom-controls">
          <button @click="zoomLevel -= 0.1" :disabled="zoomLevel <= 0.5">−</button>
          <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomLevel += 0.1" :disabled="zoomLevel >= 3">+</button>
        </div>
        <button @click="emit('close')" class="btn-close-viewer">Cerrar Visor ×</button>
      </div>
    </div>
    
    <div class="viewer-body">
      <!-- PANEL IZQUIERDO: GESTIÓN Y LÓGICA -->
      <div class="index-panel">
        
        <!-- OPERACIONES MANUALES -->
        <div class="manual-ops-card">
          <h4>Gestión de Páginas (Quirúrgica)</h4>
          <p class="help-text">Estás viendo la página <strong>{{ currentPage }}</strong>. Los cambios aplicarán aquí.</p>
          
          <div class="form-group row-group">
            <label>Página Objetivo:</label>
            <input type="number" v-model="targetPage" class="custom-input small-input" min="1" :max="totalPaginas" />
          </div>

          <div class="action-tabs">
            <button :class="['tab-btn', { active: actionType === 'insert' }]" @click="actionType = 'insert'">Insertar</button>
            <button :class="['tab-btn', { active: actionType === 'replace' }]" @click="actionType = 'replace'">Reemplazar</button>
            <button :class="['tab-btn', { active: actionType === 'delete' }]" @click="actionType = 'delete'">Eliminar</button>
          </div>

          <div v-if="actionType !== 'delete'" class="form-group mt-2">
            <label>Subir PDF (Hojas nuevas)</label>
            <input type="file" id="opFileInput" accept="application/pdf" class="custom-input" @change="handleFileSelect" />
          </div>

          <div v-if="actionType === 'insert'" class="form-group mt-2">
            <label>Etiqueta del Separador (Opcional)</label>
            <input type="text" v-model="opForm.etiqueta" class="custom-input" placeholder="Ej. Actualización" />
          </div>

          <div v-if="actionType === 'insert'" class="form-group mt-2">
            <label>Número de Documento (Opcional)</label>
            <input type="text" v-model="opForm.numero_documento" class="custom-input" placeholder="Ej. Recibo 001" />
          </div>

          <div v-if="actionType === 'insert'" class="form-group mt-2">
            <label>Fecha de Vencimiento (Opcional)</label>
            <input type="date" v-model="opForm.fecha_vencimiento" class="custom-input" />
          </div>

          <button @click="executeOperation" class="btn-execute mt-3" :disabled="isProcessing">
            <span v-if="isProcessing">Procesando...</span>
            <span v-else>Ejecutar Operación</span>
          </button>
        </div>

        <hr class="panel-divider" />

        <!-- HISTORIAL DE ÍNDICES -->
        <div class="indices-list">
          <h4 class="indices-title">Separadores (Índices)</h4>
          <div v-if="indicesActuales.length === 0" class="no-indices">
            No hay separadores lógicos.
          </div>
          
          <div v-for="indice in indicesActuales" :key="indice.id" 
               :class="['indice-item', { active: currentPage >= indice.pagina_inicio }]" 
               @click="jumpToPage(indice.pagina_inicio)">
            <div class="indice-info">
              <span class="indice-page">Pág. {{ indice.pagina_inicio }}</span>
              <div class="indice-text">
                <span class="indice-label">{{ indice.etiqueta }}</span>
                <span v-if="indice.numero_documento" class="indice-numero"># {{ indice.numero_documento }}</span>
              </div>
            </div>
            <div class="indice-meta">
              {{ indice.tipo_movimiento }} • {{ new Date(indice.fecha_operacion).toLocaleDateString() }}
            </div>
            <div v-if="indice.fecha_vencimiento" class="indice-vencimiento">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Vence: {{ new Date(indice.fecha_vencimiento).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DERECHO: VISOR PDF CON PDF.JS -->
      <div class="pdf-panel">
        <div v-if="isRendering" class="rendering-overlay">
          <div class="spinner"></div>
          <p>Renderizando documento...</p>
        </div>
        <div ref="pagesContainer" class="pdf-scroll-container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.98); z-index: 9999; display: flex; flex-direction: column; color: white; }
.viewer-header { padding: 1rem 2rem; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; }

.header-titles h3 { color: white; margin: 0; font-weight: 600; }
.title-with-badge { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.25rem; }
.page-count-badge { background: #0ea5e9; color: white; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 4px; text-transform: uppercase; }
.doc-meta { color: #94a3b8; font-size: 0.85rem; }

.viewer-controls { display: flex; align-items: center; gap: 1.5rem; }

.action-buttons { display: flex; gap: 0.5rem; }
.btn-action { 
  display: flex; align-items: center; gap: 0.5rem; 
  background: rgba(255,255,255,0.05); color: #cbd5e1; 
  border: 1px solid rgba(255,255,255,0.1); padding: 0.5rem 0.85rem; 
  border-radius: 8px; font-size: 0.85rem; font-weight: 600; 
  cursor: pointer; transition: 0.2s; 
}
.btn-action:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }
.btn-action svg { width: 18px; }

.zoom-controls { display: flex; align-items: center; gap: 1rem; background: #1e293b; padding: 0.25rem 0.75rem; border-radius: 8px; border: 1px solid #334155; }
.zoom-controls button { background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 0 0.5rem; transition: 0.2s; }
.zoom-controls button:hover:not(:disabled) { color: white; }
.zoom-text { font-size: 0.85rem; font-weight: 600; min-width: 45px; text-align: center; }

.btn-close-viewer { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-close-viewer:hover { background: #dc2626; }

.viewer-body { flex: 1; display: flex; overflow: hidden; }

/* PANEL IZQUIERDO */
.index-panel { width: 380px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; padding: 1.5rem; overflow-y: auto; }

.manual-ops-card { background: #0f172a; padding: 1.25rem; border-radius: 12px; border: 1px solid #334155; margin-bottom: 1rem; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
.manual-ops-card h4 { color: white; margin: 0 0 0.5rem 0; font-size: 1rem; }
.help-text { color: #94a3b8; font-size: 0.8rem; margin-bottom: 1rem; line-height: 1.4; }
.help-text strong { color: #0ea5e9; }

.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; }
.row-group { display: flex; align-items: center; gap: 0.75rem; }
.row-group label { margin: 0; }

.custom-input { width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: white; outline: none; }
.small-input { width: 80px; text-align: center; font-weight: 700; border-color: #0ea5e9; }

.action-tabs { display: flex; background: #1e293b; border-radius: 6px; overflow: hidden; margin: 1rem 0; border: 1px solid #334155; }
.tab-btn { flex: 1; padding: 0.6rem; border: none; background: transparent; color: #94a3b8; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.tab-btn.active { background: #0ea5e9; color: white; }

.btn-execute { width: 100%; padding: 0.85rem; border-radius: 8px; border: none; background: #10b981; color: white; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 5px 15px rgba(16, 185, 129, 0.2); }
.btn-execute:hover:not(:disabled) { background: #059669; transform: translateY(-2px); }
.btn-execute:disabled { opacity: 0.6; cursor: not-allowed; }

.panel-divider { border: none; border-top: 1px solid #334155; margin: 1.5rem 0; }

/* ÍNDICES */
.indices-title { color: #cbd5e1; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 1rem 0; }
.no-indices { color: #64748b; font-size: 0.9rem; font-style: italic; text-align: center; margin-top: 1rem; }
.indice-item { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; cursor: pointer; transition: 0.2s; opacity: 0.7; }
.indice-item:hover { border-color: #0ea5e9; transform: translateX(5px); opacity: 1; }
.indice-item.active { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.05); opacity: 1; }

.indice-info { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
.indice-page { background: #334155; color: #cbd5e1; font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; }
.indice-item.active .indice-page { background: #0ea5e9; color: white; }

.indice-text { display: flex; flex-direction: column; flex: 1; }
.indice-label { color: #f8fafc; font-weight: 600; font-size: 0.95rem; line-height: 1.3; }
.indice-numero { color: #94a3b8; font-size: 0.75rem; font-weight: 500; font-family: monospace; }
.indice-meta { color: #64748b; font-size: 0.75rem; margin-top: 0.25rem; }
.indice-vencimiento { display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.5rem; color: #f59e0b; font-size: 0.75rem; font-weight: 600; background: rgba(245, 158, 11, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; }
.indice-vencimiento svg { width: 14px; }

/* PDF PANEL CON PDF.JS */
.pdf-panel { flex: 1; display: flex; flex-direction: column; background: #020617; position: relative; }
.pdf-scroll-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; padding: 2rem; gap: 2rem; scroll-behavior: smooth; }

.pdf-page-wrapper { background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5); line-height: 0; }
.pdf-page-wrapper canvas { max-width: 100%; height: auto !important; }

.rendering-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
.spinner { width: 40px; height: 40px; border: 4px solid #1e293b; border-top-color: #0ea5e9; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
</style>
