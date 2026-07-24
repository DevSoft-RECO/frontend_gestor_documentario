import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import AdminLayout from '@/layouts/AdminLayout.vue'

// Vistas
import CallbackView from '@/views/CallbackView.vue'
import DashboardView from '@/views/DashboardView.vue'
import UnauthorizedView from '@/views/UnauthorizedView.vue'
import CategoriasView from '@/views/GestorDocumental/Categorias/CategoriasView.vue'
import BuscadorView from '@/views/GestorDocumental/Asociados/BuscadorView.vue'
import PerfilView from '@/views/GestorDocumental/Asociados/PerfilView.vue'
import DocumentoBusquedaView from '@/views/GestorDocumental/Busqueda/DocumentoBusquedaView.vue'
import BibliotecaView from '@/views/Manuales/BibliotecaView.vue'
import AdminManualesView from '@/views/Manuales/AdminManualesView.vue'

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
            permission: 'app_documentos'
        },
        children: [
            {
                path: 'dashboard',
                name: 'dashboard',
                component: DashboardView,
                meta: {
                    title: 'Gestiones'
                }
            },
            {
                path: 'gestor/categorias',
                name: 'gestor-categorias',
                component: CategoriasView,
                meta: {
                    title: 'Configuración de Categorías',
                    role: 'Super Admin'
                }
            },
            {
                path: 'gestor/admin/asociados',
                name: 'gestor-admin-asociados',
                component: () => import('@/views/GestorDocumental/Asociados/AdminAsociadosView.vue'),
                meta: {
                    title: 'Administrar Portafolios',
                    role: 'Super Admin'
                }
            },
            {
                path: 'gestor/buscador',
                name: 'gestor-buscador',
                component: BuscadorView,
                meta: {
                    title: 'Buscador de Asociados',
                    permission: 'buscar_crear_asociados'
                }
            },
            {
                path: 'gestor/asociados/:id',
                name: 'gestor-perfil',
                component: PerfilView,
                meta: {
                    title: 'Perfil del Asociado'
                }
            },
            {
                path: 'gestor/busqueda-documentos',
                name: 'gestor-busqueda-docs',
                component: DocumentoBusquedaView,
                meta: {
                    title: 'Buscador por Número Físico',
                    permission: 'buscar_docuemntos'
                }
            },
            {
                path: 'gestor/papelera',
                name: 'gestor-papelera',
                component: () => import('@/views/GestorDocumental/Papelera/PapeleraView.vue'),
                meta: {
                    title: 'Papelera de Reciclaje'
                }
            },
            {
                path: 'manuales/biblioteca',
                name: 'manuales-biblioteca',
                component: BibliotecaView,
                meta: {
                    title: 'Biblioteca de Normativas'
                }
            },
            {
                path: 'manuales/configuracion',
                name: 'manuales-configuracion',
                component: AdminManualesView,
                meta: {
                    title: 'Configuración de Normativas',
                    permission: 'admin_biblioteca'
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
            console.warn(`⛔ Acceso denegado: Falta permiso '${to.meta.permission}'.`)
            return next({ name: 'unauthorized' })
        }

        // Verificar Rol
        if (to.meta.role && !authStore.hasRole(to.meta.role as string)) {
            console.warn(`⛔ Acceso denegado: Falta rol '${to.meta.role}'.`)
            return next({ name: 'unauthorized' })
        }
    }

    next()
})


export default router
