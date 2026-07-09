<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * Estructura de datos para los documentos del expediente
 */
interface Documento {
  id: number
  asociado_id: number
  subcategoria_id: number
  file_path: string
  fecha_creacion: string
  usuario?: { name: string } // Campo para el creador
  subcategoria: {
    id: number
    nombre: string
    categoria: {
      id: number
      nombre: string
    }
  }
}

interface GrupoCategoria {
  id: number
  nombre: string
  documentos: Documento[]
}

const props = defineProps<{
  expedienteAgrupado: GrupoCategoria[]
  asociadoNombre: string
}>()

const emit = defineEmits(['openViewer', 'addDocument'])

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

// --- Estados de Filtros Reactivos ---
const selectedFolderId = ref<number | 'all'>('all')
const searchQuery = ref('')

// --- Lógica de Filtrado Reactivo (Respeta Permisos de la BD) ---
const filteredExpedienteAgrupado = computed(() => {
  let result = props.expedienteAgrupado

  // 1. Filtrar por Fólder (Categoría)
  if (selectedFolderId.value !== 'all') {
    result = result.filter(grupo => grupo.id === selectedFolderId.value)
  }

  // 2. Filtrar por Nombre de Subcategoría (Buscador)
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.map(grupo => {
      return {
        ...grupo,
        documentos: grupo.documentos.filter(doc => 
          doc.subcategoria.nombre.toLowerCase().includes(query)
        )
      }
    }).filter(grupo => grupo.documentos.length > 0) // Oculta carpetas vacías tras buscar
  }

  return result
})

// Limpiar filtros al fallar la búsqueda
const resetFilters = () => {
  selectedFolderId.value = 'all'
  searchQuery.value = ''
}
</script>

<template>
  <div class="expediente-content">
    
    <!-- Panel de Navegación y Búsqueda (Control del Archivador) -->
    <div v-if="props.expedienteAgrupado.length > 0" class="archive-control-panel shadow-sm">
      <div class="control-grid">
        <!-- Selector de Folder -->
        <div class="control-field">
          <label class="control-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>Filtrar por Portafolio</span>
          </label>
          <div class="select-wrapper">
            <select v-model="selectedFolderId" class="premium-select">
              <option value="all">📂 Todos los Portafolios</option>
              <option v-for="grupo in props.expedienteAgrupado" :key="grupo.id" :value="grupo.id">
                📁 Portafolio: {{ grupo.nombre }}
              </option>
            </select>
          </div>
        </div>

        <!-- Buscador de Subcategoría -->
        <div class="control-field">
          <label class="control-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Buscar Subcategoría</span>
          </label>
          <div class="search-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Ej: DPI, Contrato, Firma..." 
              class="premium-search-input"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn" title="Limpiar búsqueda">×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado Vacío Absoluto (Gaveta vacía de la BD) -->
    <div v-if="props.expedienteAgrupado.length === 0" class="empty-state glass-card">
      <div class="empty-icon-wrapper">
        <div class="cabinet-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
        </div>
      </div>
      <h3>Archivador Vacío</h3>
      <p>No se han encontrado fólderes ni documentos archivados en la gaveta de <strong>{{ props.asociadoNombre }}.</strong></p>
      <button @click="emit('addDocument')" class="btn-primary-outline mt-6">Abrir Nuevo Fólder</button>
    </div>

    <!-- Estado Sin Resultados por Filtros -->
    <div v-else-if="filteredExpedienteAgrupado.length === 0" class="no-results-state glass-card animate-in fade-in">
      <div class="empty-icon-wrapper">
        <div class="search-off-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="8" x2="14" y2="14"/><line x1="14" y1="8" x2="8" y2="14"/></svg>
        </div>
      </div>
      <h3>Sin Coincidencias</h3>
      <p>No encontramos ningún documento o subcategoría con esos filtros en la gaveta de <strong>{{ props.asociadoNombre }}.</strong></p>
      <button @click="resetFilters" class="btn-primary-outline mt-6">Restablecer Archivador</button>
    </div>

    <!-- Lista por Categorías Filtrada (Carpetas de Suspensión) -->
    <div v-else class="categorias-stack">
      <div v-for="grupo in filteredExpedienteAgrupado" :key="grupo.id" class="folder-hanging-wrapper">
        <!-- Pestaña superior del Folder Colgante (Hanging Folder Tab) -->
        <div class="hanging-folder-tab">
          <div class="tab-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>Portafolio: {{ grupo.nombre }}</span>
          </div>
          <span class="tab-badge">{{ grupo.documentos.length }} {{ grupo.documentos.length === 1 ? 'Doc' : 'Docs' }}</span>
        </div>

        <!-- Cuerpo de la Carpeta Manila Colgante -->
        <div class="folder-body-card">
          <!-- Varillas de suspensión metálicas (estéticas) -->
          <div class="suspension-bar-left"></div>
          <div class="suspension-bar-right"></div>
          
          <!-- Hojas de papel dentro del Folder -->
          <div class="docs-grid">
            <div v-for="doc in grupo.documentos" :key="doc.id" class="doc-sheet-card" @click="emit('openViewer', doc)">
              <!-- Clip Metálico de Sujeción (Paperclip Decorator) -->
              <div class="paperclip-decorator">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </div>

              <div class="doc-sheet-body">
                <div class="sheet-header">
                  <span class="sheet-tag">Hoja Archivada</span>
                  <div class="sheet-status-dot"></div>
                </div>
                
                <h4 class="sheet-title">{{ doc.subcategoria.nombre }}</h4>
                
                <div class="sheet-meta">
                  <div class="meta-item">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span>Fecha: {{ formatDate(doc.fecha_creacion) }}</span>
                  </div>
                  <div class="meta-item archivist">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <span>Archivó: {{ doc.usuario?.name || 'Sistema' }}</span>
                  </div>
                </div>
              </div>

              <!-- Acción de la hoja de papel -->
              <div class="sheet-action">
                <span>Extraer y Leer</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');

.expediente-content {
  font-family: 'Plus Jakarta Sans', sans-serif;
  padding-bottom: 4rem;
}

/* --- PANEL DE CONTROL Y NAVEGACIÓN --- */
.archive-control-panel {
  background: linear-gradient(145deg, #ffffff 0%, #f0f4f8 100%);
  border: 1.5px solid #cbd5e1;
  border-radius: 24px;
  padding: 1.5rem 2rem;
  margin-bottom: 3rem;
  box-shadow:
    0 4px 6px -1px rgba(15, 23, 42, 0.06),
    0 10px 25px -5px rgba(15, 23, 42, 0.08);
  position: relative;
  overflow: hidden;
}

.archive-control-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #0ea5e9, #6366f1, #0ea5e9);
  background-size: 200% 100%;
  animation: shimmer-bar 4s ease infinite;
}

@keyframes shimmer-bar {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.control-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-wrapper, .search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.premium-select, .premium-search-input {
  width: 100%;
  background: #f8fafc;
  border: 1.5px solid #94a3b8;
  border-radius: 14px;
  padding: 0.8rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  outline: none;
  transition: all 0.3s;
  box-shadow: inset 0 2px 6px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.04);
}

.premium-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 1.2rem center;
  background-size: 1.25rem;
  padding-right: 3rem;
}

.premium-select:focus, .premium-search-input:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1), inset 0 2px 4px rgba(0,0,0,0.01);
}

.clear-search-btn {
  position: absolute;
  right: 1rem;
  background: #f1f5f9;
  border: none;
  color: #64748b;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-search-btn:hover {
  background: #0ea5e9;
  color: white;
}

/* --- ESTADOS VACÍOS Y SIN COINCIDENCIAS --- */
.empty-state, .no-results-state {
  background: linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%);
  border-radius: 28px;
  border: 2px dashed #94a3b8;
  padding: 5rem 2rem;
  text-align: center;
  box-shadow: 0 10px 35px rgba(15, 23, 42, 0.06);
}

.empty-icon-wrapper {
  width: 100px;
  height: 100px;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem auto;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
}

.cabinet-icon, .search-off-icon {
  color: #94a3b8;
}

.empty-state h3, .no-results-state h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.65rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.empty-state p, .no-results-state p {
  color: #64748b;
  max-width: 420px;
  margin: 0 auto;
  font-size: 0.95rem;
  line-height: 1.5;
}

.btn-primary-outline {
  background: transparent;
  color: #0ea5e9;
  border: 2px solid #0ea5e9;
  padding: 0.9rem 2.25rem;
  border-radius: 18px;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-primary-outline:hover {
  background: #0ea5e9;
  color: white;
  box-shadow: 0 10px 20px rgba(14, 165, 233, 0.25);
  transform: translateY(-2px);
}

.mt-6 { margin-top: 1.5rem; }

/* --- CONTENEDOR DE FÓLDER COLGANTE --- */
.categorias-stack {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.folder-hanging-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Pestaña del Fólder Colgante */
.hanging-folder-tab {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: white;
  padding: 0.65rem 1.75rem 0.5rem 1.75rem;
  border-radius: 12px 12px 0 0;
  font-family: 'Outfit', sans-serif;
  box-shadow: 
    0 -4px 15px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255,255,255,0.1);
  margin-left: 2rem;
  z-index: 10;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.tab-badge {
  font-size: 0.65rem;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(99, 102, 241, 0.2));
  color: #38bdf8;
  padding: 0.2rem 0.7rem;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

/* Cuerpo de la Carpeta Manila Colgante */
.folder-body-card {
  position: relative;
  background: linear-gradient(160deg, #fdfaf2 0%, #f5edd8 100%);
  border: 2px solid #d4c4a8;
  border-radius: 24px;
  padding: 2.25rem 2.25rem;
  box-shadow: 
    0 8px 16px -4px rgba(139, 92, 26, 0.1),
    0 20px 40px -10px rgba(139, 92, 26, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  z-index: 5;
}

.folder-body-card::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  background: linear-gradient(180deg, #c4a36e, #a0845c, #c4a36e);
  border-radius: 24px 0 0 24px;
}

/* Varillas de suspensión metálicas en los laterales superiores */
.suspension-bar-left, .suspension-bar-right {
  position: absolute;
  top: -6px;
  width: 14px;
  height: 6px;
  background: linear-gradient(to right, #94a3b8, #64748b);
  border-radius: 3px 3px 0 0;
}
.suspension-bar-left { left: 1rem; }
.suspension-bar-right { right: 1rem; }

/* Grid de los Documentos (Hojas) */
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

/* --- TARJETA HOJA DE PAPEL (Document Sheet) --- */
.doc-sheet-card {
  position: relative;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  box-shadow:
    0 2px 4px rgba(15, 23, 42, 0.04),
    0 6px 18px -4px rgba(15, 23, 42, 0.08);
}

/* Decorador de Clip Metálico de Sujeción */
.paperclip-decorator {
  position: absolute;
  top: -8px;
  right: 1.5rem;
  color: #64748b;
  z-index: 10;
  transform: rotate(-15deg);
  transition: all 0.3s;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
}

.doc-sheet-card:hover .paperclip-decorator {
  color: #0ea5e9;
  transform: rotate(5deg) scale(1.1);
  filter: drop-shadow(0 2px 4px rgba(14, 165, 233, 0.3));
}

/* Efecto de sacar la hoja de papel del folder */
.doc-sheet-card:hover {
  transform: translateY(-10px) rotate(0.5deg);
  box-shadow: 
    0 25px 50px -12px rgba(15, 23, 42, 0.18),
    0 12px 24px -8px rgba(14, 165, 233, 0.1);
  border-color: #7dd3fc;
}

.doc-sheet-body {
  padding: 1.75rem 1.5rem 1.5rem 1.5rem;
  flex: 1;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sheet-tag {
  font-size: 0.6rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #475569, #334155);
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}

.sheet-status-dot {
  width: 9px;
  height: 9px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15), 0 0 8px rgba(16, 185, 129, 0.4);
  animation: pulse-status 2.5s ease-in-out infinite;
}

@keyframes pulse-status {
  0%, 100% { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15), 0 0 8px rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.08), 0 0 12px rgba(16, 185, 129, 0.6); }
}

.sheet-title {
  font-family: 'Outfit', sans-serif;
  margin: 0 0 1.25rem 0;
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.3;
}

.sheet-meta {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.meta-item.archivist {
  color: #0ea5e9;
}

/* Pie de la Hoja de Papel */
.sheet-action {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 800;
  color: #475569;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-top: 1.5px dashed #cbd5e1;
  transition: all 0.3s;
}

.doc-sheet-card:hover .sheet-action {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  border-top-color: transparent;
}

/* --- DARK MODE SUPPORT --- */
:root.dark .archive-control-panel {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-color: #334155;
}

:root.dark .premium-select, :root.dark .premium-search-input {
  background: #151e2d;
  border-color: #243249;
  color: #f8fafc;
}

:root.dark .premium-select:focus, :root.dark .premium-search-input:focus {
  border-color: #0ea5e9;
}

:root.dark .clear-search-btn {
  background: #1e293b;
  color: #94a3b8;
}

:root.dark .clear-search-btn:hover {
  background: #0ea5e9;
  color: white;
}

:root.dark .empty-state, :root.dark .no-results-state {
  background: #0f172a;
  border-color: #334155;
}

:root.dark .empty-icon-wrapper {
  background: #1e293b;
}

:root.dark .empty-state h3, :root.dark .no-results-state h3 {
  color: #f8fafc;
}

:root.dark .hanging-folder-tab {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}

:root.dark .folder-body-card {
  background: #151e2d; /* Manila Oscuro / Metal Grisáceo */
  border-color: #243249;
  box-shadow: 0 15px 35px rgba(0,0,0,0.3);
}

:root.dark .folder-body-card::before {
  background: #243249;
}

:root.dark .doc-sheet-card {
  background: #0f172a;
  border-color: #243249;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

:root.dark .sheet-tag {
  background: linear-gradient(135deg, #334155, #1e293b);
  color: #94a3b8;
}

:root.dark .doc-sheet-card:hover {
  border-color: #38bdf8;
}

:root.dark .sheet-title {
  color: #f8fafc;
}

:root.dark .meta-item {
  color: #94a3b8;
}

:root.dark .meta-item.archivist {
  color: #38bdf8;
}

:root.dark .sheet-action {
  background: #0b111e;
  border-color: #243249;
  color: #94a3b8;
}

:root.dark .doc-sheet-card:hover .sheet-action {
  background: #0ea5e9;
  color: white;
}

@media (max-width: 768px) {
  .control-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .folder-body-card {
    padding: 1.5rem;
  }
  .hanging-folder-tab {
    margin-left: 0.5rem;
  }
}
</style>
