import axios, { type InternalAxiosRequestConfig } from 'axios';

// Cliente para la App Madre (Auth y Datos Globales)
const motherApi = axios.create({
    baseURL: import.meta.env.VITE_MOTHER_API_URL, // Generalmente el backend madre (ej puerto 8000)
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor para inyectar el token si es necesario
motherApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // CRÍTICO: Leer de sessionStorage, NO de localStorage
    const token = sessionStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default motherApi;

