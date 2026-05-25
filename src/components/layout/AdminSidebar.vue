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

        <div class="relative group">
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

        <!--
        ============================================================
        PLANTILLA BASE: GRUPO CON SUBITEMS (ACORDEÓN + POPOVER)
        ============================================================
        Para activar este bloque en el futuro:
        1. Agrega 'children' al item del menú en menuItems
        2. Usa v-if="!item.children" en el bloque individual de arriba
        3. Cambia este comentario por v-else

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
                <svg v-if="!layoutStore.isCollapsed" class="w-4 h-4 transition-transform duration-300"
                     :class="openGroups.includes(item.id) ? 'text-verde-cope rotate-180' : 'text-gray-400'"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div v-if="layoutStore.isCollapsed"
                 class="absolute left-full top-0 ml-4 w-64 bg-azul-cope dark:bg-gray-800 border-l-4 border-verde-cope rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out origin-top-left group-hover:scale-100 scale-95 group-hover:translate-x-1 z-50">
                <div class="px-3 py-2 text-xs font-semibold text-verde-cope uppercase tracking-wider border-b border-white/10 dark:border-gray-700 mb-1">
                    {{ item.label }}
                </div>
                <RouterLink v-for="child in item.children" :key="child.route" :to="child.route" @click="handleItemClick"
                    class="block px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                    :class="isActive(child.route) ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-gray-300 hover:bg-white/5 hover:text-white'">
                    <span class="w-1.5 h-1.5 rounded-full" :class="isActive(child.route) ? 'bg-verde-cope' : 'bg-gray-400'"></span>
                    {{ child.label }}
                </RouterLink>
                <div class="absolute left-0 top-5 -translate-x-1/2 w-3 h-3 bg-verde-cope border-l border-b border-white/10 rotate-45"></div>
            </div>

            <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
                        leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
                <div v-if="openGroups.includes(item.id) && !layoutStore.isCollapsed" class="mt-2 ml-3 space-y-1 relative">
                    <RouterLink v-for="child in item.children" :key="child.route" :to="child.route" @click="handleItemClick"
                        class="relative group/child flex items-center gap-3 px-3 py-2 rounded-r-lg rounded-bl-lg ml-2 text-sm transition-all duration-200"
                        :class="isActive(child.route) ? 'bg-verde-cope/10 text-verde-cope font-bold translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1'">
                        <span class="w-1.5 h-1.5 rounded-full transition-all duration-300 ring-2"
                              :class="isActive(child.route) ? 'bg-verde-cope ring-verde-cope/30 scale-110' : 'bg-gray-600 ring-transparent group-hover/child:bg-gray-300'"></span>
                        {{ child.label }}
                    </RouterLink>
                </div>
            </transition>
        </div>
        -->

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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const layoutStore = useLayoutStore()
const authStore = useAuthStore()

// --- NUEVA FUNCIÓN PARA CERRAR EN MÓVIL ---
const handleItemClick = () => {
  if (window.innerWidth < 768) {
      layoutStore.closeSidebar()
  }
}

const menuItems = computed(() => {
    const items = [
        {
            id: 'home',
            label: 'Dashboard',
            route: '/admin/dashboard',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2v10a1 1 0 01-1 1h-3m-4 0h4" />',
            show: true
        },
        {
            id: 'buscador-asociados',
            label: 'Buscador Asociados',
            route: '/admin/gestor/buscador',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />',
            show: authStore.hasPermission('buscar_crear_asociados')
        },
        {
            id: 'buscador-documentos',
            label: 'Buscador Documentos',
            route: '/admin/gestor/busqueda-documentos',
            iconSvg: '<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" />',
            show: authStore.hasPermission('buscar_docuemntos')
        },
        {
            id: 'categorias',
            label: 'Categorías',
            route: '/admin/gestor/categorias',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />',
            show: authStore.hasRole('Super Admin')
        },
        {
            id: 'biblioteca-manuales',
            label: 'Biblioteca Manuales',
            route: '/admin/manuales/biblioteca',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />',
            show: true
        },
        {
            id: 'config-manuales',
            label: 'Configuración Manuales',
            route: '/admin/manuales/configuracion',
            iconSvg: '<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />',
            show: authStore.hasPermission('admin_biblioteca')
        },
    ]

    return items.filter(item => item.show)
})


const isActive = (path: string) => route.path === path
</script>

<style scoped>
.fade-in { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); border-radius: 20px; }
</style>
