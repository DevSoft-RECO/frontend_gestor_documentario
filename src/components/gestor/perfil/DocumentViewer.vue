<script setup lang="ts">
import { ref, watch } from 'vue'

interface IndicePagina {
  id: number
  documento_id: number
  pagina_inicio: number
  tipo_movimiento: string
  etiqueta: string
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
const viewerUrl = ref('')
const indicesActuales = ref<IndicePagina[]>([])

// Operaciones manuales
const actionType = ref<'insert' | 'replace' | 'delete'>('insert')
const targetPage = ref<number | null>(null)
const opForm = ref({
  etiqueta: '',
  fecha_vencimiento: '',
  file: null as File | null
})
const isProcessing = ref(false)

const loadIndices = async () => {
  try {
    const res = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/indices`)
    if (res.ok) {
      indicesActuales.value = await res.json()
    }
  } catch (e) {
    console.error("Error al obtener índices", e)
  }
}

const initViewer = async () => {
  await loadIndices()
  viewerUrl.value = `${API_URL}${props.documento.file_path}?t=${new Date().getTime()}`
}

const jumpToPage = (pageNum: number) => {
  viewerUrl.value = `${API_URL}${props.documento.file_path}?t=${new Date().getTime()}#page=${pageNum}`
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
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${API_URL}/api/gestor/documentos/${props.documento.id}/${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    if (res.ok) {
      await loadIndices()
      if (actionType.value === 'insert') jumpToPage(targetPage.value + 1)
      else if (actionType.value === 'replace') jumpToPage(targetPage.value)
      else jumpToPage(1)
      
      // Reset form
      opForm.value = { etiqueta: '', fecha_vencimiento: '', file: null }
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

watch(() => props.documento, initViewer, { immediate: true })
</script>

<template>
  <div class="viewer-overlay">
    <div class="viewer-header">
      <div class="header-titles">
        <h3>{{ props.documento.subcategoria?.nombre }}</h3>
        <span class="doc-meta">Asociado a {{ props.asociadoNombre }}</span>
      </div>
      <button @click="emit('close')" class="btn-close-viewer">Cerrar Visor ×</button>
    </div>
    
    <div class="viewer-body">
      <!-- PANEL IZQUIERDO: GESTIÓN Y LÓGICA -->
      <div class="index-panel">
        
        <!-- OPERACIONES MANUALES -->
        <div class="manual-ops-card">
          <h4>Gestión de Páginas del Docuemnto</h4>
          <p class="help-text">Ingresa el número de página para alterar el PDF físico.</p>
          
          <div class="form-group row-group">
            <label>Página:</label>
            <input type="number" v-model="targetPage" class="custom-input small-input" min="0" placeholder="Ej. 1" />
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
          
          <div v-for="indice in indicesActuales" :key="indice.id" class="indice-item" @click="jumpToPage(indice.pagina_inicio)">
            <div class="indice-info">
              <span class="indice-page">Pág. {{ indice.pagina_inicio }}</span>
              <span class="indice-label">{{ indice.etiqueta }}</span>
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

      <!-- PANEL DERECHO: VISOR PDF -->
      <div class="pdf-panel">
        <iframe :src="viewerUrl" class="pdf-iframe"></iframe>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.95); z-index: 9999; display: flex; flex-direction: column; }
.viewer-header { padding: 1rem 2rem; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; }
.header-titles h3 { color: white; margin: 0 0 0.25rem 0; font-weight: 600; }
.doc-meta { color: #94a3b8; font-size: 0.85rem; }
.btn-close-viewer { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-close-viewer:hover { background: #dc2626; }

.viewer-body { flex: 1; display: flex; overflow: hidden; }

/* PANEL IZQUIERDO */
.index-panel { width: 380px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; padding: 1.5rem; overflow-y: auto; }

.manual-ops-card { background: #0f172a; padding: 1.25rem; border-radius: 12px; border: 1px solid #334155; margin-bottom: 1rem; }
.manual-ops-card h4 { color: white; margin: 0 0 0.5rem 0; }
.help-text { color: #94a3b8; font-size: 0.8rem; margin-bottom: 1rem; }

.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; }
.row-group { display: flex; align-items: center; gap: 0.75rem; }
.row-group label { margin: 0; }

.custom-input { width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: white; outline: none; }
.small-input { width: 80px; text-align: center; }

.action-tabs { display: flex; background: #1e293b; border-radius: 6px; overflow: hidden; margin-bottom: 1rem; }
.tab-btn { flex: 1; padding: 0.5rem; border: none; background: transparent; color: #94a3b8; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.tab-btn.active { background: #0ea5e9; color: white; }

.btn-execute { width: 100%; padding: 0.75rem; border-radius: 6px; border: none; background: #10b981; color: white; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-execute:hover:not(:disabled) { background: #059669; }
.btn-execute:disabled { opacity: 0.6; cursor: not-allowed; }

.panel-divider { border: none; border-top: 1px solid #334155; margin: 1.5rem 0; }

/* ÍNDICES */
.indices-title { color: #cbd5e1; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 1rem 0; }
.no-indices { color: #64748b; font-size: 0.9rem; font-style: italic; text-align: center; margin-top: 1rem; }
.indice-item { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; cursor: pointer; transition: 0.2s; }
.indice-item:hover { border-color: #0ea5e9; transform: translateX(5px); }
.indice-info { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
.indice-page { background: #0ea5e9; color: white; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; }
.indice-label { color: #f8fafc; font-weight: 600; font-size: 0.95rem; line-height: 1.3; flex: 1; }
.indice-meta { color: #64748b; font-size: 0.75rem; }
.indice-vencimiento { display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.5rem; color: #f59e0b; font-size: 0.75rem; font-weight: 600; background: rgba(245, 158, 11, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; }
.indice-vencimiento svg { width: 14px; }

/* PDF PANEL */
.pdf-panel { flex: 1; display: flex; padding: 2rem; background: #0f172a; justify-content: center; }
.pdf-iframe { width: 100%; max-width: 1200px; height: 100%; border: none; border-radius: 12px; background: white; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }

.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
</style>
