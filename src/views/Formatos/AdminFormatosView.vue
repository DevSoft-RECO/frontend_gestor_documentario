<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans'] text-slate-800 dark:text-slate-100 relative overflow-hidden w-full">
    
    <!-- Background Gradients -->
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>

    <div class="w-full space-y-6 z-10 relative">

      <!-- ENCABEZADO -->
      <div class="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            Administración Central
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight font-['Outfit'] text-slate-900 dark:text-white">
            Configuración de Formatos Institucionales
          </h1>
          <p class="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-4xl">
            Gestiona las plantillas oficiales, áreas propietarias y la asignación granular de permisos de visualización y descarga por puesto de trabajo.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Botón Exportar CSV -->
          <button
            v-if="activeTab === 'formatos'"
            @click="exportarReporteCSV"
            :disabled="isExporting"
            class="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs shadow-sm hover:shadow transition-all transform hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            title="Exportar inventario y configuración de permisos en formato CSV para Excel"
          >
            <svg v-if="isExporting" class="animate-spin h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{{ isExporting ? 'Generando CSV...' : 'Exportar CSV' }}</span>
          </button>

          <button
            v-if="activeTab === 'formatos'"
            @click="abrirModalNuevoFormato"
            class="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Formato
          </button>
          
          <button
            v-if="activeTab === 'areas'"
            @click="abrirModalNuevaArea"
            class="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Área
          </button>
        </div>
      </div>

      <!-- TABS NAVEGACIÓN -->
      <div class="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          @click="activeTab = 'formatos'"
          class="px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'formatos' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white/60 dark:bg-slate-900/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <span>📑 Formatos Institucionales</span>
          <span class="px-2 py-0.5 rounded-full text-[0.65rem]" :class="activeTab === 'formatos' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">{{ pagination.total }}</span>
        </button>

        <button
          @click="activeTab = 'areas'"
          class="px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'areas' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white/60 dark:bg-slate-900/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <span>🏢 Áreas / Departamentos</span>
          <span class="px-2 py-0.5 rounded-full text-[0.65rem]" :class="activeTab === 'areas' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">{{ areas.length }}</span>
        </button>
      </div>

      <!-- TAB 1: GESTIÓN DE FORMATOS -->
      <div v-if="activeTab === 'formatos'" class="space-y-6">
        
        <!-- Filtros Rápidos -->
        <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div class="relative w-full sm:w-96">
            <input
              type="text"
              v-model="filtroSearch"
              @input="handleSearchDebounce"
              placeholder="Buscar por código o título..."
              class="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100"
            />
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <span class="text-xs font-bold text-slate-400 uppercase">Filtrar Área:</span>
            <select
              v-model="filtroAreaId"
              @change="cargarFormatos"
              class="p-2.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
            >
              <option value="">Todas las Áreas</option>
              <option v-for="area in areas" :key="area.id" :value="area.id">
                {{ area.nombre }}
              </option>
            </select>
          </div>
        </div>

        <!-- Tabla Formatos -->
        <div class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          
          <div v-if="isLoadingFormatos" class="p-16 flex flex-col items-center justify-center gap-3">
            <svg class="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-xs font-bold text-slate-400">Cargando formatos...</p>
          </div>

          <div v-else-if="formatos.length === 0" class="p-16 text-center text-slate-400 text-xs font-medium">
            No se encontraron formatos registrados. Haz clic en "Nuevo Formato" para cargar el primero.
          </div>

          <div v-else class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800 text-[0.68rem] uppercase font-extrabold text-slate-400 tracking-wider">
                  <th class="py-3.5 px-4 w-28">Código</th>
                  <th class="py-3.5 px-4 min-w-[220px]">Título del Formato</th>
                  <th class="py-3.5 px-4 min-w-[140px]">Área</th>
                  <th class="py-3.5 px-3 text-center">Tipo</th>
                  <th class="py-3.5 px-3 text-center">Versión</th>
                  <th class="py-3.5 px-4 min-w-[200px]">Permisos por Puesto</th>
                  <th class="py-3.5 px-4 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-150 dark:divide-slate-800/60 font-medium">
                <tr 
                  v-for="formato in formatos" 
                  :key="formato.id"
                  class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td class="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {{ formato.codigo }}
                  </td>

                  <td class="py-4 px-4">
                    <div class="font-bold text-slate-900 dark:text-white line-clamp-1">
                      {{ formato.titulo }}
                    </div>
                    <div class="text-[0.68rem] text-slate-400 line-clamp-1 mt-0.5">
                      {{ formato.descripcion || 'Sin descripción' }}
                    </div>
                  </td>

                  <td class="py-4 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                    {{ formato.area?.nombre || 'General' }}
                  </td>

                  <td class="py-4 px-3 text-center">
                    <span class="px-2 py-0.5 rounded-lg text-[0.65rem] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {{ formato.tipo_archivo.toUpperCase() }}
                    </span>
                  </td>

                  <td class="py-4 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    v{{ formato.version }}
                  </td>

                  <!-- Resumen de permisos por puesto -->
                  <td class="py-4 px-4">
                    <div v-if="formato.puestos_config && formato.puestos_config.length > 0" class="space-y-1">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[0.65rem] font-bold text-slate-400">Configurados: {{ formato.puestos_config.length }} puestos</span>
                      </div>
                      <div class="flex items-center gap-2 text-[0.65rem] text-slate-500">
                        <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ {{ formato.puestos_config.filter(p => p.puede_descargar).length }} con descarga
                        </span>
                        <span>•</span>
                        <span>
                          👁️ {{ formato.puestos_config.filter(p => p.puede_ver).length }} con vista
                        </span>
                      </div>
                    </div>
                    <div v-else class="text-[0.7rem] text-slate-400 italic">
                      Acceso General (Sin restricción)
                    </div>
                  </td>

                  <td class="py-4 px-4 text-center">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        @click="editarFormato(formato)"
                        title="Editar formato y permisos"
                        class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        @click="eliminarFormato(formato)"
                        title="Eliminar formato"
                        class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div class="p-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">Total: {{ pagination.total }} formatos</span>
            <div class="flex items-center gap-2">
              <button
                @click="cambiarPagina(pagination.page - 1)"
                :disabled="pagination.page <= 1"
                class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 font-bold cursor-pointer"
              >
                Anterior
              </button>
              <span class="font-bold px-2">{{ pagination.page }} de {{ totalPaginas }}</span>
              <button
                @click="cambiarPagina(pagination.page + 1)"
                :disabled="pagination.page >= totalPaginas"
                class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 font-bold cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>

        </div>

      </div>

      <!-- TAB 2: GESTIÓN DE ÁREAS -->
      <div v-else-if="activeTab === 'areas'" class="space-y-6">
        
        <div class="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="area in areas"
              :key="area.id"
              class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center"
            >
              <div>
                <h4 class="font-extrabold text-sm text-slate-800 dark:text-white">{{ area.nombre }}</h4>
                <p class="text-[0.7rem] text-slate-400 mt-0.5">Área oficial registrada</p>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  @click="editarArea(area)"
                  class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                  title="Editar Área"
                >
                  ✏️
                </button>
                <button
                  @click="eliminarArea(area)"
                  class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer"
                  title="Eliminar Área"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- MODAL FORMULARIO DE FORMATO (CON PERMISOS POR PUESTO) -->
    <div v-if="showModalFormato" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        <!-- Header Modal -->
        <div class="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 class="font-extrabold text-base tracking-tight font-['Outfit'] text-slate-900 dark:text-white">
              {{ formFormato.id ? '✏️ Editar Formato Institucional' : '➕ Subir Nuevo Formato Oficial' }}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Define los metadatos y la asignación de permisos de descarga por puesto
            </p>
          </div>
          <button @click="showModalFormato = false" class="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">×</button>
        </div>

        <!-- Body Modal -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- Área -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Área Emisora *</label>
              <select
                v-model="formFormato.formato_area_id"
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              >
                <option value="">Selecciona un área...</option>
                <option v-for="area in areas" :key="area.id" :value="area.id">
                  {{ area.nombre }}
                </option>
              </select>
            </div>

            <!-- Código -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Código Oficial (Ej: FOR-CRE-001) *</label>
              <input
                type="text"
                v-model="formFormato.codigo"
                placeholder="FOR-CRE-001"
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-mono"
              />
            </div>

          </div>

          <!-- Título -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Título del Formato *</label>
            <input
              type="text"
              v-model="formFormato.titulo"
              placeholder="Ej: Solicitud de Crédito Individual y Pagaré"
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
            />
          </div>

          <!-- Descripción -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Descripción u Objetivo</label>
            <textarea
              v-model="formFormato.descripcion"
              rows="2"
              placeholder="Describe el propósito y uso del formato..."
              class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <!-- Versión -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Versión</label>
              <input
                type="text"
                v-model="formFormato.version"
                placeholder="1.0"
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              />
            </div>

            <!-- Fecha Aprobación -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Fecha Aprobación</label>
              <input
                type="date"
                v-model="formFormato.fecha_aprobacion"
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              />
            </div>

            <!-- Fecha Vigencia -->
            <div class="space-y-1.5">
              <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Fecha Vigencia</label>
              <input
                type="date"
                v-model="formFormato.fecha_vigencia"
                class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              />
            </div>

          </div>

          <!-- Archivo Físico (PDF, Word, Excel) -->
          <div class="space-y-1.5">
            <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">
              Archivo Oficial (PDF, Word .docx, Excel .xlsx) {{ formFormato.id ? '(Opcional si no deseas reemplazar)' : '*' }}
            </label>
            <label class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer hover:border-emerald-500 transition-all">
              <span class="text-2xl">📥</span>
              <span class="text-xs font-bold text-slate-500 truncate max-w-sm">
                {{ selectedFile ? selectedFile.name : (formFormato.id ? 'Dejar vacío para conservar el archivo actual' : 'Selecciona un archivo PDF, DOCX o XLSX') }}
              </span>
              <input type="file" accept=".pdf,.docx,.xlsx,.doc,.xls" @change="onFileChange" hidden />
            </label>
          </div>

          <!-- SECCIÓN CLAVE: PERMISOS POR PUESTO (VER Y DESCARGAR) -->
          <div class="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  🔐 Permisos de Descarga y Acceso por Puesto
                </h4>
                <p class="text-[0.65rem] text-slate-400">
                  Define qué puestos pueden consultar y cuáles tienen autorización para descargar este formato
                </p>
              </div>

              <!-- Botones rápidos -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="marcarTodosVer"
                  class="text-[0.65rem] font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-500 underline cursor-pointer"
                >
                  Ver Todos
                </button>
                <span>•</span>
                <button
                  type="button"
                  @click="marcarTodosDescarga"
                  class="text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Descargar Todos
                </button>
                <span>•</span>
                <button
                  type="button"
                  @click="desmarcarTodos"
                  class="text-[0.65rem] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <!-- Lista de Puestos con switches -->
            <div class="max-h-60 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-150 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
              <div
                v-for="puesto in puestos"
                :key="puesto.id"
                class="p-3 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div class="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {{ puesto.nombre }}
                </div>

                <div class="flex items-center gap-4 shrink-0">
                  <!-- Checkbox Ver -->
                  <label class="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      :checked="getPuestoConfig(puesto.id).puede_ver"
                      @change="togglePuestoVer(puesto.id)"
                      class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span class="text-[0.7rem] font-semibold text-slate-600 dark:text-slate-400">Ver</span>
                  </label>

                  <!-- Checkbox Descargar (CLAVE) -->
                  <label class="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      :checked="getPuestoConfig(puesto.id).puede_descargar"
                      @change="togglePuestoDescargar(puesto.id)"
                      class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span 
                      class="text-[0.7rem] font-extrabold px-2 py-0.5 rounded-lg border transition-all"
                      :class="getPuestoConfig(puesto.id).puede_descargar ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'"
                    >
                      Descargar
                    </span>
                  </label>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- Footer Modal -->
        <div class="p-6 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            @click="showModalFormato = false"
            class="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            @click="guardarFormato"
            :disabled="isSaving"
            class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
          >
            <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ isSaving ? 'Guardando...' : 'Guardar Formato' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- MODAL GESTIÓN DE ÁREA -->
    <div v-if="showModalArea" class="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 class="font-extrabold text-base font-['Outfit'] text-slate-900 dark:text-white">
          {{ formArea.id ? '✏️ Editar Área' : '➕ Nueva Área Emisora' }}
        </h3>

        <div class="space-y-1.5">
          <label class="block text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-wider ml-1">Nombre del Área *</label>
          <input
            type="text"
            v-model="formArea.nombre"
            placeholder="Ej: Gerencia de Créditos, Recursos Humanos..."
            class="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
          />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="showModalArea = false"
            class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            @click="guardarArea"
            class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import Swal from 'sweetalert2'

interface Area {
  id: number
  nombre: string
}

interface Puesto {
  id: number
  nombre: string
}

interface PuestoConfigRule {
  puesto_id: number
  puede_ver: boolean
  puede_descargar: boolean
}

interface FormatoAdmin {
  id: number
  formato_area_id: number
  codigo: string
  titulo: string
  descripcion: string
  tipo_archivo: string
  version: string
  fecha_aprobacion?: string
  fecha_vigencia?: string
  area?: Area
  puestos_config?: {
    puesto_id: number
    puede_ver: boolean
    puede_descargar: boolean
    puesto?: Puesto
  }[]
}

const activeTab = ref<'formatos' | 'areas'>('formatos')
const isLoadingFormatos = ref(false)
const isSaving = ref(false)
const isExporting = ref(false)

const formatos = ref<FormatoAdmin[]>([])
const areas = ref<Area[]>([])
const puestos = ref<Puesto[]>([])

const filtroSearch = ref('')
const filtroAreaId = ref('')
let searchTimeout: any = null

const pagination = ref({
  page: 1,
  limit: 15,
  total: 0
})

const totalPaginas = computed(() => Math.ceil(pagination.value.total / pagination.value.limit) || 1)

// --- FORMULARIOS ---
const showModalFormato = ref(false)
const selectedFile = ref<File | null>(null)
const puestoConfigsMap = ref<Record<number, { puede_ver: boolean; puede_descargar: boolean }>>({})

const formFormato = ref({
  id: null as number | null,
  formato_area_id: '',
  codigo: '',
  titulo: '',
  descripcion: '',
  version: '1.0',
  fecha_aprobacion: '',
  fecha_vigencia: ''
})

const showModalArea = ref(false)
const formArea = ref({
  id: null as number | null,
  nombre: ''
})

// --- CARGA DE DATOS ---

const cargarAreas = async () => {
  try {
    const res = await api.get('/formatos/areas')
    areas.value = res.data || []
  } catch (err) {
    console.error('Error al cargar áreas:', err)
  }
}

const cargarPuestos = async () => {
  try {
    const res = await api.get('/formatos/puestos')
    puestos.value = res.data || []
  } catch (err) {
    console.error('Error al cargar puestos:', err)
  }
}

const cargarFormatos = async () => {
  isLoadingFormatos.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    if (filtroSearch.value.trim()) params.search = filtroSearch.value.trim()
    if (filtroAreaId.value) params.area_id = filtroAreaId.value

    const res = await api.get('/formatos/admin/documentos', { params })
    formatos.value = res.data.documentos || []
    pagination.value.total = res.data.total || 0
  } catch (err) {
    console.error('Error al cargar formatos:', err)
  } finally {
    isLoadingFormatos.value = false
  }
}

const handleSearchDebounce = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    cargarFormatos()
  }, 350)
}

const cambiarPagina = (p: number) => {
  pagination.value.page = p
  cargarFormatos()
}

// --- CONFIGURACIÓN DE PUESTOS EN MODAL ---

const getPuestoConfig = (puestoId: number) => {
  if (!puestoConfigsMap.value[puestoId]) {
    puestoConfigsMap.value[puestoId] = { puede_ver: true, puede_descargar: false }
  }
  return puestoConfigsMap.value[puestoId]
}

const togglePuestoVer = (puestoId: number) => {
  const cfg = getPuestoConfig(puestoId)
  cfg.puede_ver = !cfg.puede_ver
  if (!cfg.puede_ver) {
    cfg.puede_descargar = false // Si no puede ver, tampoco descargar
  }
}

const togglePuestoDescargar = (puestoId: number) => {
  const cfg = getPuestoConfig(puestoId)
  cfg.puede_descargar = !cfg.puede_descargar
  if (cfg.puede_descargar) {
    cfg.puede_ver = true // Si puede descargar, forzosamente puede ver
  }
}

const marcarTodosVer = () => {
  puestos.value.forEach(p => {
    getPuestoConfig(p.id).puede_ver = true
  })
}

const marcarTodosDescarga = () => {
  puestos.value.forEach(p => {
    const cfg = getPuestoConfig(p.id)
    cfg.puede_ver = true
    cfg.puede_descargar = true
  })
}

const desmarcarTodos = () => {
  puestos.value.forEach(p => {
    const cfg = getPuestoConfig(p.id)
    cfg.puede_ver = false
    cfg.puede_descargar = false
  })
}

// --- CREAR / EDITAR FORMATO ---

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

const abrirModalNuevoFormato = () => {
  selectedFile.value = null
  puestoConfigsMap.value = {}
  puestos.value.forEach(p => {
    puestoConfigsMap.value[p.id] = { puede_ver: true, puede_descargar: false }
  })

  formFormato.value = {
    id: null,
    formato_area_id: areas.value.length > 0 ? areas.value[0].id.toString() : '',
    codigo: '',
    titulo: '',
    descripcion: '',
    version: '1.0',
    fecha_aprobacion: '',
    fecha_vigencia: ''
  }
  showModalFormato.value = true
}

const editarFormato = (f: FormatoAdmin) => {
  selectedFile.value = null
  puestoConfigsMap.value = {}

  // Inicializar todos los puestos
  puestos.value.forEach(p => {
    puestoConfigsMap.value[p.id] = { puede_ver: false, puede_descargar: false }
  })

  // Cargar reglas existentes
  if (f.puestos_config && f.puestos_config.length > 0) {
    f.puestos_config.forEach(pc => {
      puestoConfigsMap.value[pc.puesto_id] = {
        puede_ver: pc.puede_ver,
        puede_descargar: pc.puede_descargar
      }
    })
  } else {
    // Si no tenía reglas, marcar todos por defecto
    puestos.value.forEach(p => {
      puestoConfigsMap.value[p.id] = { puede_ver: true, puede_descargar: true }
    })
  }

  formFormato.value = {
    id: f.id,
    formato_area_id: f.formato_area_id.toString(),
    codigo: f.codigo,
    titulo: f.titulo,
    descripcion: f.descripcion || '',
    version: f.version || '1.0',
    fecha_aprobacion: f.fecha_aprobacion ? f.fecha_aprobacion.substring(0, 10) : '',
    fecha_vigencia: f.fecha_vigencia ? f.fecha_vigencia.substring(0, 10) : ''
  }
  showModalFormato.value = true
}

const guardarFormato = async () => {
  if (!formFormato.value.formato_area_id || !formFormato.value.codigo || !formFormato.value.titulo) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos requeridos',
      text: 'Por favor completa el Área, Código y Título del formato.'
    })
    return
  }

  if (!formFormato.value.id && !selectedFile.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Archivo obligatorio',
      text: 'Debes seleccionar un archivo para el formato.'
    })
    return
  }

  isSaving.value = true
  try {
    const formData = new FormData()
    formData.append('formato_area_id', formFormato.value.formato_area_id)
    formData.append('codigo', formFormato.value.codigo)
    formData.append('titulo', formFormato.value.titulo)
    formData.append('descripcion', formFormato.value.descripcion)
    formData.append('version', formFormato.value.version)
    formData.append('fecha_aprobacion', formFormato.value.fecha_aprobacion)
    formData.append('fecha_vigencia', formFormato.value.fecha_vigencia)

    if (selectedFile.value) {
      formData.append('documento', selectedFile.value)
    }

    // Reglas de puesto
    const configsArr: PuestoConfigRule[] = []
    Object.keys(puestoConfigsMap.value).forEach(k => {
      const pId = parseInt(k)
      const val = puestoConfigsMap.value[pId]
      if (val.puede_ver || val.puede_descargar) {
        configsArr.push({
          puesto_id: pId,
          puede_ver: val.puede_ver,
          puede_descargar: val.puede_descargar
        })
      }
    })
    formData.append('puestos_config', JSON.stringify(configsArr))

    if (formFormato.value.id) {
      await api.put(`/formatos/admin/documentos/${formFormato.value.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } else {
      await api.post('/formatos/admin/documentos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }

    showModalFormato.value = false
    Swal.fire({
      icon: 'success',
      title: '¡Guardado!',
      text: 'El formato institucional y sus permisos fueron guardados con éxito.',
      timer: 1500,
      showConfirmButton: false
    })
    cargarFormatos()
  } catch (err: any) {
    console.error('Error al guardar formato:', err)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.response?.data?.error || 'No se pudo guardar el formato.'
    })
  } finally {
    isSaving.value = false
  }
}

const eliminarFormato = async (f: FormatoAdmin) => {
  const result = await Swal.fire({
    title: '¿Eliminar Formato?',
    text: `Se eliminará permanentemente ${f.codigo} - ${f.titulo}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    try {
      await api.delete(`/formatos/admin/documentos/${f.id}`)
      Swal.fire('Eliminado', 'El formato fue retirado del sistema.', 'success')
      cargarFormatos()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo eliminar el formato.', 'error')
    }
  }
}

// --- GESTIÓN DE ÁREAS ---

const abrirModalNuevaArea = () => {
  formArea.value = { id: null, nombre: '' }
  showModalArea.value = true
}

const editarArea = (area: Area) => {
  formArea.value = { id: area.id, nombre: area.nombre }
  showModalArea.value = true
}

const guardarArea = async () => {
  if (!formArea.value.nombre.trim()) return
  try {
    if (formArea.value.id) {
      await api.put(`/formatos/admin/areas/${formArea.value.id}`, { nombre: formArea.value.nombre })
    } else {
      await api.post('/formatos/admin/areas', { nombre: formArea.value.nombre })
    }
    showModalArea.value = false
    cargarAreas()
  } catch (err) {
    console.error(err)
    Swal.fire('Error', 'No se pudo guardar el área.', 'error')
  }
}

const eliminarArea = async (area: Area) => {
  const result = await Swal.fire({
    title: '¿Eliminar Área?',
    text: `Se eliminará el área "${area.nombre}"`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    try {
      await api.delete(`/formatos/admin/areas/${area.id}`)
      cargarAreas()
    } catch (err: any) {
      Swal.fire('No permitido', err?.response?.data?.error || 'Error al eliminar área', 'error')
    }
  }
}

// --- EXPORTAR REPORTE CSV ---
const exportarReporteCSV = async () => {
  if (isExporting.value) return
  isExporting.value = true

  try {
    const params: Record<string, string> = {}
    if (filtroSearch.value.trim() !== '') {
      params.search = filtroSearch.value.trim()
    }
    if (filtroAreaId.value !== '') {
      params.area_id = filtroAreaId.value
    }

    const res = await api.get('/formatos/admin/exportar', {
      params,
      responseType: 'blob'
    })

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const fechaStr = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `reporte_formatos_institucionales_${fechaStr}.csv`)

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    Swal.fire({
      icon: 'success',
      title: 'Reporte generado',
      text: 'El inventario de formatos institucionales se exportó exitosamente en CSV.',
      timer: 2500,
      showConfirmButton: false
    })
  } catch (err: any) {
    console.error('Error al exportar reporte CSV:', err)
    Swal.fire({
      icon: 'error',
      title: 'Error de exportación',
      text: err?.response?.data?.error || 'No se pudo generar el reporte en CSV.',
      confirmButtonColor: '#059669'
    })
  } finally {
    isExporting.value = false
  }
}

onMounted(() => {
  cargarAreas()
  cargarPuestos()
  cargarFormatos()
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
