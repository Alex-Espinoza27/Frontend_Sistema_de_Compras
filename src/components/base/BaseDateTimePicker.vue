<script setup lang="ts">
// Selector de fecha + hora (05C hardening — Bloque E1: las convocatorias
// ahora registran hora exacta de inicio/fin, no solo fecha). v-model es un
// string `YYYY-MM-DDTHH:mm` (o `''`), mismo patrón de conversión LOCAL de
// `BaseDatePicker.vue` (nunca parseo UTC/dayjs, para no introducir un
// corrimiento de día según el huso horario del navegador) más un
// `v-text-field type="time"` para la hora.
import { computed, ref } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label: string
    rules?: ((valor: unknown) => true | string)[]
    errorMessages?: string[]
    disabled?: boolean
    clearable?: boolean
    /** Fecha mínima seleccionable (`YYYY-MM-DD`) — p.ej. en "fecha de fin" se
     * pasa la fecha de inicio para no poder elegir un día anterior (05C
     * hardening, pedido explícitamente por el usuario). */
    minFecha?: string
  }>(),
  {
    rules: () => [],
    errorMessages: () => [],
    disabled: false,
    clearable: false,
    minFecha: undefined,
  },
)

const modelValue = defineModel<string>({ default: '' })
const menuAbierto = ref(false)

function partes(valor: string): { fecha: string; hora: string } {
  const [fecha, hora] = valor.split('T')
  return { fecha: fecha ?? '', hora: hora ?? '00:00' }
}

function aFecha(fecha: string): Date | null {
  if (!fecha) return null
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function aTextoFecha(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const fechaSeleccionada = computed<Date | null>({
  get: () => aFecha(partes(modelValue.value).fecha),
  set: (valor) => {
    const { hora } = partes(modelValue.value)
    modelValue.value = valor ? `${aTextoFecha(valor)}T${hora}` : ''
  },
})

const horaSeleccionada = computed<string>({
  get: () => partes(modelValue.value).hora,
  set: (valor) => {
    const { fecha } = partes(modelValue.value)
    if (fecha) modelValue.value = `${fecha}T${valor || '00:00'}`
  },
})

const textoVisible = computed(() => {
  const { fecha, hora } = partes(modelValue.value)
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio} ${hora} horas`
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
        prepend-inner-icon="mdi-calendar-clock-outline"
        @click:clear="modelValue = ''"
      />
    </template>
    <v-card>
      <div class="d-flex align-stretch flex-wrap">
        <v-date-picker
          v-model="fechaSeleccionada"
          color="primary"
          :min="minFecha"
          width="300"
          hide-header
          show-adjacent-months
        />
        <v-divider vertical />
        <v-time-picker v-model="horaSeleccionada" color="primary" format="24hr" width="300" />
      </div>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" color="primary" @click="menuAbierto = false">Listo</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
