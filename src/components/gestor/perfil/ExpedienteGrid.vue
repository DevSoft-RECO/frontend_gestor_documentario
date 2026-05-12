<script setup lang="ts">


interface Documento {
  id: number
  asociado_id: number
  subcategoria_id: number
  file_path: string
  fecha_creacion: string
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
    <div v-if="props.expedienteAgrupado.length === 0" class="empty-state glass-card">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <h3>Expediente Vacío</h3>
      <p>No hay documentos físicos en el expediente de {{ props.asociadoNombre }}.</p>
      <button @click="emit('addDocument')" class="btn-primary-outline mt-4">Comenzar a Armar Expediente</button>
    </div>

    <div v-else class="categorias-grid">
      <div v-for="grupo in props.expedienteAgrupado" :key="grupo.id" class="categoria-section glass-card">
        <div class="categoria-header">
          <h2>{{ grupo.nombre }}</h2>
          <span class="doc-count">{{ grupo.documentos.length }} documento(s)</span>
        </div>
        
        <div class="docs-grid">
          <div v-for="doc in grupo.documentos" :key="doc.id" class="doc-card" @click="emit('openViewer', doc)">
            <div class="doc-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <div class="status-indicator"></div>
            </div>
            <div class="doc-info">
              <h4>{{ doc.subcategoria.nombre }}</h4>
              <p>Subido el {{ formatDate(doc.fecha_creacion) }}</p>
            </div>
            <div class="doc-action">
              <span>Abrir Fólder</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.expediente-content { display: grid; gap: 2rem; }

.empty-state { padding: 5rem 2rem; text-align: center; border: 2px dashed #cbd5e1; background: rgba(248, 250, 252, 0.8); }
.empty-state svg { width: 64px; color: #cbd5e1; margin-bottom: 1rem; }
.empty-state h3 { font-size: 1.5rem; color: #334155; margin-bottom: 0.5rem; }
.empty-state p { color: #64748b; }

.btn-primary-outline { background: transparent; color: #0ea5e9; border: 2px solid #0ea5e9; padding: 0.85rem 1.75rem; border-radius: 9999px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-primary-outline:hover { background: #f0f9ff; }
.mt-4 { margin-top: 1rem; }

.categorias-grid { display: flex; flex-direction: column; gap: 2rem; }
.categoria-section { padding: 2rem; }
.categoria-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; }
.categoria-header h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
.doc-count { font-size: 0.85rem; font-weight: 600; color: #0ea5e9; background: #e0f2fe; padding: 0.25rem 0.75rem; border-radius: 9999px; }

.docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }

.doc-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem; display: flex; flex-direction: column; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; }
.doc-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: #bae6fd; }

.doc-icon { width: 48px; height: 48px; background: #f0f9ff; color: #0ea5e9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; position: relative; }
.doc-icon svg { width: 24px; }
.status-indicator { position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; }

.doc-info { flex: 1; }
.doc-info h4 { margin: 0 0 0.25rem 0; color: #1e293b; font-size: 1.05rem; }
.doc-info p { margin: 0; font-size: 0.8rem; color: #64748b; }

.doc-action { margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #0ea5e9; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; }
.doc-action svg { width: 16px; }
</style>
