import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useLayoutStore } from '@/stores/layout'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const layoutStore = useLayoutStore()
layoutStore.initTheme()

// Integración de Ecosistema (Heartbeat y Guardias)
import { startSessionGuards } from './utils/sessionGuards'
startSessionGuards()

// Detectar cambios del sistema en tiempo real
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {

    if (!localStorage.getItem('theme')) {
        layoutStore.initTheme()
    }
})

app.mount('#app')
