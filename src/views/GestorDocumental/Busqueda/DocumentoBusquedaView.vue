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
  fecha_vencimiento: string | null
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
  <div class="search-page">
    <!-- Hero Section -->
    <div class="hero-container" :class="{ 'full-screen': resultados.length === 0 && !isSearching }">
      <div class="hero-content" :class="{ 'slide-down': resultados.length === 0 }">
        <div class="hero-badge">Módulo de Consulta</div>
        <h1>Buscador Inteligente de <span class="text-gradient">Documentos</span></h1>
        <p>Localiza expedientes y archivos físicos con precisión quirúrgica mediante número correlativo o etiqueta.</p>
        
        <div class="search-wrapper">
          <div class="search-glass" :class="{ 'search-active': isSearching }">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Ingresa # documento o etiqueta..." 
              @keyup.enter="handleSearch"
              class="glass-input"
            />
            <button @click="handleSearch" class="btn-action" :disabled="isSearching">
              <span v-if="isSearching" class="loader"></span>
              <span v-else>Consultar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div class="main-content">
      <div v-if="isSearching" class="loading-state">
        <div class="pulse-ring"></div>
        <p>Escaneando base de datos...</p>
      </div>

      <div v-else-if="resultados.length === 0 && searchQuery && !isSearching" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>Sin coincidencias</h3>
        <p>No encontramos documentos con ese criterio. Verifica el número e intenta de nuevo.</p>
      </div>

      <div v-else-if="resultados.length > 0" class="results-layout">
        <div class="results-info">
          <span>Se encontraron <strong>{{ resultados.length }}</strong> coincidencias</span>
          <div class="results-divider"></div>
        </div>

        <div class="results-grid">
          <div v-for="(res, index) in resultados" :key="res.id" 
               class="modern-card fade-in" 
               :style="{ animationDelay: `${index * 0.05}s` }"
               @click="openDocument(res)">
            
            <div class="card-header">
              <div class="status-dot"></div>
              <span class="page-indicator">Página {{ res.pagina_inicio }}</span>
            </div>

            <div class="card-body">
              <h3 class="doc-title">{{ res.etiqueta }}</h3>
              <div class="doc-id">
                <span class="id-label">EXP-ID</span>
                <span class="id-value">#{{ res.numero_documento }}</span>
              </div>

              <div class="info-list">
                <div class="info-item">
                  <div class="info-icon">👤</div>
                  <div class="info-text">
                    <label>Asociado</label>
                    <span>{{ res.documento.asociado.nombre_completo }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon">🏷️</div>
                  <div class="info-text">
                    <label>Categoría</label>
                    <span>{{ res.documento.subcategoria.categoria.nombre }} / {{ res.documento.subcategoria.nombre }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon" :class="{ 'warn': res.fecha_vencimiento }">📅</div>
                  <div class="info-text">
                    <label>{{ res.fecha_vencimiento ? 'Vencimiento' : 'Fecha Operación' }}</label>
                    <span :class="{ 'warning-text': res.fecha_vencimiento }">
                      {{ new Date(res.fecha_vencimiento || res.fecha_operacion).toLocaleDateString() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-action">
              <span>Visualizar Archivo</span>
              <div class="arrow-icon">→</div>
            </div>
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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.search-page {
  font-family: 'Plus Jakarta Sans', sans-serif;
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  color: #1e293b;
  padding-bottom: 5rem; /* Espacio de respiración al final */
}

/* Hero Design */
.hero-container {
  background: radial-gradient(circle at top right, #f1f5f9 0%, #ffffff 100%);
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.hero-container.full-screen {
  flex: 1;
  justify-content: center;
  padding-top: 0;
}

.hero-badge {
  display: inline-block;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.5rem 1.25rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
  border: 1px solid #bae6fd;
}

.hero-container h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.1;
  color: #0f172a;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.text-gradient {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-container p {
  color: #64748b;
  font-size: 1.15rem;
  max-width: 600px;
  margin: 0 auto 3rem;
  line-height: 1.6;
}

/* Search Bar Design */
.search-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.search-glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  padding: 0.75rem 1rem;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 1);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.search-glass:focus-within {
  transform: translateY(-5px);
  box-shadow: 0 30px 60px rgba(14, 165, 233, 0.15);
  border-color: #0ea5e9;
}

.search-icon { color: #94a3b8; }

.glass-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  font-weight: 500;
  outline: none;
  color: #1e293b;
}

.btn-action {
  background: #0f172a;
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action:hover {
  background: #0ea5e9;
  transform: scale(1.02);
}

/* Results Section */
.main-content {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 2rem;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  color: #64748b;
  font-size: 0.95rem;
}

.results-divider {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

/* Modern Card Design */
.modern-card {
  background: white;
  border-radius: 28px;
  padding: 2rem;
  position: relative;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  flex-direction: column;
}

.modern-card:hover {
  transform: translateY(-12px);
  box-shadow: 0 30px 60px rgba(0,0,0,0.06);
  border-color: #0ea5e9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}

.page-indicator {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
}

.doc-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.doc-id {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 2rem;
}

.id-label {
  background: #0ea5e9;
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.id-value {
  color: #0ea5e9;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 1rem;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.info-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.info-icon {
  font-size: 1.25rem;
  background: #f8fafc;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.info-icon.warn { background: #fff7ed; }

.info-text label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.2rem;
}

.info-text span {
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
  display: block;
  line-height: 1.4;
}

.warning-text { color: #f59e0b !important; }

.card-action {
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #0ea5e9;
  font-weight: 700;
  font-size: 0.9rem;
}

.arrow-icon {
  width: 32px;
  height: 32px;
  background: #f0f9ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
}

.modern-card:hover .arrow-icon {
  background: #0ea5e9;
  color: white;
  transform: translateX(5px);
}

@media (max-width: 1200px) {
  .results-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .results-grid { grid-template-columns: 1fr; }
}

/* Animations */
.slide-down {
  animation: slideDown 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.fade-in {
  animation: fadeIn 0.6s ease-out both;
}

@keyframes slideDown {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Loading & Empty States */
.loading-state, .empty-state {
  text-align: center;
  padding: 5rem 0;
}

.loading-state p { color: #64748b; font-weight: 600; margin-top: 1rem; }

.pulse-ring {
  width: 40px;
  height: 40px;
  border: 4px solid #0ea5e9;
  border-radius: 50%;
  margin: 0 auto;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon { font-size: 4rem; margin-bottom: 1rem; }
.empty-state h3 { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
.empty-state p { color: #64748b; }

@media (max-width: 768px) {
  .results-grid { grid-template-columns: 1fr; }
  .btn-action { padding: 1rem 1.5rem; }
}
/* --- DARK MODE SUPPORT --- */
:root.dark .search-page {
  background-color: #020617;
  color: #f1f5f9;
}

:root.dark .hero-container {
  background: radial-gradient(circle at top right, #0f172a 0%, #020617 100%);
}

:root.dark .hero-container h1 { color: #f8fafc; }
:root.dark .hero-container p { color: #94a3b8; }

:root.dark .search-glass {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

:root.dark .glass-input { color: #f8fafc; }
:root.dark .search-icon { color: #64748b; }

:root.dark .results-divider { background: #1e293b; }
:root.dark .results-info { color: #64748b; }

:root.dark .modern-card {
  background: #0f172a;
  border-color: #1e293b;
}

:root.dark .modern-card:hover {
  background: #1e293b;
  border-color: #0ea5e9;
  box-shadow: 0 30px 60px rgba(0,0,0,0.4);
}

:root.dark .doc-title { color: #f8fafc; }
:root.dark .id-value { color: #94a3b8; }
:root.dark .page-indicator { background: #1e293b; color: #94a3b8; }

:root.dark .info-icon { background: #1e293b; }
:root.dark .info-icon.warn { background: #451a03; }
:root.dark .info-text span { color: #cbd5e1; }
:root.dark .info-text label { color: #64748b; }

:root.dark .card-action { border-color: #1e293b; }
:root.dark .arrow-icon { background: #1e293b; color: #0ea5e9; }

:root.dark .empty-state h3 { color: #f8fafc; }
:root.dark .empty-state p { color: #64748b; }

:root.dark .glass-modal {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
