<template>
  <div class="unauthorized-container">
    <h1>403 - Acceso No Autorizado</h1>
    <p>No tienes permisos para ver esta página.</p>
    <router-link to="/">Volver al Inicio</router-link>
  </div>
</template>

<style scoped>
.unauthorized-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

h1 {
  font-size: 2rem;
  color: #dc3545;
}

a {
  margin-top: 20px;
  color: #0d6efd;
  text-decoration: underline;
}
</style>
