<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans'] text-slate-800 dark:text-slate-100 relative overflow-hidden w-full">
    
    <!-- Background Gradients -->
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-indigo-500/10 via-sky-500/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>

    <div class="w-full space-y-6 z-10 relative">

      <!-- ENCABEZADO -->
      <div class="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Formatos Institucionales Oficiales
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight font-['Outfit'] text-slate-900 dark:text-white">
            Formatos Institucionales Vigentes
          </h1>
          <p class="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-4xl">
            Repositorio centralizado de formularios, solicitudes, contratos y plantillas oficiales vigentes de la cooperativa. Descarga autorizada según tu puesto de trabajo.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Versiones oficiales vigentes</span>
          </div>
        </div>
      </div>

      <!-- FILTROS Y BÚSQUEDA -->
      <div class="p-5 md:p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        
        <!-- Búsqueda texto -->
        <div class="relative w-full sm:w-96">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Buscar por código (ej: FOR-CRE) o título..."
            class="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100"
          />
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Selector de Área -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Área:</span>
          <select
            v-model="selectedAreaId"
            class="p-2.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none cursor-pointer text-slate-800 dark:text-slate-100"
          >
            <option value="all">Todas las Áreas</option>
            <option v-for="area in areas" :key="area.id" :value="area.id">
              {{ area.nombre }}
            </option>
          </select>

          <!-- Toggle vista (Grid / Lista) -->
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ml-2">
            <button
              @click="viewMode = 'grid'"
              class="p-2 rounded-lg transition-all"
              :class="viewMode === 'grid' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'"
              title="Vista en Cuadrícula"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              @click="viewMode = 'list'"
              class="p-2 rounded-lg transition-all"
              :class="viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'"
              title="Vista en Lista"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

      </div>

      <!-- ESTADO DE CARGA -->
      <div v-if="isLoading" class="p-20 flex flex-col items-center justify-center gap-4">
        <svg class="animate-spin h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs font-bold text-slate-400">Consultando formatos autorizados para tu puesto...</p>
      </div>

      <!-- SIN FORMATOS -->
      <div v-else-if="formatosFiltrados.length === 0" class="p-20 text-center space-y-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80">
        <div class="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-3xl">
          📑
        </div>
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">No se encontraron formatos disponibles</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto">
          No tienes formatos autorizados asignados a tu puesto para los criterios seleccionados, o aún no se han registrado documentos en esta área.
        </p>
      </div>

      <!-- VISTA EN CUADRÍCULA (GRID) -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="formato in formatosFiltrados"
          :key="formato.id"
          class="group rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden"
        >
          <!-- Indicador superior -->
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80"></div>

          <div class="space-y-4">
            
            <!-- Header Card: Código y Tipo Archivo -->
            <div class="flex items-center justify-between gap-2">
              <span class="px-2.5 py-1 rounded-xl text-[0.65rem] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-200 dark:border-slate-700/60 font-mono">
                {{ formato.codigo }}
              </span>

              <div class="flex items-center gap-1.5">
                <!-- Badge de Tipo de Archivo -->
                <span 
                  class="px-2 py-0.5 rounded-lg text-[0.65rem] font-extrabold uppercase border"
                  :class="getBadgeTipoArchivo(formato.tipo_archivo)"
                >
                  {{ formato.tipo_archivo.toUpperCase() }}
                </span>

                <!-- Badge Versión -->
                <span class="px-2 py-0.5 rounded-lg text-[0.65rem] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  v{{ formato.version }}
                </span>
              </div>
            </div>

            <!-- Título y Área -->
            <div>
              <p class="text-[0.68rem] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                {{ formato.area_nombre }}
              </p>
              <h3 class="font-extrabold text-base font-['Outfit'] text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {{ formato.titulo }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {{ formato.descripcion || 'Formato institucional vigente autorizado para uso operativo oficial.' }}
              </p>
            </div>

          </div>

          <!-- Footer Card: Metadatos y Botones -->
          <div class="mt-6 pt-4 border-t border-slate-150 dark:border-slate-800/80 space-y-4">
            
            <div class="flex items-center justify-between text-[0.7rem] text-slate-400">
              <span v-if="formato.total_paginas > 0">{{ formato.total_paginas }} páginas</span>
              <span v-else>Plantilla editable</span>
              <span>Descargas: {{ formato.total_descargas }}</span>
            </div>

            <!-- BOTONES DE ACCIÓN (CON CONTROL DE DESCARGA POR PUESTO) -->
            <div class="flex items-center gap-2">
              
              <!-- Botón Ver (Si es PDF) -->
              <button
                v-if="formato.tipo_archivo === 'pdf'"
                @click="verDocumentoPDF(formato)"
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                title="Previsualizar formato en visor"
              >
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver
              </button>

              <!-- Botón Descargar (Si tiene permiso de descarga por su puesto) -->
              <button
                v-if="formato.puede_descargar"
                @click="descargarFormato(formato)"
                :disabled="downloadingId === formato.id"
                class="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg v-if="downloadingId === formato.id" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ downloadingId === formato.id ? 'Descargando...' : 'Descargar' }}
              </button>

              <!-- Indicador de Descarga NO autorizada para su puesto -->
              <div 
                v-else
                class="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-800 text-[0.68rem] font-bold text-slate-400 cursor-not-allowed text-center"
                title="Tu puesto tiene permiso de visualización, pero no está autorizado para descargar este archivo."
              >
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Solo Lectura
              </div>

            </div>

          </div>
        </div>
      </div>

      <!-- VISTA EN LISTA -->
      <div v-else class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800 text-[0.68rem] uppercase font-extrabold text-slate-400 tracking-wider">
                <th class="py-3.5 px-4 w-28">Código</th>
                <th class="py-3.5 px-4 min-w-[240px]">Formato Institucional</th>
                <th class="py-3.5 px-4 min-w-[140px]">Área</th>
                <th class="py-3.5 px-3 text-center">Tipo</th>
                <th class="py-3.5 px-3 text-center">Versión</th>
                <th class="py-3.5 px-4 text-center">Descargas</th>
                <th class="py-3.5 px-4 text-center min-w-[160px]">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-150 dark:divide-slate-800/60 font-medium">
              <tr 
                v-for="formato in formatosFiltrados" 
                :key="formato.id"
                class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <!-- Código -->
                <td class="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                  {{ formato.codigo }}
                </td>

                <!-- Título -->
                <td class="py-4 px-4">
                  <div class="font-bold text-slate-900 dark:text-white line-clamp-1">
                    {{ formato.titulo }}
                  </div>
                  <div class="text-[0.68rem] text-slate-400 line-clamp-1 mt-0.5">
                    {{ formato.descripcion || 'Sin descripción adicional' }}
                  </div>
                </td>

                <!-- Área -->
                <td class="py-4 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                  {{ formato.area_nombre }}
                </td>

                <!-- Tipo Archivo -->
                <td class="py-4 px-3 text-center">
                  <span 
                    class="px-2 py-0.5 rounded-lg text-[0.65rem] font-extrabold uppercase border"
                    :class="getBadgeTipoArchivo(formato.tipo_archivo)"
                  >
                    {{ formato.tipo_archivo.toUpperCase() }}
                  </span>
                </td>

                <!-- Versión -->
                <td class="py-4 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                  v{{ formato.version }}
                </td>

                <!-- Descargas -->
                <td class="py-4 px-4 text-center text-slate-500 font-semibold">
                  {{ formato.total_descargas }}
                </td>

                <!-- Acciones -->
                <td class="py-4 px-4 text-center">
                  <div class="inline-flex items-center gap-2">
                    
                    <button
                      v-if="formato.tipo_archivo === 'pdf'"
                      @click="verDocumentoPDF(formato)"
                      class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      Ver
                    </button>

                    <button
                      v-if="formato.puede_descargar"
                      @click="descargarFormato(formato)"
                      :disabled="downloadingId === formato.id"
                      class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar
                    </button>

                    <span 
                      v-else
                      class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[0.65rem] font-bold text-slate-400 flex items-center gap-1 cursor-not-allowed"
                      title="Tu puesto no tiene autorización de descarga"
                    >
                      🔒 Solo Ver
                    </span>

                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- VISOR DE FORMATOS DEDICADO -->
    <VisorFormatoModal
      v-if="showViewerModal"
      :show="showViewerModal"
      :formato="selectedDocParaVisor"
      @update:show="showViewerModal = $event"
      @descargar="onDescargarModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import VisorFormatoModal, { type FormatoModalItem } from '@/components/Formatos/VisorFormatoModal.vue'
import Swal from 'sweetalert2'

interface Area {
  id: number
  nombre: string
}

interface FormatoCatalogo {
  id: number
  formato_area_id: number
  area_nombre: string
  codigo: string
  titulo: string
  descripcion: string
  tipo_archivo: string
  total_paginas: number
  version: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  total_descargas: number
  puede_ver: boolean
  puede_descargar: boolean
  ultima_actualizacion: string
}

const isLoading = ref(true)
const downloadingId = ref<number | null>(null)
const formatos = ref<FormatoCatalogo[]>([])
const areas = ref<Area[]>([])

const searchQuery = ref('')
const selectedAreaId = ref<number | 'all'>('all')
const viewMode = ref<'grid' | 'list'>('grid')

// Visor PDF
const showViewerModal = ref(false)
const selectedDocParaVisor = ref<any>(null)

const formatosFiltrados = computed(() => {
  return formatos.value.filter(f => {
    // Filtro por área
    if (selectedAreaId.value !== 'all' && f.formato_area_id !== selectedAreaId.value) {
      return false
    }
    // Filtro por búsqueda
    if (searchQuery.value.trim() !== '') {
      const q = searchQuery.value.toLowerCase()
      const matchCodigo = f.codigo.toLowerCase().includes(q)
      const matchTitulo = f.titulo.toLowerCase().includes(q)
      const matchDesc = f.descripcion?.toLowerCase().includes(q) || false
      return matchCodigo || matchTitulo || matchDesc
    }
    return true
  })
})

const cargarDatos = async () => {
  isLoading.value = true
  try {
    const [resAreas, resFormatos] = await Promise.all([
      api.get('/formatos/areas'),
      api.get('/formatos/catalogo')
    ])
    areas.value = resAreas.data || []
    formatos.value = resFormatos.data || []
  } catch (err) {
    console.error('Error al cargar catálogo de formatos:', err)
  } finally {
    isLoading.value = false
  }
}

// Descargar con control por puesto
const descargarFormato = async (formato: FormatoCatalogo) => {
  downloadingId.value = formato.id
  try {
    const res = await api.get(`/formatos/documentos/${formato.id}/descargar`)
    const { url, filename } = res.data

    // Abrir descarga directa
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename || `${formato.codigo}.${formato.tipo_archivo}`)
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    link.remove()

    // Incrementar contador local
    formato.total_descargas++
  } catch (err: any) {
    console.error('Error al descargar formato:', err)
    const errorMsg = err?.response?.data?.error || 'No se pudo descargar el archivo solicitado.'
    Swal.fire({
      icon: 'error',
      title: 'Descarga no permitida',
      text: errorMsg,
      confirmButtonColor: '#059669'
    })
  } finally {
    downloadingId.value = null
  }
}

// Ver Formato en Visor Básico
const verDocumentoPDF = (formato: FormatoCatalogo) => {
  selectedDocParaVisor.value = formato
  showViewerModal.value = true
}

const onDescargarModal = (item: FormatoModalItem) => {
  const formatoCompleto = formatos.value.find(f => f.id === item.id)
  if (formatoCompleto) {
    descargarFormato(formatoCompleto)
  }
}

const getBadgeTipoArchivo = (tipo: string) => {
  const t = tipo.toLowerCase()
  if (t === 'pdf') {
    return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  }
  if (t === 'docx' || t === 'doc') {
    return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  }
  if (t === 'xlsx' || t === 'xls') {
    return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200'
}

onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.3);
  border-radius: 9999px;
}
</style>
