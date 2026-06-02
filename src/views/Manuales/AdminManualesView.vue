<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configurar el worker usando el archivo local de la biblioteca
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface Puesto {
  id: number
  nombre: string
}

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
  puestos_autorizados: Puesto[]
  subcategoria?: {
    id: number
    nombre: string
    categoria?: {
      id: number
      nombre: string
    }
  }
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
}

interface Categoria {
  id: number
  nombre: string
  estado: boolean
  subcategorias?: Subcategoria[]
}

const authStore = useAuthStore()
const router = useRouter()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const puestos = ref<Puesto[]>([])
const categorias = ref<Categoria[]>([])
const manuales = ref<Manual[]>([])
const isLoading = ref(true)

// Modals y Formularios
const activeTab = ref<'manuales' | 'categorias'>('manuales')
const showCreateManualModal = ref(false)
const showCatModal = ref(false)
const showSubcatModal = ref(false)
const showUpdateUploadModal = ref(false)
const isSubmittingUpdate = ref(false)
const updateForm = ref({
  manualId: null as number | null,
  numeroActa: '',
  fechaAprobacion: '',
  fechaVigencia: '',
  descripcion: '',
  fileOriginal: null as File | null,
  fileActualizacion: null as File | null
})

// Modo activo del visor de PDF ('original' o el ID de la actualización)
const activeViewerMode = ref<'original' | number>('original')

// Estado del formulario de Manuales
const isSubmittingManual = ref(false)
const manualForm = ref({
  id: null as number | null, // Si está presente, es Edición
  titulo: '',
  categoriaId: '',
  subcategoriaId: '',
  file: null as File | null,
  puestosAutorizadosIds: [] as number[],
  numeroActa: '',
  fechaAprobacion: '',
  fechaVigencia: ''
})

// Estado del formulario de Categorías
const catForm = ref({
  id: null as number | null,
  nombre: '',
  estado: true
})

// Estado del formulario de Subcategorías
const subcatForm = ref({
  id: null as number | null,
  categoriaId: '',
  nombre: '',
  estado: true
})

const getHeaders = () => {
  const token = sessionStorage.getItem('access_token')
  return { 'Authorization': `Bearer ${token}` }
}

// --- Data Fetching ---
const loadAllData = async () => {
  isLoading.value = true
  try {
    const headers = getHeaders()
    const [resPuestos, resAdminCats] = await Promise.all([
      fetch(`${API_URL}/api/gestor/puestos`, { headers }),
      fetch(`${API_URL}/api/manuales/admin/categorias`, { headers }),
    ])

    if (resPuestos.ok) puestos.value = await resPuestos.json()
    
    if (resAdminCats.ok) {
      const data = await resAdminCats.json()
      categorias.value = data
      
      // Aplanar la lista de manuales cargados para poder listarlos en la tabla
      const flatDocs: Manual[] = []
      data.forEach((cat: Categoria) => {
        cat.subcategorias?.forEach(sub => {
          // Inyectamos relaciones aplanadas para facilitar la renderización
          const docs = (sub as any).documentos || []
          docs.forEach((doc: any) => {
            flatDocs.push({
              ...doc,
              subcategoria: {
                id: sub.id,
                nombre: sub.nombre,
                categoria: {
                  id: cat.id,
                  nombre: cat.nombre
                }
              }
            })
          })
        })
      })
      manuales.value = flatDocs
    }
  } catch (err) {
    console.error('Error al cargar datos de administración', err)
  } finally {
    isLoading.value = false
  }
}

// Computados para subcategorías basadas en la categoría seleccionada
const subcategoriasDisponiblesForm = computed(() => {
  if (!manualForm.value.categoriaId) return []
  const cat = categorias.value.find(c => c.id === parseInt(manualForm.value.categoriaId))
  return cat?.subcategorias || []
})

// --- ACCIONES CRUD MANUALES ---

const openCreateManual = () => {
  manualForm.value = {
    id: null,
    titulo: '',
    categoriaId: '',
    subcategoriaId: '',
    file: null,
    puestosAutorizadosIds: [],
    numeroActa: '',
    fechaAprobacion: '',
    fechaVigencia: ''
  }
  showCreateManualModal.value = true
}

const editManual = (doc: Manual) => {
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  manualForm.value = {
    id: doc.id,
    titulo: doc.titulo,
    categoriaId: doc.subcategoria?.categoria?.id?.toString() || '',
    subcategoriaId: doc.manual_subcategoria_id.toString(),
    file: null, // No cargamos archivo por defecto a menos que lo deseen cambiar
    puestosAutorizadosIds: doc.puestos_autorizados?.map(p => p.id) || [],
    numeroActa: doc.numero_acta || '',
    fechaAprobacion: formatDateForInput(doc.fecha_aprobacion),
    fechaVigencia: formatDateForInput(doc.fecha_vigencia)
  }
  showCreateManualModal.value = true
}

const handleManualFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    manualForm.value.file = target.files[0]
  }
}

const togglePuestoAuth = (id: number) => {
  const idx = manualForm.value.puestosAutorizadosIds.indexOf(id)
  if (idx > -1) {
    manualForm.value.puestosAutorizadosIds.splice(idx, 1)
  } else {
    manualForm.value.puestosAutorizadosIds.push(id)
  }
}

const saveManual = async () => {
  if (manualForm.value.titulo.trim() === '' || manualForm.value.subcategoriaId === '') {
    alert('Ingresa el título y selecciona la subcategoría.')
    return
  }

  isSubmittingManual.value = true
  const formData = new FormData()
  formData.append('titulo', manualForm.value.titulo)
  formData.append('subcategoria_id', manualForm.value.subcategoriaId)
  formData.append('puestos_autorizados', manualForm.value.puestosAutorizadosIds.join(','))
  formData.append('numero_acta', manualForm.value.numeroActa)
  formData.append('fecha_aprobacion', manualForm.value.fechaAprobacion)
  formData.append('fecha_vigencia', manualForm.value.fechaVigencia)
  
  if (manualForm.value.file) {
    formData.append('documento', manualForm.value.file)
  }

  const token = sessionStorage.getItem('access_token') || ''
  const isEdit = manualForm.value.id !== null
  const url = isEdit 
    ? `${API_URL}/api/manuales/documentos/${manualForm.value.id}` 
    : `${API_URL}/api/manuales/documentos/upload`
  
  const method = isEdit ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      showCreateManualModal.value = false
      loadAllData()
    } else {
      const err = await res.json()
      alert(`Error al guardar: ${err.error || err.detalle}`)
    }
  } catch (err) {
    console.error(err)
  } finally {
    isSubmittingManual.value = false
  }
}

const deleteManual = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar físicamente este manual? Esta acción no se puede deshacer.')) return
  try {
    const res = await fetch(`${API_URL}/api/manuales/documentos/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    if (res.ok) {
      loadAllData()
    } else {
      alert('Error al eliminar manual')
    }
  } catch (err) {
    console.error(err)
  }
}

// --- ACCIONES CRUD CATEGORÍAS ---

const openCreateCat = () => {
  catForm.value = { id: null, nombre: '', estado: true }
  showCatModal.value = true
}

const editCat = (cat: Categoria) => {
  catForm.value = { id: cat.id, nombre: cat.nombre, estado: cat.estado }
  showCatModal.value = true
}

const saveCat = async () => {
  if (catForm.value.nombre.trim() === '') return
  const isEdit = catForm.value.id !== null
  const url = isEdit ? `${API_URL}/api/manuales/categorias/${catForm.value.id}` : `${API_URL}/api/manuales/categorias`
  const method = isEdit ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: catForm.value.nombre, estado: catForm.value.estado })
    })
    if (res.ok) {
      showCatModal.value = false
      loadAllData()
    } else {
      alert('Error al guardar categoría')
    }
  } catch (err) {
    console.error(err)
  }
}

// --- ACCIONES CRUD SUBCATEGORÍAS ---

const openCreateSubcat = () => {
  subcatForm.value = { id: null, categoriaId: '', nombre: '', estado: true }
  showSubcatModal.value = true
}

const editSubcat = (sub: Subcategoria) => {
  subcatForm.value = { 
    id: sub.id, 
    categoriaId: sub.manual_categoria_id.toString(), 
    nombre: sub.nombre, 
    estado: sub.estado 
  }
  showSubcatModal.value = true
}

const saveSubcat = async () => {
  if (subcatForm.value.nombre.trim() === '' || subcatForm.value.categoriaId === '') return
  const isEdit = subcatForm.value.id !== null
  const url = isEdit ? `${API_URL}/api/manuales/subcategorias/${subcatForm.value.id}` : `${API_URL}/api/manuales/subcategorias`
  const method = isEdit ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        manual_categoria_id: parseInt(subcatForm.value.categoriaId),
        nombre: subcatForm.value.nombre, 
        estado: subcatForm.value.estado 
      })
    })
    if (res.ok) {
      showSubcatModal.value = false
      loadAllData()
    } else {
      alert('Error al guardar subcategoría')
    }
  } catch (err) {
    console.error(err)
  }
}

// --- LÓGICA ULTRA-OPTIMIZADA DE PDF.JS CON LAZY LOADING ---
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
    
    // 1. Obtener la URL firmada del backend (Alternando entre el manual principal y las hojas de actualización)
    const urlEndpoint = activeViewerMode.value === 'original'
      ? `${API_URL}/api/manuales/documentos/${selectedManual.value.id}/url`
      : `${API_URL}/api/manuales/actualizaciones/${activeViewerMode.value}/url`

    const resUrl = await fetch(urlEndpoint, {
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
    alert("Error al cargar el manual.")
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
  activeViewerMode.value = 'original'
  showViewer.value = true
}

const closeViewer = () => {
  showViewer.value = false
  selectedManual.value = null
  pdfDoc = null
  if (currentObserver) currentObserver.disconnect()
}

const openUploadUpdate = (manualId: number) => {
  updateForm.value = {
    manualId,
    numeroActa: '',
    fechaAprobacion: '',
    fechaVigencia: '',
    descripcion: '',
    fileOriginal: null,
    fileActualizacion: null
  }
  showUpdateUploadModal.value = true
}

const handleOriginalFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    updateForm.value.fileOriginal = target.files[0]
  }
}

const handleActualizacionFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    updateForm.value.fileActualizacion = target.files[0]
  }
}

const saveUpdate = async () => {
  if (updateForm.value.numeroActa.trim() === '' || !updateForm.value.fileOriginal || !updateForm.value.fileActualizacion) {
    alert('Por favor completa el número de acta y selecciona ambos archivos PDF (el manual completo consolidado y las hojas de cambio).')
    return
  }

  isSubmittingUpdate.value = true
  const formData = new FormData()
  formData.append('numero_acta', updateForm.value.numeroActa)
  formData.append('fecha_aprobacion', updateForm.value.fechaAprobacion)
  formData.append('fecha_vigencia', updateForm.value.fechaVigencia)
  formData.append('descripcion', updateForm.value.descripcion)
  formData.append('documento_original', updateForm.value.fileOriginal)
  formData.append('documento', updateForm.value.fileActualizacion)

  const token = sessionStorage.getItem('access_token') || ''
  const url = `${API_URL}/api/manuales/documentos/${updateForm.value.manualId}/actualizaciones`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      showUpdateUploadModal.value = false
      loadAllData()
    } else {
      const err = await res.json()
      alert(`Error al guardar actualización: ${err.error || err.detalle}`)
    }
  } catch (err) {
    console.error(err)
  } finally {
    isSubmittingUpdate.value = false
  }
}

const deleteUpdate = async (updateId: number) => {
  if (!confirm('¿Estás seguro de eliminar esta hoja de actualización? Esta acción no se puede deshacer.')) return
  try {
    const res = await fetch(`${API_URL}/api/manuales/actualizaciones/${updateId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    if (res.ok) {
      loadAllData()
    } else {
      alert('Error al eliminar la actualización')
    }
  } catch (err) {
    console.error(err)
  }
}

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

watch(activeViewerMode, () => {
  renderPDF()
})

const getVigenciaStatus = (manual: Manual) => {
  return { 
    label: 'Vigente', 
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

onMounted(() => {
  // Proteger la vista a nivel de código
  if (!authStore.hasPermission('admin_biblioteca')) {
    router.push('/unauthorized')
    return
  }
  loadAllData()
})
</script>

<template>
  <div class="admin-manuales-view min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 font-['Plus_Jakarta_Sans'] p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300">
    <div class="max-w-7xl mx-auto">
      
      <!-- ENCABEZADO -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <div>
          <span class="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Panel de Administración</span>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 font-['Outfit']">Configuración de Biblioteca de Manuales</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Crea estructuras, sube archivos PDF y controla los permisos de lectura de los colaboradores según sus puestos asignados.</p>
        </div>
        
        <div class="flex gap-3">
          <button @click="openCreateManual" class="btn-indigo">
            <span>➕ Subir Manual</span>
          </button>
          <button @click="openCreateCat" class="btn-slate">
            <span>📂 Crear Fólder</span>
          </button>
          <button @click="openCreateSubcat" class="btn-slate">
            <span>📁 Crear Subfólder</span>
          </button>
        </div>
      </div>

      <!-- TABS NAVEGACIÓN INTERNA -->
      <div class="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
        <button 
          @click="activeTab = 'manuales'" 
          :class="[
            'pb-3 font-extrabold text-sm transition-all relative border-b-2',
            activeTab === 'manuales' 
              ? 'border-indigo-650 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          ]"
        >
          📄 Lista de Manuales
        </button>
        <button 
          @click="activeTab = 'categorias'" 
          :class="[
            'pb-3 font-extrabold text-sm transition-all relative border-b-2',
            activeTab === 'categorias' 
              ? 'border-indigo-650 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          ]"
        >
          📂 Estructura de Fólderes
        </button>
      </div>

      <!-- LOADER -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-sm font-bold text-slate-400">Indexando base de datos...</p>
      </div>

      <!-- TAB: LISTA DE MANUALES -->
      <div v-else-if="activeTab === 'manuales'" class="space-y-6">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[0.65rem] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th class="p-4">Título del Manual</th>
                  <th class="p-4">Estructura</th>
                  <th class="p-4">Total Págs</th>
                  <th class="p-4">Cargos Autorizados</th>
                  <th class="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-150 dark:divide-slate-800">
                <tr v-for="doc in manuales" :key="doc.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                  <td class="p-4 font-bold text-slate-800 dark:text-slate-200">
                    <div class="flex items-center gap-3">
                      <span class="text-red-500 text-lg">📄</span>
                      <div class="space-y-1 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <p class="font-extrabold text-sm">{{ doc.titulo }}</p>
                          <span :class="['px-2 py-0.5 rounded font-black text-[0.55rem] uppercase tracking-wider', getVigenciaStatus(doc).class]">
                            {{ getVigenciaStatus(doc).label }}
                          </span>
                        </div>
                        <div class="flex items-center gap-3 text-[0.65rem] text-slate-400 font-semibold flex-wrap">
                          <span v-if="doc.numero_acta" class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">📜 Acta: {{ doc.numero_acta }}</span>
                          <span v-if="doc.fecha_aprobacion">📅 Aprobación: {{ formatDate(doc.fecha_aprobacion) }}</span>
                          <span v-if="doc.fecha_vigencia">⏳ Vigencia: {{ formatDate(doc.fecha_vigencia) }}</span>
                        </div>
                        <p class="text-[0.6rem] text-slate-400 font-mono truncate max-w-[250px]">{{ doc.file_path }}</p>
                        
                        <!-- Listado de la Última Hoja de Actualización Versionada Activa (Solo la última con archivo) -->
                        <div v-if="getLatestActiveUpdate(doc)" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                          <p class="text-[0.55rem] font-black text-slate-400 uppercase tracking-wider">🔄 Última Hoja de Cambio Activa:</p>
                          <div v-for="upd in [getLatestActiveUpdate(doc)].filter(Boolean) as Actualizacion[]" :key="upd.id" class="flex flex-col gap-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-850">
                            <div class="flex items-center gap-3 text-[0.65rem] text-slate-600 dark:text-slate-350">
                              <span class="font-bold text-slate-800 dark:text-slate-200">📜 Acta: {{ upd.numero_acta }}</span>
                              <span v-if="upd.fecha_aprobacion">📅 Aprob: {{ formatDate(upd.fecha_aprobacion) }}</span>
                              <span v-if="upd.fecha_vigencia" class="px-1.5 py-0.5 rounded text-[0.55rem] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10">⏳ Vigente desde: {{ formatDate(upd.fecha_vigencia) }}</span>
                              <span v-if="upd.total_paginas > 0" class="font-mono text-slate-400 text-[0.6rem]">({{ upd.total_paginas }} págs)</span>
                              <div class="ml-auto flex items-center gap-1.5">
                                <button @click="openManual(doc); activeViewerMode = upd.id" class="text-[0.6rem] font-extrabold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/10 hover:bg-indigo-100 transition-colors">Ver Hojas 👁️</button>
                                <button @click="deleteUpdate(upd.id)" class="text-[0.6rem] font-extrabold bg-red-50 dark:bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/10 hover:bg-red-100 transition-colors">Borrar 🗑️</button>
                              </div>
                            </div>
                            <p v-if="upd.descripcion" class="text-[0.6rem] text-slate-500 dark:text-slate-400 italic mt-0.5 pl-1 leading-normal">📝 {{ upd.descripcion }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="p-4 text-slate-500 dark:text-slate-400">
                    <p class="font-bold text-slate-700 dark:text-slate-350">📂 {{ doc.subcategoria?.categoria?.nombre }}</p>
                    <p class="text-[0.65rem]">📁 {{ doc.subcategoria?.nombre }}</p>
                  </td>
                  <td class="p-4 font-bold font-mono">{{ doc.total_paginas }} págs</td>
                  <td class="p-4">
                    <div class="flex flex-wrap gap-1.5 max-w-[320px]">
                      <span 
                        v-for="p in doc.puestos_autorizados" 
                        :key="p.id" 
                        class="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/10 font-bold text-[0.6rem]"
                      >
                        {{ p.nombre }}
                      </span>
                      <span v-if="!doc.puestos_autorizados || doc.puestos_autorizados.length === 0" class="text-[0.65rem] italic text-red-500 font-bold">🚫 Ninguno (Privado)</span>
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center justify-center gap-2">
                      <button @click="openManual(doc)" class="btn-action-view" title="Visualizar Manual">👁️</button>
                      <button @click="openUploadUpdate(doc.id)" class="btn-action-update" title="Subir Hojas de Actualización">🔄</button>
                      <button @click="editManual(doc)" class="btn-action-edit" title="Editar Permisos">✏️</button>
                      <button @click="deleteManual(doc.id)" class="btn-action-delete" title="Eliminar Manual">🗑️</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="manuales.length === 0">
                  <td colspan="5" class="p-16 text-center text-slate-400">
                    <p class="text-base mb-2">📚 No se han cargado manuales aún</p>
                    <button @click="openCreateManual" class="btn-indigo mx-auto text-xs py-2 px-4 rounded-xl">Subir Primer Manual</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: ESTRUCTURA DE FÓLDERES -->
      <div v-else-if="activeTab === 'categorias'" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Lista de Categorías -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-2">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">📂 Fólderes Principales</h3>
            <button @click="openCreateCat" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Crear Fólder</button>
          </div>
          <div class="divide-y divide-slate-150 dark:divide-slate-800">
            <div v-for="cat in categorias" :key="cat.id" class="py-4 flex items-center justify-between gap-4">
              <div>
                <p class="font-extrabold text-sm text-slate-800 dark:text-slate-100">{{ cat.nombre }}</p>
                <p class="text-[0.65rem] text-slate-500 dark:text-slate-500">Subfólderes asignados: <span class="font-bold text-slate-700 dark:text-slate-300">{{ cat.subcategorias?.length || 0 }}</span></p>
              </div>
              <div class="flex items-center gap-2">
                <button @click="editCat(cat)" class="btn-action-edit">✏️</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de Subcategorías -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-2">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">📁 Subfólderes</h3>
            <button @click="openCreateSubcat" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Crear Subfólder</button>
          </div>
          <div class="divide-y divide-slate-150 dark:divide-slate-800">
            <template v-for="cat in categorias" :key="'sublist-'+cat.id">
              <div v-for="sub in cat.subcategorias" :key="sub.id" class="py-4 flex items-center justify-between gap-4">
                <div>
                  <p class="font-extrabold text-sm text-slate-800 dark:text-slate-100">{{ sub.nombre }}</p>
                  <p class="text-[0.65rem] text-slate-500 dark:text-slate-500">Pertenece a: <span class="font-bold text-indigo-500">{{ cat.nombre }}</span></p>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="editSubcat(sub)" class="btn-action-edit">✏️</button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL: CREAR / EDITAR MANUAL -->
    <div v-if="showCreateManualModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        <!-- Header modal -->
        <div class="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ manualForm.id ? '✏️ Editar Metadatos del Manual' : '➕ Subir Nuevo Manual PDF' }}</h3>
          <button @click="showCreateManualModal = false" class="text-2xl text-slate-400 hover:text-slate-650 transition-colors">×</button>
        </div>

        <!-- Body modal -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          <!-- Título -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Título Comercial/Formativo</label>
            <input 
              type="text" 
              v-model="manualForm.titulo" 
              placeholder="Ej: Manual de Recepción y Cajas 2026..." 
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <!-- Selección Categoría / Subcategoría -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Fólder Principal</label>
              <select v-model="manualForm.categoriaId" class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none">
                <option value="">Selecciona Fólder...</option>
                <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </select>
            </div>
            
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Subfólder de Clasificación</label>
              <select v-model="manualForm.subcategoriaId" class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" :disabled="!manualForm.categoriaId">
                <option value="">Selecciona Subfólder...</option>
                <option v-for="s in subcategoriasDisponiblesForm" :key="s.id" :value="s.id">{{ s.nombre }}</option>
              </select>
            </div>
          </div>

          <!-- Nuevos Campos: No. Acta, Fecha Aprobación y Fecha Vigencia -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">No. Acta</label>
              <input 
                type="text" 
                v-model="manualForm.numeroActa" 
                placeholder="Ej: Acta 12-2026" 
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Fecha Aprobación</label>
              <input 
                type="date" 
                v-model="manualForm.fechaAprobacion" 
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Fecha Vigencia</label>
              <input 
                type="date" 
                v-model="manualForm.fechaVigencia" 
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <!-- Subida de PDF -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Archivo Físico (PDF)</label>
            <label for="modalManualInput" class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer hover:border-indigo-500 transition-all group">
              <span class="text-2xl">📥</span>
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-xs">{{ manualForm.file ? manualForm.file.name : (manualForm.id ? 'Dejar vacío si no deseas actualizar el PDF físico' : 'Selecciona un archivo PDF') }}</span>
            </label>
            <input type="file" accept="application/pdf" @change="handleManualFileChange" hidden id="modalManualInput" />
          </div>

          <!-- Control de Acceso: Puestos -->
          <div class="space-y-2">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Cargos/Puestos Autorizados de Lectura</label>
            <div class="border border-slate-200 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar">
              <label 
                v-for="p in puestos" 
                :key="p.id" 
                @click="togglePuestoAuth(p.id)"
                class="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer hover:border-indigo-300 transition-all"
                :class="manualForm.puestosAutorizadosIds.includes(p.id) ? 'border-indigo-550 ring-2 ring-indigo-550/10 bg-indigo-50/20' : 'border-slate-150 dark:border-slate-800'"
              >
                <input 
                  type="checkbox" 
                  :checked="manualForm.puestosAutorizadosIds.includes(p.id)" 
                  class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                  @click.stop="togglePuestoAuth(p.id)"
                />
                <span class="text-[0.7rem] font-bold">{{ p.nombre }}</span>
              </label>
            </div>
            <p class="text-[0.65rem] text-slate-400 italic mt-1 ml-1">Los administradores siempre tienen permiso total independientemente de los puestos asignados aquí.</p>
          </div>

        </div>

        <!-- Footer modal -->
        <div class="p-6 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button @click="showCreateManualModal = false" class="btn-slate">
            <span>Cancelar</span>
          </button>
          <button @click="saveManual" :disabled="isSubmittingManual" class="btn-indigo">
            <span v-if="isSubmittingManual" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></span>
            <span>{{ isSubmittingManual ? 'Guardando...' : 'Confirmar Guardado' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- MODAL: SUBIR HOJAS DE ACTUALIZACIÓN -->
    <div v-if="showUpdateUploadModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <!-- Header modal -->
        <div class="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">🔄 Subir Hojas de Actualización (Cambios)</h3>
          <button @click="showUpdateUploadModal = false" class="text-2xl text-slate-400 hover:text-slate-650 transition-colors">×</button>
        </div>

        <!-- Body modal -->
        <div class="p-6 space-y-6">
          <p class="text-xs text-slate-500 dark:text-slate-400">Sube tanto el manual consolidado (completo) con los nuevos cambios aplicados, como el archivo que contenga únicamente las hojas que cambiaron en esta acta.</p>

          <!-- No. Acta -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">No. Acta de Aprobación</label>
            <input 
              type="text" 
              v-model="updateForm.numeroActa" 
              placeholder="Ej: Acta 14-2026" 
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <!-- Fechas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Fecha Aprobación</label>
              <input 
                type="date" 
                v-model="updateForm.fechaAprobacion" 
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Fecha Vigencia</label>
              <input 
                type="date" 
                v-model="updateForm.fechaVigencia" 
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <!-- Descripción del Cambio -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">Descripción del Cambio / Acta</label>
            <textarea 
              v-model="updateForm.descripcion" 
              rows="3"
              placeholder="Ej: Se modificaron las páginas 12, 14 y 15 referentes a las políticas de cobro por cajas..." 
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            ></textarea>
          </div>

          <!-- Dos Subidas de Archivo -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 1. PDF Completo Original (Actualizado) -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">1. PDF Completo Actualizado (Original)</label>
              <label for="modalUpdateOriginalInput" class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer hover:border-indigo-500 transition-all group">
                <span class="text-xl">📄</span>
                <span class="text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 text-center truncate max-w-[200px]" :title="updateForm.fileOriginal ? updateForm.fileOriginal.name : ''">
                  {{ updateForm.fileOriginal ? updateForm.fileOriginal.name : 'Subir manual consolidado' }}
                </span>
              </label>
              <input type="file" accept="application/pdf" @change="handleOriginalFileChange" hidden id="modalUpdateOriginalInput" />
            </div>

            <!-- 2. PDF de Hojas de Cambio -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase ml-1">2. Solo Hojas de Cambio (PDF)</label>
              <label for="modalUpdateChangesInput" class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer hover:border-indigo-500 transition-all group">
                <span class="text-xl">🔄</span>
                <span class="text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 text-center truncate max-w-[200px]" :title="updateForm.fileActualizacion ? updateForm.fileActualizacion.name : ''">
                  {{ updateForm.fileActualizacion ? updateForm.fileActualizacion.name : 'Subir solo hojas modificadas' }}
                </span>
              </label>
              <input type="file" accept="application/pdf" @change="handleActualizacionFileChange" hidden id="modalUpdateChangesInput" />
            </div>
          </div>
        </div>

        <!-- Footer modal -->
        <div class="p-6 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button @click="showUpdateUploadModal = false" class="btn-slate">
            <span>Cancelar</span>
          </button>
          <button @click="saveUpdate" :disabled="isSubmittingUpdate" class="btn-indigo">
            <span v-if="isSubmittingUpdate" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></span>
            <span>{{ isSubmittingUpdate ? 'Subiendo...' : 'Subir Actualización' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- MODAL: GESTIÓN DE CATEGORÍAS -->
    <div v-if="showCatModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ catForm.id ? '✏️ Editar Fólder' : '📂 Crear Nuevo Fólder Principal' }}</h3>
        
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Nombre del Fólder</label>
            <input type="text" v-model="catForm.nombre" placeholder="Ej: Políticas de Riesgos, Manuales Operativos..." class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>
          
          <div class="flex items-center gap-3">
            <input type="checkbox" v-model="catForm.estado" id="catEstadoInput" class="rounded border-slate-300 text-indigo-650 h-4.5 w-4.5" />
            <label for="catEstadoInput" class="text-xs font-bold select-none cursor-pointer">Fólder Activo</label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button @click="showCatModal = false" class="btn-slate"><span>Cancelar</span></button>
          <button @click="saveCat" class="btn-indigo"><span>Guardar</span></button>
        </div>
      </div>
    </div>

    <!-- MODAL: GESTIÓN DE SUBCATEGORÍAS -->
    <div v-if="showSubcatModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ subcatForm.id ? '✏️ Editar Subfólder' : '📁 Crear Nuevo Subfólder' }}</h3>
        
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Fólder Principal de Destino</label>
            <select v-model="subcatForm.categoriaId" class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none">
              <option value="">Selecciona Fólder Principal...</option>
              <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Nombre del Subfólder</label>
            <input type="text" v-model="subcatForm.nombre" placeholder="Ej: Captaciones, Créditos, Atención..." class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>
          
          <div class="flex items-center gap-3">
            <input type="checkbox" v-model="subcatForm.estado" id="subcatEstadoInput" class="rounded border-slate-300 text-indigo-650 h-4.5 w-4.5" />
            <label for="subcatEstadoInput" class="text-xs font-bold select-none cursor-pointer">Subfólder Activo</label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button @click="showSubcatModal = false" class="btn-slate"><span>Cancelar</span></button>
          <button @click="saveSubcat" class="btn-indigo"><span>Guardar</span></button>
        </div>
      </div>
    </div>

    <!-- VISOR ULTRA OPTIMIZADO (FULLSCREEN PREVIEW MODAL) -->
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
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="m-0 text-[1rem] font-extrabold tracking-tight">{{ selectedManual.titulo }}</h3>
                <span :class="['px-2 py-0.5 rounded font-black text-[0.55rem] uppercase tracking-wider', getVigenciaStatus(selectedManual).class]">
                  {{ getVigenciaStatus(selectedManual).label }}
                </span>

                <!-- Selector de Versión / Hojas de Cambio -->
                <select 
                  v-if="selectedManual.actualizaciones && selectedManual.actualizaciones.length > 0"
                  v-model="activeViewerMode"
                  class="ml-3 text-[0.65rem] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 p-1.5 border border-indigo-200 dark:border-indigo-900 rounded-lg outline-none cursor-pointer"
                >
                  <option value="original">📄 Documento Original ({{ selectedManual.total_paginas }} págs)</option>
                  <template v-for="upd in selectedManual.actualizaciones" :key="upd.id">
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
                <span v-if="selectedManual.numero_acta" class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">📜 Acta: {{ selectedManual.numero_acta }}</span>
                <span v-if="selectedManual.fecha_aprobacion">📅 Aprobación: {{ formatDate(selectedManual.fecha_aprobacion) }}</span>
                <span v-if="selectedManual.fecha_vigencia">⏳ Vigencia: {{ formatDate(selectedManual.fecha_vigencia) }}</span>
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
            <div v-if="!selectedManual.actualizaciones || selectedManual.actualizaciones.length === 0" class="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span class="text-3xl">📭</span>
              <h5 class="text-xs font-bold text-slate-700 dark:text-slate-350">Sin Cambios Posteriores</h5>
              <p class="text-[0.65rem] text-slate-400 dark:text-slate-500 leading-normal">Este manual se mantiene en su versión original de publicación y no tiene actas de actualización cargadas.</p>
            </div>

            <!-- Listado de Actualizaciones en formato Timeline -->
            <div v-else class="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6 my-2">
              <div 
                v-for="upd in [...(selectedManual.actualizaciones || [])].sort((a, b) => b.id - a.id)" 
                :key="upd.id"
                class="relative space-y-1.5"
              >
                <!-- Punto en el Timeline -->
                <span class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-slate-900" 
                      :class="upd.file_path ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-300 dark:border-slate-700'"></span>
                
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[0.7rem] font-extrabold text-slate-850 dark:text-slate-100">📜 Acta {{ upd.numero_acta }}</span>
                  <span v-if="upd.file_path" class="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[0.55rem] font-bold select-none">Activo</span>
                  <span v-else class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[0.55rem] font-bold select-none">Integrado</span>
                </div>

                <div class="flex flex-col gap-0.5 text-[0.6rem] text-slate-400 dark:text-slate-550 font-bold">
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
.btn-indigo {
  background: #4f46e5;
  color: white;
  border: none;
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1.5rem;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15);
}
.btn-indigo:hover {
  background: #4338ca;
  box-shadow: 0 8px 15px rgba(79, 70, 229, 0.3);
  transform: translateY(-1px);
}
.btn-indigo:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-slate {
  background: transparent;
  color: #64748b;
  border: 1.5px solid #cbd5e1;
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.72rem 1.5rem;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-slate:hover {
  background: #f1f5f9;
  color: #334155;
  border-color: #94a3b8;
}

:root.dark .btn-slate {
  border-color: #334155;
  color: #94a3b8;
}
:root.dark .btn-slate:hover {
  background: #1e293b;
  color: #f8fafc;
}

.btn-action-edit, .btn-action-delete, .btn-action-update {
  background: #f1f5f9;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.8rem;
}
.btn-action-edit:hover {
  background: #0ea5e9;
  color: white;
}
.btn-action-update:hover {
  background: #10b981;
  color: white;
}
.btn-action-delete:hover {
  background: #ef4444;
  color: white;
}

:root.dark .btn-action-edit, :root.dark .btn-action-delete, :root.dark .btn-action-update {
  background: #1e293b;
}

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

.btn-indigo select {
  cursor: pointer;
}
.border-indigo-550 {
  border-color: #4f46e5;
}
.btn-indigo-650 {
  background: #4f46e5;
}

.btn-action-view {
  background: #f1f5f9;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.8rem;
}
.btn-action-view:hover {
  background: #4f46e5;
  color: white;
}

:root.dark .btn-action-view {
  background: #1e293b;
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
