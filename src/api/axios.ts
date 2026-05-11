import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

// Cliente para la App Hija (Local / Espejo)
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
    headers: {
        'Accept': 'application/json'
    }
});

// --- INTERCEPTOR DE REQUEST (Salida) ---
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = sessionStorage.getItem('access_token');

        if (token) {
            console.log("[Axios Local] Token encontrado en sessionStorage.");
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            config.headers.Authorization = authHeader;
        } else {
            console.warn("[Axios Local] ADVERTENCIA: No se encontró token en sessionStorage.");
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// --- INTERCEPTOR DE RESPONSE (Llegada) ---
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
            console.error('Sesión rechazada por Ecosistema.');
            sessionStorage.removeItem('access_token');
            sessionStorage.clear();
            // Redirigir al login si falla la sesión
            import('@/services/AuthService').then(module => module.default.login());
        }
        return Promise.reject(error);
    }
);

export default api;

