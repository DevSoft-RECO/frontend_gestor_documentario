<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  pdfDoc: any | null // pdfjs document proxy
}>()

const emit = defineEmits(['jumpToPage', 'highlight', 'clear'])

// Normaliza texto para búsqueda sin tildes ni mayúsculas
const normalizeText = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

const documentText = ref<Map<number, string>>(new Map())
const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchResults = ref<number[]>([])
const currentSearchIndex = ref(0)
const isExtractingText = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.pdfDoc, (newDoc) => {
  if (newDoc) {
    extractAllTextBackground(newDoc)
  }
}, { immediate: true })

const toggleSearch = () => {
  isSearchOpen.value = !isSearchOpen.value
  if (isSearchOpen.value) {
    nextTick(() => searchInputRef.value?.focus())
  } else {
    searchQuery.value = ''
    searchResults.value = []
    emit('clear')
  }
}

const extractAllTextBackground = async (doc: any) => {
  isExtractingText.value = true
  documentText.value.clear()
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item: any) => item.str).join(' ')
      documentText.value.set(i, normalizeText(text))
    }
  } catch (e) {
    console.warn("Error extrayendo texto en background", e)
  } finally {
    isExtractingText.value = false
  }
}

const executeSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    currentSearchIndex.value = 0
    emit('clear')
    return
  }
  
  const query = normalizeText(searchQuery.value.trim())
  const results: number[] = []
  
  documentText.value.forEach((text, pageNum) => {
    if (text.includes(query)) {
      results.push(pageNum)
    }
  })
  
  searchResults.value = results
  
  if (results.length > 0) {
    currentSearchIndex.value = 0
    emit('jumpToPage', results[0])
    emit('highlight', query)
  } else {
    emit('clear')
  }
}

const nextSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length
  emit('jumpToPage', searchResults.value[currentSearchIndex.value])
  emit('highlight', normalizeText(searchQuery.value.trim()))
}

const prevSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value - 1 + searchResults.value.length) % searchResults.value.length
  emit('jumpToPage', searchResults.value[currentSearchIndex.value])
  emit('highlight', normalizeText(searchQuery.value.trim()))
}
</script>

<template>
  <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all duration-300"
       :class="isSearchOpen ? 'px-3 py-1.5 border border-sky-500/50 shadow-sm' : 'p-1.5 border border-slate-200 dark:border-slate-700'">
    
    <button @click="toggleSearch" class="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-sky-500 transition-colors" title="Buscar en documento">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </button>
    
    <div v-show="isSearchOpen" class="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
      <input 
        ref="searchInputRef"
        v-model="searchQuery" 
        @keyup.enter="executeSearch"
        type="text" 
        placeholder="Buscar..." 
        class="bg-transparent border-none outline-none text-sm w-32 focus:ring-0 text-slate-700 dark:text-slate-200 placeholder-slate-400"
      />
      
      <!-- Result stats & navigation -->
      <div v-if="searchResults.length > 0" class="flex items-center gap-1 text-xs text-slate-400 font-bold border-l border-slate-300 dark:border-slate-600 pl-2">
        <span>{{ currentSearchIndex + 1 }}/{{ searchResults.length }}</span>
        <div class="flex flex-col gap-0 ml-1">
          <button @click="prevSearchResult" class="hover:text-sky-500 transition-colors" title="Anterior"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>
          <button @click="nextSearchResult" class="hover:text-sky-500 transition-colors" title="Siguiente"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
        </div>
      </div>
      
      <span v-else-if="searchQuery && !isExtractingText && searchResults.length === 0" class="text-[0.65rem] text-red-500 font-bold border-l border-slate-300 dark:border-slate-600 pl-2">0/0</span>
      
      <span v-if="isExtractingText" class="text-[0.65rem] text-sky-500 font-bold border-l border-slate-300 dark:border-slate-600 pl-2 flex items-center gap-1" title="Analizando documento...">
         <span class="inline-block w-3 h-3 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></span>
      </span>
      
      <button @click="toggleSearch" class="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Cerrar búsqueda">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  </div>
</template>
