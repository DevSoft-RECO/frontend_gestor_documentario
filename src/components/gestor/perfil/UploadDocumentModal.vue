<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUploadStore } from '@/stores/upload'

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
const uploadStore = useUploadStore()

const uploadForm = ref({
  categoria_id: '',
  subcategoria_id: '',
  etiqueta: '',
  numero_documento: '',
  fecha_vencimiento: '',
  file: null as File | null
})

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

const uploadDocument = () => {
  if (!uploadForm.value.subcategoria_id || !uploadForm.value.file) {
    alert('Por favor selecciona una subcategoría y un archivo PDF.')
    return
  }

  if (!uploadForm.value.numero_documento || !uploadForm.value.numero_documento.trim()) {
    alert('Por favor ingresa el Número Físico.')
    return
  }

  // Despachar la carga en segundo plano al almacén Pinia
  uploadStore.uploadFile({
    file: uploadForm.value.file,
    asociadoId: props.asociadoId,
    subcategoriaId: uploadForm.value.subcategoria_id,
    etiqueta: uploadForm.value.etiqueta || undefined,
    numeroDocumento: uploadForm.value.numero_documento,
    fechaVencimiento: uploadForm.value.fecha_vencimiento || undefined
  })

  // Limpiar el formulario y cerrar el modal inmediatamente
  uploadForm.value = { 
    categoria_id: '', 
    subcategoria_id: '', 
    etiqueta: '', 
    numero_documento: '', 
    fecha_vencimiento: '', 
    file: null 
  }
  
  emit('close')
}
</script>

<template>
  <div class="modal-overlay">
    <div class="glass-card modal-content slide-up">
      <div class="modal-header">
        <div class="header-main">
          <div class="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <h2>Añadir nuevo folder de datos</h2>
            <p class="modal-desc">Clasifica el primer PDF para crear este nuevo fólder en el expediente.</p>
          </div>
        </div>
        <button @click="emit('close')" class="btn-close">×</button>
      </div>
      
      <div class="modal-body-scroll">
        <div class="form-grid">
          <!-- Columna 1: Clasificación Principal -->
          <div class="form-section">
            <h3 class="section-title">1. Clasificación</h3>
            <div class="form-group">
              <label>Categoría Principal</label>
              <select v-model="uploadForm.categoria_id" class="custom-select">
                <option value="">Selecciona una familia...</option>
                <option v-for="cat in filteredCategoriasMaster" :key="cat.id" :value="cat.id">
                  {{ cat.nombre }}
                </option>
              </select>
            </div>

            <div v-if="uploadForm.categoria_id" class="form-group slide-down">
              <label>Tipo de Documento</label>
              <select v-model="uploadForm.subcategoria_id" class="custom-select">
                <option value="">Selecciona el documento exacto...</option>
                <option v-for="sub in activeSubcategoriasForUpload" :key="sub.id" :value="sub.id">
                  {{ sub.nombre }}
                </option>
              </select>
            </div>
          </div>

          <!-- Columna 2: Detalles Opcionales -->
          <div v-if="uploadForm.subcategoria_id" class="form-section slide-down">
            <h3 class="section-title">2. Detalles del Documento</h3>
            <div class="form-group">
              <label>Etiqueta del Primer Índice</label>
              <input type="text" v-model="uploadForm.etiqueta" class="custom-select" placeholder="Ej. Documento Original" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Número de documento<span style="color: #ef4444;">*</span></label>
                <input type="text" v-model="uploadForm.numero_documento" class="custom-select" placeholder="Ej. A-123" required />
              </div>
              <div class="form-group">
                <label>Fecha de vencimiento</label>
                <input type="date" v-model="uploadForm.fecha_vencimiento" class="custom-select" />
              </div>
            </div>
          </div>
        </div>

        <!-- Archivo (Ancho Completo) -->
        <div v-if="uploadForm.subcategoria_id" class="form-section file-section slide-down">
          <h3 class="section-title">3. Archivo PDF Inicial</h3>
          <div class="file-drop-area">
            <input type="file" accept="application/pdf" @change="handleFileSelect">
            <div class="file-msg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span class="file-text">{{ uploadForm.file ? uploadForm.file.name : 'Haz clic para explorar archivos (Solo PDF)' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="emit('close')" class="btn-secondary">Cancelar</button>
        <button 
          @click="uploadDocument" 
          class="btn-primary" 
          :disabled="!uploadForm.file || !uploadForm.numero_documento?.trim()"
        >
          Crear Fólder Maestro
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card { background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 24px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15); }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 2rem; }
.modal-content { width: 100%; max-width: 850px; display: flex; flex-direction: column; max-height: 90vh; }

.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 2rem 2.5rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
.header-main { display: flex; gap: 1.25rem; align-items: center; }
.icon-circle { width: 48px; height: 48px; background: #e0f2fe; color: #0ea5e9; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.icon-circle svg { width: 24px; }

.modal-header h2 { margin: 0; font-size: 1.5rem; color: #0f172a; font-weight: 800; }
.modal-desc { color: #64748b; margin: 0.25rem 0 0 0; font-size: 0.95rem; }

.btn-close { background: #f1f5f9; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; line-height: 1; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-close:hover { background: #fee2e2; color: #ef4444; }

.modal-body-scroll { padding: 2rem 2.5rem; overflow-y: auto; flex: 1; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; margin-bottom: 2rem; }

.section-title { font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.section-title::after { content: ''; flex: 1; height: 1px; background: #f1f5f9; }

.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; font-weight: 700; color: #475569; margin-bottom: 0.5rem; font-size: 0.85rem; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.custom-select { width: 100%; padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem; background: #f8fafc; color: #1e293b; outline: none; transition: 0.2s; }
.custom-select:focus { border-color: #0ea5e9; background: white; box-shadow: 0 0 0 4px rgba(14,165,233,0.1); }

.file-drop-area { position: relative; width: 100%; padding: 2rem; border: 2px dashed #e2e8f0; border-radius: 16px; background: #f8fafc; text-align: center; cursor: pointer; transition: 0.2s; }
.file-drop-area:hover { border-color: #0ea5e9; background: #f0f9ff; }
.file-drop-area input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }

.file-msg { pointer-events: none; display: flex; align-items: center; justify-content: center; gap: 1rem; color: #475569; font-weight: 600; }
.file-msg svg { width: 28px; color: #0ea5e9; }
.file-text { font-size: 0.9rem; }

.modal-actions { padding: 1.5rem 2.5rem 2rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid #f1f5f9; background: #f8fafc; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; }
.btn-secondary { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 0.85rem 2rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-secondary:hover { background: #f1f5f9; }

.btn-primary { background: #0ea5e9; color: white; border: none; padding: 0.85rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 0.75rem; }
.btn-primary:hover:not(:disabled) { background: #0284c7; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner-small { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.slide-down { animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* Scrollbar personalizado */
.modal-body-scroll::-webkit-scrollbar { width: 6px; }
.modal-body-scroll::-webkit-scrollbar-track { background: transparent; }
.modal-body-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.modal-body-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

/* --- COMPATIBILIDAD MODO OSCURO --- */
:root.dark .glass-card {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

:root.dark .modal-header { border-color: #1e293b; }
:root.dark .modal-header h2 { color: #f8fafc; }
:root.dark .modal-desc { color: #94a3b8; }
:root.dark .icon-circle { background: #1e293b; }
:root.dark .btn-close { background: #1e293b; color: #94a3b8; }

:root.dark .section-title::after { background: #1e293b; }
:root.dark .form-group label { color: #cbd5e1; }

:root.dark .custom-select {
  background: #1e293b;
  border-color: #334155;
  color: #f8fafc;
}
:root.dark .custom-select:focus { background: #0f172a; border-color: #0ea5e9; }

:root.dark .file-drop-area {
  background: #1e293b;
  border-color: #334155;
}
:root.dark .file-drop-area:hover { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.05); }
:root.dark .file-msg { color: #94a3b8; }

:root.dark .modal-actions {
  background: #020617;
  border-color: #1e293b;
}
:root.dark .btn-secondary {
  background: #1e293b;
  color: #94a3b8;
  border-color: #334155;
}
:root.dark .btn-secondary:hover { background: #334155; color: white; }

:root.dark .modal-body-scroll::-webkit-scrollbar-thumb { background: #334155; }
</style>
