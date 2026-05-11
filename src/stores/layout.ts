// src/stores/layout.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLayoutStore = defineStore('layout', () => {
    // --- STATE ---
    const isSidebarOpen = ref<boolean>(false)
    const isCollapsed = ref<boolean>(true)
    const isDark = ref<boolean>(false)

    // --- ACTIONS ---

    function toggleSidebar(): void {
        isSidebarOpen.value = !isSidebarOpen.value
    }

    function closeSidebar(): void {
        isSidebarOpen.value = false
    }

    function toggleCollapse(): void {
        isCollapsed.value = !isCollapsed.value
        if (window.innerWidth >= 1024) {
            localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
        }
    }

    // --- LÓGICA RESPONSIVA ---
    function handleResize(): void {
        const width = window.innerWidth

        if (width < 768) {
            isSidebarOpen.value = false
            isCollapsed.value = false
        }
        else if (width >= 768 && width < 1024) {
            isCollapsed.value = true
            isSidebarOpen.value = false
        }
        else {
            const storedCollapse = localStorage.getItem('sidebar_collapsed')

            if (storedCollapse === null) {
                isCollapsed.value = true
            } else {
                isCollapsed.value = storedCollapse === 'true'
            }
        }
    }

    function toggleTheme(): void {
        isDark.value = !isDark.value
        updateDOMAndStorage()
    }

    function updateDOMAndStorage(): void {
        if (isDark.value) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    function initTheme(): void {
        const storedTheme = localStorage.getItem('theme')
        if (storedTheme) {
            isDark.value = storedTheme === 'dark'
        } else {
            isDark.value = shouldBeDarkAutomatic()
        }

        if (isDark.value) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')

        handleResize()
        window.addEventListener('resize', handleResize)
    }

    function shouldBeDarkAutomatic(): boolean {
        const guatemalaTime = new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" })
        const hour = new Date(guatemalaTime).getHours()
        const isNightTime = hour >= 18 || hour < 6
        const prefersDarkSystem = window.matchMedia("(prefers-color-scheme: dark)").matches
        return isNightTime || prefersDarkSystem
    }

    return {
        isSidebarOpen,
        isCollapsed,
        isDark,
        toggleSidebar,
        closeSidebar,
        toggleCollapse,
        toggleTheme,
        initTheme,
        handleResize
    }
})
