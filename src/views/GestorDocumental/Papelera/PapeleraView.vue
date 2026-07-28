<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'
import AsignarBuzonModal from '@/components/gestor/papelera/AsignarBuzonModal.vue'
import VisorPapeleraView from '@/components/gestor/perfil/VisorPapeleraView.vue'

interface Usuario {
  id: number
  name: string
}

interface Asociado {
  id: number
  nombre_completo: string
}

interface DocumentoEliminado {
  id: number
  documento_id_original: number
  asociado_id: number
  subcategoria_id: number
  nombre_subcategoria: string
  nombre_categoria: string
  nombre_asociado: string
  file_path_original: string
  file_path_papelera: string
  total_paginas: number
  usuario_elimino_id: number
  usuario_asignado_id?: number
  fecha_eliminacion: string
  fecha_asignacion?: string
  usuario_elimino: { id: number; name: string }
  usuario_asignado?: { id: number; name: string }
  asociado?: Asociado
  descargado: boolean
  fecha_descarga?: string
}

const authStore = useAuthStore()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const activeTab = ref<'buzon' | 'general'>('buzon')
const isAdmins = computed(() => {
  const roles = authStore.user?.roles || []
  return roles.includes('Super Admin') || roles.includes('Administrador') || roles.includes('Admin')
})

const docsBuzon = ref<DocumentoEliminado[]>([])
const docsGeneral = ref<DocumentoEliminado[]>([])
const usuarios = ref<Usuario[]>([])
const isLoading = ref(false)

const showAssignModal = ref(false)
const selectedDoc = ref<DocumentoEliminado | null>(null)

const showTrashViewer = ref(false)
const selectedTrashDocument = ref<any>(null)

const handleOpenViewerTrash = (doc: DocumentoEliminado) => {
  selectedTrashDocument.value = {
    id: doc.id,
    nombre_subcategoria: doc.nombre_subcategoria,
    nombre_asociado: doc.nombre_asociado
  }
  showTrashViewer.value = true
}

const searchAsociadoQuery = ref('')
const filterDateQuery = ref('')

const pageGeneral = ref(1)
const pageBuzon = ref(1)
const totalPagesGeneral = ref(1)
const totalPagesBuzon = ref(1)
const totalGeneral = ref(0)
const totalBuzon = ref(0)

const filteredDocsGeneral = computed(() => docsGeneral.value)
const filteredDocsBuzon = computed(() => docsBuzon.value)

const fetchBuzon = async () => {
  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/papelera/mi-buzon?page=${pageBuzon.value}&limit=15&search=${searchAsociadoQuery.value}&fecha=${filterDateQuery.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      docsBuzon.value = data.data
      totalPagesBuzon.value = data.pages
      totalBuzon.value = data.total
    }
  } catch (error) {
    console.error('Error al cargar buzón personal:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchGeneral = async () => {
  if (!isAdmins.value) return
  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/papelera/general?page=${pageGeneral.value}&limit=15&search=${searchAsociadoQuery.value}&fecha=${filterDateQuery.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      docsGeneral.value = data.data
      totalPagesGeneral.value = data.pages
      totalGeneral.value = data.total
    }
  } catch (error) {
    console.error('Error al cargar papelera general:', error)
  } finally {
    isLoading.value = false
  }
}

const changePageGeneral = (p: number) => {
  if (p >= 1 && p <= totalPagesGeneral.value) {
    pageGeneral.value = p
    fetchGeneral()
  }
}

const changePageBuzon = (p: number) => {
  if (p >= 1 && p <= totalPagesBuzon.value) {
    pageBuzon.value = p
    fetchBuzon()
  }
}

// Watch inputs to trigger server-side filtering
watch([searchAsociadoQuery, filterDateQuery], () => {
  pageGeneral.value = 1
  pageBuzon.value = 1
  if (activeTab.value === 'general') {
    fetchGeneral()
  } else {
    fetchBuzon()
  }
})

const fetchUsuarios = async () => {
  if (!isAdmins.value) return
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/papelera/usuarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      usuarios.value = await res.json()
    }
  } catch (error) {
    console.error('Error al cargar usuarios:', error)
  }
}

const initView = () => {
  if (isAdmins.value) {
    activeTab.value = 'general'
    fetchGeneral()
    fetchUsuarios()
  } else {
    activeTab.value = 'buzon'
    fetchBuzon()
  }
}

onMounted(() => {
  initView()
})

const handleTabChange = (tab: 'buzon' | 'general') => {
  activeTab.value = tab
  pageGeneral.value = 1
  pageBuzon.value = 1
  searchAsociadoQuery.value = ''
  filterDateQuery.value = ''
  if (tab === 'buzon') {
    fetchBuzon()
  } else {
    fetchGeneral()
  }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleString('es-GT', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

// Acciones
const handleDownload = async (doc: DocumentoEliminado) => {
  try {
    Swal.fire({
      title: 'Generando enlace...',
      text: 'Preparando descarga segura del documento...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() },
      background: '#1e293b',
      color: '#ffffff'
    })

    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/papelera/${doc.id}/descargar`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    Swal.close()

    if (!res.ok) {
      throw new Error(data.error || 'Error al obtener la descarga')
    }

    window.open(data.url, '_blank')
    
    // Refresh to show "Descargado" status
    if (activeTab.value === 'buzon') {
      fetchBuzon()
    } else {
      fetchGeneral()
    }
  } catch (error: any) {
    Swal.fire({
      title: 'Error de descarga',
      text: error.message || 'No fue posible descargar el archivo.',
      icon: 'error',
      confirmButtonColor: '#0ea5e9',
      background: '#1e293b',
      color: '#ffffff'
    })
  }
}

const openAssign = (doc: DocumentoEliminado) => {
  selectedDoc.value = doc
  showAssignModal.value = true
}

const handleAssign = async (userId: number) => {
  if (!selectedDoc.value) return
  try {
    Swal.fire({
      title: 'Asignando...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() },
      background: '#1e293b',
      color: '#ffffff'
    })

    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/papelera/${selectedDoc.value.id}/asignar`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario_asignado_id: userId })
    })

    Swal.close()

    if (res.ok) {
      Swal.fire({
        title: 'Asignado',
        text: 'Documento asignado correctamente al buzón del usuario.',
        icon: 'success',
        confirmButtonColor: '#0ea5e9',
        background: '#1e293b',
        color: '#ffffff'
      })
      showAssignModal.value = false
      fetchGeneral()
    } else {
      const data = await res.json()
      throw new Error(data.error || 'Error al asignar')
    }
  } catch (error: any) {
    Swal.fire({
      title: 'Error',
      text: error.message || 'No se pudo completar la asignación.',
      icon: 'error',
      confirmButtonColor: '#0ea5e9',
      background: '#1e293b',
      color: '#ffffff'
    })
  }
}

const handleDeletePermanent = async (doc: DocumentoEliminado) => {
  const result = await Swal.fire({
    title: '¿Eliminar permanentemente?',
    html: `¿Está seguro de que desea depurar permanentemente este archivo?<br><br><strong>Esta acción es totalmente irreversible</strong>. Se eliminará el registro lógico e histórico y se borrará definitivamente de Google Cloud Storage.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, eliminar de por vida',
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#ffffff'
  })

  if (result.isConfirmed) {
    try {
      Swal.fire({
        title: 'Depurando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() },
        background: '#1e293b',
        color: '#ffffff'
      })

      const token = sessionStorage.getItem('access_token')
      const res = await fetch(`${API_URL}/api/gestor/papelera/${doc.id}/eliminar-permanente`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      Swal.close()

      if (res.ok) {
        Swal.fire({
          title: 'Depurado',
          text: 'El documento se eliminó definitivamente del almacenamiento en la nube.',
          icon: 'success',
          confirmButtonColor: '#0ea5e9',
          background: '#1e293b',
          color: '#ffffff'
        })
        fetchGeneral()
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Error al depurar')
      }
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error.message || 'No se pudo eliminar permanentemente.',
        icon: 'error',
        confirmButtonColor: '#0ea5e9',
        background: '#1e293b',
        color: '#ffffff'
      })
    }
  }
}
</script>

<template>
  <div class="p-5 min-h-[80vh] font-['Plus_Jakarta_Sans'] transition-colors duration-300">
    <div class="flex justify-between items-center mb-6">
      <div class="header-title">
        <h1 class="font-['Outfit'] text-2xl font-extrabold text-slate-800 dark:text-slate-100">🗑️ Papelera de Reciclaje</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Buzón de resguardo y descarga de documentos archivados por eliminación errónea.</p>
      </div>
    </div>

    <!-- TABS NAVEGACIÓN -->
    <div v-if="isAdmins" class="flex bg-slate-200/80 dark:bg-slate-800/40 p-1 rounded-xl border border-slate-900/5 dark:border-white/5 mb-5 max-w-fit shadow-sm">
      <button 
        @click="handleTabChange('general')" 
        :class="['px-4 py-2 rounded-lg text-xs font-bold transition duration-300 cursor-pointer bg-transparent border-0', activeTab === 'general' ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200']"
      >
        📥 Buzón General (Administradores)
      </button>
      <button 
        @click="handleTabChange('buzon')" 
        :class="['px-4 py-2 rounded-lg text-xs font-bold transition duration-300 cursor-pointer bg-transparent border-0', activeTab === 'buzon' ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200']"
      >
        👤 Mi Buzón Personal
      </button>
    </div>

    <!-- TAB PANEL: BUZON GENERAL (ADMINS) -->
    <div v-if="activeTab === 'general' && isAdmins" class="bg-white/70 backdrop-blur-lg border border-slate-900/5 dark:border-white/5 rounded-2xl p-5 shadow-lg shadow-slate-900/2 dark:bg-slate-900/45 dark:shadow-black/20">
      <div class="flex justify-between items-center mb-5">
        <h3 class="font-['Outfit'] text-base font-bold text-slate-800 dark:text-slate-100">Listado General de Expedientes Eliminados</h3>
        <button @click="fetchGeneral" class="bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 border border-slate-900/5 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-350 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition duration-200">🔄 Actualizar</button>
      </div>

      <!-- Filtros de búsqueda -->
      <div class="flex flex-col sm:flex-row items-end gap-4 mb-5 bg-slate-900/2 dark:bg-white/2 border border-dashed border-slate-900/10 dark:border-white/5 p-3 rounded-xl">
        <div class="flex flex-col gap-1 flex-1 w-full">
          <label class="text-[0.65rem] font-extrabold uppercase text-slate-500 dark:text-slate-400">🔍 Buscar Asociado</label>
          <input 
            type="text" 
            v-model="searchAsociadoQuery" 
            placeholder="Escribe el nombre del asociado..." 
            class="w-full bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none focus:border-sky-500 dark:focus:border-sky-500 transition duration-200"
          />
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <label class="text-[0.65rem] font-extrabold uppercase text-slate-500 dark:text-slate-400">📅 Fecha de Eliminación</label>
          <input 
            type="date" 
            v-model="filterDateQuery" 
            class="w-full bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none focus:border-sky-500 dark:focus:border-sky-500 transition duration-200"
          />
        </div>
        <button 
          v-if="searchAsociadoQuery || filterDateQuery" 
          @click="searchAsociadoQuery = ''; filterDateQuery = ''" 
          class="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3.5 py-2 rounded-xl text-[0.72rem] font-bold cursor-pointer transition duration-200 hover:bg-rose-50 hover:text-white hover:border-rose-500 whitespace-nowrap w-full sm:w-auto"
        >
          Limpiar Filtros
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">ID de Archivo</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Asociado</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Portafolio / Subcategoría</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Págs</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Eliminado Por</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Fecha Eliminado</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Descargado</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Buzón Asignado</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="9" class="text-center py-8 text-slate-400">Cargando elementos...</td>
            </tr>
            <tr v-else-if="filteredDocsGeneral.length === 0">
              <td colspan="9" class="text-center py-8 text-slate-400">No hay documentos que coincidan con los filtros.</td>
            </tr>
            <tr v-for="doc in filteredDocsGeneral" :key="doc.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td class="px-3.5 py-2.5 text-[0.78rem] font-mono font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800/60">#{{ doc.id }}</td>
              <td class="px-3.5 py-2.5 text-[0.78rem] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/60">{{ doc.nombre_asociado }}</td>
              <td class="px-3.5 py-2.5 text-[0.78rem] border-b border-slate-100 dark:border-slate-800/60">
                <div class="flex flex-col">
                  <span class="text-[0.62rem] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">{{ doc.nombre_categoria }}</span>
                  <span class="font-semibold text-sky-600 dark:text-sky-400">{{ doc.nombre_subcategoria }}</span>
                </div>
              </td>
              <td class="px-3.5 py-2.5 text-[0.78rem] border-b border-slate-100 dark:border-slate-800/60"><span class="bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-1 rounded-md text-[0.68rem] font-bold">{{ doc.total_paginas }} págs</span></td>
              <td class="px-3.5 py-2.5 text-[0.78rem] text-slate-600 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60">{{ doc.usuario_elimino?.name || 'Sistema' }}</td>
              <td class="px-3.5 py-2.5 text-xs text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800/60">{{ formatDate(doc.fecha_eliminacion) }}</td>
              <td class="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                <span v-if="doc.descargado" class="bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20 px-1.5 py-0.5 rounded-md text-[0.68rem] font-bold inline-block whitespace-nowrap" :title="'Descargado el: ' + formatDate(doc.fecha_descarga)">
                  📥 Sí
                </span>
                <span v-else class="bg-amber-500/10 text-amber-600 border border-amber-500/15 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md text-[0.68rem] font-bold inline-block whitespace-nowrap">
                  ⏳ Pendiente
                </span>
              </td>
              <td class="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                <span v-if="doc.usuario_asignado" class="bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-1 rounded-lg text-[0.68rem] font-bold">
                  👤 {{ doc.usuario_asignado.name }}
                </span>
                <span v-else class="bg-amber-500/10 text-amber-650 border border-amber-500/15 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20 px-2 py-1 rounded-lg text-[0.68rem] font-bold">📭 Sin Asignar</span>
              </td>
              <td class="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                <div class="flex items-center gap-2">
                  <button @click="openAssign(doc)" class="text-[0.68rem] font-bold px-2.5 py-1.5 rounded-md cursor-pointer transition duration-200 border-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/10" title="Asignar a Buzón de Usuario">
                    🔑 Asignar
                  </button>
                  <button @click="handleOpenViewerTrash(doc)" class="text-[0.68rem] font-bold px-2.5 py-1.5 rounded-md cursor-pointer transition duration-200 border-0 bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/10" title="Ver PDF">
                    👁️ Ver
                  </button>
                  <button @click="handleDeletePermanent(doc)" class="text-[0.68rem] font-bold px-2.5 py-1.5 rounded-md cursor-pointer transition duration-200 border-0 bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/10" title="Eliminar Permanentemente">
                    🗑️ Depurar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Control de paginación General -->
      <div v-if="totalPagesGeneral > 1" class="mt-4 flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div class="flex flex-1 justify-between sm:hidden">
          <button @click="changePageGeneral(pageGeneral - 1)" :disabled="pageGeneral <= 1" class="relative inline-flex items-center rounded-md border border-slate-300 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50">Anterior</button>
          <button @click="changePageGeneral(pageGeneral + 1)" :disabled="pageGeneral >= totalPagesGeneral" class="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-xs text-slate-700 dark:text-slate-300">
              Mostrando <span class="font-extrabold">{{ (pageGeneral - 1) * 15 + 1 }}</span> a <span class="font-extrabold">{{ Math.min(pageGeneral * 15, totalGeneral) }}</span> de <span class="font-extrabold">{{ totalGeneral }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
              <button @click="changePageGeneral(pageGeneral - 1)" :disabled="pageGeneral <= 1" class="relative inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" /></svg>
              </button>
              <button 
                v-for="p in totalPagesGeneral" 
                :key="p" 
                @click="changePageGeneral(p)"
                :class="[p === pageGeneral ? 'bg-sky-500 text-white font-extrabold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800', 'relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition duration-200 cursor-pointer']"
              >
                {{ p }}
              </button>
              <button @click="changePageGeneral(pageGeneral + 1)" :disabled="pageGeneral >= totalPagesGeneral" class="relative inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB PANEL: MI BUZÓN PERSONAL -->
    <div v-else class="bg-white/70 backdrop-blur-lg border border-slate-900/5 dark:border-white/5 rounded-2xl p-5 shadow-lg shadow-slate-900/2 dark:bg-slate-900/45 dark:shadow-black/20">
      <div class="flex justify-between items-center mb-5">
        <h3 class="font-['Outfit'] text-base font-bold text-slate-800 dark:text-slate-100">Documentos Asignados a Mi Buzón para Descarga</h3>
        <button @click="fetchBuzon" class="bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 border border-slate-900/5 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-350 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition duration-200">🔄 Actualizar</button>
      </div>

      <!-- Filtros de búsqueda -->
      <div class="flex flex-col sm:flex-row items-end gap-4 mb-5 bg-slate-900/2 dark:bg-white/2 border border-dashed border-slate-900/10 dark:border-white/5 p-3 rounded-xl">
        <div class="flex flex-col gap-1 flex-1 w-full">
          <label class="text-[0.65rem] font-extrabold uppercase text-slate-500 dark:text-slate-400">🔍 Buscar Asociado</label>
          <input 
            type="text" 
            v-model="searchAsociadoQuery" 
            placeholder="Escribe el nombre del asociado..." 
            class="w-full bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none focus:border-sky-500 dark:focus:border-sky-500 transition duration-200"
          />
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <label class="text-[0.65rem] font-extrabold uppercase text-slate-500 dark:text-slate-400">📅 Fecha de Eliminación</label>
          <input 
            type="date" 
            v-model="filterDateQuery" 
            class="w-full bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700/80 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none focus:border-sky-500 dark:focus:border-sky-500 transition duration-200"
          />
        </div>
        <button 
          v-if="searchAsociadoQuery || filterDateQuery" 
          @click="searchAsociadoQuery = ''; filterDateQuery = ''" 
          class="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3.5 py-2 rounded-xl text-[0.72rem] font-bold cursor-pointer transition duration-200 hover:bg-rose-50 hover:text-white hover:border-rose-500 whitespace-nowrap w-full sm:w-auto"
        >
          Limpiar Filtros
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">ID de Archivo</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Asociado</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Portafolio / Subcategoría</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Páginas</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Eliminado Por</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Asignado El</th>
              <th class="bg-slate-100/80 dark:bg-slate-950/50 px-3.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-800">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="7" class="text-center py-8 text-slate-400">Cargando elementos...</td>
            </tr>
            <tr v-else-if="filteredDocsBuzon.length === 0">
              <td colspan="7" class="text-center py-8 text-slate-400">No hay documentos que coincidan con los filtros.</td>
            </tr>
            <tr v-for="doc in filteredDocsBuzon" :key="doc.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td class="px-3.5 py-2.5 text-[0.78rem] font-mono font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800/60">#{{ doc.id }}</td>
              <td class="px-3.5 py-2.5 text-[0.78rem] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/60">{{ doc.nombre_asociado }}</td>
              <td class="px-3.5 py-2.5 text-[0.78rem] border-b border-slate-100 dark:border-slate-800/60">
                <div class="flex flex-col">
                  <span class="text-[0.62rem] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">{{ doc.nombre_categoria }}</span>
                  <span class="font-semibold text-sky-600 dark:text-sky-400">{{ doc.nombre_subcategoria }}</span>
                </div>
              </td>
              <td class="px-3.5 py-2.5 text-[0.78rem] border-b border-slate-100 dark:border-slate-800/60"><span class="bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-1 rounded-md text-[0.68rem] font-bold">{{ doc.total_paginas }} págs</span></td>
              <td class="px-3.5 py-2.5 text-[0.78rem] text-slate-600 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60">{{ doc.usuario_elimino?.name || 'Sistema' }}</td>
              <td class="px-3.5 py-2.5 text-xs text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800/60">{{ formatDate(doc.fecha_asignacion) }}</td>
              <td class="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                <button @click="handleDownload(doc)" class="text-[0.68rem] font-bold px-2.5 py-1.5 rounded-md cursor-pointer transition duration-200 border-0 bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/10" title="Descargar archivo">
                  📥 Descargar PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Control de paginación Buzón -->
      <div v-if="totalPagesBuzon > 1" class="mt-4 flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div class="flex flex-1 justify-between sm:hidden">
          <button @click="changePageBuzon(pageBuzon - 1)" :disabled="pageBuzon <= 1" class="relative inline-flex items-center rounded-md border border-slate-300 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50">Anterior</button>
          <button @click="changePageBuzon(pageBuzon + 1)" :disabled="pageBuzon >= totalPagesBuzon" class="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-xs text-slate-700 dark:text-slate-300">
              Mostrando <span class="font-extrabold">{{ (pageBuzon - 1) * 15 + 1 }}</span> a <span class="font-extrabold">{{ Math.min(pageBuzon * 15, totalBuzon) }}</span> de <span class="font-extrabold">{{ totalBuzon }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
              <button @click="changePageBuzon(pageBuzon - 1)" :disabled="pageBuzon <= 1" class="relative inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" /></svg>
              </button>
              <button 
                v-for="p in totalPagesBuzon" 
                :key="p" 
                @click="changePageBuzon(p)"
                :class="[p === pageBuzon ? 'bg-sky-500 text-white font-extrabold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800', 'relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition duration-200 cursor-pointer']"
              >
                {{ p }}
              </button>
              <button @click="changePageBuzon(pageBuzon + 1)" :disabled="pageBuzon >= totalPagesBuzon" class="relative inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE ASIGNACIÓN -->
    <AsignarBuzonModal 
      v-if="showAssignModal"
      :show="showAssignModal"
      :documento="selectedDoc"
      :usuarios="usuarios"
      @close="showAssignModal = false"
      @assign="handleAssign"
    />

    <!-- VISOR DE PAPELERA RESTRINGIDO -->
    <VisorPapeleraView 
      v-if="showTrashViewer && selectedTrashDocument"
      :show="showTrashViewer"
      :documento="selectedTrashDocument"
      :asociadoNombre="selectedTrashDocument.nombre_asociado || 'Expediente'"
      @close="showTrashViewer = false"
    />
  </div>
</template>
