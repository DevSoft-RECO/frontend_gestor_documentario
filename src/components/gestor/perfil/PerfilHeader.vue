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
  <div class="profile-header glass-card">
    <button @click="emit('back')" class="btn-back">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Volver al Buscador
    </button>

    <div class="header-main">
      <div class="avatar-large">
        {{ props.asociado.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}
      </div>
      <div class="main-info">
        <h1>{{ props.asociado.nombre_completo }}</h1>
        <div class="badges">
          <span class="badge-blue">DPI: {{ props.asociado.dpi }}</span>
          <span class="badge-green">Código: {{ props.asociado.codigo_cliente || 'PENDIENTE' }}</span>
        </div>
      </div>
      <div class="actions-area">
        <button @click="emit('addDocument')" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Añadir Documento
        </button>
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

.profile-header { padding: 2.5rem; margin-bottom: 2rem; }

.btn-back { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; margin-bottom: 2rem; transition: 0.2s; }
.btn-back:hover { color: #0ea5e9; transform: translateX(-5px); }
.btn-back svg { width: 18px; }

.header-main { display: flex; align-items: center; gap: 2rem; }
.avatar-large { width: 90px; height: 90px; border-radius: 24px; background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; font-size: 2.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2); }
.main-info { flex: 1; }
.main-info h1 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0 0 0.75rem 0; }

.badges { display: flex; gap: 0.75rem; }
.badge-blue, .badge-green { padding: 0.4rem 1rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 700; }
.badge-blue { background: #e0f2fe; color: #0369a1; }
.badge-green { background: #dcfce7; color: #166534; }

.actions-area { text-align: right; }
.btn-primary { background: #0ea5e9; color: white; border: none; padding: 0.85rem 1.75rem; border-radius: 9999px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.75rem; transition: 0.2s; }
.btn-primary:hover { background: #0284c7; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(14,165,233,0.2); }
.btn-primary svg { width: 20px; }
</style>
