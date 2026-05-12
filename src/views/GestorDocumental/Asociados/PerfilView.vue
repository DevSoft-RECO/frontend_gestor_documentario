<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface Asociado {
  id: number
  codigo_cliente: string
  dpi: string
  nombre_completo: string
  direccion: string
  fecha_registro: string
}

const route = useRoute()
const router = useRouter()
const asociado = ref<Asociado | null>(null)
const isLoading = ref(true)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const fetchAsociado = async () => {
  try {
    const res = await fetch(`${API_URL}/api/gestor/asociados/${route.params.id}`)
    if (res.ok) {
      asociado.value = await res.json()
    } else {
      router.push('/admin/gestor/buscador')
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

onMounted(fetchAsociado)
</script>

<template>
  <div class="perfil-container">
    <div v-if="isLoading" class="loader-container">
      <div class="loader"></div>
      <p>Cargando expediente...</p>
    </div>

    <template v-else-if="asociado">
      <!-- Encabezado Perfil -->
      <div class="profile-header glass-card">
        <button @click="router.push('/admin/gestor/buscador')" class="btn-back">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver al Buscador
        </button>

        <div class="header-main">
          <div class="avatar-large">
            {{ asociado.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}
          </div>
          <div class="main-info">
            <h1>{{ asociado.nombre_completo }}</h1>
            <div class="badges">
              <span class="badge-blue">DPI: {{ asociado.dpi }}</span>
              <span class="badge-green">Código: {{ asociado.codigo_cliente || 'PENDIENTE' }}</span>
            </div>
          </div>
          <div class="reg-date">
            <span class="label">Expediente abierto el</span>
            <span class="date">{{ formatDate(asociado.fecha_registro) }}</span>
          </div>
        </div>
      </div>

      <!-- Contenido (Módulos Futuros) -->
      <div class="profile-content">
        <div class="glass-card module-placeholder">
          <div class="placeholder-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3>Próximo Módulo: Gestión de Documentos</h3>
          <p>En el Módulo 3, aquí podrás cargar, visualizar y reemplazar las hojas del expediente de {{ asociado.nombre_completo.split(' ')[0] }}.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.perfil-container { padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.profile-header { padding: 2.5rem; margin-bottom: 2rem; }

.btn-back {
  display: flex; align-items: center; gap: 0.5rem;
  background: none; border: none; color: #64748b;
  font-weight: 600; cursor: pointer; margin-bottom: 2rem;
  transition: 0.2s;
}
.btn-back:hover { color: #0ea5e9; transform: translateX(-5px); }
.btn-back svg { width: 18px; }

.header-main { display: flex; align-items: center; gap: 2rem; }

.avatar-large {
  width: 90px; height: 90px; border-radius: 24px;
  background: linear-gradient(135deg, #0ea5e9, #3b82f6);
  color: white; font-size: 2rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2);
}

.main-info { flex: 1; }
.main-info h1 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0 0 0.75rem 0; }

.badges { display: flex; gap: 0.75rem; }
.badge-blue, .badge-green {
  padding: 0.4rem 1rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 700;
}
.badge-blue { background: #e0f2fe; color: #0369a1; }
.badge-green { background: #dcfce7; color: #166534; }

.reg-date { text-align: right; }
.reg-date .label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.25rem; }
.reg-date .date { font-weight: 700; color: #475569; }

.profile-content { display: grid; gap: 2rem; }

.module-placeholder {
  padding: 5rem 2rem; text-align: center;
  border: 2px dashed #e2e8f0; background: rgba(248, 250, 252, 0.5);
}

.placeholder-icon { width: 70px; height: 70px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #cbd5e1; }
.placeholder-icon svg { width: 35px; }

.module-placeholder h3 { font-size: 1.4rem; color: #334155; margin-bottom: 1rem; }
.module-placeholder p { color: #94a3b8; max-width: 450px; margin: 0 auto; line-height: 1.6; }

.loader-container { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: #64748b; }
.loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0ea5e9; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
