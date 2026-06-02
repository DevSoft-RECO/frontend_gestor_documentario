<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  manualId: number | null
  apiUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'saved'): void
}>()

const isSubmittingUpdate = ref(false)
const updateForm = ref({
  numeroActa: '',
  fechaAprobacion: '',
  fechaVigencia: '',
  descripcion: '',
  fileOriginal: null as File | null,
  fileActualizacion: null as File | null
})

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
  const url = `${props.apiUrl}/api/manuales/documentos/${props.manualId}/actualizaciones`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      emit('saved')
      closeModal()
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

const closeModal = () => {
  emit('update:show', false)
}

watch(() => props.show, (newShow) => {
  if (newShow) {
    updateForm.value = {
      numeroActa: '',
      fechaAprobacion: '',
      fechaVigencia: '',
      descripcion: '',
      fileOriginal: null,
      fileActualizacion: null
    }
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 font-['Plus_Jakarta_Sans'] text-slate-800 dark:text-slate-100">
      
      <!-- Header modal -->
      <div class="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">🔄 Subir Hojas de Actualización (Cambios)</h3>
        <button @click="closeModal" class="text-2xl text-slate-400 hover:text-slate-650 transition-colors">×</button>
      </div>

      <!-- Body modal -->
      <div class="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
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
        <button @click="closeModal" class="btn-slate">
          <span>Cancelar</span>
        </button>
        <button @click="saveUpdate" :disabled="isSubmittingUpdate" class="btn-indigo">
          <span v-if="isSubmittingUpdate" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></span>
          <span>{{ isSubmittingUpdate ? 'Subiendo...' : 'Subir Actualización' }}</span>
        </button>
      </div>

    </div>
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
</style>
