<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans'] text-slate-800 dark:text-slate-100 relative overflow-hidden w-full">
    
    <!-- Background Gradients -->
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-emerald-500/10 via-teal-500/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>

    <div class="w-full space-y-6 z-10 relative">

      <!-- ENCABEZADO PRINCIPAL -->
      <div class="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reportería de Documentación Normativa
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight font-['Outfit'] text-slate-900 dark:text-white">
            Reporte General de Normativas
          </h1>
          <p class="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-4xl">
            Control integral del inventario documental, clasificación por tipo, trazabilidad de versiones (actas y aprobaciones) y asignación de puestos responsables.
          </p>
        </div>

        <!-- Botón Exportar CSV -->
        <button
          @click="descargarReporteCSV"
          :disabled="isDownloading"
          class="shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <svg v-if="isDownloading" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {{ isDownloading ? 'Generando Archivo CSV...' : 'Exportar Reporte (CSV)' }}
        </button>
      </div>

      <!-- TARJETAS DE RESUMEN (KPIS) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Total Documentos -->
        <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Normativas</p>
            <p class="text-2xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{{ totalDocumentos }}</p>
          </div>
        </div>

        <!-- Estado Documental -->
        <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Documental</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                100% Vigentes
              </span>
            </div>
            <p class="text-[0.68rem] text-slate-400 mt-0.5">Sin caducidad fija (Ciclo continuo)</p>
          </div>
        </div>

        <!-- Total Actualizaciones -->
        <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Hojas de Cambio</p>
            <p class="text-2xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{{ totalActualizacionesCalculadas }}</p>
            <p class="text-[0.68rem] text-slate-400">Actualizaciones registradas</p>
          </div>
        </div>

        <!-- Páginas Totales -->
        <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Hojas Físicas</p>
            <p class="text-2xl font-extrabold text-slate-800 dark:text-white font-['Outfit']">{{ totalPaginasFisicas }}</p>
            <p class="text-[0.68rem] text-slate-400">Páginas digitalizadas</p>
          </div>
        </div>

      </div>

      <!-- SECCIÓN DE FILTROS -->
      <div class="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 dark:border-slate-800/60 pb-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros de Búsqueda y Clasificación
          </h2>
          
          <button
            v-if="tieneFiltrosActivos"
            @click="limpiarFiltros"
            class="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar Filtros
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          
          <!-- Búsqueda texto -->
          <div class="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label class="block text-[0.7rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Buscar por Título o No. Acta</label>
            <div class="relative">
              <input
                type="text"
                v-model="filtros.search"
                @input="handleSearchDebounce"
                placeholder="Ej. Política de Crédito, Acta 04-2024..."
                class="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Gaveta (Categoría) -->
          <div class="space-y-1.5">
            <label class="block text-[0.7rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Gaveta</label>
            <select
              v-model="filtros.categoriaId"
              @change="onCategoriaChange"
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
            >
              <option value="">Todas las Gavetas</option>
              <option v-for="cat in categoriasDisponibles" :key="cat.id" :value="cat.id">
                {{ cat.nombre }}
              </option>
            </select>
          </div>

          <!-- Portafolio / Área (Subcategoría) -->
          <div class="space-y-1.5">
            <label class="block text-[0.7rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Portafolio / Área</label>
            <select
              v-model="filtros.subcategoriaId"
              @change="onSubcategoriaChange"
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
            >
              <option value="">Todos los Portafolios / Áreas</option>
              <option v-for="sub in subcategoriasDisponibles" :key="sub.id" :value="sub.id">
                {{ sub.nombre }}
              </option>
            </select>
          </div>

          <!-- Tipo Documental (Carpeta) -->
          <div class="space-y-1.5">
            <label class="block text-[0.7rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Tipo Documental</label>
            <select
              v-model="filtros.carpetaId"
              @change="aplicarFiltros"
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
            >
              <option value="">Todos los Tipos</option>
              <option v-for="carp in carpetasDisponibles" :key="carp.id" :value="carp.id">
                {{ carp.nombre }}
              </option>
            </select>
          </div>

          <!-- Fechas (Desde / Hasta) -->
          <div class="space-y-1.5">
            <label class="block text-[0.7rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Rango Fechas</label>
            <div class="flex items-center gap-1.5">
              <input
                type="date"
                v-model="filtros.startDate"
                @change="aplicarFiltros"
                title="Fecha Desde"
                class="w-1/2 p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              />
              <input
                type="date"
                v-model="filtros.endDate"
                @change="aplicarFiltros"
                title="Fecha Hasta"
                class="w-1/2 p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

        </div>
      </div>

      <!-- TABLA DE DOCUMENTOS NORMATIVOS -->
      <div class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col">
        
        <!-- HEADER DE LA TABLA CON CONTROLES Y PAGINACIÓN RÁPIDA SUPERIOR -->
        <div class="p-4 sm:p-6 border-b border-slate-150 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-white/50 dark:bg-slate-900/50">
          <div>
            <h3 class="text-base font-extrabold font-['Outfit'] text-slate-900 dark:text-white">
              Inventario de Documentos Registrados
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Mostrando {{ documentos.length }} de {{ totalDocumentos }} normativas vigentes
            </p>
          </div>

          <!-- Controles de Navegación y Filas (Accesibles en el encabezado) -->
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 text-xs text-slate-500">
              <span class="font-bold text-slate-400">Filas:</span>
              <select
                v-model="pagination.limit"
                @change="onLimitChange"
                class="p-1.5 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none cursor-pointer"
              >
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
              </select>
            </div>

            <div class="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <!-- Botones de Paginación Superior -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                Pág. {{ pagination.page }} de {{ totalPaginas }}
              </span>

              <button
                @click="cambiarPagina(pagination.page - 1)"
                :disabled="pagination.page <= 1"
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                title="Página Anterior"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                <span class="hidden sm:inline">Anterior</span>
              </button>

              <button
                @click="cambiarPagina(pagination.page + 1)"
                :disabled="pagination.page >= totalPaginas"
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                title="Página Siguiente"
              >
                <span class="hidden sm:inline">Siguiente</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Estado de Carga -->
        <div v-if="isLoading" class="p-16 flex flex-col items-center justify-center gap-4">
          <svg class="animate-spin h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-xs font-bold text-slate-400">Consultando normativas y versiones...</p>
        </div>

        <!-- Sin Resultados -->
        <div v-else-if="documentos.length === 0" class="p-16 text-center space-y-3">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl">
            📑
          </div>
          <h4 class="text-base font-bold text-slate-700 dark:text-slate-300">No se encontraron normativas</h4>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            No hay documentos registrados que coincidan con los filtros seleccionados. Intenta ampliar el rango de búsqueda.
          </p>
        </div>

        <!-- Contenedor de Tabla con Scroll Interno Controlado y Encabezado Fijo (Sticky) -->
        <div v-else class="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-[0.68rem] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider shadow-sm">
              <tr>
                <th class="py-3.5 px-4 w-12 text-center">#</th>
                <th class="py-3.5 px-4 min-w-[240px]">Normativa</th>
                <th class="py-3.5 px-3 text-center w-24">Estado</th>
                <th class="py-3.5 px-4 min-w-[130px]">Tipo Documental</th>
                <th class="py-3.5 px-4 min-w-[160px]">Portafolio / Área</th>
                <th class="py-3.5 px-4 min-w-[220px]">Responsables (Puestos con Acceso)</th>
                
                <!-- 3 COLUMNAS REQUERIDAS DE CONTROL DE VERSIONES -->
                <th class="py-3.5 px-4 min-w-[160px] bg-indigo-50/50 dark:bg-indigo-950/20">No. Acta Aprobación</th>
                <th class="py-3.5 px-4 min-w-[130px] bg-indigo-50/50 dark:bg-indigo-950/20">Fecha Aprobación</th>
                <th class="py-3.5 px-4 min-w-[240px] bg-indigo-50/50 dark:bg-indigo-950/20">Descripción del Cambio</th>

                <th class="py-3.5 px-4 text-center w-24">Páginas</th>
                <th class="py-3.5 px-4 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-150 dark:divide-slate-800/60 font-medium">
              <tr 
                v-for="doc in documentos" 
                :key="doc.id"
                class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <!-- ID -->
                <td class="py-3.5 px-4 text-center font-bold text-slate-400 text-[0.7rem]">
                  #{{ doc.id }}
                </td>

                <!-- Título y Gaveta -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 dark:text-white line-clamp-2">
                    {{ doc.titulo }}
                  </div>
                  <div class="text-[0.68rem] text-slate-400 mt-0.5 flex items-center gap-1">
                    <span class="font-semibold text-slate-500 dark:text-slate-400">Gaveta:</span>
                    <span>{{ doc.carpeta?.subcategoria?.categoria?.nombre || 'General' }}</span>
                  </div>
                </td>

                <!-- Estado: Siempre Vigente -->
                <td class="py-3.5 px-3 text-center">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Vigente
                  </span>
                </td>

                <!-- Tipo Documental (Carpeta) -->
                <td class="py-3.5 px-4">
                  <span 
                    class="inline-block px-2.5 py-1 rounded-lg text-[0.7rem] font-bold border"
                    :class="getBadgeTipoDocumental(doc.carpeta?.nombre || '')"
                  >
                    {{ doc.carpeta?.nombre || 'Manual' }}
                  </span>
                </td>

                <!-- Portafolio / Área -->
                <td class="py-3.5 px-4">
                  <div class="text-slate-700 dark:text-slate-300 font-semibold">
                    {{ doc.carpeta?.subcategoria?.nombre || 'No asignada' }}
                  </div>
                </td>

                <!-- Responsables: Puestos con acceso -->
                <td class="py-3.5 px-4">
                  <div v-if="doc.puestos_autorizados && doc.puestos_autorizados.length > 0" class="flex flex-wrap gap-1">
                    <span 
                      v-for="puesto in doc.puestos_autorizados.slice(0, 3)" 
                      :key="puesto.id"
                      class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[0.65rem] font-bold text-slate-600 dark:text-slate-300"
                    >
                      {{ puesto.nombre }}
                    </span>
                    <span 
                      v-if="doc.puestos_autorizados.length > 3"
                      class="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[0.65rem] font-bold text-slate-500"
                      :title="doc.puestos_autorizados.map(p => p.nombre).join(', ')"
                    >
                      +{{ doc.puestos_autorizados.length - 3 }} más
                    </span>
                  </div>
                  <div v-else class="text-[0.7rem] text-slate-400 italic">
                    Acceso general (Todos los puestos)
                  </div>
                </td>

                <!-- COLUMNA 1: No. Acta Aprobación -->
                <td class="py-3.5 px-4 bg-indigo-50/20 dark:bg-indigo-950/5">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span class="text-[0.62rem] font-extrabold uppercase px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Orig.</span>
                      <span class="font-bold">{{ doc.numero_acta || 'Sin acta inicial' }}</span>
                    </div>
                    <div 
                      v-for="(act, idx) in doc.actualizaciones" 
                      :key="act.id"
                      class="flex items-center gap-1.5 text-[0.68rem] text-indigo-600 dark:text-indigo-400"
                    >
                      <span class="text-[0.6rem] font-extrabold uppercase px-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">v{{ idx + 2 }}</span>
                      <span>{{ act.numero_acta || 'Acta s/n' }}</span>
                    </div>
                  </div>
                </td>

                <!-- COLUMNA 2: Fecha Aprobación -->
                <td class="py-3.5 px-4 bg-indigo-50/20 dark:bg-indigo-950/5">
                  <div class="space-y-1 text-slate-600 dark:text-slate-400">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[0.62rem] font-extrabold uppercase px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Orig.</span>
                      <span>{{ formatearFecha(doc.fecha_aprobacion) }}</span>
                    </div>
                    <div 
                      v-for="(act, idx) in doc.actualizaciones" 
                      :key="act.id"
                      class="flex items-center gap-1.5 text-[0.68rem] text-indigo-600 dark:text-indigo-400"
                    >
                      <span class="text-[0.6rem] font-extrabold uppercase px-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">v{{ idx + 2 }}</span>
                      <span>{{ formatearFecha(act.fecha_aprobacion) }}</span>
                    </div>
                  </div>
                </td>

                <!-- COLUMNA 3: Descripción del Cambio -->
                <td class="py-3.5 px-4 bg-indigo-50/20 dark:bg-indigo-950/5">
                  <div class="space-y-1">
                    <div class="text-[0.7rem] text-slate-500 italic">
                      [Inicial] Aprobación y emisión original
                    </div>
                    <div 
                      v-for="(act, idx) in doc.actualizaciones" 
                      :key="act.id"
                      class="text-[0.68rem] text-slate-700 dark:text-slate-300 line-clamp-2"
                      :title="act.descripcion"
                    >
                      <span class="font-bold text-indigo-600 dark:text-indigo-400">[Act. {{ idx + 1 }}]</span>
                      {{ act.descripcion || 'Sin detalle de cambios' }}
                    </div>
                  </div>
                </td>

                <!-- Total Páginas / Actualizaciones -->
                <td class="py-3.5 px-4 text-center">
                  <div class="font-bold text-slate-700 dark:text-slate-300">
                    {{ doc.total_paginas }} págs.
                  </div>
                  <div class="text-[0.65rem] text-slate-400 mt-0.5">
                    {{ (doc.actualizaciones?.length || 0) }} act.
                  </div>
                </td>

                <!-- Acciones -->
                <td class="py-3.5 px-4 text-center">
                  <div class="inline-flex items-center gap-1.5 shrink-0">
                    <button
                      @click="abrirVisorPDF(doc)"
                      title="Previsualizar documento PDF"
                      class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    <button
                      @click="abrirModalDetalle(doc)"
                      title="Ver historial completo de versiones"
                      class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <!-- FOOTER DE PAGINACIÓN FIJO/ANCLADO AL FINAL DE LA TARJETA -->
        <div class="p-4 sm:p-5 border-t border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <span class="text-slate-400 font-medium">
            Mostrando registros del {{ ((pagination.page - 1) * pagination.limit) + (documentos.length > 0 ? 1 : 0) }} al {{ Math.min(pagination.page * pagination.limit, totalDocumentos) }} de un total de {{ totalDocumentos }}
          </span>

          <div class="flex items-center gap-2">
            <button
              @click="cambiarPagina(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              Anterior
            </button>
            
            <span class="px-3 py-1 font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
              {{ pagination.page }} / {{ totalPaginas }}
            </span>

            <button
              @click="cambiarPagina(pagination.page + 1)"
              :disabled="pagination.page >= totalPaginas"
              class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              Siguiente
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

      </div>

    </div>

    <!-- MODAL DETALLE DE VERSIONES -->
    <div v-if="showDetalleModal && selectedDocDetalle" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 class="font-extrabold text-base tracking-tight font-['Outfit'] text-slate-900 dark:text-white">
              Historial de Versiones y Aprobaciones
            </h3>
            <p class="text-xs text-slate-400 mt-0.5 truncate max-w-md">
              {{ selectedDocDetalle.titulo }}
            </p>
          </div>
          <button @click="showDetalleModal = false" class="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white">×</button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          <!-- Metadatos Básicos -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 text-xs">
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Tipo</p>
              <p class="font-bold text-slate-700 dark:text-slate-200">{{ selectedDocDetalle.carpeta?.nombre || 'Manual' }}</p>
            </div>
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Área</p>
              <p class="font-bold text-slate-700 dark:text-slate-200">{{ selectedDocDetalle.carpeta?.subcategoria?.nombre || 'General' }}</p>
            </div>
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Estado</p>
              <span class="inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                Vigente
              </span>
            </div>
            <div>
              <p class="text-[0.65rem] font-bold text-slate-400 uppercase">Total Versiones</p>
              <p class="font-bold text-indigo-600 dark:text-indigo-400">{{ 1 + (selectedDocDetalle.actualizaciones?.length || 0) }}</p>
            </div>
          </div>

          <!-- Puestos Responsables -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Puestos / Responsables Asignados</h4>
            <div class="flex flex-wrap gap-1.5">
              <span 
                v-for="p in selectedDocDetalle.puestos_autorizados" 
                :key="p.id"
                class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {{ p.nombre }}
              </span>
              <span v-if="!selectedDocDetalle.puestos_autorizados || selectedDocDetalle.puestos_autorizados.length === 0" class="text-xs text-slate-400 italic">
                Sin restricción (Acceso para toda la cooperativa)
              </span>
            </div>
          </div>

          <!-- Línea de tiempo de cambios / versiones -->
          <div class="space-y-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Línea de Tiempo de Aprobaciones</h4>

            <div class="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900">
              
              <!-- Versión Inicial -->
              <div class="relative">
                <span class="absolute -left-6 top-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900"></span>
                <div class="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">Versión 1.0 (Aprobación Inicial)</span>
                    <span class="text-[0.7rem] text-slate-400">{{ formatearFecha(selectedDocDetalle.fecha_aprobacion) }}</span>
                  </div>
                  <p class="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    Acta: {{ selectedDocDetalle.numero_acta || 'Sin número de acta' }}
                  </p>
                  <p class="text-xs text-slate-500">
                    Aprobación original y entrada en vigor del documento.
                  </p>
                </div>
              </div>

              <!-- Actualizaciones -->
              <div 
                v-for="(act, idx) in selectedDocDetalle.actualizaciones" 
                :key="act.id"
                class="relative"
              >
                <span class="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900"></span>
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Actualización {{ idx + 1 }} (v{{ idx + 2 }}.0)</span>
                    <span class="text-[0.7rem] text-slate-400">{{ formatearFecha(act.fecha_aprobacion) }}</span>
                  </div>
                  <p class="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    Acta: {{ act.numero_acta || 'Sin acta registrada' }}
                  </p>
                  <p class="text-xs text-slate-600 dark:text-slate-400">
                    {{ act.descripcion || 'Sin detalle de los cambios realizados' }}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        <div class="p-4 border-t border-slate-150 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button @click="showDetalleModal = false" class="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            Cerrar
          </button>
        </div>

      </div>
    </div>

    <!-- VISOR DE PDF INTEGRADO -->
    <PDFViewer
      v-if="showViewerModal"
      :show="showViewerModal"
      :manual="selectedDocParaVisor"
      :api-url="API_URL"
      @update:show="showViewerModal = $event"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import PDFViewer from '@/components/Manuales/PDFViewer.vue'

interface Puesto {
  id: number
  nombre: string
}

interface Actualizacion {
  id: number
  manual_documento_id: number
  numero_acta: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  descripcion?: string
  file_path: string
  total_paginas: number
  fecha_creacion: string
}

interface ManualDoc {
  id: number
  manual_carpeta_id: number
  titulo: string
  file_path: string
  total_paginas: number
  numero_acta?: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  fecha_creacion: string
  ultima_actualizacion: string
  puestos_autorizados: Puesto[]
  actualizaciones: Actualizacion[]
  carpeta?: {
    id: number
    nombre: string
    subcategoria?: {
      id: number
      nombre: string
      categoria?: {
        id: number
        nombre: string
      }
    }
  }
}

interface Carpeta {
  id: number
  nombre: string
}

interface Subcategoria {
  id: number
  nombre: string
  carpetas?: Carpeta[]
}

interface Categoria {
  id: number
  nombre: string
  subcategorias?: Subcategoria[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const isLoading = ref(true)
const isDownloading = ref(false)
const documentos = ref<ManualDoc[]>([])
const categoriasDisponibles = ref<Categoria[]>([])
const puestosDisponibles = ref<Puesto[]>([])

// Paginación
const pagination = ref({
  page: 1,
  limit: 15,
  total: 0
})

// Filtros reactivos
const filtros = ref({
  search: '',
  categoriaId: '',
  subcategoriaId: '',
  carpetaId: '',
  startDate: '',
  endDate: ''
})

let searchTimeout: any = null

// Modales
const showDetalleModal = ref(false)
const selectedDocDetalle = ref<ManualDoc | null>(null)
const showViewerModal = ref(false)
const selectedDocParaVisor = ref<any>(null)

// --- COMPUTED PROPERTIES ---

const totalDocumentos = computed(() => pagination.value.total)

const totalPaginas = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.limit) || 1
})

const totalActualizacionesCalculadas = computed(() => {
  return documentos.value.reduce((acc, doc) => acc + (doc.actualizaciones?.length || 0), 0)
})

const totalPaginasFisicas = computed(() => {
  return documentos.value.reduce((acc, doc) => acc + (doc.total_paginas || 0), 0)
})

const subcategoriasDisponibles = computed(() => {
  if (!filtros.value.categoriaId) {
    const subs: Subcategoria[] = []
    categoriasDisponibles.value.forEach(c => {
      if (c.subcategorias) subs.push(...c.subcategorias)
    })
    return subs
  }
  const cat = categoriasDisponibles.value.find(c => c.id === parseInt(filtros.value.categoriaId))
  return cat?.subcategorias || []
})

const carpetasDisponibles = computed(() => {
  if (!filtros.value.subcategoriaId) {
    const carps: Carpeta[] = []
    subcategoriasDisponibles.value.forEach(s => {
      if (s.carpetas) carps.push(...s.carpetas)
    })
    return carps
  }
  const sub = subcategoriasDisponibles.value.find(s => s.id === parseInt(filtros.value.subcategoriaId))
  return sub?.carpetas || []
})

const tieneFiltrosActivos = computed(() => {
  return !!(
    filtros.value.search ||
    filtros.value.categoriaId ||
    filtros.value.subcategoriaId ||
    filtros.value.carpetaId ||
    filtros.value.startDate ||
    filtros.value.endDate
  )
})

// --- CARGA DE DATOS ---

const cargarFiltrosTaxonomia = async () => {
  try {
    const res = await api.get('/manuales/reportes/filtros')
    if (res.data) {
      categoriasDisponibles.value = res.data.categorias || []
      puestosDisponibles.value = res.data.puestos || []
    }
  } catch (err) {
    console.error('Error al cargar taxonomía de filtros:', err)
  }
}

const cargarReporte = async () => {
  isLoading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    if (filtros.value.search) params.search = filtros.value.search
    if (filtros.value.categoriaId) params.categoria_id = filtros.value.categoriaId
    if (filtros.value.subcategoriaId) params.subcategoria_id = filtros.value.subcategoriaId
    if (filtros.value.carpetaId) params.carpeta_id = filtros.value.carpetaId
    if (filtros.value.startDate) params.start_date = filtros.value.startDate
    if (filtros.value.endDate) params.end_date = filtros.value.endDate

    const res = await api.get('/manuales/reportes/listado', { params })
    documentos.value = res.data.documentos || []
    pagination.value.total = res.data.total || 0
  } catch (err) {
    console.error('Error al cargar listado del reporte:', err)
  } finally {
    isLoading.value = false
  }
}

// --- EVENTOS Y FILTROS ---

const handleSearchDebounce = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    cargarReporte()
  }, 350)
}

const onCategoriaChange = () => {
  filtros.value.subcategoriaId = ''
  filtros.value.carpetaId = ''
  pagination.value.page = 1
  cargarReporte()
}

const onSubcategoriaChange = () => {
  filtros.value.carpetaId = ''
  pagination.value.page = 1
  cargarReporte()
}

const aplicarFiltros = () => {
  pagination.value.page = 1
  cargarReporte()
}

const limpiarFiltros = () => {
  filtros.value = {
    search: '',
    categoriaId: '',
    subcategoriaId: '',
    carpetaId: '',
    startDate: '',
    endDate: ''
  }
  pagination.value.page = 1
  cargarReporte()
}

const cambiarPagina = (nuevaPagina: number) => {
  pagination.value.page = nuevaPagina
  cargarReporte()
}

const onLimitChange = () => {
  pagination.value.page = 1
  cargarReporte()
}

// --- EXPORTAR REPORTE A CSV ---

const descargarReporteCSV = async () => {
  isDownloading.value = true
  try {
    const params: any = {}
    if (filtros.value.search) params.search = filtros.value.search
    if (filtros.value.categoriaId) params.categoria_id = filtros.value.categoriaId
    if (filtros.value.subcategoriaId) params.subcategoria_id = filtros.value.subcategoriaId
    if (filtros.value.carpetaId) params.carpeta_id = filtros.value.carpetaId
    if (filtros.value.startDate) params.start_date = filtros.value.startDate
    if (filtros.value.endDate) params.end_date = filtros.value.endDate

    const res = await api.get('/manuales/reportes/exportar', {
      params,
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `reporte_normativas_${new Date().toISOString().substring(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (err) {
    console.error('Error al exportar reporte a CSV:', err)
  } finally {
    isDownloading.value = false
  }
}

// --- MODALES Y ACCIONES ---

const abrirModalDetalle = (doc: ManualDoc) => {
  selectedDocDetalle.value = doc
  showDetalleModal.value = true
}

const abrirVisorPDF = (doc: ManualDoc) => {
  selectedDocParaVisor.value = doc
  showViewerModal.value = true
}

// --- HELPERS VISUALES ---

const formatearFecha = (fechaStr?: string) => {
  if (!fechaStr) return 'No especificada'
  return fechaStr.substring(0, 10)
}

const getBadgeTipoDocumental = (tipo: string) => {
  const t = tipo.toLowerCase()
  if (t.includes('política') || t.includes('politica')) {
    return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  }
  if (t.includes('reglamento')) {
    return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  }
  if (t.includes('procedimiento')) {
    return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
  }
  if (t.includes('instructivo')) {
    return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  }
  return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
}

onMounted(async () => {
  await Promise.all([cargarFiltrosTaxonomia(), cargarReporte()])
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
