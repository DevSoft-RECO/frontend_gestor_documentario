<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Puesto {
  id: number
  nombre: string
}

interface Subcategoria {
  id: number
  categoria_id: number
  nombre: string
  estado: boolean
  puestos_autorizados?: Puesto[]
}

interface Categoria {
  id: number
  nombre: string
  estado: boolean
  subcategorias: Subcategoria[]
}

const categorias = ref<Categoria[]>([])
const puestos = ref<Puesto[]>([])
const selectedCategoria = ref<Categoria | null>(null)
const isLoading = ref(false)
const isSyncing = ref(false)
const searchQuery = ref('')

const showModalCategoria = ref(false)
const showModalSubcategoria = ref(false)
const editingCategoria = ref<Categoria | null>(null)
const editingSubcategoria = ref<Subcategoria | null>(null)

const formCategoria = ref({ nombre: '', estado: true })
const formSubcategoria = ref({ 
  nombre: '', 
  estado: true,
  puestos_ids: [] as number[] 
})

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const fetchCategorias = async () => {
  isLoading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/categorias`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    categorias.value = await res.json()
    if (selectedCategoria.value) {
      selectedCategoria.value = categorias.value.find(c => c.id === selectedCategoria.value?.id) || null
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const fetchPuestos = async () => {
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/puestos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    puestos.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

const syncPuestos = async () => {
  isSyncing.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/puestos/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (res.ok) {
      await fetchPuestos()
      alert(`Sincronización exitosa: ${data.puestos_procesados} puestos procesados.`)
    }
  } catch (e) {
    console.error(e)
  } finally {
    isSyncing.value = false
  }
}

const filteredCategorias = computed(() => {
  return categorias.value.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const saveCategoria = async () => {
  const method = editingCategoria.value ? 'PUT' : 'POST'
  const url = editingCategoria.value 
    ? `${API_URL}/api/gestor/categorias/${editingCategoria.value.id}` 
    : `${API_URL}/api/gestor/categorias`

  try {
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formCategoria.value)
    })
    showModalCategoria.value = false
    fetchCategorias()
  } catch (e) {
    console.error(e)
  }
}

const saveSubcategoria = async () => {
  if (!selectedCategoria.value) return

  const method = editingSubcategoria.value ? 'PUT' : 'POST'
  const url = editingSubcategoria.value 
    ? `${API_URL}/api/gestor/subcategorias/${editingSubcategoria.value.id}` 
    : `${API_URL}/api/gestor/subcategorias`

  // Mapeamos los IDs seleccionados a objetos Puesto para GORM
  const puestosSeleccionados = formSubcategoria.value.puestos_ids.map(id => ({ id }))

  const body = {
    nombre: formSubcategoria.value.nombre,
    estado: formSubcategoria.value.estado,
    puestos_autorizados: puestosSeleccionados,
    categoria_id: selectedCategoria.value.id
  }

  try {
    const token = sessionStorage.getItem('access_token')
    await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })
    showModalSubcategoria.value = false
    fetchCategorias()
  } catch (e) {
    console.error(e)
  }
}

const toggleEstadoCategoria = async (cat: Categoria) => {
  try {
    await fetch(`${API_URL}/api/gestor/categorias/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cat, estado: !cat.estado })
    })
    fetchCategorias()
  } catch (e) {
    console.error(e)
  }
}

const toggleEstadoSubcategoria = async (sub: Subcategoria) => {
  try {
    await fetch(`${API_URL}/api/gestor/subcategorias/${sub.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sub, estado: !sub.estado })
    })
    fetchCategorias()
  } catch (e) {
    console.error(e)
  }
}

const openModalCategoria = (cat: Categoria | null = null) => {
  editingCategoria.value = cat
  formCategoria.value = cat ? { nombre: cat.nombre, estado: cat.estado } : { nombre: '', estado: true }
  showModalCategoria.value = true
}

const openModalSubcategoria = (sub: Subcategoria | null = null) => {
  editingSubcategoria.value = sub
  if (sub) {
    formSubcategoria.value = { 
      nombre: sub.nombre, 
      estado: sub.estado,
      puestos_ids: sub.puestos_autorizados?.map(p => p.id) || []
    }
  } else {
    formSubcategoria.value = { 
      nombre: '', 
      estado: true,
      puestos_ids: []
    }
  }
  showModalSubcategoria.value = true
}

onMounted(() => {
  fetchCategorias()
  fetchPuestos()
})
</script>

<template>
  <div class="categorias-container">
    <div class="header-section">
      <div class="header-title">
        <h1>Categorías y Subcategorías</h1>
        <p>Configura las familias de documentos y sus clasificaciones.</p>
      </div>
      <button @click="syncPuestos" :disabled="isSyncing" class="btn-sync">
        <svg v-if="!isSyncing" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        <span v-else class="spinner"></span>
        {{ isSyncing ? 'Sincronizando...' : 'Sincronizar Puestos' }}
      </button>
    </div>

    <div class="main-grid">
      <!-- PANEL IZQUIERDO: CATEGORIAS -->
      <div class="glass-card panel-categorias">
        <div class="panel-header">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input v-model="searchQuery" type="text" placeholder="Buscar categoría...">
          </div>
          <button @click="openModalCategoria()" class="btn-add">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div class="list-container">
          <div v-if="isLoading" class="loader">Cargando...</div>
          <div 
            v-for="cat in filteredCategorias" 
            :key="cat.id" 
            :class="['list-item', { active: selectedCategoria?.id === cat.id, inactive: !cat.estado }]"
            @click="selectedCategoria = cat"
          >
            <div class="item-info">
              <span class="item-name">{{ cat.nombre }}</span>
              <span class="item-count">{{ cat.subcategorias?.length || 0 }} subcategorías</span>
            </div>
            <div class="item-actions">
              <button @click.stop="openModalCategoria(cat)" class="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button @click.stop="toggleEstadoCategoria(cat)" :class="['btn-status', { active: cat.estado }]">
                {{ cat.estado ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DERECHO: SUBCATEGORIAS -->
      <div class="glass-card panel-subcategorias">
        <template v-if="selectedCategoria">
          <div class="panel-header">
            <h3>Subcategorías de: <span>{{ selectedCategoria.nombre }}</span></h3>
            <button @click="openModalSubcategoria()" class="btn-add">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Nueva Subcategoría
            </button>
          </div>

          <div class="list-container">
            <div v-if="!selectedCategoria.subcategorias?.length" class="empty-state">
              <p>No hay subcategorías en esta familia.</p>
            </div>
            <div 
              v-for="sub in selectedCategoria.subcategorias" 
              :key="sub.id" 
              :class="['list-item', { inactive: !sub.estado }]"
            >
              <div class="item-info">
                <span class="item-name">{{ sub.nombre }}</span>
                <span class="status-dot" :class="{ active: sub.estado }"></span>
              </div>
              <div class="item-actions">
                <button @click="openModalSubcategoria(sub)" class="btn-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button @click="toggleEstadoSubcategoria(sub)" :class="['btn-status', { active: sub.estado }]">
                  {{ sub.estado ? 'Activo' : 'Inactivo' }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p>Selecciona una categoría para gestionar sus subcategorías.</p>
        </div>
      </div>
    </div>

    <!-- MODAL CATEGORIA -->
    <div v-if="showModalCategoria" class="modal-overlay">
      <div class="glass-card modal-content">
        <h3>{{ editingCategoria ? 'Editar' : 'Nueva' }} Categoría</h3>
        <div class="form-group">
          <label>Nombre de Categoría</label>
          <input v-model="formCategoria.nombre" type="text" placeholder="Ej. Datos Personales">
        </div>
        <div class="modal-actions">
          <button @click="showModalCategoria = false" class="btn-cancel">Cancelar</button>
          <button @click="saveCategoria" class="btn-save">Guardar</button>
        </div>
      </div>
    </div>

    <!-- MODAL SUBCATEGORIA -->
    <div v-if="showModalSubcategoria" class="modal-overlay">
      <div class="glass-card modal-content">
        <h3>{{ editingSubcategoria ? 'Editar' : 'Nueva' }} Subcategoría</h3>
        <div class="form-group">
          <label>Nombre de Subcategoría</label>
          <input v-model="formSubcategoria.nombre" type="text" placeholder="Ej. DPI">
        </div>
        <div class="form-group">
          <label>Puestos con acceso a crear carpeta</label>
          <div class="puestos-selector">
            <div v-for="puesto in puestos" :key="puesto.id" class="puesto-option">
              <input 
                type="checkbox" 
                :id="'puesto-' + puesto.id" 
                :value="puesto.id" 
                v-model="formSubcategoria.puestos_ids"
              >
              <label :for="'puesto-' + puesto.id">{{ puesto.nombre }}</label>
            </div>
          </div>
          <p class="helper-text">Si no seleccionas ninguno, todos tendrán acceso (por defecto).</p>
        </div>
        <div class="modal-actions">
          <button @click="showModalSubcategoria = false" class="btn-cancel">Cancelar</button>
          <button @click="saveSubcategoria" class="btn-save">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.categorias-container {
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
  font-family: 'Inter', sans-serif;
}

.header-section {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-section h1 {
  font-size: 1.8rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.header-section p {
  color: #64748b;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.search-bar svg { width: 18px; color: #94a3b8; margin-right: 0.5rem; }
.search-bar input { border: none; background: transparent; width: 100%; outline: none; color: #1e293b; }

.btn-add {
  background: #0ea5e9;
  color: white;
  border: none;
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: 0.2s;
}

.btn-add svg { width: 20px; }
.btn-add:hover { background: #0284c7; }

.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.list-item {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: white;
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: 0.2s;
}

.list-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.list-item.active { border-color: #0ea5e9; background: #f0f9ff; }
.list-item.inactive { opacity: 0.6; grayscale: 0.5; }

.item-info { display: flex; flex-direction: column; gap: 0.25rem; }
.item-name { font-weight: 600; color: #1e293b; }
.item-count { font-size: 0.8rem; color: #64748b; }

.item-actions { display: flex; align-items: center; gap: 0.75rem; }

.btn-icon { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 0.25rem; }
.btn-icon svg { width: 18px; }
.btn-icon:hover { color: #0ea5e9; }

.btn-status {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
}

.btn-status.active { background: #dcfce7; color: #166534; }
.btn-status:not(.active) { background: #fee2e2; color: #991b1b; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
.status-dot.active { background: #10b981; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  gap: 1rem;
}

.empty-state svg { width: 48px; }

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.form-group { margin: 1.5rem 0; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #475569; }
.form-group input { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; }

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
.btn-cancel { background: #f1f5f9; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
.btn-save { background: #0ea5e9; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }

/* NUEVOS ESTILOS */
.btn-sync {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s;
}
.btn-sync:hover { background: #334155; transform: translateY(-2px); }
.btn-sync:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sync svg { width: 18px; }

.puestos-selector {
  max-height: 200px;
  overflow-y: auto;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem;
}
.puesto-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.puesto-option:last-child { border-bottom: none; }
.puesto-option label { margin-bottom: 0; font-size: 0.9rem; cursor: pointer; color: #1e293b; }
.puesto-option input { width: auto; cursor: pointer; }

.helper-text { font-size: 0.75rem; color: #64748b; margin-top: 0.5rem; }

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-content {
  width: 100%;
  max-width: 500px; /* Un poco más ancho para el selector */
  padding: 2rem;
}
</style>
