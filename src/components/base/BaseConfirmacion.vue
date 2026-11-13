<script setup lang="ts">
// Confirmación reutilizable (05B: retirar, suspender, cancelar, adjudicar,
// desierta, eliminar). `fuerte` exige un checkbox explícito antes de habilitar
// el botón; `pedirMotivo` agrega un textarea obligatorio (cancelar/desierta).
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    titulo: string
    mensaje: string
    textoConfirmar?: string
    color?: string
    fuerte?: boolean
    pedirMotivo?: boolean
    motivoRequerido?: boolean
    /** Texto inicial del motivo al abrir (editable) — ej. "No se presentaron
     * cotizaciones." cuando ya se sabe la causa (05C hardening, pedido
     * explícitamente por el usuario). */
    motivoSugerido?: string
    cargando?: boolean
  }>(),
  {
    textoConfirmar: 'Confirmar',
    color: 'error',
    fuerte: false,
    pedirMotivo: false,
    motivoRequerido: true,
    motivoSugerido: '',
    cargando: false,
  },
)

const abierto = defineModel<boolean>('abierto', { default: false })
const emit = defineEmits<{ confirmar: [motivo: string | undefined] }>()

const aceptado = ref(false)
const motivo = ref('')

watch(abierto, (valor) => {
  if (valor) {
    aceptado.value = false
    motivo.value = props.motivoSugerido
  }
})

const puedeConfirmar = computed(
  () => (!props.fuerte || aceptado.value) && (!props.pedirMotivo || !props.motivoRequerido || !!motivo.value.trim()),
)

function confirmar() {
  emit('confirmar', props.pedirMotivo ? motivo.value : undefined)
}
</script>

<template>
  <v-dialog v-model="abierto" max-width="480">
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
        <span>{{ titulo }}</span>
        <v-btn icon="mdi-close" variant="text" density="compact" @click="abierto = false" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <p class="text-body-2 mb-4">{{ mensaje }}</p>
        <v-textarea
          v-if="pedirMotivo"
          v-model="motivo"
          :label="motivoRequerido ? 'Motivo' : 'Motivo (opcional)'"
          class="mb-2"
        />
        <v-checkbox v-if="fuerte" v-model="aceptado" label="Entiendo y deseo continuar" hide-details />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
        <v-btn variant="outlined" color="secondary" class="px-5" @click="abierto = false">Cancelar</v-btn>
        <v-btn :color="color" variant="flat" elevation="2" class="px-6" :loading="cargando" :disabled="!puedeConfirmar" @click="confirmar">
          {{ textoConfirmar }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
