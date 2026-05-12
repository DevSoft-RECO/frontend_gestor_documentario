<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Interfaces
interface Asociado {
  id: number
  codigo_cliente: string
  dpi: string
  nombre_completo: string
  direccion: string
  fecha_registro: string
}

interface CategoriaMaster {
  id: number
  nombre: string
  estado: boolean
  subcategorias: SubcategoriaMaster[]
}

interface SubcategoriaMaster {
  id: number
  categoria_id: number
  nombre: string
  estado: boolean
}

interface Documento {
  id: number
  asociado_id: number
  subcategoria_id: number
  file_path: string
  fecha_creacion: string
  subcategoria: {
    id: number
    nombre: string
    categoria: {
      id: number
      nombre: string
    }
  }
}

// Grouped structure for UI
interface GrupoCategoria {
  id: number
  nombre: string
  documentos: Documento[]
}

const route = useRoute()
const router = useRouter()
const asociado = ref<Asociado | null>(null)
const expedientesBrutos = ref<Documento[]>([])
const categoriasMaster = ref<CategoriaMaster[]>([])
const isLoading = ref(true)

const showUploadModal = ref(false)
const showViewerModal = ref(false)
const viewerUrl = ref('')

const uploadForm = ref({
  categoria_id: '',
  subcategoria_id: '',
  file: null as File | null
})
const isUploading = ref(false)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// --- Data Fetching ---

const fetchAsociado = async () => {
  try {
    const res = await fetch(`${API_URL}/api/gestor/asociados/${route.params.id}`)
    if (res.ok) {
      asociado.value = await res.json()
    } else {
      router.push('/admin/gestor/buscador')
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchExpediente = async () => {
  try {
    const res = await fetch(`${API_URL}/api/gestor/asociados/${route.params.id}/expediente`)
    if (res.ok) {
      expedientesBrutos.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchCategoriasMaster = async () => {
  try {
    const res = await fetch(`${API_URL}/api/gestor/categorias`)
    if (res.ok) {
      categoriasMaster.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  }
}

const loadAllData = async () => {
  isLoading.value = true
  await Promise.all([fetchAsociado(), fetchExpediente(), fetchCategoriasMaster()])
  isLoading.value = false
}

// --- Computed Properties ---

const expedienteAgrupado = computed(() => {
  const grupos: Record<number, GrupoCategoria> = {}

  expedientesBrutos.value.forEach(doc => {
    if (!doc.subcategoria || !doc.subcategoria.categoria) return // Safety check

    const catId = doc.subcategoria.categoria.id
    if (!grupos[catId]) {
      grupos[catId] = {
        id: catId,
        nombre: doc.subcategoria.categoria.nombre,
        documentos: []
      }
    }
    grupos[catId].documentos.push(doc)
  })

  return Object.values(grupos)
})

const activeSubcategoriasForUpload = computed(() => {
  const catId = Number(uploadForm.value.categoria_id)
  if (!catId) return []
  const cat = categoriasMaster.value.find(c => c.id === catId)
  return cat ? cat.subcategorias.filter(s => s.estado) : []
})

// --- Actions ---

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    uploadForm.value.file = target.files[0]
  }
}

const uploadDocument = async () => {
  if (!uploadForm.value.subcategoria_id || !uploadForm.value.file) {
    alert('Por favor selecciona una subcategoría y un archivo PDF.')
    return
  }

  isUploading.value = true
  const formData = new FormData()
  formData.append('asociado_id', route.params.id as string)
  formData.append('subcategoria_id', uploadForm.value.subcategoria_id)
  formData.append('documento', uploadForm.value.file)

  try {
    const res = await fetch(`${API_URL}/api/gestor/documentos/upload`, {
      method: 'POST',
      body: formData
    })
    
    if (res.ok) {
      // Reload expediente
      await fetchExpediente()
      showUploadModal.value = false
      uploadForm.value = { categoria_id: '', subcategoria_id: '', file: null }
      
      // Reset input file visual
      const fileInput = document.getElementById('fileUploadInput') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } else {
      const data = await res.json()
      alert(`Error: ${data.error}`)
    }
  } catch (e) {
    console.error(e)
    alert('Error al subir el documento')
  } finally {
    isUploading.value = false
  }
}

const openViewer = (doc: Documento) => {
  // Adding timestamp to avoid iframe caching
  viewerUrl.value = `${API_URL}${doc.file_path}?t=${new Date().getTime()}`
  showViewerModal.value = true
}

onMounted(loadAllData)
</script>

<template>
  <div class="perfil-container">
    <div v-if="isLoading" class="loader-container">
      <div class="loader"></div>
      <p>Cargando expediente...</p>
    </div>

    <template v-else-if="asociado">
      <!-- ENCABEZADO -->
      <div class="profile-header glass-card">
        <button @click="router.push('/admin/gestor/buscador')" class="btn-back">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver al Buscador
        </button>

        <div class="header-main">
          <div class="avatar-large">
            {{ asociado.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}
          </div>
          <div class="main-info">
            <h1>{{ asociado.nombre_completo }}</h1>
            <div class="badges">
              <span class="badge-blue">DPI: {{ asociado.dpi }}</span>
              <span class="badge-green">Código: {{ asociado.codigo_cliente || 'PENDIENTE' }}</span>
            </div>
          </div>
          <div class="actions-area">
            <button @click="showUploadModal = true" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Añadir Documento
            </button>
          </div>
        </div>
      </div>

      <!-- CONTENIDO DEL EXPEDIENTE (CARPETAS ACTIVAS) -->
      <div class="expediente-content">
        <div v-if="expedienteAgrupado.length === 0" class="empty-state glass-card">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <h3>Expediente Vacío</h3>
          <p>No hay documentos físicos en el expediente de {{ asociado.nombre_completo.split(' ')[0] }}.</p>
          <button @click="showUploadModal = true" class="btn-primary-outline mt-4">Comenzar a Armar Expediente</button>
        </div>

        <div v-else class="categorias-grid">
          <div v-for="grupo in expedienteAgrupado" :key="grupo.id" class="categoria-section glass-card">
            <div class="categoria-header">
              <h2>{{ grupo.nombre }}</h2>
              <span class="doc-count">{{ grupo.documentos.length }} documento(s)</span>
            </div>
            
            <div class="docs-grid">
              <div v-for="doc in grupo.documentos" :key="doc.id" class="doc-card" @click="openViewer(doc)">
                <div class="doc-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <div class="status-indicator"></div>
                </div>
                <div class="doc-info">
                  <h4>{{ doc.subcategoria.nombre }}</h4>
                  <p>Subido el {{ formatDate(doc.fecha_creacion) }}</p>
                </div>
                <div class="doc-action">
                  <span>Ver PDF</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- MODAL DE CARGA (AÑADIR DOCUMENTO) -->
    <div v-if="showUploadModal" class="modal-overlay">
      <div class="glass-card modal-content slide-up">
        <div class="modal-header">
          <h2>Añadir Nuevo Documento</h2>
          <button @click="showUploadModal = false" class="btn-close">×</button>
        </div>
        
        <p class="modal-desc">Selecciona a qué familia pertenece la hoja que vas a insertar en el expediente.</p>
        
        <div class="form-group">
          <label>1. Categoría Principal</label>
          <select v-model="uploadForm.categoria_id" class="custom-select">
            <option value="">Selecciona una familia...</option>
            <option v-for="cat in categoriasMaster.filter(c => c.estado)" :key="cat.id" :value="cat.id">
              {{ cat.nombre }}
            </option>
          </select>
        </div>

        <div v-if="uploadForm.categoria_id" class="form-group slide-down">
          <label>2. Tipo de Documento</label>
          <select v-model="uploadForm.subcategoria_id" class="custom-select">
            <option value="">Selecciona el documento exacto...</option>
            <option v-for="sub in activeSubcategoriasForUpload" :key="sub.id" :value="sub.id">
              {{ sub.nombre }}
            </option>
          </select>
        </div>

        <div v-if="uploadForm.subcategoria_id" class="form-group slide-down">
          <label>3. Archivo PDF</label>
          <div class="file-drop-area">
            <input id="fileUploadInput" type="file" accept="application/pdf" @change="handleFileSelect">
            <div class="file-msg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span>{{ uploadForm.file ? uploadForm.file.name : 'Haz clic para explorar archivos (Solo PDF)' }}</span>
            </div>
          </div>
          <p class="warning-text" v-if="uploadForm.subcategoria_id">
            ⚠️ Si ya existe este documento en el fólder, el nuevo archivo reemplazará al anterior por completo.
          </p>
        </div>

        <div class="modal-actions">
          <button @click="showUploadModal = false" class="btn-secondary">Cancelar</button>
          <button 
            @click="uploadDocument" 
            class="btn-primary" 
            :disabled="!uploadForm.file || isUploading"
          >
            {{ isUploading ? 'Subiendo...' : 'Guardar en Expediente' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL VISOR PDF -->
    <div v-if="showViewerModal" class="viewer-overlay">
      <div class="viewer-header">
        <h3>Visor de Expediente</h3>
        <button @click="showViewerModal = false" class="btn-close-viewer">Cerrar Visor ×</button>
      </div>
      <div class="viewer-body">
        <iframe :src="viewerUrl" class="pdf-iframe"></iframe>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perfil-container { padding: 2rem; max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif; }

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.profile-header { padding: 2.5rem; margin-bottom: 2rem; }

.btn-back { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; margin-bottom: 2rem; transition: 0.2s; }
.btn-back:hover { color: #0ea5e9; transform: translateX(-5px); }
.btn-back svg { width: 18px; }

.header-main { display: flex; align-items: center; gap: 2rem; }
.avatar-large { width: 90px; height: 90px; border-radius: 24px; background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; font-size: 2.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2); }
.main-info { flex: 1; }
.main-info h1 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0 0 0.75rem 0; }

.badges { display: flex; gap: 0.75rem; }
.badge-blue, .badge-green { padding: 0.4rem 1rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 700; }
.badge-blue { background: #e0f2fe; color: #0369a1; }
.badge-green { background: #dcfce7; color: #166534; }

.actions-area { text-align: right; }
.btn-primary { background: #0ea5e9; color: white; border: none; padding: 0.85rem 1.75rem; border-radius: 9999px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.75rem; transition: 0.2s; }
.btn-primary:hover:not(:disabled) { background: #0284c7; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(14,165,233,0.2); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-primary svg { width: 20px; }

.btn-primary-outline { background: transparent; color: #0ea5e9; border: 2px solid #0ea5e9; padding: 0.85rem 1.75rem; border-radius: 9999px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-primary-outline:hover { background: #f0f9ff; }

.mt-4 { margin-top: 1rem; }

/* EXPEDIENTE GRID */
.expediente-content { display: grid; gap: 2rem; }

.empty-state { padding: 5rem 2rem; text-align: center; border: 2px dashed #cbd5e1; background: rgba(248, 250, 252, 0.8); }
.empty-state svg { width: 64px; color: #cbd5e1; margin-bottom: 1rem; }
.empty-state h3 { font-size: 1.5rem; color: #334155; margin-bottom: 0.5rem; }
.empty-state p { color: #64748b; }

.categorias-grid { display: flex; flex-direction: column; gap: 2rem; }

.categoria-section { padding: 2rem; }
.categoria-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; }
.categoria-header h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
.doc-count { font-size: 0.85rem; font-weight: 600; color: #0ea5e9; background: #e0f2fe; padding: 0.25rem 0.75rem; border-radius: 9999px; }

.docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }

.doc-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem; display: flex; flex-direction: column; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; }
.doc-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: #bae6fd; }

.doc-icon { width: 48px; height: 48px; background: #f0f9ff; color: #0ea5e9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; position: relative; }
.doc-icon svg { width: 24px; }
.status-indicator { position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; }

.doc-info { flex: 1; }
.doc-info h4 { margin: 0 0 0.25rem 0; color: #1e293b; font-size: 1.05rem; }
.doc-info p { margin: 0; font-size: 0.8rem; color: #64748b; }

.doc-action { margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #0ea5e9; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; }
.doc-action svg { width: 16px; }

/* MODALS */
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { width: 90%; max-width: 550px; padding: 2.5rem; }

.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.modal-header h2 { margin: 0; font-size: 1.5rem; color: #0f172a; }
.btn-close { background: none; border: none; font-size: 2rem; color: #94a3b8; cursor: pointer; line-height: 1; }
.btn-close:hover { color: #ef4444; }

.modal-desc { color: #64748b; margin-bottom: 2rem; line-height: 1.5; }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-weight: 700; color: #475569; margin-bottom: 0.5rem; font-size: 0.9rem; }

.custom-select { width: 100%; padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 1rem; background: #f8fafc; color: #1e293b; outline: none; transition: 0.2s; }
.custom-select:focus { border-color: #0ea5e9; background: white; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }

.file-drop-area { position: relative; width: 100%; padding: 2rem; border: 2px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; text-align: center; cursor: pointer; transition: 0.2s; }
.file-drop-area:hover { border-color: #0ea5e9; background: #f0f9ff; }
.file-drop-area input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.file-msg { pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #64748b; font-weight: 500; }
.file-msg svg { width: 32px; color: #94a3b8; }

.warning-text { margin-top: 0.75rem; font-size: 0.8rem; color: #d97706; font-weight: 600; line-height: 1.4; }

.modal-actions { margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; }
.btn-secondary { background: #f1f5f9; color: #475569; border: none; padding: 0.85rem 1.5rem; border-radius: 9999px; font-weight: 600; cursor: pointer; }

/* ANIMATIONS */
.slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.slide-down { animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* VIEWER OVERLAY */
.viewer-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.95); z-index: 9999; display: flex; flex-direction: column; }
.viewer-header { padding: 1rem 2rem; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; }
.viewer-header h3 { color: white; margin: 0; font-weight: 600; }
.btn-close-viewer { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-close-viewer:hover { background: #dc2626; }
.viewer-body { flex: 1; padding: 2rem; display: flex; justify-content: center; }
.pdf-iframe { width: 100%; max-width: 1200px; height: 100%; border: none; border-radius: 12px; background: white; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }

.loader-container { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: #64748b; }
.loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0ea5e9; border-radius: 50%; animation: spin 1s linear infinite; }
</style>
