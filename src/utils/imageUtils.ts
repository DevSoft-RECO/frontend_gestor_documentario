export const getAvatarUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;

    // Si ya es una URL completa (http/https) o data URI (blob/base64), devolverla tal cual
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    // Obtener URL base de la App Madre desde variables de entorno
    const baseUrl = (import.meta.env.VITE_MOTHER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

    // Limpiar el path para evitar dobles slashes
    const cleanPath = path.replace(/^\/+/, '');

    // Verificamos si necesita 'storage'
    if (!cleanPath.startsWith('storage/')) {
        return `${baseUrl}/${cleanPath}`;
    }

    return `${baseUrl}/${cleanPath}`;
};
