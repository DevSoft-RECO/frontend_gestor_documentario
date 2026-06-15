<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUploadStore } from '@/stores/upload'

import PerfilHeader from '@/components/gestor/perfil/PerfilHeader.vue'
import ExpedienteGrid from '@/components/gestor/perfil/ExpedienteGrid.vue'
import UploadDocumentModal from '@/components/gestor/perfil/UploadDocumentModal.vue'
import DocumentViewer from '@/components/gestor/perfil/DocumentViewer.vue'

interface Asociado {
  id: number
  codigo_cliente: string
  dpi: string
  nombre_completo: string
  direccion: string
  fecha_registro: string
  usuario_id?: number
}

interface CategoriaMaster {
  id: number
  nombre: string
  estado: boolean
  subcategorias: any[]
}

interface Documento {
  id: number
  asociado_id: number
  subcategoria_id: number
  file_path: string
  fecha_creacion: string
  subcategoria: any
}

interface GrupoCategoria {
  id: number
  nombre: string
  documentos: Documento[]
}

interface ActividadItem {
  etiqueta: string
  tipo_movimiento: string
  fecha_operacion: string
  usuario_nombre: string
  asociado_nombre: string
  subcategoria: string
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uploadStore = useUploadStore()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const asociado = ref<Asociado | null>(null)
const expedientesBrutos = ref<Documento[]>([])
const categoriasMaster = ref<CategoriaMaster[]>([])
const actividades = ref<ActividadItem[]>([])
const isLoading = ref(true)

const showUploadModal = ref(false)
const showViewerModal = ref(false)
const currentDocument = ref<Documento | null>(null)

// --- Helper Functions ---
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// --- Data Fetching ---
const loadAllData = async () => {
  isLoading.value = true
  try {
    const asociadoId = route.params.id as string
    const token = sessionStorage.getItem('access_token')
    const headers = { 'Authorization': `Bearer ${token}` }

    const [resAsociado, resDocs, resCats, resActividades] = await Promise.all([
      fetch(`${API_URL}/api/gestor/asociados/${asociadoId}`, { headers }),
      fetch(`${API_URL}/api/gestor/asociados/${asociadoId}/expediente`, { headers }),
      fetch(`${API_URL}/api/gestor/categorias`, { headers }),
      fetch(`${API_URL}/api/gestor/asociados/${asociadoId}/actividad`, { headers })
    ])

    if (!resAsociado.ok) throw new Error('Asociado no encontrado')

    asociado.value = await resAsociado.json()
    expedientesBrutos.value = await resDocs.json()
    categoriasMaster.value = await resCats.json()
    if (resActividades.ok) {
      actividades.value = await resActividades.json()
    }
  } catch (e) {
    console.error(e)
    alert('Error al cargar datos')
    router.push('/gestor/asociados')
  } finally {
    isLoading.value = false
  }
}

// Transform the flat document list into categorized groups with permission check
const expedienteAgrupado = computed<GrupoCategoria[]>(() => {
  if (!expedientesBrutos.value) return []
  
  const map = new Map<number, GrupoCategoria>()
  
  // Helper para verificar permiso (ESTRICTO)
  const canSeeSubcategoria = (sub: any) => {
    if (authStore.user?.roles?.includes('Super Admin') || authStore.user?.roles?.includes('Administrador')) return true
    
    // Si no tiene puestos asignados, se oculta
    if (!sub.puestos_autorizados || sub.puestos_autorizados.length === 0) return false
    
    return sub.puestos_autorizados.some((p: any) => p.id === authStore.user?.id_puesto)
  }

  expedientesBrutos.value.forEach(doc => {
    // Verificamos si el usuario tiene permiso para ver esta subcategoría
    if (!canSeeSubcategoria(doc.subcategoria)) return

    const catId = doc.subcategoria.categoria.id
    const catName = doc.subcategoria.categoria.nombre
    
    if (!map.has(catId)) {
      map.set(catId, { id: catId, nombre: catName, documentos: [] })
    }
    map.get(catId)!.documentos.push(doc)
  })
  
  return Array.from(map.values())
})

const handleUploadSuccess = () => {
  showUploadModal.value = false
  loadAllData() // Reload docs
}

const handleOpenViewer = (doc: Documento) => {
  currentDocument.value = doc
  showViewerModal.value = true
}

onMounted(() => {
  loadAllData()
  uploadStore.onUploadCompleted((asociadoId) => {
    // Solo recargar si la carga completada pertenece al asociado que estamos visualizando actualmente
    if (asociadoId === route.params.id as string) {
      loadAllData()
    }
  })
})
</script>

<template>
  <div class="perfil-view">
    <div v-if="isLoading" class="loader-container">
      <div class="loader"></div>
      <p>Cargando expediente...</p>
    </div>

    <div v-else-if="asociado">
      <PerfilHeader 
        :asociado="asociado" 
        @back="router.push('/gestor/asociados')"
        @addDocument="showUploadModal = true"
        @updateSuccess="loadAllData"
      />

      <div class="profile-layout-grid">
        <div class="main-content">
          <ExpedienteGrid 
            :expedienteAgrupado="expedienteAgrupado"
            :asociadoNombre="asociado.nombre_completo"
            @openViewer="handleOpenViewer"
            @addDocument="showUploadModal = true"
          />
        </div>

        <div class="sidebar-content">
          <div class="sidebar-card">
            <div class="sidebar-header">
              <div class="sidebar-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3>Historial de Actividad</h3>
            </div>
            
            <div class="activity-timeline">
              <div v-for="(item, i) in actividades" :key="i" class="activity-item">
                <div class="activity-marker">
                  <div class="marker-dot"></div>
                  <div v-if="i < actividades.length - 1" class="marker-line"></div>
                </div>
                <div class="activity-details">
                  <div class="activity-top">
                    <span class="activity-type" :class="item.tipo_movimiento.toLowerCase()">{{ item.tipo_movimiento }}</span>
                    <span class="activity-date">{{ formatDate(item.fecha_operacion) }}</span>
                  </div>
                  <p class="activity-label">{{ item.etiqueta }}</p>
                  <p class="activity-meta">
                    Subcategoría: <strong>{{ item.subcategoria }}</strong>
                  </p>
                  <div class="activity-user-badge">
                    <span class="user-avatar">{{ item.usuario_nombre?.charAt(0) || '?' }}</span>
                    <span class="user-name">{{ item.usuario_nombre }}</span>
                  </div>
                </div>
              </div>

              <div v-if="!actividades || actividades.length === 0" class="no-activity">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Sin actividad reciente</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UploadDocumentModal 
        v-if="showUploadModal"
        :categoriasMaster="categoriasMaster"
        :asociadoId="route.params.id as string"
        @close="showUploadModal = false"
        @uploadSuccess="handleUploadSuccess"
      />

      <DocumentViewer 
        v-if="showViewerModal && currentDocument"
        :documento="currentDocument"
        :asociadoNombre="asociado.nombre_completo"
        @close="showViewerModal = false"
      />
    </div>
  </div>
</template>

<style scoped>
.perfil-view { padding: 2rem; width: 100%; min-height: calc(100vh - 80px); box-sizing: border-box; }

.loader-container { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: #64748b; }
.loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0ea5e9; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* --- GRID & LAYOUT --- */
.profile-layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-top: 1rem;
}

@media (min-width: 1024px) {
  .profile-layout-grid {
    grid-template-columns: 1fr 340px;
  }
}

.main-content {
  min-width: 0;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
}

.sidebar-card {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 1.75rem;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
  position: sticky;
  top: 100px;
  transition: all 0.3s ease;
}

:root.dark .sidebar-card {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-color: #334155;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
}

:root.dark .sidebar-header {
  border-color: #334155;
}

.sidebar-header-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #f0fdf4;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
}

:root.dark .sidebar-header-icon {
  background: rgba(22, 163, 74, 0.15);
  color: #4ade80;
}

.sidebar-header h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

:root.dark .sidebar-header h3 {
  color: #f8fafc;
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.activity-item {
  display: flex;
  gap: 1rem;
  position: relative;
}

.activity-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0ea5e9;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.15);
  z-index: 2;
}

.marker-line {
  width: 2px;
  flex-grow: 1;
  background: #e2e8f0;
  margin-top: 4px;
  margin-bottom: -1.5rem;
}

:root.dark .marker-line {
  background: #334155;
}

.activity-details {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.activity-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
}

.activity-type {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
}

.activity-type.creacion,
.activity-type.insertar,
.activity-type.upload,
.activity-type.adición {
  background: #e0f2fe;
  color: #0369a1;
}

:root.dark .activity-type.creacion,
:root.dark .activity-type.insertar,
:root.dark .activity-type.upload,
:root.dark .activity-type.adición {
  background: rgba(3, 105, 161, 0.2);
  color: #38bdf8;
}

.activity-type.actualizacion,
.activity-type.reemplazar,
.activity-type.modificación {
  background: #fef3c7;
  color: #b45309;
}

:root.dark .activity-type.actualizacion,
:root.dark .activity-type.reemplazar,
:root.dark .activity-type.modificación {
  background: rgba(180, 83, 9, 0.2);
  color: #fbbf24;
}

.activity-type.eliminar,
.activity-type.eliminación {
  background: #fee2e2;
  color: #b91c1c;
}

:root.dark .activity-type.eliminar,
:root.dark .activity-type.eliminación {
  background: rgba(185, 28, 28, 0.2);
  color: #f87171;
}

.activity-date {
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}

.activity-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
  margin: 0;
  line-height: 1.3;
}

:root.dark .activity-label {
  color: #cbd5e1;
}

.activity-meta {
  font-size: 0.7rem;
  color: #64748b;
  margin: 0;
}

:root.dark .activity-meta {
  color: #94a3b8;
}

.activity-user-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.user-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

:root.dark .user-avatar {
  background: #334155;
  color: #cbd5e1;
}

.user-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;
}

:root.dark .user-name {
  color: #94a3b8;
}

.no-activity {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  color: #94a3b8;
  gap: 0.75rem;
}

.no-activity p {
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0;
}
</style>
