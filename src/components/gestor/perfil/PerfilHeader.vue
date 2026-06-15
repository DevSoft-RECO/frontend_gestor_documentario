<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Asociado {
  id: number
  codigo_cliente: string
  dpi: string
  nombre_completo: string
  direccion: string
  fecha_registro: string
  usuario_id?: number
}

const props = defineProps<{
  asociado: Asociado
}>()

const emit = defineEmits(['back', 'addDocument', 'updateSuccess'])

const authStore = useAuthStore()

const canEdit = computed(() => {
  const currentUserId = authStore.user?.id || authStore.user?.user_id
  const isSuperAdmin = authStore.user?.roles?.includes('Super Admin')
  return isSuperAdmin || (Number(props.asociado.usuario_id) === Number(currentUserId))
})

const showEditModal = ref(false)
const isSaving = ref(false)
const editForm = ref({
  nombre_completo: '',
  dpi: '',
  codigo_cliente: '',
  direccion: ''
})

const openEditModal = () => {
  editForm.value = {
    nombre_completo: props.asociado.nombre_completo,
    dpi: props.asociado.dpi,
    codigo_cliente: props.asociado.codigo_cliente || '',
    direccion: props.asociado.direccion || ''
  }
  showEditModal.value = true
}

const updateAsociado = async () => {
  isSaving.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/asociados/${props.asociado.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(editForm.value)
    })
    const data = await res.json()
    if (res.ok) {
      showEditModal.value = false
      emit('updateSuccess')
    } else {
      alert(`Error: ${data.error}`)
    }
  } catch (e) {
    console.error(e)
    alert('Error al actualizar asociado')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="profile-header-container">
    <div class="top-nav">
      <button @click="emit('back')" class="btn-minimal">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Regresar al Archivero Central
      </button>
    </div>

    <!-- Gaveta de Archivero Digital Premium -->
    <div class="drawer-header-card shadow-drawer">
      <!-- Decoración de la Manija de la Gaveta (Filing Cabinet Handle) -->
      <div class="drawer-handle-wrapper">
        <div class="drawer-handle-bar"></div>
        <div class="drawer-handle-bracket left"></div>
        <div class="drawer-handle-bracket right"></div>
      </div>

      <div class="drawer-front-grid">
        <!-- Tarjeta de Identificación Metálica (Classic Label Slot) -->
        <div class="archive-label-slot">
          <div class="metal-frame">
            <div class="paper-label">
              <span class="label-code">{{ props.asociado.codigo_cliente || 'SIN ASIGNAR' }}</span>
              <span class="label-dept">EXPEDIENTE DIGITAL</span>
            </div>
          </div>
        </div>

        <div class="profile-main">
          <!-- Pestaña de Fólder / Portfolio Tab -->
          <div class="folder-portfolio-tab">
            <div class="folder-tab-shape">
              <span class="tab-initials">{{ props.asociado.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}</span>
            </div>
            <div class="folder-body-shadow"></div>
          </div>

          <div class="profile-details">
            <div class="name-section">
              <span class="category-tag-premium">
                <span class="pulse-dot"></span> Portafolio de Asociado Activo
              </span>
              <h1>{{ props.asociado.nombre_completo }}</h1>
            </div>
            
            <div class="meta-row-premium">
              <div class="meta-box-premium">
                <label>DPI / CUI</label>
                <span>{{ props.asociado.dpi }}</span>
              </div>
              <div class="meta-divider-premium"></div>
              <div class="meta-box-premium">
                <label>Dirección del Asociado</label>
                <span class="text-truncate">{{ props.asociado.direccion || 'Sin dirección registrada' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones del Archivador -->
        <div class="header-actions">
          <button v-if="canEdit" @click="openEditModal" class="btn-archive-edit" title="Editar Perfil">
            <div class="btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
          </button>
          <button @click="emit('addDocument')" class="btn-archive-insert">
            <div class="btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            </div>
            <span>Nuevo Folder</span>
          </button>
        </div>
      </div>
    </div>
    <!-- Modal de Edición de Asociado -->
    <Teleport to="body">
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="glass-card modal-content slide-up">
          <div class="modal-header">
            <div class="header-main">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div>
                <h2>Editar Fólder Maestro</h2>
                <p class="modal-desc">Modifica los detalles principales del expediente.</p>
              </div>
            </div>
            <button @click="showEditModal = false" class="btn-close">×</button>
          </div>
          
          <div class="modal-body-scroll">
            <div class="form-grid-modal">
              <div class="form-group full-width">
                <label>Nombre Completo</label>
                <input v-model="editForm.nombre_completo" type="text" placeholder="Nombre completo" class="custom-select" required>
              </div>
              <div class="form-row-modal">
                <div class="form-group">
                  <label>Documento DPI</label>
                  <input v-model="editForm.dpi" type="text" placeholder="13 dígitos" class="custom-select" required>
                </div>
                <div class="form-group">
                  <label>Código Cliente</label>
                  <input v-model="editForm.codigo_cliente" type="text" placeholder="Código de cliente" class="custom-select">
                </div>
              </div>
              <div class="form-group full-width">
                <label>Dirección</label>
                <textarea v-model="editForm.direccion" placeholder="Dirección completa" class="custom-select custom-textarea" rows="3"></textarea>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="showEditModal = false" class="btn-secondary" :disabled="isSaving">Cancelar</button>
            <button @click="updateAsociado" class="btn-primary" :disabled="isSaving || !editForm.nombre_completo?.trim() || !editForm.dpi?.trim()">
              <span v-if="isSaving" class="spinner-small"></span>
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');

.profile-header-container {
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin-bottom: 3rem;
  perspective: 1000px;
}

.top-nav {
  margin-bottom: 1.5rem;
}

.btn-minimal {
  background: transparent;
  border: none;
  color: #64748b;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem 0;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-minimal:hover {
  color: #0ea5e9;
  transform: translateX(-5px);
}

/* --- GAVETA DE ARCHIVERO PREMIUM --- */
.drawer-header-card {
  position: relative;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 36px;
  padding: 3rem 2.5rem 2.5rem 2.5rem;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transform-style: preserve-3d;
}

.drawer-header-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 36px;
  padding: 2px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(226,232,240,0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}

/* Efecto 3D de tirar de la gaveta */
.drawer-header-card:hover {
  transform: translateY(-8px) rotateX(2deg) scale(1.005);
  box-shadow: 
    0 20px 40px -15px rgba(15, 23, 42, 0.1),
    0 30px 60px -20px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255,255,255,0.9);
  border-color: #cbd5e1;
}

/* --- MANIJA METÁLICA DE LA GAVETA --- */
.drawer-handle-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  width: 140px;
  height: 20px;
  pointer-events: none;
}

.drawer-handle-bar {
  position: absolute;
  top: 5px;
  left: 10px;
  right: 10px;
  height: 8px;
  background: linear-gradient(to bottom, #94a3b8 0%, #475569 50%, #334155 100%);
  border-radius: 4px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);
}

.drawer-handle-bracket {
  position: absolute;
  top: 0;
  width: 14px;
  height: 18px;
  background: linear-gradient(135deg, #cbd5e1 0%, #475569 100%);
  border-radius: 3px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.drawer-handle-bracket.left { left: 0; }
.drawer-handle-bracket.right { right: 0; }

/* Grid de distribución de la Gaveta */
.drawer-front-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 3rem;
}

/* --- TARJETERO METÁLICO (Etiqueta clásica de archivero) --- */
.archive-label-slot {
  flex-shrink: 0;
}

.metal-frame {
  background: linear-gradient(135deg, #cbd5e1 0%, #64748b 50%, #475569 100%);
  padding: 5px;
  border-radius: 8px;
  box-shadow: 
    inset 0 1px 2px rgba(255,255,255,0.8),
    0 4px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.paper-label {
  background: #fcfbf7; /* Papel antiguo / crema */
  border: 1px solid #d1c7bd;
  border-radius: 4px;
  padding: 10px 14px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.label-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 0.05em;
  line-height: 1;
}

.label-dept {
  font-size: 0.55rem;
  font-weight: 800;
  color: #94a3b8;
  margin-top: 0.35rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* --- PERFIL PRINCIPAL --- */
.profile-main {
  display: flex;
  align-items: center;
  gap: 2.25rem;
}

/* Pestaña de Fólder / Portfolio Tab Metaphor */
.folder-portfolio-tab {
  position: relative;
  width: 90px;
  height: 90px;
  flex-shrink: 0;
}

.folder-tab-shape {
  position: absolute;
  bottom: 0;
  width: 90px;
  height: 74px;
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); /* Folder Manila Premium */
  border-radius: 0 12px 12px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 10px 20px -5px rgba(202, 138, 4, 0.4),
    inset 0 1px 0 rgba(255,255,255,0.3);
  z-index: 2;
}

/* Pestaña sobresaliente del folder */
.folder-tab-shape::before {
  content: '';
  position: absolute;
  top: -14px;
  left: 0;
  width: 45px;
  height: 15px;
  background: #eab308;
  border-radius: 8px 8px 0 0;
  z-index: 1;
}

.tab-initials {
  font-family: 'Outfit', sans-serif;
  color: white;
  font-weight: 800;
  font-size: 1.85rem;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.folder-body-shadow {
  position: absolute;
  bottom: -4px;
  left: 6px;
  right: 6px;
  height: 10px;
  background: rgba(0, 0, 0, 0.15);
  filter: blur(4px);
  border-radius: 50%;
  z-index: 1;
}

/* --- DETALLES --- */
.profile-details {
  display: flex;
  flex-direction: column;
}

.category-tag-premium {
  font-size: 0.7rem;
  font-weight: 800;
  color: #0ea5e9;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 8px #10b981;
  animation: pulse-glow 2s infinite;
}

.name-section h1 {
  font-family: 'Outfit', sans-serif;
  font-size: 2.35rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.03em;
  margin: 0 0 1rem 0;
  line-height: 1;
}

.meta-row-premium {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.meta-box-premium {
  display: flex;
  flex-direction: column;
}

.meta-box-premium label {
  font-size: 0.6rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  letter-spacing: 0.05em;
}

.meta-box-premium span {
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
}

.text-truncate {
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.meta-divider-premium {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
}

/* --- BOTÓN PREMIUM DE INSERCIÓN EN ARCHIVADOR --- */
.btn-archive-insert {
  background: #0f172a;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
  position: relative;
  overflow: hidden;
  border: 1px solid #1e293b;
}

.btn-archive-insert::before {
  content: '';
  position: absolute;
  top: 0;
  left: -50%;
  width: 200%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-25deg);
  transition: 0.75s;
  pointer-events: none;
}

.btn-archive-insert:hover::before {
  left: 120%;
}

.btn-archive-insert:hover {
  background: #0ea5e9;
  border-color: #38bdf8;
  box-shadow: 0 15px 30px rgba(14, 165, 233, 0.35);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  pointer-events: none;
}

.btn-archive-insert span {
  pointer-events: none;
}

.btn-archive-insert:hover .btn-icon {
  transform: rotate(90deg) scale(1.15);
}

@keyframes pulse-glow {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* --- DARK MODE SUPPORT --- */
:root.dark .drawer-header-card {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-color: #334155;
}

:root.dark .drawer-header-card::before {
  background: linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
}

:root.dark .drawer-handle-bar {
  background: linear-gradient(to bottom, #64748b 0%, #334155 50%, #0f172a 100%);
}

:root.dark .drawer-handle-bracket {
  background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
}

:root.dark .metal-frame {
  background: linear-gradient(135deg, #475569 0%, #1e293b 50%, #0f172a 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 10px rgba(0,0,0,0.3);
}

:root.dark .paper-label {
  background: #182232; /* Papel oscuro elegante */
  border-color: #2e3e56;
}

:root.dark .label-code {
  color: #f8fafc;
}

:root.dark .name-section h1 { color: #f8fafc; }
:root.dark .meta-box-premium span { color: #cbd5e1; }
:root.dark .meta-divider-premium { background: #334155; }
:root.dark .btn-minimal { color: #94a3b8; }
:root.dark .btn-minimal:hover { color: #0ea5e9; }
:root.dark .btn-archive-insert { background: #0ea5e9; border-color: #38bdf8; }
:root.dark .btn-archive-insert:hover { background: #0284c7; border-color: #0ea5e9; }

@media (max-width: 1024px) {
  .drawer-front-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .archive-label-slot {
    order: -1;
    display: flex;
    justify-content: center;
  }
  .header-actions {
    display: flex;
    justify-content: center;
  }
  .btn-archive-insert {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .profile-main {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
  .meta-row-premium {
    flex-direction: column;
    gap: 1rem;
  }
  .meta-divider-premium {
    display: none;
  }
  .text-truncate {
    max-width: 100%;
  }
}

/* --- EDIT MODAL STYLES --- */
.header-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-end;
}

.btn-archive-edit {
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.btn-archive-edit:hover {
  background: #f8fafc;
  color: #0ea5e9;
  border-color: #0ea5e9;
}
.btn-archive-edit .btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}
.btn-archive-edit:hover .btn-icon {
  transform: scale(1.1) rotate(15deg);
}

.glass-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
}

.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 2rem; }
.modal-content { width: 100%; max-width: 600px; display: flex; flex-direction: column; max-height: 90vh; }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 2rem 2.5rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
.header-main { display: flex; gap: 1.25rem; align-items: center; }
.icon-circle { width: 48px; height: 48px; background: #e0f2fe; color: #0ea5e9; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.icon-circle svg { width: 24px; }
.modal-header h2 { margin: 0; font-size: 1.5rem; color: #0f172a; font-weight: 800; }
.modal-desc { color: #64748b; margin: 0.25rem 0 0 0; font-size: 0.95rem; }
.btn-close { background: #f1f5f9; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; line-height: 1; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-close:hover { background: #fee2e2; color: #ef4444; }
.modal-body-scroll { padding: 2rem 2.5rem; overflow-y: auto; flex: 1; }
.form-grid-modal { display: flex; flex-direction: column; gap: 1.25rem; }
.form-row-modal { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { display: flex; flex-direction: column; }
.form-group label { display: block; font-weight: 700; color: #475569; margin-bottom: 0.5rem; font-size: 0.85rem; }
.custom-select { width: 100%; padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem; background: #f8fafc; color: #1e293b; outline: none; transition: 0.2s; }
.custom-select:focus { border-color: #0ea5e9; background: white; box-shadow: 0 0 0 4px rgba(14,165,233,0.1); }
.custom-textarea { resize: vertical; min-height: 80px; }
.modal-actions { padding: 1.5rem 2.5rem 2rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid #f1f5f9; background: #f8fafc; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; }
.btn-secondary { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 0.85rem 2rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-secondary:hover { background: #f1f5f9; }
.btn-primary { background: #0ea5e9; color: white; border: none; padding: 0.85rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 0.75rem; }
.btn-primary:hover:not(:disabled) { background: #0284c7; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.spinner-small { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

:root.dark .glass-card {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

:root.dark .btn-archive-edit {
  background: #1e293b;
  color: #cbd5e1;
  border-color: #334155;
}
:root.dark .btn-archive-edit:hover {
  background: #334155;
  color: white;
  border-color: #0ea5e9;
}
:root.dark .modal-header { border-color: #1e293b; }
:root.dark .modal-header h2 { color: #f8fafc; }
:root.dark .modal-desc { color: #94a3b8; }
:root.dark .icon-circle { background: #1e293b; }
:root.dark .btn-close { background: #1e293b; color: #94a3b8; }
:root.dark .form-group label { color: #cbd5e1; }
:root.dark .custom-select {
  background: #1e293b;
  border-color: #334155;
  color: #f8fafc;
}
:root.dark .custom-select:focus { background: #0f172a; border-color: #0ea5e9; }
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
:root.dark .modal-body-scroll::-webkit-scrollbar-thumb { background: #334155; }

@media (max-width: 1024px) {
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  .btn-archive-edit {
    width: 100%;
    justify-content: center;
  }
}
</style>
