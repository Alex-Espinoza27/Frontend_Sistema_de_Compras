<script setup lang="ts">
import { ref, watch } from 'vue'

import { publicoApi } from '@/api/publico.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
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
</script>

<template>
  <v-dialog v-model="abierto" max-width="480">
    <v-card>
      <v-card-title class="text-titulo">Motivo del cierre</v-card-title>
      <v-card-text>
        <v-progress-circular v-if="cargando" indeterminate color="primary" />
        <template v-else-if="detalle">
          <div class="text-h6 text-titulo mb-2">{{ detalle.nombre_servicio }}</div>
          <BaseChipEstado :estado="detalle.estado" class="mb-4" />
          <div class="text-body-2">
            La convocatoria fue declarada {{ detalle.estado.nombre.toUpperCase() }} por el motivo siguiente:
            {{ detalle.motivo_cierre ?? 'Sin motivo registrado.' }}
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="abierto = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
