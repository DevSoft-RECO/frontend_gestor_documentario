import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import AuthService from '../services/AuthService'
import { getAvatarUrl } from '../utils/imageUtils'
import axiosInstance from '../api/axios'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

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

    // --- VARIABLES REACTIVAS DE SOCKETS Y CONTROL DE INACTIVIDAD ---
    const echoInstance = ref<any>(null)
    const showInactivityModal = ref<boolean>(false)
    const inactivitySessionId = ref<string | null>(null)
    const inactivityCountdown = ref<number>(300)
    const isHeartbeatLoading = ref<boolean>(false)
    let countdownTimerId: any = null


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

            // CRÍTICO: Inicializar WebSockets de inmediato tras obtener el token
            initSessionSocket()
        } catch (error) {
            console.error(">>> [AuthStore] ERROR EN INTERCAMBIO O FETCH:", error);
            throw error;
        }
    }


    function logout(): void {
        disconnectSessionSocket()
        user.value = null
        token.value = null
        isReady.value = false
        AuthService.logout()
    }

    function logoutLocal(): void {
        disconnectSessionSocket()
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

    // --- MÉTODOS DE SOCKETS Y CIERRE ---
    function initSessionSocket(): void {
        if (!token.value || !user.value) return
        if (echoInstance.value) return // Evitar conexiones duplicadas

        window.Pusher = Pusher

        echoInstance.value = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
            wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8082,
            wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 8082,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
            authEndpoint: `${import.meta.env.VITE_MOTHER_API_URL}/api/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${token.value}`,
                    Accept: 'application/json'
                }
            }
        })

        // Escuchar canal privado del usuario centralizado (soporte para id o user_id de Go)
        const userId = user.value.id || user.value.user_id
        echoInstance.value.private(`user.${userId}`)
            .listen('.InactivityExpiringSoon', (e: any) => {
                inactivitySessionId.value = e.sessionId
                inactivityCountdown.value = Math.round(e.remainingSeconds) || 300
                showInactivityModal.value = true
                startLocalCountdown()
            })
            .listen('.SessionForceClosed', () => {
                stopLocalCountdown()
                disconnectSessionSocket()
                AuthService.logoutLocal()
                const motherAppUrl = import.meta.env.VITE_MOTHER_APP_URL || 'http://localhost:5173'
                window.location.href = `${motherAppUrl}/login?session_expired=true`
            })
    }

    // --- DISCONNECT ---
    function disconnectSessionSocket(): void {
        if (echoInstance.value) {
            echoInstance.value.disconnect()
            echoInstance.value = null
        }
        showInactivityModal.value = false
        inactivitySessionId.value = null
        stopLocalCountdown()
    }

    // --- COUNTDOWNS ---
    function startLocalCountdown(): void {
        if (countdownTimerId) clearInterval(countdownTimerId)
        countdownTimerId = setInterval(() => {
            if (inactivityCountdown.value > 0) {
                inactivityCountdown.value--
            } else {
                clearInterval(countdownTimerId)
                AuthService.logoutLocal()
                const motherAppUrl = import.meta.env.VITE_MOTHER_APP_URL || 'http://localhost:5173'
                window.location.href = `${motherAppUrl}/login?session_expired=true`
            }
        }, 1000)
    }

    function stopLocalCountdown(): void {
        if (countdownTimerId) {
            clearInterval(countdownTimerId)
            countdownTimerId = null
        }
    }

    // --- HEARTBEAT ---
    async function sendHeartbeatPing(): Promise<void> {
        if (!inactivitySessionId.value || isHeartbeatLoading.value) return
        isHeartbeatLoading.value = true
        try {
            const motherApiUrl = import.meta.env.VITE_MOTHER_API_URL || 'http://localhost:8000'
            await axios.post(`${motherApiUrl}/api/sso/heartbeat`, {
                session_id: inactivitySessionId.value
            }, {
                headers: {
                    Authorization: `Bearer ${token.value}`
                }
            })

            showInactivityModal.value = false
            stopLocalCountdown()
        } catch (err) {
            console.error('Error al enviar ping de heartbeat a la Madre:', err)
            logout()
        } finally {
            isHeartbeatLoading.value = false
        }
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
        hasRole,
        // Sockets e Inactividad
        echoInstance,
        showInactivityModal,
        inactivitySessionId,
        inactivityCountdown,
        isHeartbeatLoading,
        initSessionSocket,
        disconnectSessionSocket,
        sendHeartbeatPing
    }
})


