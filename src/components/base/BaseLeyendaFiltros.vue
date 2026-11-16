<script setup lang="ts">
// Leyenda de un listado: una píldora alineada a la derecha (debajo de los
// botones del encabezado) que, al hacer clic, abre una tarjeta FLOTANTE sobre
// la pantalla —no empuja filtros ni tabla— y se cierra con otro clic, fuera de
// ella o con Esc. Texto corto y siempre con la misma forma: para qué sirve el
// módulo, columnas clave y a qué fecha aplica el filtro.
withDefaults(
  defineProps<{
    proposito: string
    columnas?: string
    fechas?: string
    filtros?: string
    titulo?: string
  }>(),
  { titulo: '¿Qué muestra este módulo?', columnas: '', fechas: '', filtros: '' },
)
</script>

<template>
  <div class="leyenda-filtros">
    <v-menu location="bottom end" offset="6" :close-on-content-click="false">
      <template #activator="{ props: activador }">
        <v-btn
          v-bind="activador"
          variant="outlined"
          color="primary"
          size="small"
          rounded="pill"
          prepend-icon="mdi-information-outline"
          class="leyenda-filtros__pildora"
        >
          {{ titulo }}
        </v-btn>
      </template>

      <v-card class="leyenda-filtros__tarjeta" elevation="8" role="note">
        <dl class="leyenda-filtros__lista">
          <div>
            <dt>Para qué sirve</dt>
            <dd>{{ proposito }}</dd>
          </div>
          <div v-if="columnas">
            <dt>Columnas clave</dt>
            <dd>{{ columnas }}</dd>
          </div>
          <div v-if="fechas">
            <dt>Filtro de fechas</dt>
            <dd>{{ fechas }}</dd>
          </div>
          <div v-if="filtros">
            <dt>Otros filtros</dt>
            <dd>{{ filtros }}</dd>
          </div>
        </dl>
      </v-card>
    </v-menu>
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
  width: min(460px, calc(100vw - 32px));
  padding: 12px 16px;
  border-left: 4px solid rgb(var(--v-theme-primary));
  font-size: 0.8125rem;
  line-height: 1.4;
}
.leyenda-filtros__lista {
  margin: 0;
}
.leyenda-filtros__lista > div + div {
  margin-top: 8px;
}
.leyenda-filtros__lista dt {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.leyenda-filtros__lista dd {
  margin: 0;
}
</style>
