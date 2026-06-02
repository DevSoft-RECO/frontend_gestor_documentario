<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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

const props = defineProps<{
  show: boolean
  manual: Manual | null
  categorias: Categoria[]
  puestos: Puesto[]
  apiUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'saved'): void
}>()

const isSubmittingManual = ref(false)
const manualForm = ref({
  id: null as number | null,
  titulo: '',
  categoriaId: '',
  subcategoriaId: '',
  file: null as File | null,
  puestosAutorizadosIds: [] as number[],
  numeroActa: '',
  fechaAprobacion: '',
  fechaVigencia: ''
})

const subcategoriasDisponiblesForm = computed(() => {
  if (!manualForm.value.categoriaId) return []
  const cat = props.categorias.find(c => c.id === parseInt(manualForm.value.categoriaId))
  return cat?.subcategorias || []
})

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
    ? `${props.apiUrl}/api/manuales/documentos/${manualForm.value.id}` 
    : `${props.apiUrl}/api/manuales/documentos/upload`
  
  const method = isEdit ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    if (res.ok) {
      emit('saved')
      closeModal()
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

const closeModal = () => {
  emit('update:show', false)
}

watch(() => props.show, (newShow) => {
  if (newShow) {
    if (props.manual) {
      const formatDateForInput = (dateStr?: string) => {
        if (!dateStr) return ''
        return dateStr.substring(0, 10)
      }

      manualForm.value = {
        id: props.manual.id,
        titulo: props.manual.titulo,
        categoriaId: props.manual.subcategoria?.categoria?.id?.toString() || '',
        subcategoriaId: props.manual.manual_subcategoria_id.toString(),
        file: null,
        puestosAutorizadosIds: props.manual.puestos_autorizados?.map(p => p.id) || [],
        numeroActa: props.manual.numero_acta || '',
        fechaAprobacion: formatDateForInput(props.manual.fecha_aprobacion),
        fechaVigencia: formatDateForInput(props.manual.fecha_vigencia)
      }
    } else {
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
    }
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 font-['Plus_Jakarta_Sans'] text-slate-800 dark:text-slate-100">
      
      <!-- Header modal -->
      <div class="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ manualForm.id ? '✏️ Editar Metadatos del Manual' : '➕ Subir Nuevo Manual PDF' }}</h3>
        <button @click="closeModal" class="text-2xl text-slate-400 hover:text-slate-650 transition-colors">×</button>
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
        <button @click="closeModal" class="btn-slate">
          <span>Cancelar</span>
        </button>
        <button @click="saveManual" :disabled="isSubmittingManual" class="btn-indigo">
          <span v-if="isSubmittingManual" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></span>
          <span>{{ isSubmittingManual ? 'Guardando...' : 'Confirmar Guardado' }}</span>
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
.border-indigo-550 {
  border-color: #4f46e5;
}
</style>
