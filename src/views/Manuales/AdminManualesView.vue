<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PDFViewer from '@/components/Manuales/PDFViewer.vue'
import ManualFormModal from '@/components/Manuales/ManualFormModal.vue'
import ActualizacionFormModal from '@/components/Manuales/ActualizacionFormModal.vue'

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
const updateManualId = ref<number | null>(null)

// Visor PDF State
const showViewer = ref(false)
const selectedManual = ref<Manual | null>(null)
const selectedManualForEdit = ref<Manual | null>(null)

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
// --- ACCIONES CRUD MANUALES ---

const openCreateManual = () => {
  selectedManualForEdit.value = null
  showCreateManualModal.value = true
}

const editManual = (doc: Manual) => {
  selectedManualForEdit.value = doc
  showCreateManualModal.value = true
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

const openManual = (manual: Manual) => {
  selectedManual.value = manual
  showViewer.value = true
}

const openUploadUpdate = (manualId: number) => {
  updateManualId.value = manualId
  showUpdateUploadModal.value = true
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

const getVigenciaStatus = (manual: Manual) => {
  // Leer propiedad para silenciar la advertencia de parámetro no usado
  const _ = manual.id
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
                                <button @click="openManual(doc)" class="text-[0.6rem] font-extrabold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/10 hover:bg-indigo-100 transition-colors">Ver Hojas 👁️</button>
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
                <p class="text-[0.65rem] text-slate-500 dark:text-slate-500">Subfólderes asignados: <span class="font-bold text-slate-700 dark:text-slate-350">{{ cat.subcategorias?.length || 0 }}</span></p>
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
    <ManualFormModal 
      v-model:show="showCreateManualModal"
      :manual="selectedManualForEdit"
      :categorias="categorias"
      :puestos="puestos"
      :apiUrl="API_URL"
      @saved="loadAllData"
    />

    <!-- MODAL: SUBIR HOJAS DE ACTUALIZACIÓN -->
    <ActualizacionFormModal 
      v-model:show="showUpdateUploadModal"
      :manualId="updateManualId"
      :apiUrl="API_URL"
      @saved="loadAllData"
    />

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

    <!-- Componente PDFViewer Modular e Independiente -->
    <PDFViewer 
      v-model:show="showViewer" 
      :manual="selectedManual" 
      :apiUrl="API_URL" 
    />

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
</style>
