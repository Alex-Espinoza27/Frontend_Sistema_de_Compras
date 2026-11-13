<script setup lang="ts">
// E1 — Requerimientos (05B). Listado con scope de la propia entidad
// (aplicado por el backend, no por el frontend).
import { computed, ref } from 'vue'

import { entidadesApi } from '@/api/entidades.api'
import { publicoApi } from '@/api/publico.api'
import { requerimientosApi } from '@/api/requerimientos.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseRangoFechas from '@/components/base/BaseRangoFechas.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { RequerimientoListaItem } from '@/modules/entidad/entidad.types'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import dayjs from '@/plugins/dayjs'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { hoyTexto } from '@/utils/fechas'

const ui = useUiStore()
const auth = useAuthStore()
const esAdmin = auth.usuario?.rol === 'ADMINISTRADOR'
const entidadAsignada = computed(() => (auth.perfil?.tipo === 'ENTIDAD' ? auth.perfil.entidad : null))
const rubros = ref<RubroPublico[]>([])
publicoApi.rubros().then((data) => (rubros.value = data.items))

// ADMINISTRADOR no tiene entidad propia y ve requerimientos de todas — combo para filtrar por una en particular.
const entidades = ref<EntidadListaItem[]>([])
if (esAdmin) {
  entidadesApi.index({ ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidades.value = data.items))
}

const { items, paginacion, cargando, params, recargar } = useListado<RequerimientoListaItem>(
  requerimientosApi.index,
  { ordenar_por: 'fecha_creacion', direccion: 'desc', desde: hoyTexto(), hasta: hoyTexto() },
  'filtros_requerimientos',
)

const cabeceras = [
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Estado', key: 'activo', sortable: false },
  { title: 'Número', key: 'numero' },
  { title: 'Objeto', key: 'objeto' },
  ...(esAdmin ? [{ title: 'Entidad', key: 'entidad', sortable: false }] : []),
  { title: 'Tipo', key: 'tipo' },
  { title: 'Rubros', key: 'rubros', sortable: false },
  { title: 'Área usuaria', key: 'area', sortable: false },
  { title: 'N.º ítems', key: 'cantidad_items', sortable: false },
  { title: '¿Convocado?', key: 'tiene_convocatoria', sortable: false },
  { title: 'Fecha de creación', key: 'fecha_creacion' },
]

// Desactivar en vez de eliminar (05C hardening, pedido explícitamente por el
// usuario, mismo patrón que Usuarios/Proveedores/Catálogos/Roles): no se
// borra ningún registro, el requerimiento queda listado con su estado en
// "Inactivo".
const cambiarEstadoAbierto = ref(false)
const requerimientoParaCambiarEstado = ref<RequerimientoListaItem | null>(null)
const cambiandoEstado = ref(false)
function pedirCambioEstado(item: RequerimientoListaItem) {
  requerimientoParaCambiarEstado.value = item
  cambiarEstadoAbierto.value = true
}
async function confirmarCambioEstado() {
  if (!requerimientoParaCambiarEstado.value) return
  cambiandoEstado.value = true
  try {
    if (requerimientoParaCambiarEstado.value.activo) {
      await requerimientosApi.desactivar(requerimientoParaCambiarEstado.value.requerimiento_id)
      ui.mostrarSnackbar('Requerimiento desactivado.', 'success')
    } else {
      await requerimientosApi.activar(requerimientoParaCambiarEstado.value.requerimiento_id)
      ui.mostrarSnackbar('Requerimiento activado.', 'success')
    }
    cambiarEstadoAbierto.value = false
    recargar()
  } finally {
    cambiandoEstado.value = false
  }
}

</script>

<template>
  <v-container class="py-8" max-width="1400">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Requerimientos</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="outlined" :loading="cargando" @click="recargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn to="/app/requerimientos/nuevo" color="primary" variant="flat" elevation="2" class="font-weight-medium px-5">
          Nuevo requerimiento
        </v-btn>
      </div>
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
        v-if="esAdmin"
        v-model="params.entidad_id as number"
        :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
        label="Entidad"
        clearable
        style="max-width: 240px"
        @update:model-value="recargar()"
      />
      <v-text-field
        v-else-if="entidadAsignada"
        :model-value="entidadAsignada.razon_social"
        label="Entidad asignada"
        prepend-inner-icon="mdi-domain"
        readonly
        style="max-width: 260px"
      />
      <BaseRangoFechas
        v-model:desde="params.desde as string"
        v-model:hasta="params.hasta as string"
        label="Fecha de creación"
        style="max-width: 260px"
        @aplicar="recargar()"
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
      <template #item.acciones="{ item }">
        <div class="d-flex align-center ga-1">
          <v-btn
            :to="`/app/requerimientos/${item.requerimiento_id}`"
            icon
            variant="text"
            size="small"
            color="primary"
          >
            <v-icon icon="mdi-pencil-outline" />
            <v-tooltip activator="parent" location="top">Editar requerimiento</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            :color="item.activo ? 'error' : 'success'"
            @click="pedirCambioEstado(item)"
          >
            <v-icon :icon="item.activo ? 'mdi-close-circle-outline' : 'mdi-check-circle-outline'" />
            <v-tooltip activator="parent" location="top">{{ item.activo ? 'Desactivar requerimiento' : 'Activar requerimiento' }}</v-tooltip>
          </v-btn>
        </div>
      </template>
      <template #item.activo="{ item }">
        <v-chip size="small" variant="tonal" rounded="pill" :color="item.activo ? 'success' : 'grey'">
          {{ item.activo ? 'Activo' : 'Inactivo' }}
        </v-chip>
      </template>
      <template #item.numero="{ item }">
        <v-chip color="primary" variant="tonal" size="small" class="font-weight-medium">
          {{ item.numero }}
        </v-chip>
      </template>
      <template #item.entidad="{ item }">{{ item.entidad.sigla ?? '—' }}</template>
      <template #item.tipo="{ item }">
        <v-chip
          :color="item.tipo === 'BIEN' ? 'info' : 'success'"
          variant="tonal"
          size="small"
          rounded="pill"
          class="font-weight-medium px-3"
        >
          {{ item.tipo === 'BIEN' ? 'Bien' : 'Servicio' }}
        </v-chip>
      </template>
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
    </BaseTablaServidor>

    <BaseConfirmacion
      v-model:abierto="cambiarEstadoAbierto"
      :titulo="requerimientoParaCambiarEstado?.activo ? 'Desactivar requerimiento' : 'Activar requerimiento'"
      :mensaje="
        requerimientoParaCambiarEstado?.activo
          ? 'El requerimiento dejará de estar disponible para nuevas convocatorias.'
          : 'El requerimiento volverá a estar disponible para nuevas convocatorias.'
      "
      :texto-confirmar="requerimientoParaCambiarEstado?.activo ? 'Desactivar' : 'Activar'"
      :color="requerimientoParaCambiarEstado?.activo ? 'error' : 'primary'"
      :cargando="cambiandoEstado"
      @confirmar="confirmarCambioEstado"
    />
  </v-container>
</template>
