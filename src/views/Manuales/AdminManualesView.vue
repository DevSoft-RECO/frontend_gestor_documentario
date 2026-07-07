<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'
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
  manual_carpeta_id: number
  titulo: string
  file_path: string
  total_paginas: number
  puestos_autorizados: Puesto[]
  carpeta?: {
    id: number
    nombre: string
    subcategoria?: {
      id: number
      nombre: string
      categoria?: {
        id: number
        nombre: string
      }
    }
  }
  numero_acta?: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  actualizaciones?: Actualizacion[]
}

interface Carpeta {
  id: number
  manual_subcategoria_id: number
  nombre: string
  estado: boolean
}

interface Subcategoria {
  id: number
  manual_categoria_id: number
  nombre: string
  estado: boolean
  carpetas?: Carpeta[]
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
const showCarpetaModal = ref(false)
const showUpdateUploadModal = ref(false)
const updateManualId = ref<number | null>(null)

// Visor PDF State
const showViewer = ref(false)
const selectedManual = ref<Manual | null>(null)
const selectedManualForEdit = ref<Manual | null>(null)

// Estado del formulario de Gavetas (Categorías)
const catForm = ref({
  id: null as number | null,
  nombre: '',
  estado: true
})

// Estado del formulario de Portafolios (Subcategorías)
const subcatForm = ref({
  id: null as number | null,
  categoriaId: '',
  nombre: '',
  estado: true
})

// Estado del formulario de Carpetas
const carpetaForm = ref({
  id: null as number | null,
  subcategoriaId: '',
  nombre: '',
  estado: true
})

const getHeaders = () => {
  const token = sessionStorage.getItem('access_token')
  return { 'Authorization': `Bearer ${token}` }
}

const loadAllData = async () => {
  isLoading.value = true
  try {
    const headers = getHeaders()
    const [resPuestos, resAdminCats] = await Promise.all([
      fetch(`${API_URL}/api/gestor/puestos`, { headers }),
      fetch(`${API_URL}/api/manuales/admin/categorias`, { headers }),
    ])

    if (resPuestos.ok) puestos.value = await resPuestos.json()
    if (resAdminCats.ok) categorias.value = await resAdminCats.json()
    
    await loadManuales()
  } catch (err) {
    console.error('Error al cargar datos de administración', err)
  } finally {
    isLoading.value = false
  }
}

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
  if (!confirm('¿Estás seguro de eliminar físicamente esta normativa? Esta acción no se puede deshacer.')) return
  try {
    const res = await fetch(`${API_URL}/api/manuales/documentos/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    if (res.ok) {
      loadAllData()
    } else {
      alert('Error al eliminar normativa')
    }
  } catch (err) {
    console.error(err)
  }
}

// --- ACCIONES CRUD GAVETAS (CATEGORÍAS) ---

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
      alert('Error al guardar gaveta')
    }
  } catch (err) {
    console.error(err)
  }
}

// --- ACCIONES CRUD PORTAFOLIOS (SUBCATEGORÍAS) ---

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
      alert('Error al guardar portafolio')
    }
  } catch (err) {
    console.error(err)
  }
}

// --- ACCIONES CRUD CARPETAS (NIVEL 3) ---

const openCreateCarpeta = () => {
  carpetaForm.value = { id: null, subcategoriaId: '', nombre: '', estado: true }
  showCarpetaModal.value = true
}

const editCarpeta = (carp: Carpeta) => {
  carpetaForm.value = {
    id: carp.id,
    subcategoriaId: carp.manual_subcategoria_id.toString(),
    nombre: carp.nombre,
    estado: carp.estado
  }
  showCarpetaModal.value = true
}

const saveCarpeta = async () => {
  if (carpetaForm.value.nombre.trim() === '' || carpetaForm.value.subcategoriaId === '') return
  const isEdit = carpetaForm.value.id !== null
  const url = isEdit ? `${API_URL}/api/manuales/carpetas/${carpetaForm.value.id}` : `${API_URL}/api/manuales/carpetas`
  const method = isEdit ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manual_subcategoria_id: parseInt(carpetaForm.value.subcategoriaId),
        nombre: carpetaForm.value.nombre,
        estado: carpetaForm.value.estado
      })
    })
    if (res.ok) {
      showCarpetaModal.value = false
      loadAllData()
    } else {
      alert('Error al guardar carpeta')
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
  if (!manual.fecha_vigencia) {
    return {
      label: 'Vigente',
      class: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10'
    }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vigenciaDate = new Date(manual.fecha_vigencia)
  
  if (today >= vigenciaDate) {
    return {
      label: 'Vigente',
      class: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10'
    }
  } else {
    return {
      label: 'No Vigente',
      class: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/10'
    }
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

const currentPage = ref(1)
const totalManuales = ref(0)
const itemsPerPage = ref(10)

const loadManuales = async () => {
  try {
    const headers = getHeaders()
    const res = await fetch(`${API_URL}/api/manuales/admin/documentos?page=${currentPage.value}&limit=${itemsPerPage.value}`, { headers })
    if (res.ok) {
      const data = await res.json()
      manuales.value = data.documentos.map((doc: any) => ({
        ...doc,
        carpeta: doc.carpeta ? {
          id: doc.carpeta.id,
          nombre: doc.carpeta.nombre,
          subcategoria: doc.carpeta.subcategoria ? {
            id: doc.carpeta.subcategoria.id,
            nombre: doc.carpeta.subcategoria.nombre,
            categoria: doc.carpeta.subcategoria.categoria ? {
              id: doc.carpeta.subcategoria.categoria.id,
              nombre: doc.carpeta.subcategoria.categoria.nombre
            } : undefined
          } : undefined
        } : undefined
      }))
      totalManuales.value = data.total
    }
  } catch (err) {
    console.error('Error al cargar manuales paginados', err)
  }
}

const changePage = (page: number) => {
  currentPage.value = page
  loadManuales()
}

const verPuestosAutorizados = (doc: Manual) => {
  const isDark = document.documentElement.classList.contains('dark')
  const itemBg = isDark ? '#1e293b' : '#f1f5f9'
  const itemTextColor = isDark ? '#f1f5f9' : '#1e293b'
  const itemBorder = isDark ? '#334155' : '#e2e8f0'
  const popupBg = isDark ? '#0f172a' : '#ffffff'
  const titleColor = isDark ? '#ffffff' : '#1e293b'

  const listHtml = doc.puestos_autorizados && doc.puestos_autorizados.length > 0
    ? `<ul style="text-align: left; list-style-type: none; padding: 0; margin: 0;">
        ${doc.puestos_autorizados.map(p => `
          <li style="padding: 8px 12px; margin-bottom: 6px; background-color: ${itemBg}; border-radius: 8px; font-size: 0.9rem; font-weight: 600; color: ${itemTextColor}; display: flex; align-items: center; gap: 8px; border: 1px solid ${itemBorder};">
            <span style="color: #6366f1;">💼</span> ${p.nombre}
          </li>
        `).join('')}
       </ul>`
    : `<p style="color: #ef4444; font-weight: bold; font-style: italic; text-align: center;">🚫 Ninguno (Privado)</p>`

  Swal.fire({
    title: 'Cargos Autorizados',
    html: `
      <div style="margin-top: 10px;">
        <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 15px; text-align: left;">
          Puestos autorizados para visualizar el manual <strong>"${doc.titulo}"</strong>:
        </p>
        <div style="max-h: 300px; overflow-y: auto; padding-right: 4px;">
          ${listHtml}
        </div>
      </div>
    `,
    icon: 'info',
    background: popupBg,
    color: titleColor,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#4f46e5',
    customClass: {
      popup: 'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl',
      title: 'font-extrabold font-["Outfit"]',
    }
  })
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
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 font-['Outfit']">Biblioteca de Normativas (Gavetas)</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Crea estructuras (Gaveta ➔ Portafolio ➔ Carpeta), sube archivos PDF y controla los permisos de lectura de los colaboradores según sus puestos asignados.</p>
        </div>
        
        <div class="flex gap-3">
          <button @click="openCreateManual" class="btn-indigo">
            <span>➕ Subir Normativa</span>
          </button>
          <button @click="openCreateCat" class="btn-slate">
            <span>📂 Crear Gaveta</span>
          </button>
          <button @click="openCreateSubcat" class="btn-slate">
            <span>📁 Crear Portafolio</span>
          </button>
          <button @click="openCreateCarpeta" class="btn-slate">
            <span>🗂️ Crear Carpeta</span>
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
          📄 Lista de Normativas
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
          📂 Estructura Física (Gavetas)
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
                  <th class="p-4">Título de la Normativa</th>
                  <th class="p-4">Estructura de Destino</th>
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
                        
                        <!-- Listado de la Última Hoja de Actualización Versionada Activa -->
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
                    <p class="font-bold text-slate-700 dark:text-slate-350">📂 Gaveta: {{ doc.carpeta?.subcategoria?.categoria?.nombre || 'N/A' }}</p>
                    <p class="text-[0.7rem] font-medium text-slate-650 dark:text-slate-400">📁 Portafolio: {{ doc.carpeta?.subcategoria?.nombre || 'N/A' }}</p>
                    <p class="text-[0.65rem] text-indigo-500 font-bold">🗂️ Carpeta: {{ doc.carpeta?.nombre || 'N/A' }}</p>
                  </td>
                  <td class="p-4 font-bold font-mono">{{ doc.total_paginas }} págs</td>
                  <td class="p-4">
                    <div class="flex items-center">
                      <button 
                        v-if="doc.puestos_autorizados && doc.puestos_autorizados.length > 0"
                        @click="verPuestosAutorizados(doc)"
                        class="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/10 font-bold text-[0.7rem] hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1.5"
                      >
                        <span>👁️ Ver</span>
                        <span class="bg-indigo-150 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full text-[0.6rem] font-black">
                          {{ doc.puestos_autorizados.length }}
                        </span>
                      </button>
                      <span v-else class="text-[0.65rem] italic text-red-500 font-bold">🚫 Ninguno (Privado)</span>
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center justify-center gap-2">
                      <button @click="openManual(doc)" class="btn-action-view" title="Visualizar Normativa">👁️</button>
                      <button @click="openUploadUpdate(doc.id)" class="btn-action-update" title="Subir Hojas de Actualización">🔄</button>
                      <button @click="editManual(doc)" class="btn-action-edit" title="Editar Permisos">✏️</button>
                      <button @click="deleteManual(doc.id)" class="btn-action-delete" title="Eliminar Normativa">🗑️</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="manuales.length === 0">
                  <td colspan="5" class="p-16 text-center text-slate-400">
                    <p class="text-base mb-2">📚 No se han cargado normativas aún</p>
                    <button @click="openCreateManual" class="btn-indigo mx-auto text-xs py-2 px-4 rounded-xl">Subir Primer Manual</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- PAGINACIÓN -->
          <div v-if="totalManuales > itemsPerPage" class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
            <div class="text-xs text-slate-500 dark:text-slate-400">
              Mostrando <span class="font-bold text-slate-800 dark:text-slate-200">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> a 
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ Math.min(currentPage * itemsPerPage, totalManuales) }}</span> de 
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ totalManuales }}</span> normativas
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="changePage(currentPage - 1)" 
                :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                Anterior
              </button>
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Pág. {{ currentPage }} de {{ Math.ceil(totalManuales / itemsPerPage) }}
              </span>
              <button 
                @click="changePage(currentPage + 1)" 
                :disabled="currentPage >= Math.ceil(totalManuales / itemsPerPage)"
                class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- TAB: ESTRUCTURA DE GAVETAS (3 NIVELES) -->
      <div v-else-if="activeTab === 'categorias'" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Lista de Gavetas -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-2">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">📂 Gavetas (Generales)</h3>
            <button @click="openCreateCat" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Crear Gaveta</button>
          </div>
          <div class="divide-y divide-slate-150 dark:divide-slate-800">
            <div v-for="cat in categorias" :key="cat.id" class="py-4 flex items-center justify-between gap-4">
              <div>
                <p class="font-extrabold text-sm text-slate-800 dark:text-slate-100">{{ cat.nombre }}</p>
                <p class="text-[0.65rem] text-slate-500 dark:text-slate-500">Portafolios: <span class="font-bold text-slate-700 dark:text-slate-350">{{ cat.subcategorias?.length || 0 }}</span></p>
              </div>
              <div class="flex items-center gap-2">
                <button @click="editCat(cat)" class="btn-action-edit">✏️</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de Portafolios -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-2">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">📁 Portafolios (Nivel 1)</h3>
            <button @click="openCreateSubcat" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Crear Portafolio</button>
          </div>
          <div class="divide-y divide-slate-150 dark:divide-slate-800">
            <template v-for="cat in categorias" :key="'sublist-'+cat.id">
              <div v-for="sub in cat.subcategorias" :key="sub.id" class="py-4 flex items-center justify-between gap-4">
                <div>
                  <p class="font-extrabold text-sm text-slate-800 dark:text-slate-100">{{ sub.nombre }}</p>
                  <p class="text-[0.65rem] text-slate-500 dark:text-slate-500">Pertenece a Gaveta: <span class="font-bold text-indigo-500">{{ cat.nombre }}</span></p>
                  <p class="text-[0.6rem] text-slate-400">Carpetas asignadas: <span class="font-bold text-slate-650">{{ sub.carpetas?.length || 0 }}</span></p>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="editSubcat(sub)" class="btn-action-edit">✏️</button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Lista de Carpetas -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-2">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">🗂️ Carpetas (Nivel 2)</h3>
            <button @click="openCreateCarpeta" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">+ Crear Carpeta</button>
          </div>
          <div class="divide-y divide-slate-150 dark:divide-slate-800">
            <template v-for="cat in categorias" :key="'carplist-'+cat.id">
              <template v-for="sub in cat.subcategorias" :key="'carpsublist-'+sub.id">
                <div v-for="carp in sub.carpetas" :key="carp.id" class="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p class="font-extrabold text-sm text-slate-800 dark:text-slate-100">{{ carp.nombre }}</p>
                    <p class="text-[0.65rem] text-slate-500 dark:text-slate-500">En Portafolio: <span class="font-bold text-indigo-500">{{ sub.nombre }}</span> ({{ cat.nombre }})</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button @click="editCarpeta(carp)" class="btn-action-edit">✏️</button>
                  </div>
                </div>
              </template>
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

    <!-- MODAL: GESTIÓN DE GAVETAS (CATEGORÍAS) -->
    <div v-if="showCatModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ catForm.id ? '✏️ Editar Gaveta' : '📂 Crear Nueva Gaveta' }}</h3>
        
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Nombre de la Gaveta</label>
            <input type="text" v-model="catForm.nombre" placeholder="Ej: Gerencia Administrativa, Auditoría..." class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>
          
          <div class="flex items-center gap-3">
            <input type="checkbox" v-model="catForm.estado" id="catEstadoInput" class="rounded border-slate-300 text-indigo-650 h-4.5 w-4.5" />
            <label for="catEstadoInput" class="text-xs font-bold select-none cursor-pointer">Gaveta Activa</label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button @click="showCatModal = false" class="btn-slate"><span>Cancelar</span></button>
          <button @click="saveCat" class="btn-indigo"><span>Guardar</span></button>
        </div>
      </div>
    </div>

    <!-- MODAL: GESTIÓN DE PORTAFOLIOS (SUBCATEGORÍAS) -->
    <div v-if="showSubcatModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ subcatForm.id ? '✏️ Editar Portafolio' : '📁 Crear Nuevo Portafolio' }}</h3>
        
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Gaveta Principal de Destino</label>
            <select v-model="subcatForm.categoriaId" class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none">
              <option value="">Selecciona Gaveta...</option>
              <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Nombre del Portafolio</label>
            <input type="text" v-model="subcatForm.nombre" placeholder="Ej: Informática, Contabilidad..." class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>
          
          <div class="flex items-center gap-3">
            <input type="checkbox" v-model="subcatForm.estado" id="subcatEstadoInput" class="rounded border-slate-300 text-indigo-650 h-4.5 w-4.5" />
            <label for="subcatEstadoInput" class="text-xs font-bold select-none cursor-pointer">Portafolio Activo</label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button @click="showSubcatModal = false" class="btn-slate"><span>Cancelar</span></button>
          <button @click="saveSubcat" class="btn-indigo"><span>Guardar</span></button>
        </div>
      </div>
    </div>

    <!-- MODAL: GESTIÓN DE CARPETAS (NIVEL 3) -->
    <div v-if="showCarpetaModal" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6">
        <h3 class="font-extrabold text-base tracking-tight font-['Outfit']">{{ carpetaForm.id ? '✏️ Editar Carpeta' : '🗂️ Crear Nueva Carpeta' }}</h3>
        
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Portafolio de Destino</label>
            <select v-model="carpetaForm.subcategoriaId" class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none">
              <option value="">Selecciona Portafolio...</option>
              <optgroup v-for="c in categorias" :key="'group-'+c.id" :label="c.nombre">
                <option v-for="s in c.subcategorias" :key="s.id" :value="s.id">{{ s.nombre }}</option>
              </optgroup>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase">Nombre de la Carpeta</label>
            <input type="text" v-model="carpetaForm.nombre" placeholder="Ej: Manuales, Procedimientos..." class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none" />
          </div>
          
          <div class="flex items-center gap-3">
            <input type="checkbox" v-model="carpetaForm.estado" id="carpetaEstadoInput" class="rounded border-slate-300 text-indigo-650 h-4.5 w-4.5" />
            <label for="carpetaEstadoInput" class="text-xs font-bold select-none cursor-pointer">Carpeta Activa</label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button @click="showCarpetaModal = false" class="btn-slate"><span>Cancelar</span></button>
          <button @click="saveCarpeta" class="btn-indigo"><span>Guardar</span></button>
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
