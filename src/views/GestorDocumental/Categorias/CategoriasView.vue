<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Puesto {
  id: number
  nombre: string
}

interface SubcategoriaPuesto {
  subcategoria_id: number
  puesto_id: number
  ver: boolean
  editar: boolean
  puesto?: Puesto
}

interface Subcategoria {
  id: number
  categoria_id: number
  nombre: string
  estado: boolean
  puestos_autorizados?: SubcategoriaPuesto[]
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
  estado: true
})

const puestosPermissions = ref<Record<number, { ver: boolean, editar: boolean }>>({})

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
    const token = sessionStorage.getItem('access_token')
    await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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

  // Mapeamos los permisos de puestos activos
  const puestosSeleccionados = Object.entries(puestosPermissions.value)
    .filter(([_, perm]) => perm.ver || perm.editar)
    .map(([puestoId, perm]) => ({
      puesto_id: Number(puestoId),
      ver: perm.ver,
      editar: perm.editar
    }))

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
    const token = sessionStorage.getItem('access_token')
    await fetch(`${API_URL}/api/gestor/categorias/${cat.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...cat, estado: !cat.estado })
    })
    fetchCategorias()
  } catch (e) {
    console.error(e)
  }
}

const toggleEstadoSubcategoria = async (sub: Subcategoria) => {
  try {
    const token = sessionStorage.getItem('access_token')
    await fetch(`${API_URL}/api/gestor/subcategorias/${sub.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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

const searchPuestoQuery = ref('')

const filteredPuestos = computed(() => {
  const query = searchPuestoQuery.value.trim().toLowerCase()
  if (!query) return puestos.value
  return puestos.value.filter(p => p.nombre.toLowerCase().includes(query))
})

const toggleEditar = (puestoId: number) => {
  const perm = puestosPermissions.value[puestoId]
  if (perm && perm.editar) {
    perm.ver = true
  }
}

const selectAllPuestos = () => {
  filteredPuestos.value.forEach(p => {
    puestosPermissions.value[p.id] = { ver: true, editar: true }
  })
}

const deselectAllPuestos = () => {
  filteredPuestos.value.forEach(p => {
    puestosPermissions.value[p.id] = { ver: false, editar: false }
  })
}

const openModalSubcategoria = (sub: Subcategoria | null = null) => {
  searchPuestoQuery.value = ''
  editingSubcategoria.value = sub

  // Inicializar todos los puestos en falso
  puestos.value.forEach(p => {
    puestosPermissions.value[p.id] = { ver: false, editar: false }
  })

  if (sub) {
    formSubcategoria.value = { 
      nombre: sub.nombre, 
      estado: sub.estado
    }
    // Cargar permisos existentes
    if (sub.puestos_autorizados) {
      sub.puestos_autorizados.forEach(pa => {
        puestosPermissions.value[pa.puesto_id] = {
          ver: pa.ver,
          editar: pa.editar
        }
      })
    }
  } else {
    formSubcategoria.value = { 
      nombre: '', 
      estado: true
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
  <div class="p-8 min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 font-sans transition-colors duration-300">
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">Categorías y Subcategorías</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Configura las familias de documentos y sus clasificaciones.</p>
      </div>
      <button @click="syncPuestos" :disabled="isSyncing" class="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center gap-3 font-semibold transition duration-200 hover:bg-slate-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shadow-md">
        <svg v-if="!isSyncing" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-[18px] h-[18px]"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        <span v-else class="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        {{ isSyncing ? 'Sincronizando...' : 'Sincronizar Puestos' }}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 h-[calc(100vh-200px)]">
      <!-- PANEL IZQUIERDO: CATEGORIAS -->
      <div class="bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg shadow-slate-200/50 flex flex-col dark:bg-slate-900/80 dark:border-slate-800/80 dark:shadow-slate-950/20 overflow-hidden">
        <div class="p-6 border-b border-black/5 dark:border-slate-800/50 flex justify-between items-center gap-4">
          <div class="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 dark:bg-slate-800/50 dark:border-slate-700/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-[18px] h-[18px] text-slate-400 mr-2"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input v-model="searchQuery" type="text" placeholder="Buscar categoría..." class="border-none bg-transparent w-full outline-none text-slate-800 dark:text-slate-200 dark:placeholder-slate-500">
          </div>
          <button @click="openModalCategoria()" class="bg-sky-500 text-white p-2.5 rounded-lg cursor-pointer transition duration-200 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div v-if="isLoading" class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Cargando...</div>
          <div 
            v-for="cat in filteredCategorias" 
            :key="cat.id" 
            :class="[
              'p-4 mb-3 rounded-xl bg-white border border-transparent cursor-pointer flex justify-between items-center transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800/60 dark:hover:border-slate-700', 
              { 
                'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 dark:border-sky-500': selectedCategoria?.id === cat.id, 
                'opacity-50': !cat.estado 
              }
            ]"
            @click="selectedCategoria = cat"
          >
            <div class="flex flex-col gap-1">
              <span class="font-semibold text-slate-800 dark:text-slate-200">{{ cat.nombre }}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ cat.subcategorias?.length || 0 }} subcategorías</span>
            </div>
            <div class="flex items-center gap-3">
              <button @click.stop="openModalCategoria(cat)" class="bg-transparent border-0 text-slate-500 cursor-pointer p-1 transition duration-200 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-[18px] h-[18px]"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button @click.stop="toggleEstadoCategoria(cat)" 
                      :class="[
                        'px-2.5 py-1 rounded-md text-[0.7rem] font-black border-0 cursor-pointer transition-colors',
                        cat.estado 
                          ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-400'
                      ]">
                {{ cat.estado ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DERECHO: SUBCATEGORIAS -->
      <div class="bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg shadow-slate-200/50 flex flex-col dark:bg-slate-900/80 dark:border-slate-800/80 dark:shadow-slate-950/20 overflow-hidden">
        <template v-if="selectedCategoria">
          <div class="p-6 border-b border-black/5 dark:border-slate-800/50 flex justify-between items-center gap-4">
            <h3 class="font-extrabold text-slate-800 dark:text-slate-100">Subcategorías de: <span class="text-sky-500 font-black">{{ selectedCategoria.nombre }}</span></h3>
            <button @click="openModalSubcategoria()" class="bg-sky-500 text-white px-4 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 font-semibold transition duration-200 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Nueva Subcategoría
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div v-if="!selectedCategoria.subcategorias?.length" class="flex flex-col items-center justify-center h-full text-slate-400 gap-4 dark:text-slate-500 py-16">
              <p>No hay subcategorías en esta familia.</p>
            </div>
            <div 
              v-for="sub in selectedCategoria.subcategorias" 
              :key="sub.id" 
              :class="['p-4 mb-3 rounded-xl bg-white border border-transparent flex justify-between items-center transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800/60 dark:hover:border-slate-700', { 'opacity-50': !sub.estado }]"
            >
              <div class="flex items-center gap-3">
                <span class="font-semibold text-slate-800 dark:text-slate-200">{{ sub.nombre }}</span>
                <span class="w-2 h-2 rounded-full" :class="sub.estado ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              </div>
              <div class="flex items-center gap-3">
                <button @click="openModalSubcategoria(sub)" class="bg-transparent border-0 text-slate-500 cursor-pointer p-1 transition duration-200 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-[18px] h-[18px]"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button @click="toggleEstadoSubcategoria(sub)" 
                        :class="[
                          'px-2.5 py-1 rounded-md text-[0.7rem] font-black border-0 cursor-pointer transition-colors',
                          sub.estado 
                            ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : 'bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-400'
                        ]">
                  {{ sub.estado ? 'Activo' : 'Inactivo' }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="flex flex-col items-center justify-center h-full text-slate-400 gap-4 dark:text-slate-500 p-8">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-12 h-12 text-slate-350 dark:text-slate-600"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p class="text-sm font-semibold">Selecciona una categoría para gestionar sus subcategorías.</p>
        </div>
      </div>
    </div>

    <!-- MODAL CATEGORIA -->
    <div v-if="showModalCategoria" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-[420px]">
        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">{{ editingCategoria ? 'Editar' : 'Nueva' }} Categoría</h3>
        <div class="my-6">
          <label class="block mb-2 font-semibold text-slate-600 dark:text-slate-300 text-sm">Nombre de Categoría</label>
          <input v-model="formCategoria.nombre" type="text" placeholder="Ej. Datos Personales" class="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 transition-all">
        </div>
        <div class="flex justify-end gap-4">
          <button @click="showModalCategoria = false" class="bg-slate-100 border-0 px-6 py-3 rounded-lg cursor-pointer font-semibold text-slate-750 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 transition duration-200">Cancelar</button>
          <button @click="saveCategoria" class="bg-sky-500 border-0 px-6 py-3 rounded-lg cursor-pointer font-semibold text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 transition duration-200">Guardar</button>
        </div>
      </div>
    </div>

    <!-- MODAL SUBCATEGORIA -->
    <div v-if="showModalSubcategoria" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-[500px]">
        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">{{ editingSubcategoria ? 'Editar' : 'Nueva' }} Subcategoría</h3>
        <div class="my-6">
          <label class="block mb-2 font-semibold text-slate-600 dark:text-slate-300 text-sm">Nombre de Subcategoría</label>
          <input v-model="formSubcategoria.nombre" type="text" placeholder="Ej. DPI" class="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 transition-all">
        </div>
        <div class="my-6">
          <label class="block mb-2 font-semibold text-slate-600 dark:text-slate-300 text-sm">Puestos con acceso a crear carpeta</label>
          
          <div class="flex flex-col gap-2 mb-3">
            <input 
              v-model="searchPuestoQuery" 
              type="text" 
              placeholder="🔍 Buscar puesto por nombre..." 
              class="w-full px-3 py-2 rounded-md border border-slate-350 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 transition-all"
            />
            <div class="flex gap-2 justify-end">
              <button type="button" @click="selectAllPuestos" class="bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 transition duration-200">Seleccionar todos</button>
              <button type="button" @click="deselectAllPuestos" class="bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 transition duration-200">Limpiar todos</button>
            </div>
          </div>

          <div class="grid grid-cols-[2.2fr_1fr_1fr] items-center p-2 font-extrabold text-[0.72rem] uppercase text-slate-500 border-b-2 border-slate-200 dark:text-slate-400 dark:border-slate-700">
            <span class="text-left">Puesto</span>
            <span class="text-center">👁️ Ver</span>
            <span class="text-center">✏️ Editar</span>
          </div>

          <div class="max-h-[200px] overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 custom-scrollbar dark:bg-slate-800/50 dark:border-slate-700">
            <div v-for="puesto in filteredPuestos" :key="puesto.id" class="grid grid-cols-[2.2fr_1fr_1fr] items-center p-2 border-b border-slate-100 last:border-0 dark:border-slate-800">
              <span class="text-xs text-slate-750 dark:text-slate-300 text-left">{{ puesto.nombre }}</span>
              <span class="flex justify-center">
                <input 
                  type="checkbox" 
                  :id="'puesto-ver-' + puesto.id" 
                  v-model="puestosPermissions[puesto.id].ver"
                  class="w-4 h-4 cursor-pointer accent-sky-500"
                >
              </span>
              <span class="flex justify-center">
                <input 
                  type="checkbox" 
                  :id="'puesto-editar-' + puesto.id" 
                  v-model="puestosPermissions[puesto.id].editar"
                  @change="toggleEditar(puesto.id)"
                  class="w-4 h-4 cursor-pointer accent-sky-500"
                >
              </span>
            </div>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-450 mt-2">Si no autorizas ningún permiso (ambos vacíos), el puesto no tendrá acceso a este folder.</p>
        </div>
        <div class="flex justify-end gap-4">
          <button @click="showModalSubcategoria = false" class="bg-slate-100 border-0 px-6 py-3 rounded-lg cursor-pointer font-semibold text-slate-750 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 transition duration-200">Cancelar</button>
          <button @click="saveSubcategoria" class="bg-sky-500 border-0 px-6 py-3 rounded-lg cursor-pointer font-semibold text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 transition duration-200">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>
