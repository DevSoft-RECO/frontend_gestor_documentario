<script setup lang="ts">
import { ref } from 'vue'
import DocumentReadOnlyViewer from '@/components/gestor/busqueda/DocumentReadOnlyViewer.vue'

interface IndiceResultado {
  id: number
  documento_id: number
  pagina_inicio: number
  etiqueta: string
  numero_documento: string
  fecha_operacion: string
  documento: {
    id: number
    file_path: string
    subcategoria: { 
      nombre: string
      categoria: { nombre: string }
    }
    asociado: {
      nombre_completo: string
      codigo_cliente: string
    }
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const searchQuery = ref('')
const resultados = ref<IndiceResultado[]>([])
const isSearching = ref(false)

const showViewer = ref(false)
const selectedDoc = ref<any>(null)
const selectedPage = ref(1)
const selectedAsociado = ref('')

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  resultados.value = []
  
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/busqueda/documento/${searchQuery.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      resultados.value = await res.json()
    }
  } catch (e) {
    console.error("Error en búsqueda:", e)
  } finally {
    isSearching.value = false
  }
}

const openDocument = (res: IndiceResultado) => {
  selectedDoc.value = res.documento
  selectedPage.value = res.pagina_inicio
  selectedAsociado.value = res.documento.asociado.nombre_completo
  showViewer.value = true
}
</script>

<template>
  <div class="search-view">
    <div class="search-header">
      <h1>Buscador de Documentos</h1>
      <p>Localiza cualquier archivo físico mediante su número correlativo o etiqueta.</p>
      
      <div class="search-bar-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Ingresa el número de documento o etiqueta..." 
          @keyup.enter="handleSearch"
          class="search-input"
        />
        <button @click="handleSearch" class="btn-search" :disabled="isSearching">
          <span v-if="isSearching">Buscando...</span>
          <span v-else>Buscar</span>
        </button>
      </div>
    </div>

    <div class="results-container">
      <div v-if="resultados.length === 0 && !isSearching && searchQuery" class="no-results">
        No se encontraron documentos con ese número.
      </div>

      <div class="results-grid">
        <div v-for="res in resultados" :key="res.id" class="result-card" @click="openDocument(res)">
          <div class="card-badge">Pág. {{ res.pagina_inicio }}</div>
          <div class="card-content">
            <h3 class="card-title">{{ res.etiqueta }}</h3>
            <div class="card-numero"># {{ res.numero_documento }}</div>
            
            <hr class="card-divider" />
            
            <div class="card-meta">
              <div class="meta-item">
                <span class="label">Asociado:</span>
                <span class="value">{{ res.documento.asociado.nombre_completo }}</span>
              </div>
              <div class="meta-item">
                <span class="label">Categoría:</span>
                <span class="value">{{ res.documento.subcategoria.categoria.nombre }} / {{ res.documento.subcategoria.nombre }}</span>
              </div>
              <div class="meta-item">
                <span class="label">Fecha:</span>
                <span class="value">{{ new Date(res.fecha_operacion).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <span>Hacer clic para abrir visor</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Visor de Solo Lectura -->
    <DocumentReadOnlyViewer 
      v-if="showViewer"
      :documento="selectedDoc"
      :asociadoNombre="selectedAsociado"
      :initialPage="selectedPage"
      @close="showViewer = false"
    />
  </div>
</template>

<style scoped>
.search-view { padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; min-height: 100vh; }
.search-header { text-align: center; margin-bottom: 3rem; }
.search-header h1 { color: #0f172a; font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
.search-header p { color: #64748b; font-size: 1.1rem; }

.search-bar-container { display: flex; max-width: 700px; margin: 2rem auto; gap: 1rem; background: white; padding: 0.5rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.search-input { flex: 1; border: none; padding: 1rem 1.5rem; font-size: 1.1rem; outline: none; border-radius: 12px; }
.btn-search { background: #0ea5e9; color: white; border: none; padding: 0 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-search:hover { background: #0284c7; transform: translateY(-2px); }

.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
.result-card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; cursor: pointer; transition: 0.3s; position: relative; display: flex; flex-direction: column; }
.result-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); border-color: #0ea5e9; }

.card-badge { position: absolute; top: 1rem; right: 1rem; background: #f0f9ff; color: #0ea5e9; font-weight: 800; font-size: 0.75rem; padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid #bae6fd; }

.card-content { padding: 1.5rem; flex: 1; }
.card-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
.card-numero { font-family: monospace; color: #0ea5e9; font-weight: 600; font-size: 0.9rem; margin-bottom: 1rem; }
.card-divider { border: none; border-top: 1px solid #f1f5f9; margin: 1rem 0; }

.card-meta { display: flex; flex-direction: column; gap: 0.75rem; }
.meta-item { display: flex; justify-content: space-between; font-size: 0.85rem; }
.meta-item .label { color: #94a3b8; font-weight: 500; }
.meta-item .value { color: #475569; font-weight: 600; text-align: right; }

.card-footer { background: #f8fafc; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 0.85rem; font-weight: 600; border-top: 1px solid #f1f5f9; }
.result-card:hover .card-footer { background: #f0f9ff; color: #0ea5e9; }

.no-results { text-align: center; color: #94a3b8; padding: 3rem; font-style: italic; }
</style>
