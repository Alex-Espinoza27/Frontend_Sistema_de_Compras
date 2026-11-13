<script setup lang="ts">
// Envoltorio de v-data-table-server (05B: todas las tablas paginadas del
// backend pasan por aquí — pensado para usarse junto a `useListado`).
// `ordenarPor`/`direccion` traduce el `sort-by` interno de Vuetify (array de
// {key, order}) al par ordenar_por/direccion de un solo campo que ya
// consumen `useListado` y el backend (03 §1) — antes no existía este puente,
// así que hacer clic en una columna solo movía la flechita sin disparar
// ninguna petición (05C hardening, bug reportado por el usuario en todas
// las tablas del sistema).
import { computed } from 'vue'

withDefaults(defineProps<{ headers: unknown[]; items: unknown[]; itemsLength: number; loading: boolean; mensajeVacio?: string }>(), {
  mensajeVacio: 'No hay datos para mostrar.',
})

const pagina = defineModel<number | undefined>('page', { required: true })
const porPagina = defineModel<number | undefined>('itemsPerPage', { required: true })
const ordenarPor = defineModel<string | undefined>('ordenarPor')
const direccion = defineModel<'asc' | 'desc' | undefined>('direccion')

const sortBy = computed<{ key: string; order: 'asc' | 'desc' }[]>({
  get: () => (ordenarPor.value ? [{ key: ordenarPor.value, order: direccion.value ?? 'asc' }] : []),
  set: (valor) => {
    ordenarPor.value = valor[0]?.key
    direccion.value = valor[0]?.order ?? 'asc'
  },
})
</script>

<template>
  <v-data-table-server
    v-model:page="pagina"
    v-model:items-per-page="porPagina"
    v-model:sort-by="sortBy"
    :headers="(headers as never)"
    :items="items"
    :items-length="itemsLength"
    :loading="loading"
    must-sort
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope" :key="slot">
      <slot :name="slot" v-bind="scope ?? {}" />
    </template>
    <template v-if="!$slots['no-data']" #no-data>
      <div class="text-center py-8 text-grey">{{ mensajeVacio }}</div>
    </template>
  </v-data-table-server>
</template>

<style scoped>
/* Cabecera con un tinte sutil (05C hardening, pedido explícitamente por el
   usuario: "que no todo sea blanco" pero sin resaltar demasiado). Usa el color
   `primary` del tema activo con muy baja opacidad, por eso no hace falta una
   variante aparte para modo oscuro: `--v-theme-primary` ya cambia con el tema. */
:deep(.v-table__wrapper thead) {
  background-color: rgb(var(--v-theme-primary) / 0.07);
}
:deep(.v-table__wrapper thead th) {
  font-weight: 700 !important;
  border-bottom: 2px solid rgb(var(--v-theme-primary) / 0.18) !important;
}
</style>
