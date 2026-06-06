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

const openRegisterModal = () => {
  form.value = {
    nombre_completo: searchQuery.value,
    dpi: '',
    codigo_cliente: '',
    direccion: ''
  }
  showModal.value = true
}

const registerAsociado = async () => {
  if (!form.value.nombre_completo || !form.value.nombre_completo.trim()) {
    alert('El Nombre Completo es obligatorio.')
    return
  }
  if (!form.value.dpi || !form.value.dpi.trim()) {
    alert('El Documento DPI es obligatorio.')
    return
  }
  if (!form.value.codigo_cliente || !form.value.codigo_cliente.trim()) {
    alert('El Código Cliente es obligatorio.')
    return
  }

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
  <div class="search-page">
    <!-- Hero & Search Section -->
    <div class="hero-section" :class="{ 'hero-min': results.length > 0 || searchQuery.length >= 3 }">
      <div class="hero-content slide-down">
        <div class="badge-premium">Gestión de Expedientes</div>
        <h1>Directorio de <span class="text-highlight">Asociados</span></h1>
        <p>Busca por Nombre, DPI o Código para acceder al historial documental completo.</p>

        <div class="search-container">
          <div class="search-glass" :class="{ 'is-loading': isLoading }">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Ej. Juan Pérez o 2540..." 
              autofocus
              class="glass-input"
            >
            <div v-if="isLoading" class="loader-circle"></div>
          </div>

          <!-- Dropdown de Resultados -->
          <Transition name="fade-scale">
            <div v-if="results.length > 0" class="results-dropdown glass-panel">
              <div class="dropdown-header">Resultados Encontrados ({{ results.length }})</div>
              <div 
                v-for="(asoc, index) in results" 
                :key="asoc.id" 
                class="dropdown-item"
                :style="{ animationDelay: `${index * 0.05}s` }"
                @click="goToProfile(asoc.id)"
              >
                <div class="asoc-avatar">{{ asoc.nombre_completo.charAt(0) }}</div>
                <div class="asoc-details">
                  <span class="asoc-name">{{ asoc.nombre_completo }}</span>
                  <span class="asoc-meta">
                    <span class="meta-tag">DPI: {{ asoc.dpi }}</span>
                    <span class="meta-tag">COD: {{ asoc.codigo_cliente || 'N/A' }}</span>
                  </span>
                </div>
                <div class="asoc-arrow">→</div>
              </div>
            </div>
          </Transition>

          <!-- No Encontrado -->
          <Transition name="fade">
            <div v-if="searchQuery.length >= 3 && results.length === 0 && !isLoading" class="not-found-card">
              <div class="not-found-content">
                <div class="empty-anim">🔍</div>
                <h3>Sin coincidencias</h3>
                <p>No encontramos a este asociado en nuestra base de datos.</p>
                <button @click="openRegisterModal" class="btn-premium">
                  <span>+</span> Registrar Nuevo Asociado
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Modal Registro -->
    <Transition name="blur">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="glass-modal slide-up">
          <div class="modal-header">
            <div>
              <h2>Nuevo Registro</h2>
              <p>Completa el perfil básico para iniciar el expediente.</p>
            </div>
            <button @click="showModal = false" class="btn-close">×</button>
          </div>
          
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label>Nombre Completo <span style="color: #ef4444;">*</span></label>
                <div class="input-with-icon">
                  <i>👤</i>
                  <input v-model="form.nombre_completo" type="text" placeholder="Nombre completo del asociado" required>
                </div>
              </div>
              <div class="form-group">
                <label>Documento DPI <span style="color: #ef4444;">*</span></label>
                <div class="input-with-icon">
                  <i>🆔</i>
                  <input v-model="form.dpi" type="text" placeholder="13 dígitos" required>
                </div>
              </div>
              <div class="form-group">
                <label>Código Cliente <span style="color: #ef4444;">*</span></label>
                <div class="input-with-icon">
                  <i>🔢</i>
                  <input v-model="form.codigo_cliente" type="text" placeholder="Ej. 102565" required>
                </div>
              </div>
              <div class="form-group full">
                <label>Dirección Domiciliar</label>
                <div class="input-with-icon">
                  <i>📍</i>
                  <input v-model="form.direccion" type="text" placeholder="Dirección completa">
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="showModal = false" class="btn-ghost">Descartar</button>
            <button @click="registerAsociado" class="btn-submit" :disabled="!form.nombre_completo?.trim() || !form.dpi?.trim() || !form.codigo_cliente?.trim()">
              Generar Expediente
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
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
  overflow-y: auto;
  padding-bottom: 5rem;
}

/* Hero Section */
.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2rem;
  background: radial-gradient(circle at top right, #f1f5f9 0%, #ffffff 100%);
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
}

.hero-section.hero-min {
  flex: 0 0 25vh;
  min-height: 25vh;
  align-items: flex-start;
  padding-top: 4rem;
}

.hero-content {
  width: 100%;
  max-width: 800px;
  text-align: center;
}

.badge-premium {
  display: inline-block;
  background: #0ea5e9;
  color: white;
  padding: 0.5rem 1.25rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2);
}

.hero-content h1 {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 1rem;
}

.text-highlight {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-content p {
  color: #64748b;
  font-size: 1.2rem;
  margin-bottom: 3rem;
}

/* Search Bar Design */
.search-container {
  position: relative;
  max-width: 700px;
  margin: 0 auto;
}

.search-glass {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 25px 60px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.4s;
}

.search-glass:focus-within {
  transform: translateY(-5px);
  border-color: #0ea5e9;
  box-shadow: 0 35px 70px rgba(14, 165, 233, 0.12);
}

.search-icon { color: #94a3b8; width: 28px; }

.glass-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 1.4rem;
  font-weight: 600;
  color: #1e293b;
  outline: none;
}

.loader-circle {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #0ea5e9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Dropdown Results */
.results-dropdown {
  position: absolute;
  top: calc(100% + 1rem);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 40px 80px rgba(0,0,0,0.1);
  overflow: hidden;
  z-index: 50;
  text-align: left;
}

.dropdown-header {
  padding: 1.25rem 2rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  border-bottom: 1px solid #f8fafc;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 1.5rem 2rem;
  gap: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  animation: slideIn 0.4s ease-out both;
}

.dropdown-item:hover {
  background: #f0f9ff;
  padding-left: 2.5rem;
}

.asoc-avatar {
  width: 48px;
  height: 48px;
  background: #0ea5e9;
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.25rem;
}

.asoc-details { flex: 1; display: flex; flex-direction: column; }

.asoc-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.asoc-meta { display: flex; gap: 0.75rem; }

.meta-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}

.asoc-arrow {
  color: #cbd5e1;
  font-size: 1.5rem;
  transition: 0.3s;
}

.dropdown-item:hover .asoc-arrow {
  color: #0ea5e9;
  transform: translateX(5px);
}

/* Not Found Card */
.not-found-card {
  margin-top: 1.5rem;
}

.not-found-content {
  background: white;
  padding: 1.75rem 2rem;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 15px 35px rgba(0,0,0,0.04);
}

.empty-anim { font-size: 2.25rem; margin-bottom: 0.5rem; }
.not-found-content h3 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.25rem; }
.not-found-content p { color: #64748b; margin-bottom: 1.25rem; font-size: 0.95rem; }

.btn-premium {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.85rem 2rem;
  border-radius: 16px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 auto;
}

.btn-premium:hover {
  background: #0ea5e9;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2);
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.glass-modal {
  width: 95%;
  max-width: 650px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  padding: 3rem;
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 0 50px 100px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
}

.modal-header h2 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.4rem; }
.btn-close {
  background: #f1f5f9;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
}

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.form-group.full { grid-column: span 2; }
.form-group label { display: block; font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.6rem; }

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon i { position: absolute; left: 1.25rem; font-style: normal; font-size: 1.25rem; }
.input-with-icon input {
  width: 100%;
  padding: 1.1rem 1rem 1.1rem 3.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  font-size: 1.05rem;
  font-weight: 600;
  outline: none;
  transition: 0.3s;
}

.input-with-icon input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1); }

.modal-footer {
  margin-top: 3rem;
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
}

.btn-ghost { background: transparent; border: none; font-weight: 700; color: #64748b; cursor: pointer; }
.btn-submit {
  background: #0ea5e9;
  color: white;
  border: none;
  padding: 1.1rem 2.5rem;
  border-radius: 18px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: 0.3s;
}

.btn-submit:hover { background: #0284c7; transform: translateY(-2px); }

/* Transitions */
.fade-scale-enter-active { transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
.fade-scale-enter-from { opacity: 0; transform: scale(0.95) translateY(-20px); }

@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.slide-up { animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}
/* --- DARK MODE SUPPORT --- */
:root.dark .search-page {
  background-color: #020617;
  color: #f1f5f9;
}

:root.dark .hero-section {
  background: radial-gradient(circle at top right, #0f172a 0%, #020617 100%);
}

:root.dark .hero-content h1 { color: #f8fafc; }
:root.dark .hero-content p { color: #94a3b8; }

:root.dark .search-glass {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

:root.dark .glass-input { color: #f8fafc; }
:root.dark .search-icon { color: #64748b; }

:root.dark .results-dropdown {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

:root.dark .dropdown-header { color: #64748b; border-color: #1e293b; }
:root.dark .dropdown-item:hover { background: #1e293b; }
:root.dark .asoc-name { color: #f8fafc; }
:root.dark .meta-tag { background: #1e293b; color: #94a3b8; }

:root.dark .not-found-content {
  background: #0f172a;
  border-color: #1e293b;
}

:root.dark .not-found-content h3 { color: #f8fafc; }
:root.dark .btn-premium { background: #0ea5e9; }
:root.dark .btn-premium:hover { background: #0284c7; }

:root.dark .glass-modal {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

:root.dark .modal-header h2 { color: #f8fafc; }
:root.dark .modal-header p { color: #94a3b8; }
:root.dark .btn-close { background: #1e293b; color: #94a3b8; }

:root.dark .input-with-icon input {
  background: #020617;
  border-color: #1e293b;
  color: #f8fafc;
}

:root.dark .input-with-icon input:focus { border-color: #0ea5e9; }
:root.dark .btn-ghost { color: #94a3b8; }
</style>
