<script setup lang="ts">
// Selector de RANGO de fechas en un solo control (05C hardening — reemplaza
// el par de `BaseDatePicker` "Desde"/"Hasta" que había en el Dashboard por
// un único campo, con atajos comunes). Mismo criterio que `BaseDatePicker`:
// el modelo son strings `YYYY-MM-DD` (o `''`), y toda conversión a/desde
// `Date` usa getters/constructor LOCALES (nunca parseo UTC), para no
// introducir un corrimiento de día según el huso horario del navegador.
//
// `v-date-picker` con `multiple="range"` (Vuetify 3.13, soportado nativo)
// expone su v-model como `Date[]` con TODOS los días del rango — acá solo se
// usan el primero y el último. El color de selección reutiliza `primary` del
// tema activo (05D: nada de color fuera del tema), igual que los botones de
// atajos y de "Aplicar".
import { computed, reactive, ref } from 'vue'

import { aTextoFecha } from '@/utils/fechas'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ label?: string }>(), {
  label: 'Rango de fechas',
})

const emit = defineEmits<{ aplicar: [] }>()

const desde = defineModel<string>('desde', { default: '' })
const hasta = defineModel<string>('hasta', { default: '' })

const menuAbierto = ref(false)

function aFecha(valor: string): Date | null {
  if (!valor) return null
  const [anio, mes, dia] = valor.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}
function aTextoCorto(valor: string): string {
  const [anio, mes, dia] = valor.split('-')
  return `${dia}/${mes}/${anio}`
}

// `v-date-picker` con `multiple="range"` solo pinta como "en rango" los días
// que efectivamente están en el array del v-model — si solo se le pasan los
// dos extremos, únicamente esos dos días quedan resaltados. Hay que
// completar cada día intermedio a mano.
function diasEntre(inicio: Date, fin: Date): Date[] {
  const dias: Date[] = []
  const cursor = new Date(inicio)
  while (cursor <= fin) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

// Borrador local: el rango solo se confirma al modelo (y dispara "aplicar")
// al elegir un atajo o tocar "Aplicar" — así arrastrar el calendario no
// recarga el dashboard en cada clic intermedio.
const borrador = reactive({ desde: desde.value, hasta: hasta.value })
function sincronizarBorrador() {
  borrador.desde = desde.value
  borrador.hasta = hasta.value
}

const rangoCalendario = computed<Date[]>({
  get: () => {
    const inicio = aFecha(borrador.desde)
    const fin = aFecha(borrador.hasta)
    if (!inicio && !fin) return []
    if (inicio && !fin) return [inicio]
    if (!inicio && fin) return [fin]
    return diasEntre(inicio as Date, fin as Date)
  },
  set: (valor) => {
    if (!valor.length) {
      borrador.desde = ''
      borrador.hasta = ''
      return
    }
    const ordenado = [...valor].sort((a, b) => a.getTime() - b.getTime())
    borrador.desde = aTextoFecha(ordenado[0])
    borrador.hasta = aTextoFecha(ordenado[ordenado.length - 1])
  },
})

const textoVisible = computed(() => {
  if (!desde.value && !hasta.value) return ''
  if (desde.value && !hasta.value) return `Desde ${aTextoCorto(desde.value)}`
  if (!desde.value && hasta.value) return `Hasta ${aTextoCorto(hasta.value)}`
  if (desde.value === hasta.value) return aTextoCorto(desde.value)
  return `${aTextoCorto(desde.value)} – ${aTextoCorto(hasta.value)}`
})

function hoy(): Date {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
}

interface Atajo {
  titulo: string
  rango: () => [Date, Date]
}
const atajos: Atajo[] = [
  { titulo: 'Hoy', rango: () => [hoy(), hoy()] },
  {
    titulo: 'Ayer',
    rango: () => {
      const d = hoy()
      d.setDate(d.getDate() - 1)
      return [d, d]
    },
  },
  {
    titulo: 'Últimos 7 días',
    rango: () => {
      const fin = hoy()
      const inicio = hoy()
      inicio.setDate(inicio.getDate() - 6)
      return [inicio, fin]
    },
  },
  {
    titulo: 'Últimos 30 días',
    rango: () => {
      const fin = hoy()
      const inicio = hoy()
      inicio.setDate(inicio.getDate() - 29)
      return [inicio, fin]
    },
  },
  {
    titulo: 'Mes actual',
    rango: () => {
      const ahora = hoy()
      return [new Date(ahora.getFullYear(), ahora.getMonth(), 1), ahora]
    },
  },
  {
    titulo: 'Mes anterior',
    rango: () => {
      const ahora = hoy()
      return [new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1), new Date(ahora.getFullYear(), ahora.getMonth(), 0)]
    },
  },
  {
    titulo: 'Este año',
    rango: () => {
      const ahora = hoy()
      return [new Date(ahora.getFullYear(), 0, 1), ahora]
    },
  },
]

// Se compara contra el borrador (no contra el modelo ya confirmado): así el
// atajo activo se resalta apenas se elige, sin esperar a "Aplicar".
const atajoActivo = computed(() =>
  atajos.find((a) => {
    const [inicio, fin] = a.rango()
    return aTextoFecha(inicio) === borrador.desde && aTextoFecha(fin) === borrador.hasta
  })?.titulo ?? null,
)

// Elegir un atajo solo actualiza el borrador (pinta el rango completo en el
// calendario, mismo camino que arrastrar el mouse) — se confirma recién con
// "Aplicar", igual que una selección manual.
function elegirAtajo(atajo: Atajo) {
  const [inicio, fin] = atajo.rango()
  borrador.desde = aTextoFecha(inicio)
  borrador.hasta = aTextoFecha(fin)
}

function limpiar() {
  desde.value = ''
  hasta.value = ''
  menuAbierto.value = false
  emit('aplicar')
}

function aplicar() {
  desde.value = borrador.desde
  hasta.value = borrador.hasta
  menuAbierto.value = false
  emit('aplicar')
}

function alAbrir(abierto: boolean) {
  if (abierto) sincronizarBorrador()
}
</script>

<template>
  <v-menu v-model="menuAbierto" :close-on-content-click="false" location="bottom start" @update:model-value="alAbrir">
    <template #activator="{ props: activadorProps }">
      <v-text-field
        v-bind="{ ...$attrs, ...activadorProps }"
        :model-value="textoVisible"
        :label="label"
        placeholder="Todo el período"
        readonly
        clearable
        prepend-inner-icon="mdi-calendar-range-outline"
        @click:clear="limpiar"
      />
    </template>

    <v-card class="rango-fechas-card">
      <div class="d-flex flex-wrap">
        <v-list density="compact" class="rango-fechas-atajos py-2">
          <v-list-item
            v-for="atajo in atajos"
            :key="atajo.titulo"
            :active="atajoActivo === atajo.titulo"
            color="primary"
            @click="elegirAtajo(atajo)"
          >
            <v-list-item-title>{{ atajo.titulo }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <v-divider vertical />

        <div>
          <v-date-picker v-model="rangoCalendario" multiple="range" color="primary" hide-header show-adjacent-months />
          <v-divider />
          <div class="d-flex justify-end ga-2 pa-3">
            <v-btn variant="tonal" color="primary" size="small" @click="menuAbierto = false">Cancelar</v-btn>
            <v-btn color="primary" size="small" @click="aplicar">Aplicar</v-btn>
          </div>
        </div>
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
.rango-fechas-card {
  overflow: hidden;
}
.rango-fechas-atajos {
  min-width: 160px;
}
</style>
