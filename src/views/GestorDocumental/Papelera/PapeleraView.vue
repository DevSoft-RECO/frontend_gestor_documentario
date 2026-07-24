<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'

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
const selectedUserId = ref<number | ''>('')

const searchAsociadoQuery = ref('')
const filterDateQuery = ref('')

const filteredDocsGeneral = computed(() => {
  let list = docsGeneral.value
  
  if (searchAsociadoQuery.value.trim() !== '') {
    const q = searchAsociadoQuery.value.toLowerCase().trim()
    list = list.filter(doc => doc.nombre_asociado.toLowerCase().includes(q))
  }
  
  if (filterDateQuery.value !== '') {
    const targetDate = filterDateQuery.value
    list = list.filter(doc => {
      if (!doc.fecha_eliminacion) return false
      const docDate = doc.fecha_eliminacion.split('T')[0]
      return docDate === targetDate
    })
  }
  
  return list
})

const filteredDocsBuzon = computed(() => {
  let list = docsBuzon.value
  
  if (searchAsociadoQuery.value.trim() !== '') {
    const q = searchAsociadoQuery.value.toLowerCase().trim()
    list = list.filter(doc => doc.nombre_asociado.toLowerCase().includes(q))
  }
  
  if (filterDateQuery.value !== '') {
    const targetDate = filterDateQuery.value
    list = list.filter(doc => {
      if (!doc.fecha_eliminacion) return false
      const docDate = doc.fecha_eliminacion.split('T')[0]
      return docDate === targetDate
    })
  }
  
  return list
})

const fetchBuzon = async () => {
  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/papelera/mi-buzon`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      docsBuzon.value = await res.json()
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
    const res = await fetch(`${API_URL}/api/gestor/papelera/general`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      docsGeneral.value = await res.json()
    }
  } catch (error) {
    console.error('Error al cargar papelera general:', error)
  } finally {
    isLoading.value = false
  }
}

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
  selectedUserId.value = doc.usuario_asignado_id || ''
  showAssignModal.value = true
}

const handleAssign = async () => {
  if (!selectedDoc.value || selectedUserId.value === '') return
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
      body: JSON.stringify({ usuario_asignado_id: selectedUserId.value })
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
  <div class="papelera-container">
    <div class="header-section">
      <div class="header-title">
        <h1>🗑️ Papelera de Reciclaje</h1>
        <p>Buzón de resguardo y descarga de documentos archivados por eliminación errónea.</p>
      </div>
    </div>

    <!-- TABS NAVEGACIÓN -->
    <div v-if="isAdmins" class="tabs-navigation shadow-sm">
      <button 
        @click="handleTabChange('general')" 
        :class="['tab-btn', { active: activeTab === 'general' }]"
      >
        📥 Buzón General (Administradores)
      </button>
      <button 
        @click="handleTabChange('buzon')" 
        :class="['tab-btn', { active: activeTab === 'buzon' }]"
      >
        👤 Mi Buzón Personal
      </button>
    </div>

    <!-- TAB PANEL: BUZON GENERAL (ADMINS) -->
    <div v-if="activeTab === 'general' && isAdmins" class="glass-card panel-papelera">
      <div class="panel-header-simple">
        <h3>Listado General de Expedientes Eliminados</h3>
        <button @click="fetchGeneral" class="btn-refresh">🔄 Actualizar</button>
      </div>

      <!-- Filtros de búsqueda -->
      <div class="filters-panel">
        <div class="filter-field search-field">
          <label class="filter-label">🔍 Buscar Asociado</label>
          <input 
            type="text" 
            v-model="searchAsociadoQuery" 
            placeholder="Escribe el nombre del asociado..." 
            class="premium-filter-input"
          />
        </div>
        <div class="filter-field date-field">
          <label class="filter-label">📅 Fecha de Eliminación</label>
          <input 
            type="date" 
            v-model="filterDateQuery" 
            class="premium-filter-input"
          />
        </div>
        <button 
          v-if="searchAsociadoQuery || filterDateQuery" 
          @click="searchAsociadoQuery = ''; filterDateQuery = ''" 
          class="btn-clear-filters"
        >
          Limpiar Filtros
        </button>
      </div>

      <div class="table-wrapper">
        <table class="premium-table">
          <thead>
            <tr>
              <th>Asociado</th>
              <th>Portafolio / Subcategoría</th>
              <th>Págs</th>
              <th>Eliminado Por</th>
              <th>Fecha Eliminado</th>
              <th>Buzón Asignado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading" class="table-loading-row">
              <td colspan="7" class="text-center py-8 text-slate-400">Cargando elementos...</td>
            </tr>
            <tr v-else-if="filteredDocsGeneral.length === 0">
              <td colspan="7" class="text-center py-8 text-slate-400">No hay documentos que coincidan con los filtros.</td>
            </tr>
            <tr v-for="doc in filteredDocsGeneral" :key="doc.id" class="table-row hover:bg-slate-800/10 dark:hover:bg-slate-800/30">
              <td class="font-bold text-slate-700 dark:text-slate-200">{{ doc.nombre_asociado }}</td>
              <td>
                <div class="flex flex-col">
                  <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">{{ doc.nombre_categoria }}</span>
                  <span class="font-semibold text-sky-600 dark:text-sky-400">{{ doc.nombre_subcategoria }}</span>
                </div>
              </td>
              <td><span class="badge-pages">{{ doc.total_paginas }} págs</span></td>
              <td class="text-slate-600 dark:text-slate-300">{{ doc.usuario_elimino?.name || 'Sistema' }}</td>
              <td class="text-xs text-slate-400 font-medium">{{ formatDate(doc.fecha_eliminacion) }}</td>
              <td>
                <span v-if="doc.usuario_asignado" class="assigned-user-badge">
                  👤 {{ doc.usuario_asignado.name }}
                </span>
                <span v-else class="unassigned-badge">📭 Sin Asignar</span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <button @click="openAssign(doc)" class="btn-action btn-assign" title="Asignar a Buzón de Usuario">
                    🔑 Asignar
                  </button>
                  <button @click="handleDownload(doc)" class="btn-action btn-download" title="Descargar PDF">
                    📥 Descargar
                  </button>
                  <button @click="handleDeletePermanent(doc)" class="btn-action btn-delete" title="Eliminar Permanentemente">
                    🗑️ Depurar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB PANEL: MI BUZÓN PERSONAL -->
    <div v-else class="glass-card panel-papelera">
      <div class="panel-header-simple">
        <h3>Documentos Asignados a Mi Buzón para Descarga</h3>
        <button @click="fetchBuzon" class="btn-refresh">🔄 Actualizar</button>
      </div>

      <!-- Filtros de búsqueda -->
      <div class="filters-panel">
        <div class="filter-field search-field">
          <label class="filter-label">🔍 Buscar Asociado</label>
          <input 
            type="text" 
            v-model="searchAsociadoQuery" 
            placeholder="Escribe el nombre del asociado..." 
            class="premium-filter-input"
          />
        </div>
        <div class="filter-field date-field">
          <label class="filter-label">📅 Fecha de Eliminación</label>
          <input 
            type="date" 
            v-model="filterDateQuery" 
            class="premium-filter-input"
          />
        </div>
        <button 
          v-if="searchAsociadoQuery || filterDateQuery" 
          @click="searchAsociadoQuery = ''; filterDateQuery = ''" 
          class="btn-clear-filters"
        >
          Limpiar Filtros
        </button>
      </div>

      <div class="table-wrapper">
        <table class="premium-table">
          <thead>
            <tr>
              <th>Asociado</th>
              <th>Portafolio / Subcategoría</th>
              <th>Páginas</th>
              <th>Eliminado Por</th>
              <th>Asignado El</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading" class="table-loading-row">
              <td colspan="6" class="text-center py-8 text-slate-400">Cargando elementos...</td>
            </tr>
            <tr v-else-if="filteredDocsBuzon.length === 0">
              <td colspan="6" class="text-center py-8 text-slate-400">No hay documentos que coincidan con los filtros.</td>
            </tr>
            <tr v-for="doc in filteredDocsBuzon" :key="doc.id" class="table-row hover:bg-slate-800/10 dark:hover:bg-slate-800/30">
              <td class="font-bold text-slate-700 dark:text-slate-200">{{ doc.nombre_asociado }}</td>
              <td>
                <div class="flex flex-col">
                  <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">{{ doc.nombre_categoria }}</span>
                  <span class="font-semibold text-sky-600 dark:text-sky-400">{{ doc.nombre_subcategoria }}</span>
                </div>
              </td>
              <td><span class="badge-pages">{{ doc.total_paginas }} págs</span></td>
              <td class="text-slate-600 dark:text-slate-300">{{ doc.usuario_elimino?.name || 'Sistema' }}</td>
              <td class="text-xs text-slate-400 font-medium">{{ formatDate(doc.fecha_asignacion) }}</td>
              <td>
                <button @click="handleDownload(doc)" class="btn-action btn-download" title="Descargar archivo">
                  📥 Descargar PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DE ASIGNACIÓN -->
    <div v-if="showAssignModal" class="modal-backdrop">
      <div class="glass-modal animate-in fade-in zoom-in-95">
        <div class="modal-header">
          <h3>Asignar Documento a Buzón</h3>
          <button @click="showAssignModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedDoc">
          <p class="text-sm text-slate-300 mb-4">
            Elige qué usuario será responsable de descargar el archivo:
            <strong>{{ selectedDoc.nombre_subcategoria }}</strong> del asociado <strong>{{ selectedDoc.nombre_asociado }}</strong>.
          </p>

          <div class="form-group">
            <label class="form-label">Destinatario</label>
            <select v-model="selectedUserId" class="premium-select">
              <option value="" disabled selected>Seleccione un usuario...</option>
              <option v-for="user in usuarios" :key="user.id" :value="user.id">
                {{ user.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAssignModal = false" class="btn-cancel">Cancelar</button>
          <button @click="handleAssign" class="btn-confirm" :disabled="selectedUserId === ''">
            Confirmar Asignación
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');

.papelera-container {
  font-family: 'Plus Jakarta Sans', sans-serif;
  padding: 2rem;
  min-height: 80vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

/* Light Mode (Default) */
.header-title h1 {
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
}

.header-title p {
  font-size: 0.95rem;
  color: #64748b;
  margin-top: 0.25rem;
}

/* Dark Mode Overrides */
:global(.dark) .header-title h1 {
  color: #f1f5f9;
}
:global(.dark) .header-title p {
  color: #94a3b8;
}

/* TABS NAVEGACIÓN */
.tabs-navigation {
  display: flex;
  background: rgba(226, 232, 240, 0.8);
  padding: 0.4rem;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  margin-bottom: 2rem;
  max-width: fit-content;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
  transition: all 0.3s;
  cursor: pointer;
  background: transparent;
  border: none;
}

.tab-btn:hover {
  color: #0f172a;
}

.tab-btn.active {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}

:global(.dark) .tabs-navigation {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
:global(.dark) .tab-btn {
  color: #94a3b8;
}
:global(.dark) .tab-btn:hover {
  color: #f1f5f9;
}

/* CARDS */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.04);
}

.panel-header-simple {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.panel-header-simple h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.btn-refresh {
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(15, 23, 42, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

:global(.dark) .glass-card {
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}
:global(.dark) .panel-header-simple h3 {
  color: #f8fafc;
}
:global(.dark) .btn-refresh {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
:global(.dark) .btn-refresh:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* TABLA PREMIUM */
.table-wrapper {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.premium-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.premium-table th {
  background: rgba(241, 245, 249, 0.8);
  padding: 1rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
  letter-spacing: 0.05em;
  border-bottom: 1.5px solid rgba(15, 23, 42, 0.08);
}

.premium-table td {
  padding: 1.1rem 1.25rem;
  font-size: 0.875rem;
  color: #334155;
  border-bottom: 1px solid rgba(15, 23, 42, 0.04);
}

.table-row {
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: rgba(241, 245, 249, 0.6);
}

:global(.dark) .table-wrapper {
  border: 1px solid rgba(255, 255, 255, 0.05);
}
:global(.dark) .premium-table th {
  background: rgba(15, 23, 42, 0.5);
  color: #94a3b8;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.08);
}
:global(.dark) .premium-table td {
  color: #e2e8f0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
:global(.dark) .table-row:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.badge-pages {
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
}

:global(.dark) .badge-pages {
  color: #38bdf8;
}

.assigned-user-badge {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  padding: 0.35rem 0.7rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba(16, 185, 129, 0.15);
}

:global(.dark) .assigned-user-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.unassigned-badge {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  padding: 0.35rem 0.7rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba(245, 158, 11, 0.15);
}

:global(.dark) .unassigned-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

/* ACCIONES */
.btn-action {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-assign {
  background: #10b981;
  color: #ffffff;
}

.btn-assign:hover {
  background: #059669;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
}

.btn-download {
  background: #0ea5e9;
  color: #ffffff;
}

.btn-download:hover {
  background: #0284c7;
  box-shadow: 0 4px 10px rgba(14, 165, 233, 0.2);
}

.btn-delete {
  background: #ef4444;
  color: #ffffff;
}

.btn-delete:hover {
  background: #dc2626;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);
}

/* MODAL */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

:global(.dark) .modal-backdrop {
  background: rgba(15, 23, 42, 0.75);
}

.glass-modal {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}

:global(.dark) .glass-modal {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:global(.dark) .modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-header h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
}

:global(.dark) .modal-header h3 {
  color: #f8fafc;
}

.close-btn {
  background: transparent;
  color: #64748b;
  font-size: 1.5rem;
  border: none;
  cursor: pointer;
}

.close-btn:hover {
  color: #0f172a;
}

:global(.dark) .close-btn:hover {
  color: #ffffff;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  color: #475569;
}

:global(.dark) .modal-body p {
  color: #slate-300;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
}

:global(.dark) .form-label {
  color: #94a3b8;
}

.premium-select {
  background: #f8fafc;
  border: 1.5px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: #1e293b;
  outline: none;
  font-weight: 600;
}

.premium-select:focus {
  border-color: #0ea5e9;
}

:global(.dark) .premium-select {
  background: #1e293b;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

:global(.dark) .modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-cancel {
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.btn-cancel:hover {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

:global(.dark) .btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:global(.dark) .btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-confirm {
  background: #0ea5e9;
  color: #ffffff;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-confirm:hover:not(:disabled) {
  background: #0284c7;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* FILTROS */
.filters-panel {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 2rem;
  background: rgba(15, 23, 42, 0.02);
  border: 1px dashed rgba(15, 23, 42, 0.1);
  padding: 1.25rem;
  border-radius: 16px;
}

:global(.dark) .filters-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.search-field {
  flex: 2.5;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #64748b;
}

:global(.dark) .filter-label {
  color: #94a3b8;
}

.premium-filter-input {
  background: #ffffff;
  border: 1.5px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.65rem 1rem;
  color: #1e293b;
  outline: none;
  font-weight: 600;
  transition: border-color 0.2s;
  width: 100%;
}

.premium-filter-input:focus {
  border-color: #0ea5e9;
}

:global(.dark) .premium-filter-input {
  background: #1e293b;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.btn-clear-filters {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.65rem 1.2rem;
  border-radius: 12px;
  border: 1.5px solid rgba(239, 68, 68, 0.15);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-clear-filters:hover {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}
</style>
