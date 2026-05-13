<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface CategoriaMaster {
  id: number
  nombre: string
  estado: boolean
  subcategorias: SubcategoriaMaster[]
}

interface Puesto {
  id: number
  nombre: string
}

interface SubcategoriaMaster {
  id: number
  categoria_id: number
  nombre: string
  estado: boolean
  puestos_autorizados?: Puesto[]
}

const props = defineProps<{
  categoriasMaster: CategoriaMaster[]
  asociadoId: string
}>()

const emit = defineEmits(['close', 'uploadSuccess'])

const authStore = useAuthStore()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const uploadForm = ref({
  categoria_id: '',
  subcategoria_id: '',
  etiqueta: '',
  numero_documento: '',
  fecha_vencimiento: '',
  file: null as File | null
})
const isUploading = ref(false)

const canSeeSubcategoria = (sub: SubcategoriaMaster) => {
  // 1. Bypass para Super Admin
  if (authStore.user?.roles?.includes('Super Admin') || authStore.user?.roles?.includes('Administrador')) {
    return true
  }

  // 2. POLÍTICA ESTRICTA: Si no tiene puestos restringidos, se OCULTA por seguridad
  if (!sub.puestos_autorizados || sub.puestos_autorizados.length === 0) {
    return false
  }

  // 3. Verificar si el puesto del usuario está autorizado
  const idPuestoUsuario = authStore.user?.id_puesto
  return sub.puestos_autorizados.some(p => p.id === idPuestoUsuario)
}

const filteredCategoriasMaster = computed(() => {
  return props.categoriasMaster
    .filter(c => c.estado)
    .map(c => ({
      ...c,
      subcategorias: c.subcategorias.filter(s => s.estado && canSeeSubcategoria(s))
    }))
    .filter(c => c.subcategorias.length > 0) // Solo mostrar categorías que tengan al menos una subcategoría visible
})

const activeSubcategoriasForUpload = computed(() => {
  const catId = Number(uploadForm.value.categoria_id)
  if (!catId) return []
  const cat = filteredCategoriasMaster.value.find(c => c.id === catId)
  return cat ? cat.subcategorias : []
})

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
  formData.append('asociado_id', props.asociadoId)
  formData.append('subcategoria_id', uploadForm.value.subcategoria_id)
  if (uploadForm.value.etiqueta) {
    formData.append('etiqueta', uploadForm.value.etiqueta)
  }
  if (uploadForm.value.numero_documento) {
    formData.append('numero_documento', uploadForm.value.numero_documento)
  }
  if (uploadForm.value.fecha_vencimiento) {
    formData.append('fecha_vencimiento', uploadForm.value.fecha_vencimiento)
  }
  formData.append('documento', uploadForm.value.file)

  try {
    const token = sessionStorage.getItem('access_token') || ''
    const res = await fetch(`${API_URL}/api/gestor/documentos/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    if (res.ok) {
      uploadForm.value = { categoria_id: '', subcategoria_id: '', etiqueta: '', numero_documento: '', fecha_vencimiento: '', file: null }
      emit('uploadSuccess')
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
</script>

<template>
  <div class="modal-overlay">
    <div class="glass-card modal-content slide-up">
      <div class="modal-header">
        <h2>Añadir Nuevo Documento Maestro</h2>
        <button @click="emit('close')" class="btn-close">×</button>
      </div>
      
      <p class="modal-desc">Selecciona a qué familia pertenece el primer PDF que vas a insertar en este nuevo fólder.</p>
      
      <div class="form-group">
        <label>1. Categoría Principal</label>
        <select v-model="uploadForm.categoria_id" class="custom-select">
          <option value="">Selecciona una familia...</option>
          <option v-for="cat in filteredCategoriasMaster" :key="cat.id" :value="cat.id">
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
        <label>3. Etiqueta del Primer Índice (Opcional)</label>
        <input type="text" v-model="uploadForm.etiqueta" class="custom-select" placeholder="Ej. Documento Original" />
      </div>

      <div v-if="uploadForm.subcategoria_id" class="form-group slide-down">
        <label>4. Número del Documento Físico (Opcional)</label>
        <input type="text" v-model="uploadForm.numero_documento" class="custom-select" placeholder="Ej. Factura A-123" />
      </div>

      <div v-if="uploadForm.subcategoria_id" class="form-group slide-down">
        <label>5. Fecha de Vencimiento (Opcional)</label>
        <input type="date" v-model="uploadForm.fecha_vencimiento" class="custom-select" />
      </div>

      <div v-if="uploadForm.subcategoria_id" class="form-group slide-down">
        <label>6. Archivo PDF Inicial</label>
        <div class="file-drop-area">
          <input type="file" accept="application/pdf" @change="handleFileSelect">
          <div class="file-msg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span>{{ uploadForm.file ? uploadForm.file.name : 'Haz clic para explorar archivos (Solo PDF)' }}</span>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="emit('close')" class="btn-secondary">Cancelar</button>
        <button 
          @click="uploadDocument" 
          class="btn-primary" 
          :disabled="!uploadForm.file || isUploading"
        >
          {{ isUploading ? 'Subiendo...' : 'Crear Fólder Maestro' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
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

.modal-actions { margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; }
.btn-secondary { background: #f1f5f9; color: #475569; border: none; padding: 0.85rem 1.5rem; border-radius: 9999px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #0ea5e9; color: white; border: none; padding: 0.85rem 1.75rem; border-radius: 9999px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-primary:hover:not(:disabled) { background: #0284c7; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.slide-down { animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>
