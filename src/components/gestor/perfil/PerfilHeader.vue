<script setup lang="ts">

interface Asociado {
  id: number
  codigo_cliente: string
  dpi: string
  nombre_completo: string
  direccion: string
  fecha_registro: string
}

const props = defineProps<{
  asociado: Asociado
}>()

const emit = defineEmits(['back', 'addDocument'])

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}
</script>

<template>
  <div class="profile-header-container">
    <div class="top-nav">
      <button @click="emit('back')" class="btn-minimal">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Regresar al buscador
      </button>
    </div>

    <div class="header-card">
      <div class="profile-main">
        <div class="avatar-wrapper">
          <div class="avatar-circle">
            {{ props.asociado.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}
          </div>
          <div class="status-indicator"></div>
        </div>

        <div class="profile-details">
          <div class="name-section">
            <span class="category-tag">Expediente de Asociado</span>
            <h1>{{ props.asociado.nombre_completo }}</h1>
          </div>
          
          <div class="meta-row">
            <div class="meta-box">
              <label>DPI / CUI</label>
              <span>{{ props.asociado.dpi }}</span>
            </div>
            <div class="meta-divider"></div>
            <div class="meta-box">
              <label>Código Cliente</label>
              <span :class="{ 'pending': !props.asociado.codigo_cliente }">
                {{ props.asociado.codigo_cliente || 'POR ASIGNAR' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button @click="emit('addDocument')" class="btn-action-premium">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo Documento
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.profile-header-container {
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin-bottom: 2.5rem;
}

.top-nav {
  margin-bottom: 1.5rem;
}

.btn-minimal {
  background: transparent;
  border: none;
  color: #64748b;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem 0;
  transition: all 0.3s;
}

.btn-minimal:hover {
  color: #0ea5e9;
  transform: translateX(-5px);
}

.header-card {
  background: white;
  padding: 2.5rem;
  border-radius: 32px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.avatar-wrapper {
  position: relative;
}

.avatar-circle {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: white;
  border-radius: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  box-shadow: 0 15px 35px rgba(14, 165, 233, 0.25);
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: #10b981;
  border: 4px solid white;
  border-radius: 50%;
}

.category-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 0.5rem;
}

.name-section h1 {
  font-size: 2.25rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
  line-height: 1.1;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.meta-box {
  display: flex;
  flex-direction: column;
}

.meta-box label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

.meta-box span {
  font-size: 1rem;
  font-weight: 700;
  color: #334155;
  font-family: 'JetBrains Mono', monospace;
}

.meta-box span.pending { color: #f59e0b; }

.meta-divider {
  width: 1px;
  height: 30px;
  background: #e2e8f0;
}

.btn-action-premium {
  background: #0f172a;
  color: white;
  border: none;
  padding: 1.1rem 2rem;
  border-radius: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.btn-action-premium:hover {
  background: #0ea5e9;
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgba(14, 165, 233, 0.3);
}

/* --- DARK MODE SUPPORT --- */
:root.dark .header-card {
  background: #0f172a;
  border-color: #1e293b;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

:root.dark .name-section h1 { color: #f8fafc; }
:root.dark .meta-box span { color: #cbd5e1; }
:root.dark .status-indicator { border-color: #0f172a; }
:root.dark .meta-divider { background: #1e293b; }
:root.dark .btn-minimal { color: #94a3b8; }
:root.dark .btn-minimal:hover { color: #0ea5e9; }
:root.dark .btn-action-premium { background: #0ea5e9; }
:root.dark .btn-action-premium:hover { background: #0284c7; }

@media (max-width: 768px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 2rem;
  }
  .profile-main { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
  .header-actions { width: 100%; }
  .btn-action-premium { width: 100%; justify-content: center; }
}
</style>
