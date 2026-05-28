import Swal from 'sweetalert2';

export const startSessionGuards = () => {
    // ----------------------------------------------------
    // REGLA B: AVISO CORTÉS DE CIERRE DE JORNADA (17:50 hrs)
    // ----------------------------------------------------
    const alertTime = new Date();
    alertTime.setHours(17, 50, 0, 0);

    if (new Date() < alertTime) {
        const msUntilAlert = alertTime.getTime() - new Date().getTime();
        setTimeout(() => {
            if (sessionStorage.getItem('access_token')) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: 'Jornada por finalizar',
                    text: 'Tu sesión se cerrará irremediablemente a las 6:00 PM.',
                    timer: 60000,
                    showConfirmButton: false
                });
            }
        }, msUntilAlert);
    }
};

