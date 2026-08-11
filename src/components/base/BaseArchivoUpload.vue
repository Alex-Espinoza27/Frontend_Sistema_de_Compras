<script setup lang="ts">
// Subida de archivos (DJ, sustentos, TDR, plantilla DJ — 05B). El model
// siempre es `File[]` (incluso en modo single) para no bifurcar el tipo en
// cada pantalla que lo use; la validación real de tipo/tamaño es del backend
// (422), esto solo evita subidas que fallarían seguro.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    accept?: string
    multiple?: boolean
    maxSizeMb?: number
    hint?: string
    errorMessages?: string[]
  }>(),
  {
    accept: '.pdf,.doc,.docx',
    multiple: false,
    maxSizeMb: 10,
    hint: undefined,
    errorMessages: () => [],
  },
)

const modelValue = defineModel<File[]>({ default: () => [] })

const valorInterno = computed<File[]>({
  get: () => modelValue.value,
  set: (valor) => {
    const lista = Array.isArray(valor) ? valor : valor ? [valor] : []
    modelValue.value = props.multiple ? lista : lista.slice(-1)
  },
})

const excedeTamano = computed(() =>
  modelValue.value.some((archivo) => archivo.size > props.maxSizeMb * 1024 * 1024),
)

const mensajesError = computed(() =>
  excedeTamano.value ? [`Cada archivo debe pesar como máximo ${props.maxSizeMb} MB.`] : (props.errorMessages ?? []),
)
</script>

<template>
  <v-file-input
    v-model="valorInterno"
    :label="label"
    :accept="accept"
    :multiple="multiple"
    :error-messages="mensajesError"
    :hint="hint ?? `Formatos permitidos: ${accept}. Máximo ${maxSizeMb} MB por archivo.`"
    persistent-hint
    show-size
    chips
  />
</template>
