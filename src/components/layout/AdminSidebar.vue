<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="layoutStore.isSidebarOpen"
      class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden"
      @click="layoutStore.closeSidebar"
    ></div>
  </Transition>

  <aside
    class="fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 shadow-2xl
           bg-azul-cope dark:bg-gray-900
           border-r border-transparent dark:border-gray-800"
    :class="[
      layoutStore.isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      layoutStore.isCollapsed ? 'w-20' : 'w-64'
    ]"
  >
    <div class="h-16 flex items-center justify-between px-6 shrink-0 bg-black/10 dark:bg-black/20 border-b border-white/5 dark:border-gray-800">

      <div v-if="!layoutStore.isCollapsed" class="flex items-center justify-center w-full fade-in">
        <img src="@/assets/logoyk1.svg" alt="YK" class="h-14 w-auto object-contain transition-all" />
      </div>

      <div v-else class="w-full flex justify-center fade-in">
        <img src="@/assets/yk.png" alt="YK" class="h-8 w-8 object-contain" />
      </div>

    </div>

    <nav
      class="flex-1 py-6 px-3 space-y-2 custom-scrollbar"
      :class="layoutStore.isCollapsed ? 'overflow-visible' : 'overflow-y-auto'"
    >
      <template v-for="item in menuItems" :key="item.id">

        <div v-if="!item.children" class="relative group">
            <RouterLink
            :to="item.route"
            @click="handleItemClick"
            class="flex items-center px-3 py-3 rounded-lg transition-all duration-200 group border-l-4"
            :class="[
                isActive(item.route)
                ? 'bg-white/10 dark:bg-gray-800 border-verde-cope text-white dark:text-verde-cope shadow-lg'
                : 'border-transparent text-gray-300 dark:text-gray-400 hover:bg-white/5 dark:hover:bg-gray-800 hover:text-white dark:hover:text-gray-100',
                layoutStore.isCollapsed ? 'justify-center pl-0 border-l-0' : ''
            ]"
            >
                <span class="shrink-0 transition-colors duration-200"
                      :class="isActive(item.route) ? 'text-verde-cope' : 'group-hover:text-verde-cope'">
                    <svg v-html="item.iconSvg" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"></svg>
                </span>

                <span v-if="!layoutStore.isCollapsed" class="ml-3 font-medium text-sm truncate">
                    {{ item.label }}
                </span>
            </RouterLink>

            <div
                v-if="layoutStore.isCollapsed"
                class="absolute left-full top-0 ml-2 px-3 py-2 bg-verde-cope text-white text-sm font-bold rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none"
                style="width: max-content;"
            >
                {{ item.label }}
                <div class="absolute top-3 -left-1 w-2 h-2 bg-verde-cope transform rotate-45"></div>
            </div>
        </div>

        <div v-else class="relative group">
            <button
                @click="handleGroupClick(item.id)"
                class="w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group border-l-4 border-transparent"
                :class="[
                    openGroups.includes(item.id) && !layoutStore.isCollapsed
                    ? 'bg-black/20 dark:bg-black/40 text-white dark:text-gray-100'
                    : 'text-gray-300 dark:text-gray-400 hover:bg-white/5 dark:hover:bg-gray-800 hover:text-white',
                    layoutStore.isCollapsed ? 'justify-center pl-0' : 'justify-between'
                ]"
            >
                <div class="flex items-center">
                    <span class="shrink-0 transition-colors" :class="openGroups.includes(item.id) ? 'text-verde-cope' : 'group-hover:text-verde-cope'">
                        <svg v-html="item.iconSvg" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"></svg>
                    </span>
                    <span v-if="!layoutStore.isCollapsed" class="ml-3 font-medium text-sm truncate">{{ item.label }}</span>
                </div>

                <svg
                    v-if="!layoutStore.isCollapsed"
                    class="w-4 h-4 transition-transform duration-300"
                    :class="openGroups.includes(item.id) ? 'text-verde-cope rotate-180' : 'text-gray-400'"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <!-- POP-OVER FLOTANTE (SOLO CUANDO COLAPSADO) -->
            <div
                v-if="layoutStore.isCollapsed"
                class="absolute left-full top-0 ml-4 w-64
                       bg-azul-cope dark:bg-gray-800
                       border-l-4 border-verde-cope
                       rounded-xl shadow-2xl
                       opacity-0 invisible
                       group-hover:opacity-100 group-hover:visible
                       transition-all duration-300 ease-out
                       origin-top-left
                       group-hover:scale-100 scale-95
                       group-hover:translate-x-1
                       z-50"
            >
                 <div class="px-3 py-2 text-xs font-semibold text-verde-cope uppercase tracking-wider border-b border-white/10 dark:border-gray-700 mb-1">
                    {{ item.label }}
                 </div>

                 <RouterLink
                  v-for="child in item.children"
                  :key="child.route"
                  :to="child.route"
                  @click="handleItemClick"
                  class="block px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                  :class="isActive(child.route)
                    ? 'bg-white/10 text-white font-medium shadow-sm'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="isActive(child.route) ? 'bg-verde-cope' : 'bg-gray-400'"></span>
                  {{ child.label }}
                </RouterLink>

                 <!-- Colita / Flecha apuntando al botón padre (Verde para efecto 'llave' { ) -->
                 <div
                   class="absolute left-0 top-5 -translate-x-1/2
                          w-3 h-3 bg-verde-cope
                          border-l border-b border-white/10
                          rotate-45"
                 ></div>
            </div>

            <!-- ACORDEÓN EXPANDIDO (SOLO CUANDO ESTÁ ABIERTO) -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <div
                    v-if="openGroups.includes(item.id) && !layoutStore.isCollapsed"
                    class="mt-2 ml-3 space-y-1 relative"
                >


                    <RouterLink
                        v-for="child in item.children"
                        :key="child.route"
                        :to="child.route"
                        @click="handleItemClick"
                        class="relative group/child flex items-center gap-3 px-3 py-2 rounded-r-lg rounded-bl-lg ml-2 text-sm transition-all duration-200"
                        :class="isActive(child.route)
                            ? 'bg-verde-cope/10 text-verde-cope font-bold translate-x-1'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1'"
                    >
                         <!-- Indicador circular animado -->
                         <span
                            class="w-1.5 h-1.5 rounded-full transition-all duration-300 ring-2"
                            :class="isActive(child.route)
                                ? 'bg-verde-cope ring-verde-cope/30 scale-110'
                                : 'bg-gray-600 ring-transparent group-hover/child:bg-gray-300'"
                         ></span>

                         {{ child.label }}
                    </RouterLink>
                </div>
            </transition>
        </div>
      </template>
    </nav>

    <div class="p-4 mt-auto border-t border-white/10 dark:border-gray-800 shrink-0">
        <div v-if="!layoutStore.isCollapsed" class="fade-in text-center">
            <p class="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">Desarrollado por</p>
            <p class="text-xs font-bold text-white dark:text-gray-300 tracking-wide">
                Área de Informática <span class="text-verde-cope">2025</span>
            </p>
        </div>
        <div v-else class="flex justify-center fade-in">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-600 hover:text-verde-cope cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
        </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
// import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const layoutStore = useLayoutStore()
// const authStore = useAuthStore()
const openGroups = ref<string[]>([])

// --- NUEVA FUNCIÓN PARA CERRAR EN MÓVIL ---
const handleItemClick = () => {
  if (window.innerWidth < 768) {
      layoutStore.closeSidebar()
  }
}



// Helper para verificar roles administrativos
// (Se usa dentro del computed para lógica dinámica)

const menuItems = computed(() => {

    /**
     * --- EJEMPLO DE GRUPO DINÁMICO (COMENTADO) ---
     * Este patrón asegura que el botón "Padre" del sidebar SOLO se muestre
     * si el usuario tiene permiso para ver al menos uno de sus hijos.
     */
    /*
    const ventasChildren = [
        // Hijo 1: Requiere permiso 'ver_reportes_ventas'
        ...(authStore.hasPermission('ver_reportes_ventas') ? [{
            label: 'Reportes de Ventas',
            route: '/admin/ventas/reportes'
        }] : []),

        // Hijo 2: Requiere Rol 'Gerente'
        ...(authStore.hasRole('Gerente') ? [{
            label: 'Configuración de Caja',
            route: '/admin/ventas/config'
        }] : [])
    ];
    */

    const items = [
        {
            id: 'home',
            label: 'Dashboard',
            route: '/admin/dashboard',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2v10a1 1 0 01-1 1h-3m-4 0h4" />',
            show: true
        },

        // --- EJEMPLO BASE FUNCIONAL CON SUBITEMS (Siempre visible) ---
        // Útil para agrupar opciones sin depender de permisos
        {
            id: 'ejemplo-base-grupo',
            label: 'Ejemplo Grupo',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />',
            show: true,
            children: [
                { label: 'Opción A', route: '/admin/dashboard#opcion-a' },
                { label: 'Opción B', route: '/admin/dashboard#opcion-b' }
            ]
        },

        /*
        // --- CONTINUACIÓN EJEMPLO GRUPO DINÁMICO ---
        {
            id: 'modulo-ventas',
            label: 'Módulo de Ventas',
            iconSvg: '<path ... />', // Tu SVG aquí
            // MAGIA AQUÍ: show depende de si `ventasChildren` tiene elementos
            show: ventasChildren.length > 0,
            children: ventasChildren
        }
        */
    ]

    return items.filter(item => item.show)
})

const isActive = (path: string) => route.path === path

const handleGroupClick = (id: string) => {
    if (layoutStore.isCollapsed) return
    if (openGroups.value.includes(id)) {
        openGroups.value = []
    } else {
        openGroups.value = [id]
    }
}
</script>

<style scoped>
.fade-in { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); border-radius: 20px; }
</style>
