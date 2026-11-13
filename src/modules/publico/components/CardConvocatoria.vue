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

// Motivo de cierre visible directamente en la card para DESIERTA y CANCELADA
// (para ADJUDICADA el detalle se consulta en el documento de resultados)
const fraseResultado = computed(() => {
  const c = props.convocatoria
  if (c.motivo_cierre && (c.estado.codigo === 'DESIERTA' || c.estado.codigo === 'CANCELADA')) {
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
  <v-card
    class="pa-5 card-convocatoria"
    :class="{ 'card-convocatoria--urgente': convocatoria.es_urgente }"
    rounded="lg"
  >
    <v-row align="center">
      <!-- Columna Principal: Código, Tipo, Título y TDR (md=7, lg=7) -->
      <v-col cols="12" md="7" class="pr-md-4">
        <!-- Badges superiores -->
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <!-- Número de Convocatoria (Alto contraste en claro y oscuro) -->
          <v-chip
            variant="tonal"
            size="small"
            color="primary"
            class="font-datos font-weight-bold chip-codigo"
          >
            <v-icon icon="mdi-pound" size="14" class="mr-1" />
            {{ convocatoria.numero ?? 'S/N' }}
          </v-chip>

          <!-- Tipo Bien / Servicio -->
          <v-chip
            :color="convocatoria.tipo === 'BIEN' ? 'accent' : 'primary'"
            variant="tonal"
            size="small"
            class="font-weight-medium"
          >
            <v-icon
              :icon="convocatoria.tipo === 'BIEN' ? 'mdi-package-variant-closed' : 'mdi-account-wrench-outline'"
              size="15"
              class="mr-1"
            />
            {{ convocatoria.tipo === 'BIEN' ? 'Bien' : 'Servicio' }}
          </v-chip>

          <!-- Sigla de la Entidad (si viene) -->
          <v-chip
            v-if="convocatoria.entidad?.sigla"
            variant="outlined"
            size="small"
            color="grey"
          >
            <v-icon icon="mdi-city-variant-outline" size="14" class="mr-1" />
            {{ convocatoria.entidad.sigla }}
          </v-chip>

          <!-- Chip de Urgencia -->
          <v-chip
            v-if="convocatoria.es_urgente"
            color="warning"
            variant="flat"
            size="small"
            class="font-weight-bold animate-pulse"
          >
            <v-icon icon="mdi-fire" size="16" class="mr-1" />
            ¡Cierra pronto!
          </v-chip>
        </div>

        <!-- Título del Requerimiento / Servicio -->
        <div class="text-titulo text-h6 font-weight-bold mb-2 servicio-titulo">
          {{ convocatoria.nombre_servicio }}
        </div>

        <!-- Frase de resultado o motivo (si existe) -->
        <v-alert
          v-if="fraseResultado"
          density="compact"
          variant="tonal"
          color="info"
          class="mb-3 rounded-md text-body-2"
          icon="mdi-information-outline"
        >
          {{ fraseResultado }}
        </v-alert>

        <!-- Botón de Descarga TDR / Especificaciones Técnicas -->
        <div v-if="convocatoria.archivo_tdr" class="d-flex align-center mt-2">
          <v-btn
            variant="outlined"
            size="small"
            color="primary"
            class="tdr-btn px-3"
            prepend-icon="mdi-file-download-outline"
            :loading="descargandoTdr"
            @click="descargarTdr"
          >
            {{ etiquetaTdr }}
            <v-tooltip activator="parent" location="top">
              Descargar archivo adjunto: {{ convocatoria.archivo_tdr.nombre }}
            </v-tooltip>
          </v-btn>
        </div>
      </v-col>

      <!-- Columna de Fechas y Cronograma (md=3, lg=3) -->
      <v-col cols="12" sm="6" md="3" class="my-2 my-md-0">
        <div class="cronograma-box pa-3">
          <div class="text-caption font-weight-bold text-uppercase text-grey mb-2 d-flex align-center ga-1">
            <v-icon icon="mdi-clock-outline" size="14" />
            <span>Cronograma del Proceso</span>
          </div>

          <!-- Publicación con fecha y hora completa -->
          <div v-if="convocatoria.fecha_publicacion" class="d-flex align-center text-caption mb-1">
            <v-icon icon="mdi-calendar-check-outline" size="15" class="mr-1 text-primary" />
            <span class="text-grey font-weight-medium">
              Pub: <strong class="text-on-surface">{{ dayjs(convocatoria.fecha_publicacion).tz().format('DD/MM/YYYY HH:mm') }}h</strong>
            </span>
          </div>

          <!-- Cierre / Fin con fecha y hora completa -->
          <div class="d-flex align-center text-caption mb-1">
            <v-icon icon="mdi-calendar-clock-outline" size="15" class="mr-1 text-error" />
            <span class="text-grey font-weight-medium">
              Fin: <strong class="text-on-surface">{{ dayjs(convocatoria.fecha_fin).tz().format('DD/MM/YYYY HH:mm') }}h</strong>
            </span>
          </div>

          <div
            v-if="venceEnTexto"
            class="d-inline-flex align-center text-caption font-weight-bold px-2 py-1 rounded mt-1"
            :class="convocatoria.es_urgente ? 'vence-alerta' : 'vence-normal'"
          >
            <v-icon icon="mdi-timer-sand-complete" size="13" class="mr-1" />
            <span>{{ venceEnTexto }}</span>
          </div>
        </div>
      </v-col>

      <!-- Columna de Estado y Acción Principal (md=2, lg=2) -->
      <v-col cols="12" sm="6" md="2" class="d-flex flex-column align-end justify-center ga-2">
        <BaseChipEstado :estado="convocatoria.estado" size="large" class="estado-destacado" />

        <template v-if="convocatoria.accion === 'POSTULAR'">
          <v-btn
            v-if="auth.usuario?.rol === 'PROVEEDOR'"
            :to="`/app/postular/${convocatoria.convocatoria_id}`"
            size="default"
            color="primary"
            variant="flat"
            elevation="2"
            block
            class="boton-ajustable"
            prepend-icon="mdi-send-check-outline"
          >
            Postular
          </v-btn>
          <v-btn
            v-else-if="!auth.autenticado"
            :to="rutaLogin"
            variant="tonal"
            color="primary"
            size="small"
            block
            class="boton-ajustable"
            prepend-icon="mdi-login"
          >
            Inicia sesión para postular
          </v-btn>
          <template v-else>
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              block
              class="boton-ajustable"
              prepend-icon="mdi-account-switch"
              @click="irALoginParaPostular"
            >
              Iniciar sesión
            </v-btn>
            <div class="text-caption text-grey text-right">
              Solo proveedores registrados pueden cotizar.
            </div>
          </template>
        </template>

        <v-btn
          v-else-if="convocatoria.accion === 'YA_POSTULADO'"
          variant="tonal"
          color="success"
          size="default"
          block
          class="boton-ajustable font-weight-bold"
          prepend-icon="mdi-check-decagram-outline"
          to="/app/mis-postulaciones"
        >
          Ya postulaste
        </v-btn>

        <v-btn
          v-else-if="convocatoria.accion === 'VER_POSTULACION' && convocatoria.oferta_id"
          variant="tonal"
          color="primary"
          size="default"
          block
          class="boton-ajustable font-weight-bold"
          prepend-icon="mdi-file-eye-outline"
          :to="`/app/mis-postulaciones/${convocatoria.oferta_id}`"
        >
          Ver mi postulación
        </v-btn>

        <v-btn
          v-else-if="convocatoria.accion === 'RESULTADOS'"
          variant="flat"
          color="primary"
          size="default"
          elevation="2"
          block
          class="boton-ajustable boton-resultados font-weight-bold"
          prepend-icon="mdi-file-chart-outline"
          :loading="cargando"
          @click="verResultados"
        >
          {{ etiquetaDocumento }}
        </v-btn>

        <v-btn
          v-else-if="convocatoria.accion === 'MOTIVO'"
          variant="outlined"
          color="grey"
          size="default"
          block
          class="boton-ajustable font-weight-bold"
          prepend-icon="mdi-text-box-search-outline"
          @click="emit('ver-motivo', convocatoria.convocatoria_id)"
        >
          Ver motivo
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
.card-convocatoria {
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 1));
}

.card-convocatoria:hover {
  transform: translateY(-2px);
  box-shadow: var(--sombra-2);
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.card-convocatoria--urgente {
  border-left: 5px solid rgb(var(--v-theme-warning)) !important;
}

.servicio-titulo {
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface));
}

.cronograma-box {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.6);
  border-radius: 16px !important;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.chip-codigo {
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  letter-spacing: 0.5px;
}

.estado-destacado {
  font-size: 0.92rem !important;
  font-weight: 700 !important;
  border-radius: 10px !important;
}

.estado-destacado :deep(.v-chip__content) {
  font-size: 0.92rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px;
}

.vence-normal {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

.vence-alerta {
  background: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));
  font-weight: 700;
}

.tdr-btn {
  text-transform: none;
  font-weight: 600;
}

.boton-ajustable {
  height: auto !important;
  min-height: 44px;
  white-space: normal;
  text-transform: none;
  font-weight: 600;
}

.boton-ajustable :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
</style>
