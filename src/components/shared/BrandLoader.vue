<script setup>
// Props para hacerlo reutilizable y dinámico
defineProps({
  text: {
    type: String,
    default: 'Cargando Sistema YK...' // Texto por defecto
  },
  subtext: {
    type: String,
    default: 'Por favor espere'
  }
})
</script>

<template>
  <div class="internal-loader-container">
    
    <div class="spinner-wrapper">
      <div class="ring-navy"></div>
      <div class="ring-green"></div>
    </div>

    <div class="text-content">
      <span class="loading-title">{{ text }}</span>
      <span class="loading-subtitle">{{ subtext }}</span>
    </div>

  </div>
</template>

<style scoped>
.internal-loader-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  width: 100%;
  height: 100%;
  min-height: 200px; /* Altura mínima para que no colapse en tablas vacías */
  background-color: transparent; /* Se adapta al fondo de tu tabla/card */
}

/* --- SPINNER COMPACTO (50px) --- */
.spinner-wrapper {
  position: relative;
  width: 50px; 
  height: 50px;
  margin-bottom: 15px; /* Espacio entre spinner y texto */
}

/* Anillo Base (Azul Marino) */
.ring-navy {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(0, 31, 63, 0.1); /* Azul muy suave */
  border-top-color: #001f3f; /* Azul Marino Fuerte */
  animation: spin 1s linear infinite;
}

/* Anillo Energía (Verde) */
.ring-green {
  position: absolute;
  top: 3px; left: 3px; right: 3px; bottom: 3px; /* Ligeramente más pequeño */
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #2ecc40; /* Verde Corporativo */
  filter: drop-shadow(0 0 2px rgba(46, 204, 64, 0.5)); /* Glow sutil */
  animation: spin-reverse 1.5s ease-in-out infinite;
}

/* --- TEXTOGRAFÍA --- */
.text-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: pulse-text 2s infinite ease-in-out;
}

.loading-title {
  font-family: 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: #001f3f; /* Azul Marino */
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.loading-subtitle {
  font-family: 'Segoe UI', sans-serif;
  font-size: 0.75rem;
  color: #6c757d; /* Gris neutro para información secundaria */
  font-weight: 500;
}

/* --- ANIMACIONES --- */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes spin-reverse {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>