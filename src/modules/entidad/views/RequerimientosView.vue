<script setup lang="ts">
// E1 — Requerimientos (05B). Listado con scope de la propia entidad
// (aplicado por el backend, no por el frontend).
import { ref } from 'vue'

import { entidadesApi } from '@/api/entidades.api'
import { publicoApi } from '@/api/publico.api'
import { requerimientosApi } from '@/api/requerimientos.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { RequerimientoListaItem } from '@/modules/entidad/entidad.types'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import dayjs from '@/plugins/dayjs'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const auth = useAuthStore()
const esEntidad = auth.usuario?.rol === 'ENTIDAD'
const rubros = ref<RubroPublico[]>([])
publicoApi.rubros().then((data) => (rubros.value = data.items))

// ADMINISTRADOR/AUDITOR no tienen entidad propia y ven requerimientos de
// todas (05C hardening) — combo para filtrar por una en particular.
const entidades = ref<EntidadListaItem[]>([])
if (!esEntidad) {
  entidadesApi.index({ ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidades.value = data.items))
}

// Orden por defecto: más recientes primero (05C hardening, pedido
// explícitamente por el usuario — antes no había ninguna columna de fecha).
const { items, paginacion, cargando, params, recargar } = useListado<RequerimientoListaItem>(
  requerimientosApi.index,
  { ordenar_por: 'fecha_creacion', direccion: 'desc' },
)

// `sortable` refleja exactamente lo que soporta el backend
// (`RequerimientoController::index` solo acepta ordenar_por
// numero/objeto/tipo/fecha_creacion, 05C hardening) — el resto se deja sin
// flecha de orden en vez de mostrar una que no hace nada o dispara un 422.
const cabeceras = [
  { title: 'Número', key: 'numero' },
  { title: 'Objeto', key: 'objeto' },
  ...(esEntidad ? [] : [{ title: 'Entidad', key: 'entidad', sortable: false }]),
  { title: 'Tipo', key: 'tipo' },
  { title: 'Rubros', key: 'rubros', sortable: false },
  { title: 'Área usuaria', key: 'area', sortable: false },
  { title: 'N.º ítems', key: 'cantidad_items', sortable: false },
  { title: '¿Convocado?', key: 'tiene_convocatoria', sortable: false },
  { title: 'Fecha de creación', key: 'fecha_creacion' },
  { title: '', key: 'acciones', sortable: false },
]

const eliminarAbierto = ref(false)
const eliminarId = ref<number | null>(null)
const eliminando = ref(false)
function pedirEliminar(id: number) {
  eliminarId.value = id
  eliminarAbierto.value = true
}
async function confirmarEliminar() {
  if (!eliminarId.value) return
  eliminando.value = true
  try {
    await requerimientosApi.destroy(eliminarId.value)
    eliminarAbierto.value = false
    ui.mostrarSnackbar('Requerimiento eliminado.', 'success')
    recargar()
  } catch {
    // 409 ya muestra snackbar global si tiene convocatoria no-borrador.
  } finally {
    eliminando.value = false
  }
}

</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Requerimientos</div>
      <v-btn to="/app/requerimientos/nuevo" prepend-icon="mdi-plus">Nuevo requerimiento</v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por objeto o número"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 280px"
        clearable
      />
      <v-select
        v-model="params.tipo"
        :items="[
          { title: 'Bien', value: 'BIEN' },
          { title: 'Servicio', value: 'SERVICIO' },
        ]"
        label="Tipo"
        clearable
        style="max-width: 160px"
        @update:model-value="recargar()"
      />
      <v-select
        v-model="params.rubro_ids as number[]"
        :items="rubros.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
        label="Rubros"
        multiple
        chips
        closable-chips
        clearable
        style="max-width: 240px"
        @update:model-value="recargar()"
      />
      <v-select
        v-model="params.convocado"
        :items="[
          { title: 'Sí', value: 'true' },
          { title: 'No', value: 'false' },
        ]"
        label="¿Convocado?"
        clearable
        style="max-width: 160px"
        @update:model-value="recargar()"
      />
      <v-select
        v-if="!esEntidad"
        v-model="params.entidad_id as number"
        :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
        label="Entidad"
        clearable
        style="max-width: 240px"
        @update:model-value="recargar()"
      />
    </div>

    <BaseTablaServidor
      v-model:page="params.pagina"
      v-model:items-per-page="params.por_pagina"
      v-model:ordenar-por="params.ordenar_por"
      v-model:direccion="params.direccion"
      :headers="cabeceras"
      :items="items"
      :items-length="paginacion.total"
      :loading="cargando"
      mensaje-vacio="Aún no has creado requerimientos."
    >
      <template #item.entidad="{ item }">{{ item.entidad.sigla ?? '—' }}</template>
      <template #item.tipo="{ item }">{{ item.tipo === 'BIEN' ? 'Bien' : 'Servicio' }}</template>
      <template #item.rubros="{ item }">
        <div class="d-flex flex-wrap ga-1">
          <v-chip v-for="r in item.rubros" :key="r.rubro_id" size="small" color="primary" variant="tonal">
            {{ r.nombre }}
          </v-chip>
          <span v-if="!item.rubros.length" class="text-grey">—</span>
        </div>
      </template>
      <template #item.area="{ item }">{{ item.area?.nombre ?? '—' }}</template>
      <template #item.tiene_convocatoria="{ item }">
        <v-icon :icon="item.tiene_convocatoria ? 'mdi-check' : 'mdi-minus'" size="18" />
      </template>
      <template #item.fecha_creacion="{ item }">{{ dayjs(item.fecha_creacion).tz().format('DD/MM/YYYY HH:mm') }}</template>
      <template #item.acciones="{ item }">
        <v-btn :to="`/app/requerimientos/${item.requerimiento_id}`" variant="text" size="small">Ver/Editar</v-btn>
        <v-btn
          variant="text"
          size="small"
          color="error"
          :disabled="item.tiene_convocatoria"
          @click="pedirEliminar(item.requerimiento_id)"
        >
          Eliminar
        </v-btn>
      </template>
    </BaseTablaServidor>

    <BaseConfirmacion
      v-model:abierto="eliminarAbierto"
      titulo="Eliminar requerimiento"
      mensaje="¿Seguro que deseas eliminar este requerimiento? Esta acción no se puede deshacer."
      texto-confirmar="Eliminar"
      :cargando="eliminando"
      @confirmar="confirmarEliminar"
    />
  </v-container>
</template>
