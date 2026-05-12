<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

const route = useRoute()
const router = useRouter()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const asociado = ref<Asociado | null>(null)
const expedientesBrutos = ref<Documento[]>([])
const categoriasMaster = ref<CategoriaMaster[]>([])
const isLoading = ref(true)

const showUploadModal = ref(false)
const showViewerModal = ref(false)
const currentDocument = ref<Documento | null>(null)

// --- Data Fetching ---
const loadAllData = async () => {
  isLoading.value = true
  try {
    const asociadoId = route.params.id as string
    const [resAsociado, resDocs, resCats] = await Promise.all([
      fetch(`${API_URL}/api/gestor/asociados/${asociadoId}`),
      fetch(`${API_URL}/api/gestor/asociados/${asociadoId}/expediente`),
      fetch(`${API_URL}/api/gestor/categorias`)
    ])

    if (!resAsociado.ok) throw new Error('Asociado no encontrado')

    asociado.value = await resAsociado.json()
    expedientesBrutos.value = await resDocs.json()
    categoriasMaster.value = await resCats.json()
  } catch (e) {
    console.error(e)
    alert('Error al cargar datos')
    router.push('/gestor/asociados')
  } finally {
    isLoading.value = false
  }
}

// Transform the flat document list into categorized groups
const expedienteAgrupado = computed<GrupoCategoria[]>(() => {
  if (!expedientesBrutos.value) return []
  
  const map = new Map<number, GrupoCategoria>()
  
  expedientesBrutos.value.forEach(doc => {
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

onMounted(loadAllData)
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
      />

      <ExpedienteGrid 
        :expedienteAgrupado="expedienteAgrupado"
        :asociadoNombre="asociado.nombre_completo"
        @openViewer="handleOpenViewer"
        @addDocument="showUploadModal = true"
      />

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
.perfil-view { padding: 2rem; max-width: 1400px; margin: 0 auto; min-height: calc(100vh - 80px); }

.loader-container { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: #64748b; }
.loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0ea5e9; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
