<script setup lang="ts">
// 05C hardening (pedido explícitamente por el usuario): el diseño anterior
// era un v-dialog genérico sin encabezado ni estructura — se alinea ahora al
// mismo patrón de modal usado en la web interna (ModalProveedorForm.vue):
// cabecera con avatar/ícono + título + botón cerrar, divider, cuerpo con
// chips/datos y el motivo en su propia tarjeta destacada.
import { computed, ref, watch } from 'vue'

import dayjs from '@/plugins/dayjs'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import { publicoApi } from '@/api/publico.api'
import type { ConvocatoriaPublicaDetalle } from '@/modules/publico/publico.types'

const props = defineProps<{ convocatoriaId: number | null }>()
const abierto = defineModel<boolean>('abierto', { default: false })

const detalle = ref<ConvocatoriaPublicaDetalle | null>(null)
const cargando = ref(false)

watch(
  () => props.convocatoriaId,
  async (id) => {
    if (!id) return
    cargando.value = true
    detalle.value = null
    try {
      detalle.value = await publicoApi.convocatoria(id)
    } finally {
      cargando.value = false
    }
  },
)

const esCancelada = computed(() => detalle.value?.estado.codigo === 'CANCELADA')
const iconoEncabezado = computed(() => (esCancelada.value ? 'mdi-close-circle-outline' : 'mdi-file-remove-outline'))
const colorEncabezado = computed(() => detalle.value?.estado.color ?? 'grey')
</script>

<template>
  <v-dialog v-model="abierto" max-width="560" persistent scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center ga-3 pa-4 bg-surface text-titulo font-weight-bold">
        <v-avatar :color="colorEncabezado" variant="tonal" size="40" rounded="lg">
          <v-icon :icon="iconoEncabezado" size="22" />
        </v-avatar>
        <span class="flex-grow-1">Motivo del cierre</span>
        <v-btn icon="mdi-close" variant="text" density="compact" @click="abierto = false" />
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-5">
        <div v-if="cargando" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <template v-else-if="detalle">
          <div class="d-flex align-center flex-wrap ga-2 mb-3">
            <v-chip variant="tonal" size="small" color="primary" class="font-datos font-weight-bold">
              <v-icon icon="mdi-pound" size="14" class="mr-1" />
              {{ detalle.numero ?? 'S/N' }}
            </v-chip>
            <v-chip v-if="detalle.entidad?.sigla" variant="outlined" size="small" color="grey">
              <v-icon icon="mdi-city-variant-outline" size="14" class="mr-1" />
              {{ detalle.entidad.sigla }}
            </v-chip>
            <BaseChipEstado :estado="detalle.estado" />
          </div>

          <div class="text-h6 text-titulo font-weight-bold mb-3">
            {{ detalle.nombre_servicio }}
          </div>

          <div class="d-flex align-center text-caption text-grey mb-4">
            <v-icon icon="mdi-calendar-clock-outline" size="15" class="mr-1" />
            Cierre del proceso: <strong class="text-on-surface ml-1">{{ dayjs(detalle.fecha_fin).tz().format('DD/MM/YYYY HH:mm') }}h</strong>
          </div>

          <div class="motivo-box pa-4 rounded-lg">
            <div class="text-caption font-weight-bold text-uppercase mb-1 d-flex align-center ga-1" :class="`text-${colorEncabezado}`">
              <v-icon icon="mdi-information-outline" size="15" />
              <span>Motivo registrado</span>
            </div>
            <p class="text-body-2 mb-0">
              La convocatoria fue declarada <strong>{{ detalle.estado.nombre.toUpperCase() }}</strong> por el motivo siguiente:
              {{ detalle.motivo_cierre ?? 'Sin motivo registrado.' }}
            </p>
          </div>
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="tonal" color="primary" @click="abierto = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.motivo-box {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.6);
}
</style>
