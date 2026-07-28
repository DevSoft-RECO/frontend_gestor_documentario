<script setup lang="ts">


const props = defineProps<{
  show: boolean
  documentosEliminados: any[]
  asociadoNombre: string
}>()

const emit = defineEmits(['close', 'preview'])

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.show" class="modal-overlay" @click.self="emit('close')">
      <div class="glass-card modal-content slide-up">
        <!-- Encabezado del Modal -->
        <div class="modal-header">
          <div class="header-main">
            <div class="icon-circle-trash">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <div>
              <h2>Papelera del Asociado</h2>
              <p class="modal-desc">Expediente: <span class="font-bold text-sky-500">{{ props.asociadoNombre }}</span></p>
            </div>
          </div>
          <button @click="emit('close')" class="btn-close">×</button>
        </div>

        <!-- Cuerpo del Modal -->
        <div class="modal-body-scroll">
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Listado histórico de documentos u hojas eliminadas de este expediente. Puede visualizar el contenido antes de decidir solicitar la restauración.
          </p>

          <div v-if="props.documentosEliminados.length === 0" class="text-center py-10 text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2 opacity-50"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            No hay registros de documentos eliminados para este asociado.
          </div>

          <div v-else class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20">
            <table class="w-full border-collapse text-left text-xs">
              <thead>
                <tr class="bg-slate-100/50 dark:bg-slate-950/50">
                  <th class="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[0.65rem] border-b border-slate-200 dark:border-slate-800">ID de Archivo</th>
                  <th class="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[0.65rem] border-b border-slate-200 dark:border-slate-800">Elemento</th>
                  <th class="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[0.65rem] border-b border-slate-200 dark:border-slate-800">Eliminado por</th>
                  <th class="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[0.65rem] border-b border-slate-200 dark:border-slate-800 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in props.documentosEliminados" :key="doc.id" class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800/60">
                    #{{ doc.id }}
                  </td>
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/60">
                    <div class="flex flex-col">
                      <span>{{ doc.nombre_subcategoria }}</span>
                      <span class="text-[0.6rem] text-slate-400 font-bold uppercase mt-0.5">{{ doc.nombre_categoria }} &bull; {{ doc.total_paginas }} pág(s) &bull; {{ formatDate(doc.fecha_eliminacion) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                    {{ doc.usuario_elimino?.name || 'Sistema' }}
                  </td>
                  <td class="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 text-right">
                    <div class="inline-flex gap-2">
                      <button @click="emit('preview', doc)" class="bg-sky-500 hover:bg-sky-600 text-white font-bold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer shadow-sm shadow-sky-500/10 text-[0.68rem] transition duration-250">
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="modal-actions">
          <button @click="emit('close')" class="btn-secondary">Cerrar Papelera</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
}

.modal-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(15, 23, 42, 0.6); 
  backdrop-filter: blur(8px); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 9999; 
  padding: 2rem; 
}

.modal-content { 
  width: 100%; 
  max-width: 700px; 
  display: flex; 
  flex-direction: column; 
  max-height: 90vh; 
}

.modal-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  padding: 2rem 2.5rem 1.5rem; 
  border-bottom: 1px solid #f1f5f9; 
}

.header-main { 
  display: flex; 
  gap: 1.25rem; 
  align-items: center; 
}

.icon-circle-trash { 
  width: 48px; 
  height: 48px; 
  background: #fee2e2; 
  color: #ef4444; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.modal-header h2 { 
  margin: 0; 
  font-size: 1.5rem; 
  color: #0f172a; 
  font-weight: 800; 
  font-family: 'Outfit', sans-serif;
}

.modal-desc { 
  color: #64748b; 
  margin: 0.25rem 0 0 0; 
  font-size: 0.95rem; 
}

.btn-close { 
  background: #f1f5f9; 
  border: none; 
  font-size: 1.5rem; 
  color: #94a3b8; 
  cursor: pointer; 
  line-height: 1; 
  width: 32px; 
  height: 32px; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: 0.2s; 
}

.btn-close:hover { 
  background: #fee2e2; 
  color: #ef4444; 
}

.modal-body-scroll { 
  padding: 2rem 2.5rem; 
  overflow-y: auto; 
  flex: 1; 
}

.modal-actions { 
  padding: 1.5rem 2.5rem 2rem; 
  display: flex; 
  justify-content: flex-end; 
  gap: 1rem; 
  border-top: 1px solid #f1f5f9; 
  background: #f8fafc; 
  border-bottom-left-radius: 24px; 
  border-bottom-right-radius: 24px; 
}

.btn-secondary { 
  background: white; 
  color: #475569; 
  border: 1px solid #e2e8f0; 
  padding: 0.85rem 2rem; 
  border-radius: 12px; 
  font-weight: 600; 
  cursor: pointer; 
  transition: 0.2s; 
}

.btn-secondary:hover { 
  background: #f1f5f9; 
}

:root.dark .glass-card {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

:root.dark .modal-header { border-color: #1e293b; }
:root.dark .modal-header h2 { color: #f8fafc; }
:root.dark .modal-desc { color: #94a3b8; }
:root.dark .icon-circle-trash { background: rgba(239, 68, 68, 0.15); color: #f87171; }
:root.dark .btn-close { background: #1e293b; color: #94a3b8; }
:root.dark .modal-actions {
  background: #020617;
  border-color: #1e293b;
}
:root.dark .btn-secondary {
  background: #1e293b;
  color: #94a3b8;
  border-color: #334155;
}
:root.dark .btn-secondary:hover { background: #334155; color: white; }
</style>
