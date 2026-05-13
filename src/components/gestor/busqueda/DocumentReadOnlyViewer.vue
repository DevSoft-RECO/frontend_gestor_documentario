<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
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
  await nextTick()
  if (!pagesContainer.value) return
  isRendering.value = true
  
  try {
    const token = sessionStorage.getItem('access_token')
    const url = `${API_URL}${props.documento.file_path}?t=${new Date().getTime()}`
    
    const loadingTask = pdfjsLib.getDocument({
      url,
      httpHeaders: { 'Authorization': `Bearer ${token}` }
    })
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
    
    // Si hay una página inicial, saltar a ella después de renderizar
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
    root: pagesContainer.value,
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
  const token = sessionStorage.getItem('access_token')
  const res = await fetch(`${API_URL}${props.documento.file_path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', `${props.documento.subcategoria?.nombre || 'documento'}.pdf`)
  link.click()
  URL.revokeObjectURL(blobUrl)
}

const printPDF = async () => {
  const token = sessionStorage.getItem('access_token')
  const res = await fetch(`${API_URL}${props.documento.file_path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
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
}

watch(() => props.documento, () => {
  loadIndices()
  renderPDF()
}, { immediate: true })

watch(zoomLevel, renderPDF)
</script>

<template>
  <div class="viewer-overlay">
    <div class="viewer-header">
      <div class="header-titles">
        <div class="title-with-badge">
          <h3>{{ props.documento.subcategoria?.nombre }}</h3>
          <span class="page-count-badge">{{ currentPage }} / {{ totalPaginas }} Páginas</span>
        </div>
        <span class="doc-meta">Viendo expediente de {{ props.asociadoNombre }}</span>
      </div>
      
      <div class="viewer-controls">
        <div class="action-buttons">
          <button @click="downloadPDF" class="btn-action">Descargar</button>
          <button @click="printPDF" class="btn-action">Imprimir</button>
        </div>
        <div class="zoom-controls">
          <button @click="zoomLevel -= 0.1">−</button>
          <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomLevel += 0.1">+</button>
        </div>
        <button @click="emit('close')" class="btn-close-viewer">Cerrar Visor ×</button>
      </div>
    </div>
    
    <div class="viewer-body">
      <div class="index-panel">
        <h4 class="indices-title">Índices del Documento</h4>
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
        </div>
      </div>

      <div class="pdf-panel">
        <div v-if="isRendering" class="rendering-overlay">
          <div class="spinner"></div>
          <p>Cargando visor de seguridad...</p>
        </div>
        <div ref="pagesContainer" class="pdf-scroll-container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.98); z-index: 9999; display: flex; flex-direction: column; color: white; font-family: 'Inter', sans-serif; }
.viewer-header { padding: 1rem 2rem; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; }
.header-titles h3 { color: white; margin: 0; font-weight: 600; }
.title-with-badge { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.25rem; }
.page-count-badge { background: #0ea5e9; color: white; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 4px; }
.doc-meta { color: #94a3b8; font-size: 0.85rem; }

.viewer-controls { display: flex; align-items: center; gap: 1.5rem; }
.action-buttons { display: flex; gap: 0.5rem; }
.btn-action { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: 0.2s; }
.btn-action:hover { background: rgba(255,255,255,0.1); color: white; }

.zoom-controls { display: flex; align-items: center; gap: 1rem; background: #1e293b; padding: 0.25rem 0.75rem; border-radius: 8px; border: 1px solid #334155; }
.zoom-controls button { background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; }
.zoom-text { font-size: 0.85rem; min-width: 45px; text-align: center; }
.btn-close-viewer { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }

.viewer-body { flex: 1; display: flex; overflow: hidden; }
.index-panel { width: 320px; background: #1e293b; border-right: 1px solid #334155; padding: 1.5rem; overflow-y: auto; }
.indices-title { color: #cbd5e1; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 1.5rem; }
.indice-item { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; cursor: pointer; opacity: 0.7; transition: 0.2s; }
.indice-item.active { border-color: #0ea5e9; opacity: 1; background: rgba(14, 165, 233, 0.05); }

.indice-info { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; }
.indice-page { background: #334155; color: #cbd5e1; font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; }
.indice-item.active .indice-page { background: #0ea5e9; color: white; }
.indice-label { color: #f8fafc; font-weight: 600; font-size: 0.95rem; }
.indice-numero { color: #94a3b8; font-size: 0.75rem; display: block; font-family: monospace; }
.indice-meta { color: #64748b; font-size: 0.75rem; }

.pdf-panel { flex: 1; background: #020617; position: relative; }
.pdf-scroll-container { height: 100%; overflow-y: auto; display: flex; flex-direction: column; align-items: center; padding: 2rem; gap: 2rem; }
.pdf-page-wrapper { background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.rendering-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
.spinner { width: 40px; height: 40px; border: 4px solid #1e293b; border-top-color: #0ea5e9; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
