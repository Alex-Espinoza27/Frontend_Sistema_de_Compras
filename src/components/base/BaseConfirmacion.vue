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
    cargando?: boolean
  }>(),
  {
    textoConfirmar: 'Confirmar',
    color: 'error',
    fuerte: false,
    pedirMotivo: false,
    motivoRequerido: true,
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
    motivo.value = ''
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
    <v-card>
      <v-card-title class="text-titulo">{{ titulo }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-4">{{ mensaje }}</p>
        <v-textarea
          v-if="pedirMotivo"
          v-model="motivo"
          :label="motivoRequerido ? 'Motivo' : 'Motivo (opcional)'"
          class="mb-2"
        />
        <v-checkbox v-if="fuerte" v-model="aceptado" label="Entiendo y deseo continuar" hide-details />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="abierto = false">Cancelar</v-btn>
        <v-btn :color="color" :loading="cargando" :disabled="!puedeConfirmar" @click="confirmar">
          {{ textoConfirmar }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
