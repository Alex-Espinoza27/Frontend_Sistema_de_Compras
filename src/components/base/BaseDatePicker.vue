<script setup lang="ts">
// Selector de fecha con estilo Vuetify (05C hardening) — reemplaza los
// `<input type="date">` nativos del navegador por un `v-date-picker` dentro
// de un menú, manteniendo el mismo contrato que antes: v-model es un string
// `YYYY-MM-DD` (o `''`), igual que el input nativo. La conversión a/desde
// `Date` se hace con los getters/constructor LOCALES (nunca parseo UTC ni
// dayjs) para no reintroducir un corrimiento de día según el huso horario
// del navegador.
import { computed, ref } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label: string
    rules?: ((valor: unknown) => true | string)[]
    errorMessages?: string[]
    disabled?: boolean
    clearable?: boolean
  }>(),
  {
    rules: () => [],
    errorMessages: () => [],
    disabled: false,
    clearable: false,
  },
)

const modelValue = defineModel<string>({ default: '' })
const menuAbierto = ref(false)

function aFecha(valor: string): Date | null {
  if (!valor) return null
  const [anio, mes, dia] = valor.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function aTexto(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const fechaSeleccionada = computed<Date | null>({
  get: () => aFecha(modelValue.value),
  set: (valor) => {
    modelValue.value = valor ? aTexto(valor) : ''
    menuAbierto.value = false
  },
})

const textoVisible = computed(() => {
  if (!modelValue.value) return ''
  const [anio, mes, dia] = modelValue.value.split('-')
  return `${dia}/${mes}/${anio}`
})
</script>

<template>
  <v-menu v-model="menuAbierto" :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: activadorProps }">
      <v-text-field
        v-bind="{ ...$attrs, ...activadorProps }"
        :model-value="textoVisible"
        :label="label"
        readonly
        :disabled="disabled"
        :clearable="clearable"
        :rules="rules"
        :error-messages="errorMessages"
        prepend-inner-icon="mdi-calendar-outline"
        @click:clear="modelValue = ''"
      />
    </template>
    <v-date-picker v-model="fechaSeleccionada" hide-header show-adjacent-months />
  </v-menu>
</template>
