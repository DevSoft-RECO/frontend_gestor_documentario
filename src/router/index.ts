import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import AdminLayout from '@/layouts/AdminLayout.vue'

// Vistas
import CallbackView from '@/views/CallbackView.vue'
import DashboardView from '@/views/DashboardView.vue'
import UnauthorizedView from '@/views/UnauthorizedView.vue'

const routes: RouteRecordRaw[] = [
    // 1. RUTAS PÚBLICAS
    {
        path: '/',
        redirect: '/admin/dashboard'
    },
    {
        path: '/callback',
        name: 'callback',
        component: CallbackView
    },
    {
        path: '/unauthorized',
        name: 'unauthorized',
        component: UnauthorizedView
    },

    // 2. RUTAS PROTEGIDAS
    {
        path: '/admin',
        component: AdminLayout,
        meta: {
            requiresAuth: true,
            permission: 'nombre_del_permiso'
        },
        children: [
            {
                path: 'dashboard',
                name: 'dashboard',
                component: DashboardView,
                meta: {
                    title: 'Gestiones'
                }
            }
        ]
    },

    { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

// --- GUARDIA DE NAVEGACIÓN ---
router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()

    // 0. Callback o Unauthorized → siempre pasar
    if (to.name === 'callback' || to.name === 'unauthorized') {
        return next()
    }

    const isAuthenticated = !!authStore.token

    // Caso 1: Ruta requiere Auth y no tenemos token
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!isAuthenticated) {
            console.log('🔒 Acceso Hija: Usuario sin sesión. Iniciando flujo SSO...')
            authStore.login(to.fullPath); // Guardar URL original
            return next(false);
        }
    }

    // Caso 2: Estamos autenticados, verificar identidad
    if (isAuthenticated) {
        if (!authStore.isReady || !authStore.user) {
            try {
                await authStore.fetchUser();
            } catch {
                // RE-AUTENTICACIÓN FLUIDA: 
                // Si el token falló, intentamos PKCE de nuevo
                authStore.login(to.fullPath);
                return next(false);
            }
        }

        // Verificar permiso
        if (to.meta.permission && !authStore.hasPermission(to.meta.permission as string)) {
            const motherAppUrl = import.meta.env.VITE_MOTHER_APP_URL || 'http://localhost:5173'
            console.warn(`⛔ Acceso denegado: Falta permiso '${to.meta.permission}'.`)
            window.location.href = `${motherAppUrl}/apps`
            return next(false)
        }
    }

    next()
})


export default router
