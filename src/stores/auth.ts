import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import AuthService from '../services/AuthService'
import { getAvatarUrl } from '../utils/imageUtils'
import axiosInstance from '../api/axios'

const MOTHER_API_URL = import.meta.env.VITE_MOTHER_API_URL || 'http://localhost:8000';
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;

export interface User {
    [key: string]: any;
    roles?: string[];
    permissions?: string[];
    permisos?: string[];
    avatar?: string;
}

export const useAuthStore = defineStore('auth', () => {
    // MIGRACIÓN DE ALMACENAMIENTO (Limpia cachés viejas si cambias de arquitectura)
    const STORAGE_VERSION = 'v1_captacion_pkce'; 

    if (localStorage.getItem('yk_storage_version') !== STORAGE_VERSION) {
        const keysToRemove = ['access_token', 'user_data', 'pkce_verifier'];
        keysToRemove.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });
        localStorage.setItem('yk_storage_version', STORAGE_VERSION);
    }

    // --- STATE ---
    const user = ref<User | null>(JSON.parse(sessionStorage.getItem('user_data') || 'null'))
    const token = ref<string | null>(sessionStorage.getItem('access_token') || null)
    const processingSSO = ref<boolean>(false)
    const isReady = ref<boolean>(false)

    // --- GETTERS ---
    const userAvatar = computed(() => {
        return getAvatarUrl(user.value?.avatar)
    })

    // --- ACTIONS ---

    async function login(redirectTo: string | null = null): Promise<void> {
        if (processingSSO.value) return; 
        processingSSO.value = true;
        
        if (redirectTo) {
            sessionStorage.setItem('auth_redirect_to', redirectTo);
        }
        
        await AuthService.login();
    }

    async function handlePKCECallback(code: string): Promise<void> {
        console.log(">>> [AuthStore] Iniciando intercambio de código por Token...");
        const verifier = sessionStorage.getItem('pkce_verifier')
        if (!verifier) {
            console.error(">>> [AuthStore] ERROR: No se encontró pkce_verifier en sessionStorage.");
            throw new Error('No se encontró el verifier PKCE')
        }

        try {
            const response = await axios.post(`${MOTHER_API_URL}/oauth/token`, {
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                code_verifier: verifier,
                code: code
            });
            
            console.log(">>> [AuthStore] Token obtenido exitosamente.");
            token.value = response.data.access_token;
            sessionStorage.setItem('access_token', token.value!);
            sessionStorage.removeItem('pkce_verifier');
            processingSSO.value = false;

            console.log(">>> [AuthStore] Sincronizando perfil JIT con Backend Hija...");
            await fetchUser(true); 
        } catch (error) {
            console.error(">>> [AuthStore] ERROR EN INTERCAMBIO O FETCH:", error);
            throw error;
        }
    }


    function logout(): void {
        user.value = null
        token.value = null
        isReady.value = false
        AuthService.logout()
    }

    function logoutLocal(): void {
        user.value = null
        token.value = null
        isReady.value = false
        AuthService.logoutLocal()
    }

    async function fetchUser(force = false): Promise<void> {
        if (!token.value) {
            isReady.value = true
            return
        }

        if (!force && user.value) {
            isReady.value = true
            return
        }

        try {
            const response = await axiosInstance.get('/me')
            user.value = response.data

            sessionStorage.setItem('user_data', JSON.stringify(user.value))
        } catch (error) {
            console.warn('Sesión expirada o inválida', error)
            logoutLocal()
        } finally {
            isReady.value = true
        }
    }

    function hasPermission(permission: string): boolean {
        if (!user.value) return false

        if (user.value.roles && user.value.roles.includes('Super Admin')) return true

        const userPerms = user.value.permissions || user.value.permisos || []
        if (Array.isArray(userPerms)) {
            return userPerms.includes(permission)
        }

        return false
    }

    function hasRole(role: string): boolean {
        if (!user.value) return false
        return !!(user.value.roles && user.value.roles.includes(role))
    }

    async function checkAuth(): Promise<void> {
        await fetchUser()
    }

    return {
        user,
        token,
        processingSSO,
        isReady,
        userAvatar,
        login,
        handlePKCECallback,
        logout,
        logoutLocal,
        fetchUser,
        checkAuth,
        hasPermission,
        hasRole
    }
})

