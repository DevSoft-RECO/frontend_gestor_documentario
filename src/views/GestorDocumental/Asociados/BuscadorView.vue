<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

interface Asociado {
  id: number
  codigo_cliente: string
  dpi: string
  nombre_completo: string
}

const router = useRouter()
const searchQuery = ref('')
const results = ref<Asociado[]>([])
const isLoading = ref(false)
const showModal = ref(false)

const form = ref({
  nombre_completo: '',
  dpi: '',
  codigo_cliente: '',
  direccion: ''
})

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Live search logic
watch(searchQuery, async (newVal) => {
  if (newVal.length < 3) {
    results.value = []
    return
  }

  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/asociados/search?q=${newVal}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    results.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

const goToProfile = (id: number) => {
  router.push(`/admin/gestor/asociados/${id}`)
}

const registerAsociado = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/asociados`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    })
    const data = await res.json()
    if (res.ok) {
      goToProfile(data.id)
    } else {
      alert(`Error: ${data.error}`)
    }
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <div class="search-container">
    <div class="search-box">
      <div class="logo-section">
        <svg xmlns="http://www.w3.org/2000/svg" class="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h1>Buscador de Asociados</h1>
        <p>Busca por Nombre, DPI o Código de Cliente</p>
      </div>

      <div class="input-wrapper" :class="{ 'has-results': results.length > 0 }">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Escribe para buscar..." 
          autofocus
        >
        <div v-if="isLoading" class="loader-inline"></div>
      </div>

      <!-- Resultados -->
      <Transition name="slide-up">
        <div v-if="results.length > 0" class="results-list glass-card">
          <div 
            v-for="asoc in results" 
            :key="asoc.id" 
            class="result-item"
            @click="goToProfile(asoc.id)"
          >
            <div class="asoc-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div class="asoc-info">
              <span class="asoc-name">{{ asoc.nombre_completo }}</span>
              <span class="asoc-meta">DPI: {{ asoc.dpi }} | Código: {{ asoc.codigo_cliente || 'N/A' }}</span>
            </div>
            <svg class="chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
      </Transition>

      <!-- No encontrado -->
      <div v-if="searchQuery.length >= 3 && results.length === 0 && !isLoading" class="not-found">
        <p>No encontramos ningún asociado con esa información.</p>
        <button @click="showModal = true" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Registrar como Nuevo
        </button>
      </div>
    </div>

    <!-- Modal Registro -->
    <div v-if="showModal" class="modal-overlay">
      <div class="glass-card modal-content slide-up">
        <h2>Registro Rápido de Asociado</h2>
        <p>Ingresa los datos básicos para crear el expediente.</p>
        
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input v-model="form.nombre_completo" type="text" placeholder="Ej. Pedro Picapiedra">
          </div>
          <div class="form-group">
            <label>DPI (CUI)</label>
            <input v-model="form.dpi" type="text" placeholder="13 dígitos">
          </div>
          <div class="form-group">
            <label>Código de Cliente (Opcional)</label>
            <input v-model="form.codigo_cliente" type="text" placeholder="Ej. 10025-1">
          </div>
          <div class="form-group full">
            <label>Dirección</label>
            <input v-model="form.direccion" type="text" placeholder="Dirección completa">
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showModal = false" class="btn-secondary">Cancelar</button>
          <button @click="registerAsociado" class="btn-primary">Crear Perfil y Continuar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding-top: 10vh;
  background: radial-gradient(circle at top right, #f0f9ff, #e2e8f0);
  font-family: 'Inter', sans-serif;
}

.search-box {
  width: 100%;
  max-width: 700px;
  padding: 0 2rem;
  text-align: center;
}

.logo-section {
  margin-bottom: 3rem;
}

.logo-icon {
  width: 60px;
  height: 60px;
  color: #0ea5e9;
  margin-bottom: 1rem;
}

.logo-section h1 { font-size: 2.2rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; }
.logo-section p { color: #64748b; font-size: 1.1rem; }

.input-wrapper {
  position: relative;
  background: white;
  border-radius: 9999px;
  padding: 0.5rem 1.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  transition: 0.3s;
}

.input-wrapper:focus-within {
  box-shadow: 0 15px 35px rgba(14, 165, 233, 0.1);
  border-color: #0ea5e9;
  transform: translateY(-2px);
}

.input-wrapper.has-results {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.input-wrapper input {
  width: 100%;
  padding: 1rem;
  font-size: 1.25rem;
  border: none;
  outline: none;
  background: transparent;
  color: #1e293b;
}

.loader-inline {
  width: 24px; height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #0ea5e9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 1rem;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.results-list {
  background: white;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  margin-top: -1px;
  border: 1px solid #e2e8f0;
  border-top: 1px solid #f1f5f9;
  text-align: left;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.result-item {
  display: flex;
  align-items: center;
  padding: 1.25rem 2rem;
  cursor: pointer;
  transition: 0.2s;
  border-bottom: 1px solid #f8fafc;
}

.result-item:last-child { border-bottom: none; }
.result-item:hover { background: #f0f9ff; padding-left: 2.5rem; }

.asoc-icon { width: 40px; height: 40px; background: #e0f2fe; color: #0369a1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1.25rem; }
.asoc-icon svg { width: 24px; }

.asoc-info { flex: 1; display: flex; flex-direction: column; }
.asoc-name { font-weight: 700; color: #1e293b; font-size: 1.1rem; }
.asoc-meta { font-size: 0.85rem; color: #64748b; margin-top: 0.25rem; }

.chevron { width: 20px; color: #cbd5e1; }
.result-item:hover .chevron { color: #0ea5e9; transform: translateX(5px); }

.not-found { margin-top: 3rem; animation: fadeIn 0.5s ease; }
.not-found p { color: #64748b; margin-bottom: 1.5rem; }

.btn-primary {
  background: #0ea5e9;
  color: white;
  border: none;
  padding: 0.85rem 1.75rem;
  border-radius: 9999px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  transition: 0.2s;
}

.btn-primary:hover { background: #0284c7; transform: scale(1.05); }
.btn-primary svg { width: 20px; }

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 90%;
  max-width: 600px;
  padding: 3rem;
  background: rgba(255,255,255,0.95);
}

.modal-content h2 { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; }
.modal-content p { color: #64748b; margin-bottom: 2rem; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; text-align: left; }
.form-group.full { grid-column: span 2; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; }
.form-group input { width: 100%; padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 1rem; }

.modal-actions { margin-top: 2.5rem; display: flex; justify-content: flex-end; gap: 1rem; }
.btn-secondary { background: #f1f5f9; color: #475569; border: none; padding: 0.85rem 1.5rem; border-radius: 9999px; font-weight: 600; cursor: pointer; }

.slide-up-enter-active { transition: all 0.4s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(30px); }
</style>
