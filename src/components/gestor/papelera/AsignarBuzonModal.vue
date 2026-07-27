<script setup lang="ts">
import { ref, computed } from 'vue'

interface Usuario {
  id: number
  name: string
}

interface DocumentoEliminado {
  id: number
  nombre_subcategoria: string
  nombre_asociado: string
  usuario_asignado_id?: number
}

const props = defineProps<{
  show: boolean
  documento: DocumentoEliminado | null
  usuarios: Usuario[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'assign', userId: number): void
}>()

const searchQuery = ref('')
const selectedUserId = ref<number | null>(props.documento?.usuario_asignado_id || null)

const filteredUsuarios = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.usuarios
  return props.usuarios.filter(user => user.name.toLowerCase().includes(q))
})

const handleSelectUser = (userId: number) => {
  selectedUserId.value = userId
}

const handleConfirm = () => {
  if (selectedUserId.value !== null) {
    emit('assign', selectedUserId.value)
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-50">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-[90%] max-w-[460px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
        <h3 class="font-['Outfit'] text-base font-bold text-slate-800 dark:text-slate-100">Asignar Documento a Buzón</h3>
        <button @click="emit('close')" class="bg-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white text-xl border-0 cursor-pointer">&times;</button>
      </div>

      <!-- Body -->
      <div class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        <div v-if="documento" class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-600 dark:text-slate-400">
            Elige qué usuario será responsable de descargar el archivo:
          </p>
          <div class="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          {{ documento.nombre_subcategoria }} - {{ documento.nombre_asociado }}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[0.7rem] font-extrabold text-slate-450 uppercase tracking-wider">Destinatario</label>
          
          <!-- Buscador -->
          <div class="relative">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Buscar usuario por nombre..." 
              class="w-full px-3 py-2.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-sky-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 transition duration-200"
            />
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              Limpiar
            </button>
          </div>

          <!-- Lista de usuarios filtrados -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl max-h-[220px] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-800/30">
            <div 
              v-for="user in filteredUsuarios" 
              :key="user.id"
              @click="handleSelectUser(user.id)"
              :class="[
                'p-3 flex items-center justify-between cursor-pointer border-b border-slate-100 last:border-0 dark:border-slate-800 transition duration-150',
                selectedUserId === user.id 
                  ? 'bg-sky-500/10 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 font-bold border-l-4 border-l-sky-500' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              ]"
            >
              <span class="text-xs">{{ user.name }}</span>
              <span v-if="selectedUserId === user.id" class="text-sky-500 font-black text-xs font-sans">✓</span>
            </div>
            <div v-if="filteredUsuarios.length === 0" class="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No se encontraron usuarios
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
        <button @click="emit('close')" class="bg-slate-900/5 hover:bg-slate-900/10 text-slate-650 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-900/5 dark:border-white/10 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition duration-200">Cancelar</button>
        <button 
          @click="handleConfirm" 
          class="bg-sky-500 hover:bg-sky-650 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition duration-200 border-0 disabled:opacity-50 disabled:cursor-not-allowed" 
          :disabled="selectedUserId === null"
        >
          Confirmar Asignación
        </button>
      </div>
    </div>
  </div>
</template>
