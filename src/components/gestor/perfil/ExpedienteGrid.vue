<script setup lang="ts">
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
</script>

<template>
  <div class="expediente-content">
    <!-- Estado Vacío -->
    <div v-if="props.expedienteAgrupado.length === 0" class="empty-state glass-card">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <h3>Expediente en Blanco</h3>
      <p>No se han encontrado documentos digitalizados para <strong>{{ props.asociadoNombre }}.</strong></p>
      <button @click="emit('addDocument')" class="btn-primary-outline mt-6">Comenzar a Armar Expediente</button>
    </div>

    <!-- Lista por Categorías -->
    <div v-else class="categorias-stack">
      <div v-for="grupo in props.expedienteAgrupado" :key="grupo.id" class="categoria-section">
        <div class="categoria-header">
          <div class="header-left">
            <div class="folder-dot"></div>
            <h2>{{ grupo.nombre }}</h2>
          </div>
          <span class="doc-count">{{ grupo.documentos.length }} Archivos</span>
        </div>
        
        <div class="docs-grid">
          <div v-for="doc in grupo.documentos" :key="doc.id" class="doc-card" @click="emit('openViewer', doc)">
            <div class="doc-card-body">
              <div class="doc-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <div class="status-indicator"></div>
              </div>
              
              <div class="doc-info">
                <span class="meta-label">Documento Oficial</span>
                <h4>{{ doc.subcategoria.nombre }}</h4>
                <div class="doc-details">
                  <div class="detail-item">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span>{{ formatDate(doc.fecha_creacion) }}</span>
                  </div>
                  <!-- Nuevo campo de Creador -->
                  <div class="detail-item creator">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <span>{{ doc.usuario?.name || 'Sistema' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="doc-action">
              <span>Abrir Fólder</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.expediente-content {
  font-family: 'Plus Jakarta Sans', sans-serif;
  padding-bottom: 2rem;
}

/* Glass Card Global */
.glass-card {
  background: white;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 25px rgba(0,0,0,0.03);
}

.empty-state {
  padding: 5rem 2rem;
  text-align: center;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  margin-bottom: 1.5rem;
  color: #cbd5e1;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #64748b;
  max-width: 400px;
  margin: 0 auto;
}

.btn-primary-outline {
  background: transparent;
  color: #0ea5e9;
  border: 2px solid #0ea5e9;
  padding: 0.85rem 2rem;
  border-radius: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary-outline:hover {
  background: #0ea5e9;
  color: white;
}

.mt-6 { margin-top: 1.5rem; }

/* Secciones de Categoría */
.categorias-stack {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.categoria-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.folder-dot {
  width: 10px;
  height: 10px;
  background: #0ea5e9;
  border-radius: 50%;
}

.categoria-header h2 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.doc-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
}

/* Docs Grid */
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Tarjeta Vertical */
.doc-card {
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.01);
}

.doc-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.06);
  border-color: #bae6fd;
}

.doc-card-body {
  padding: 1.5rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.doc-icon-wrapper {
  width: 52px;
  height: 52px;
  background: #f0f9ff;
  color: #0ea5e9;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.status-indicator {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  background: #10b981;
  border: 3px solid white;
  border-radius: 50%;
}

.doc-info { flex: 1; }

.meta-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  display: block;
}

.doc-info h4 {
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
}

.doc-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.detail-item.creator {
  color: #0ea5e9;
}

/* Pie de Tarjeta */
.doc-action {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 800;
  color: #0ea5e9;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px dashed #e2e8f0;
  transition: all 0.3s;
}

.doc-card:hover .doc-action {
  background: #0ea5e9;
  color: white;
}

/* --- DARK MODE SUPPORT --- */
:root.dark .glass-card, :root.dark .doc-card {
  background: #0f172a;
  border-color: #1e293b;
}

:root.dark .empty-state { border-color: #1e293b; background: #020617; }
:root.dark .empty-state h3 { color: #f8fafc; }

:root.dark .categoria-header { border-color: #1e293b; }
:root.dark .categoria-header h2 { color: #f8fafc; }
:root.dark .doc-count { background: #1e293b; color: #94a3b8; }

:root.dark .doc-info h4 { color: #f8fafc; }
:root.dark .doc-icon-wrapper { background: #1e293b; }
:root.dark .status-indicator { border-color: #0f172a; }
:root.dark .doc-action { background: #020617; border-color: #1e293b; }

:root.dark .detail-item { color: #94a3b8; }
:root.dark .detail-item.creator { color: #38bdf8; }

@media (max-width: 640px) {
  .docs-grid { grid-template-columns: 1fr; }
}
</style>
