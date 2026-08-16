<script setup lang="ts">
// 05C hardening (pedido explícitamente por el usuario): la card se reorganizó
// en 3 columnas (nombre del servicio 66% del ancho para que nunca se corte,
// fechas y estado/acción cada una en su propia columna) porque antes el
// contenido quedaba centrado con mucho espacio vacío alrededor. Se agregó el
// chip de Tipo (Bien/Servicio, mismo patrón de color que `PostularView.vue`)
// y el botón de TDR/EETT ahora vive debajo del nombre del servicio, no
// después de las fechas.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from '@/plugins/dayjs'
import { useAuthStore } from '@/stores/auth.store'
import { useDescarga } from '@/composables/useDescarga'
import { publicoApi } from '@/api/publico.api'
import type { ConvocatoriaPublicaItem } from '@/modules/publico/publico.types'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'

const props = defineProps<{ convocatoria: ConvocatoriaPublicaItem }>()
const emit = defineEmits<{ 'ver-motivo': [id: number] }>()

const auth = useAuthStore()
const router = useRouter()
const { cargando, abrirEnNuevaPestana } = useDescarga()
const { cargando: descargandoTdr, descargar: descargarArchivo } = useDescarga()

// Postular (05C hardening, pedido explícitamente por el usuario): tras
// iniciar sesión, lleva directo al formulario de postulación de esta misma
// convocatoria (no al listado genérico) — LoginView.vue ya respeta
// `route.query.redirect` si viene.
const rutaLogin = computed(() => ({
  path: '/login',
  query: { redirect: `/app/postular/${props.convocatoria.convocatoria_id}` },
}))

// Si ya hay una sesión iniciada con un rol que no es PROVEEDOR (ej. quedó
// logueado como ADMINISTRADOR/ENTIDAD en otra pestaña), un simple `to="/login"`
// no sirve: el guard `soloInvitado` de /login rebota a cualquier usuario ya
// autenticado de vuelta a /app. Hay que cerrar esa sesión primero para que el
// botón realmente lleve al formulario de login.
async function irALoginParaPostular() {
  if (auth.autenticado) await auth.logout()
  router.push(rutaLogin.value)
}

function verResultados() {
  abrirEnNuevaPestana(publicoApi.resultadosPdfUrl(props.convocatoria.convocatoria_id))
}
function descargarTdr() {
  if (!props.convocatoria.archivo_tdr) return
  descargarArchivo(publicoApi.tdrUrl(props.convocatoria.convocatoria_id), props.convocatoria.archivo_tdr.nombre)
}

const etiquetaTdr = computed(() =>
  props.convocatoria.tipo === 'SERVICIO' ? 'Descargar Especificaciones Técnicas' : 'Descargar Términos de Referencia',
)

// Motivo/resultado visibles directamente en la card, sin abrir el detalle
// (05C hardening, pedido explícitamente por el usuario — antes solo se veían
// al abrir el modal "Ver motivo").
const fraseResultado = computed(() => {
  const c = props.convocatoria
  if (c.resultado_resumen) return c.resultado_resumen
  if (c.motivo_cierre) {
    return `La convocatoria fue declarada ${c.estado.nombre.toUpperCase()} por el motivo siguiente: ${c.motivo_cierre}`
  }
  return null
})

const etiquetaDocumento = computed(() => (props.convocatoria.estado.codigo === 'DESIERTA' ? 'Ver documento' : 'Ver resultados'))

// --- Cuenta regresiva en vivo -------------------------------------------------
const ahora = ref(dayjs())
let temporizador: ReturnType<typeof setInterval>
onMounted(() => {
  temporizador = setInterval(() => {
    ahora.value = dayjs()
  }, 60000)
})
onUnmounted(() => clearInterval(temporizador))

const venceEnTexto = computed(() => {
  if (props.convocatoria.accion !== 'POSTULAR') return null
  const minutos = dayjs(props.convocatoria.fecha_fin).diff(ahora.value, 'minute')
  if (minutos <= 0) return null
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const mins = minutos % 60
  const partes: string[] = []
  if (dias > 0) partes.push(`${dias} día${dias === 1 ? '' : 's'}`)
  partes.push(`${horas} hora${horas === 1 ? '' : 's'}`)
  partes.push(`${mins} minuto${mins === 1 ? '' : 's'}`)
  return `Vence en ${partes.join(', ')}`
})
</script>

<template>
  <v-card class="pa-6" rounded="lg">
    <v-row no-gutters>
      <!-- Nombre del servicio: 66% del ancho (md=8/12) para que nunca se corte -->
      <v-col cols="12" md="8" class="pr-md-4 mb-4 mb-md-0">
        <div class="d-flex align-center flex-wrap ga-2 mb-1">
          <span class="text-datos">{{ convocatoria.numero ?? '—' }}</span>
          <v-icon
            v-if="convocatoria.es_urgente"
            icon="mdi-alert-circle-outline"
            color="accent"
            size="18"
          />
          <v-chip :color="convocatoria.tipo === 'BIEN' ? 'accent' : 'primary'" variant="flat" size="small">
            {{ convocatoria.tipo === 'BIEN' ? 'Bien' : 'Servicio' }}
          </v-chip>
        </div>
        <div class="text-titulo text-h6 mb-2">{{ convocatoria.nombre_servicio }}</div>

        <div v-if="fraseResultado" class="text-body-2 text-grey mb-2">{{ fraseResultado }}</div>

        <v-btn
          v-if="convocatoria.archivo_tdr"
          variant="text"
          size="small"
          density="compact"
          class="pl-0"
          prepend-icon="mdi-file-download-outline"
          :loading="descargandoTdr"
          @click="descargarTdr"
        >
          {{ etiquetaTdr }}
        </v-btn>
      </v-col>

      <!-- Fechas -->
      <v-col cols="6" md="2" class="mb-4 mb-md-0">
        <div v-if="convocatoria.fecha_publicacion" class="text-body-2 text-grey">
          Publicación: {{ dayjs(convocatoria.fecha_publicacion).tz().format('DD/MM/YYYY') }}
        </div>
        <div class="text-body-2 text-grey">
          Postular hasta: {{ dayjs(convocatoria.fecha_fin).tz().format('DD/MM/YYYY') }}
          {{ dayjs(convocatoria.fecha_fin).tz().format('HH:mm') }}h
        </div>
        <div v-if="venceEnTexto" class="text-body-2 font-weight-medium" :class="convocatoria.es_urgente ? 'text-accent' : 'text-primary'">
          {{ venceEnTexto }}
        </div>
      </v-col>

      <!-- Estado + acción -->
      <v-col cols="6" md="2" class="d-flex flex-column align-end ga-2">
        <BaseChipEstado :estado="convocatoria.estado" size="large" />

        <template v-if="convocatoria.accion === 'POSTULAR'">
          <v-btn
            v-if="auth.usuario?.rol === 'PROVEEDOR'"
            :to="`/app/postular/${convocatoria.convocatoria_id}`"
            size="small"
            block
            class="boton-ajustable"
          >
            Postular
          </v-btn>
          <v-btn v-else-if="!auth.autenticado" :to="rutaLogin" variant="tonal" size="small" block class="boton-ajustable">
            Inicia sesión para postular
          </v-btn>
          <template v-else>
            <v-btn variant="tonal" size="small" block class="boton-ajustable" @click="irALoginParaPostular">
              Iniciar sesión
            </v-btn>
            <div class="text-caption text-grey text-right">
              Solo los proveedores registrados pueden postular.
            </div>
          </template>
        </template>

        <v-btn
          v-else-if="convocatoria.accion === 'YA_POSTULADO'"
          variant="tonal"
          color="success"
          size="small"
          block
          class="boton-ajustable"
          prepend-icon="mdi-check-circle-outline"
          to="/app/mis-postulaciones"
        >
          Ya postulaste
        </v-btn>

        <v-btn
          v-else-if="convocatoria.accion === 'VER_POSTULACION' && convocatoria.oferta_id"
          variant="tonal"
          color="primary"
          size="small"
          block
          class="boton-ajustable"
          prepend-icon="mdi-file-eye-outline"
          :to="`/app/mis-postulaciones/${convocatoria.oferta_id}`"
        >
          Ver mi postulación
        </v-btn>

        <v-btn
          v-else-if="convocatoria.accion === 'RESULTADOS'"
          variant="tonal"
          size="small"
          block
          class="boton-ajustable"
          :loading="cargando"
          @click="verResultados"
        >
          {{ etiquetaDocumento }}
        </v-btn>

        <v-btn
          v-else-if="convocatoria.accion === 'MOTIVO'"
          variant="tonal"
          size="small"
          block
          class="boton-ajustable"
          @click="emit('ver-motivo', convocatoria.convocatoria_id)"
        >
          Ver motivo
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
/* El texto de los botones de acción puede ser más ancho que la columna
   angosta donde viven (05C hardening, pedido explícitamente por el usuario
   — antes se salía del borde en pantallas medias); se permite salto de
   línea en vez de desbordar. El chip de estado usa el mismo tratamiento,
   pero ya lo trae `BaseChipEstado.vue` de fábrica.

   `min-height` cubre el caso de 2 líneas (ej. "Ver resultados"/
   "Ver documento" no siempre entran en una sola línea en esta columna
   angosta, a diferencia de "Ver motivo") y se aplica siempre, para que
   todas las cards de una misma lista tengan el botón a la misma altura
   en vez de saltar entre alto/bajo según el texto de cada una (05C
   hardening, pedido explícitamente por el usuario). */
.boton-ajustable {
  height: auto !important;
  min-height: 52px;
  white-space: normal;
}
.boton-ajustable :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
</style>
