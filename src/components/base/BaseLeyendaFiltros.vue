<script setup lang="ts">
// Leyenda plegable de un listado: explica qué muestra la lista y a qué campo se
// aplica cada filtro (los de fecha apuntan a una fecha distinta en cada módulo:
// registro, cierre de plazo, envío). Va FUERA de la fila de filtros, debajo de
// los botones del encabezado y alineada a la derecha: dentro de esa fila
// estiraba a todos los inputs a su altura. Un clic la minimiza a una píldora y
// otro la vuelve a abrir; el estado se recuerda en el navegador.
import { ref } from 'vue'

withDefaults(
  defineProps<{
    lineas: string[]
    titulo?: string
  }>(),
  { titulo: '¿Qué muestra este listado?' },
)

const CLAVE = 'compras-la-perla:leyenda-filtros-abierta'

function leerEstado(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'cerrada'
  } catch {
    return true
  }
}

const abierta = ref(leerEstado())

function alternar() {
  abierta.value = !abierta.value
  try {
    localStorage.setItem(CLAVE, abierta.value ? 'abierta' : 'cerrada')
  } catch {
    // Sin localStorage (modo privado estricto): solo vale para esta pantalla.
  }
}
</script>

<template>
  <div class="leyenda-filtros">
    <v-btn
      v-if="!abierta"
      variant="outlined"
      color="primary"
      size="small"
      rounded="pill"
      prepend-icon="mdi-information-outline"
      class="leyenda-filtros__pildora"
      :aria-expanded="false"
      @click="alternar"
    >
      {{ titulo }}
    </v-btn>

    <v-card v-else class="leyenda-filtros__tarjeta" elevation="3" role="note">
      <button type="button" class="leyenda-filtros__cabecera" :aria-expanded="true" title="Minimizar" @click="alternar">
        <v-icon icon="mdi-information-outline" size="18" color="primary" />
        <span class="leyenda-filtros__titulo">{{ titulo }}</span>
        <v-icon icon="mdi-chevron-up" size="20" />
      </button>
      <ul class="leyenda-filtros__lista">
        <li v-for="linea in lineas" :key="linea">{{ linea }}</li>
      </ul>
    </v-card>
  </div>
</template>

<style scoped>
.leyenda-filtros {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.leyenda-filtros__pildora {
  text-transform: none;
  letter-spacing: 0;
}
.leyenda-filtros__tarjeta {
  width: 100%;
  max-width: 540px;
  border-left: 4px solid rgb(var(--v-theme-primary));
  font-size: 0.8125rem;
  line-height: 1.4;
}
.leyenda-filtros__cabecera {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.leyenda-filtros__titulo {
  flex: 1;
  font-weight: 700;
}
.leyenda-filtros__lista {
  margin: 0;
  padding: 0 14px 10px 30px;
}
.leyenda-filtros__lista li + li {
  margin-top: 3px;
}
</style>
