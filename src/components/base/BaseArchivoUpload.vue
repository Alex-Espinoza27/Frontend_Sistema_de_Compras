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

const extensionesPermitidas = computed(() =>
  props.accept
    .split(',')
    .map((e) => e.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean),
)

const formatoInvalido = computed(() =>
  modelValue.value.some((archivo) => !extensionesPermitidas.value.includes(archivo.name.split('.').pop()?.toLowerCase() ?? '')),
)

const mensajesError = computed(() => {
  if (formatoInvalido.value) {
    const lista = extensionesPermitidas.value.map((e) => e.toUpperCase())
    const texto = lista.length > 1 ? `${lista.slice(0, -1).join(', ')} o ${lista[lista.length - 1]}` : (lista[0] ?? '')
    return [`Solo se permiten archivos ${texto}.`]
  }
  if (excedeTamano.value) return [`Cada archivo debe pesar como máximo ${props.maxSizeMb} MB.`]
  return props.errorMessages ?? []
})
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
