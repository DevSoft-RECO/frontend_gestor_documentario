<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="show && formato" 
        class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm select-none"
        @keydown.esc="cerrar"
        @contextmenu.prevent
      >
        <!-- CONTENEDOR DEL MODAL -->
        <div 
          class="relative flex flex-col w-full max-w-6xl h-[94vh] max-h-[960px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          @click.stop
        >
          <!-- CABECERA -->
          <header class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-50/90 dark:bg-slate-950/70">
            
            <!-- IDENTIFICACIÓN DEL FORMATO -->
            <div class="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <span 
                class="px-2.5 py-1 rounded-lg text-[0.65rem] font-black uppercase tracking-wider border shrink-0"
                :class="getBadgeTipo(formato.tipo_archivo)"
              >
                {{ formato.tipo_archivo }}
              </span>

              <div class="truncate">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {{ formato.codigo }}
                  </span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[0.65rem]">
                    v{{ formato.version || '1.0' }}
                  </span>
                  <span v-if="formato.area_nombre" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    · {{ formato.area_nombre }}
                  </span>
                </div>
                <h3 class="text-sm font-extrabold text-slate-850 dark:text-white truncate mt-0.5" :title="formato.titulo">
                  {{ formato.titulo }}
                </h3>
              </div>
            </div>

            <!-- CONTROLES DEL VISOR (ZOOM Y PÁGINAS) -->
            <div v-if="esPDF && totalPaginas > 0" class="flex items-center gap-2 shrink-0 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-1 rounded-xl">
              <span class="text-[0.7rem] font-bold text-slate-600 dark:text-slate-300 px-1">
                {{ totalPaginas }} {{ totalPaginas === 1 ? 'pág' : 'págs' }}
              </span>
              <div class="h-3.5 w-px bg-slate-300 dark:bg-slate-700"></div>
              
              <!-- Zoom Out -->
              <button 
                @click="cambiarZoom(-0.15)"
                :disabled="zoomLevel <= 0.6"
                class="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-30 cursor-pointer"
                title="Reducir zoom"
              >
                −
              </button>
              <span class="text-[0.68rem] font-mono font-bold text-slate-600 dark:text-slate-300 min-w-[34px] text-center">
                {{ Math.round(zoomLevel * 100) }}%
              </span>
              <!-- Zoom In -->
              <button 
                @click="cambiarZoom(0.15)"
                :disabled="zoomLevel >= 2.0"
                class="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-30 cursor-pointer"
                title="Aumentar zoom"
              >
                +
              </button>
            </div>

            <!-- ACCIONES DE DESCARGA Y CIERRE -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Botón Descargar (SOLO si el puesto tiene autorización) -->
              <button
                v-if="formato.puede_descargar"
                @click="onDescargar"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all cursor-pointer"
                title="Descargar este formato oficial"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span class="hidden sm:inline">Descargar</span>
              </button>

              <!-- Indicador Solo Lectura (sin permiso de descarga) -->
              <span 
                v-else
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[0.68rem] font-bold text-slate-400 flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                title="Tu puesto no tiene autorización de descarga para este formato"
              >
                🔒 Solo Lectura
              </span>

              <!-- Botón Cerrar -->
              <button 
                @click="cerrar"
                class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar visor"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <!-- ÁREA PRINCIPAL DEL DOCUMENTO -->
          <div 
            ref="scrollContainer"
            class="relative flex-1 bg-slate-200/70 dark:bg-slate-950 overflow-y-auto overflow-x-auto p-4 sm:p-6 custom-scrollbar"
          >
            <!-- ESTADO DE CARGA -->
            <div 
              v-if="isLoading" 
              class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs"
            >
              <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-xs font-bold text-slate-600 dark:text-slate-300">
                Cargando formato de solo lectura...
              </p>
            </div>

            <!-- ESTADO DE ERROR -->
            <div 
              v-else-if="errorMessage" 
              class="flex flex-col items-center justify-center h-full p-6 text-center gap-3"
            >
              <div class="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center text-2xl border border-rose-200 dark:border-rose-900">
                ⚠️
              </div>
              <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">
                No fue posible cargar el formato
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                {{ errorMessage }}
              </p>
              <div class="flex items-center gap-3 mt-2">
                <button 
                  @click="cargarDocumento" 
                  class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Reintentar
                </button>
                <button
                  v-if="formato.puede_descargar"
                  @click="onDescargar"
                  class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Descargar directo
                </button>
              </div>
            </div>

            <!-- CONTENEDOR DE PÁGINAS PDF (CANVAS NATIVO SIN HERRAMIENTAS DEL NAVEGADOR) -->
            <div 
              v-show="esPDF && !errorMessage" 
              ref="pagesContainer"
              class="flex flex-col items-center gap-6 min-h-full py-2"
            >
              <!-- Los elementos <canvas> se inyectan dinámicamente aquí -->
            </div>

            <!-- ARCHIVOS OFIMÁTICOS (WORD / EXCEL) -->
            <div 
              v-if="!esPDF && !isLoading && !errorMessage" 
              class="flex flex-col items-center justify-center h-full p-6 text-center"
            >
              <div class="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-lg"
                   :class="formato.tipo_archivo === 'xlsx' || formato.tipo_archivo === 'xls' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'">
                {{ formato.tipo_archivo === 'xlsx' || formato.tipo_archivo === 'xls' ? '📊' : '📝' }}
              </div>

              <h4 class="text-base font-extrabold text-slate-850 dark:text-white mb-1">
                Formato Institucional en Microsoft {{ (formato.tipo_archivo === 'xlsx' || formato.tipo_archivo === 'xls') ? 'Excel' : 'Word' }}
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-5">
                Este formato es un archivo editable <span class="font-mono font-bold text-slate-700 dark:text-slate-300">.{{ formato.tipo_archivo }}</span>. Los documentos de Office no pueden renderizarse como PDF interactivo sin alterar sus macros o celdas, pero puedes descargarlo para editarlo en tu equipo si tu puesto está autorizado.
              </p>

              <!-- Metadatos del documento -->
              <div class="grid grid-cols-2 gap-3 max-w-sm w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-left text-xs mb-6">
                <div>
                  <span class="text-[0.68rem] text-slate-400 font-bold block">Código</span>
                  <span class="font-mono font-extrabold text-slate-700 dark:text-slate-200">{{ formato.codigo }}</span>
                </div>
                <div>
                  <span class="text-[0.68rem] text-slate-400 font-bold block">Versión</span>
                  <span class="font-bold text-slate-700 dark:text-slate-200">v{{ formato.version || '1.0' }}</span>
                </div>
                <div v-if="formato.fecha_aprobacion">
                  <span class="text-[0.68rem] text-slate-400 font-bold block">Aprobado</span>
                  <span class="font-medium text-slate-600 dark:text-slate-300">{{ formato.fecha_aprobacion }}</span>
                </div>
                <div v-if="formato.fecha_vigencia">
                  <span class="text-[0.68rem] text-slate-400 font-bold block">Vigencia</span>
                  <span class="font-medium text-slate-600 dark:text-slate-300">{{ formato.fecha_vigencia }}</span>
                </div>
              </div>

              <button
                v-if="formato.puede_descargar"
                @click="onDescargar"
                class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Formato (.{{ formato.tipo_archivo }})
              </button>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import api from '@/api/axios'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configurar el worker de PDF.js usando el archivo compilado localmente
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export interface FormatoModalItem {
  id: number
  codigo: string
  titulo: string
  descripcion?: string
  area_nombre?: string
  tipo_archivo: string
  version?: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  puede_descargar: boolean
  [key: string]: any
}

const props = defineProps<{
  show: boolean
  formato: FormatoModalItem | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'descargar', formato: FormatoModalItem): void
}>()

const isLoading = ref(false)
const errorMessage = ref('')
const totalPaginas = ref(0)
const zoomLevel = ref(1.15) // Zoom confortable de lectura

const pagesContainer = ref<HTMLElement | null>(null)
let pdfDocInstance: pdfjsLib.PDFDocumentProxy | null = null

const esPDF = computed(() => {
  const tipo = (props.formato?.tipo_archivo || '').toLowerCase().replace('.', '').trim()
  return tipo === 'pdf'
})

const getBadgeTipo = (tipo: string) => {
  const t = tipo?.toLowerCase()
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

const limpiarRecursos = () => {
  if (pagesContainer.value) {
    pagesContainer.value.innerHTML = ''
  }
  if (pdfDocInstance) {
    pdfDocInstance.destroy()
    pdfDocInstance = null
  }
  totalPaginas.value = 0
}

const cerrar = () => {
  limpiarRecursos()
  emit('update:show', false)
}

const onDescargar = () => {
  if (props.formato) {
    emit('descargar', props.formato)
  }
}

const cambiarZoom = (delta: number) => {
  const nuevoZoom = Math.min(2.0, Math.max(0.6, Math.round((zoomLevel.value + delta) * 100) / 100))
  if (nuevoZoom !== zoomLevel.value) {
    zoomLevel.value = nuevoZoom
    renderizarPaginas()
  }
}

const renderizarPaginas = async () => {
  if (!pdfDocInstance || !pagesContainer.value) return

  pagesContainer.value.innerHTML = ''
  const pixelRatio = window.devicePixelRatio || 1

  for (let i = 1; i <= pdfDocInstance.numPages; i++) {
    try {
      const page = await pdfDocInstance.getPage(i)
      const viewport = page.getViewport({ scale: zoomLevel.value })

      const pageCard = document.createElement('div')
      pageCard.className = 'flex flex-col items-center bg-white rounded-xl shadow-md border border-slate-200/80 dark:border-slate-800 overflow-hidden'
      pageCard.style.maxWidth = '100%'

      const canvas = document.createElement('canvas')
      // Resolución nítida para pantallas HiDPI / Retina
      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      canvas.style.display = 'block'

      const ctx = canvas.getContext('2d', { alpha: false })
      if (ctx) {
        ctx.scale(pixelRatio, pixelRatio)
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        }).promise
      }

      pageCard.appendChild(canvas)
      pagesContainer.value.appendChild(pageCard)
    } catch (renderErr) {
      console.error(`[VisorFormato] Error renderizando página ${i}:`, renderErr)
    }
  }
}

const cargarDocumento = async () => {
  if (!props.formato) return

  limpiarRecursos()
  errorMessage.value = ''

  if (!esPDF.value) {
    return
  }

  isLoading.value = true
  try {
    // 1. Obtener URL firmada autorizada de GCS
    const res = await api.get(`/formatos/documentos/${props.formato.id}/ver`)
    const signedUrl = res.data?.url
    if (!signedUrl) {
      throw new Error('No se obtuvo el enlace seguro del documento.')
    }

    // 2. Descargar bytes directamente en memoria como ArrayBuffer
    const fileRes = await fetch(signedUrl)
    if (!fileRes.ok) {
      throw new Error(`Error al recuperar el archivo (${fileRes.status})`)
    }
    const arrayBuffer = await fileRes.arrayBuffer()

    // 3. Cargar en PDF.js (sin iframe, sin barra de herramientas externa)
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
      cMapPacked: true
    })

    pdfDocInstance = await loadingTask.promise
    totalPaginas.value = pdfDocInstance.numPages

    await nextTick()
    await renderizarPaginas()
  } catch (err: any) {
    console.error('[VisorFormato] Error:', err)
    errorMessage.value = err?.response?.data?.error || err?.message || 'Ocurrió un error al cargar el formato.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (props.show && props.formato) {
    cargarDocumento()
  }
})

onUnmounted(() => {
  limpiarRecursos()
})

watch(
  () => [props.show, props.formato?.id],
  ([abierto]) => {
    if (abierto && props.formato) {
      cargarDocumento()
    } else {
      limpiarRecursos()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.55);
}
</style>
