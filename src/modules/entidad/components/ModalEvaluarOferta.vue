<script setup lang="ts">
// F2 — Modal de evaluación (05B), reordenado en 4 pasos a pedido del usuario
// (más ordenado y secuencial para el evaluador): Ítems → Condiciones →
// Archivos (con previsualización) → Evaluación. Reevaluable mientras la
// convocatoria siga EN_EVALUACION; se precargan las compuertas ya
// registradas si la oferta fue evaluada antes.
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { evaluacionApi } from '@/api/evaluacion.api'
import BaseStepper from '@/components/base/BaseStepper.vue'
import { useDescarga } from '@/composables/useDescarga'
import type {
  ArchivoEvaluacion,
  OfertaEvaluacionDetalle,
  ResultadoEvaluacionCompuerta,
} from '@/modules/entidad/entidad.types'

const props = defineProps<{ ofertaId: number | null }>()
const abierto = defineModel<boolean>('abierto', { default: false })
const emit = defineEmits<{ guardado: [] }>()

const pasos = ['Ítems', 'Condiciones', 'Archivos', 'Evaluación']
const paso = ref(1)

const cargando = ref(false)
const detalle = ref<OfertaEvaluacionDetalle | null>(null)

const evalTecnica = ref<ResultadoEvaluacionCompuerta>(null)
const motivoTecnica = ref('')
const evalLogistica = ref<ResultadoEvaluacionCompuerta>(null)
const motivoLogistica = ref('')

watch(
  () => props.ofertaId,
  async (id) => {
    paso.value = 1
    limpiarPreview()
    if (!id) return
    cargando.value = true
    detalle.value = null
    try {
      detalle.value = await evaluacionApi.detalle(id)
      evalTecnica.value = detalle.value.eval_tecnica
      motivoTecnica.value = detalle.value.eval_tecnica_motivo ?? ''
      evalLogistica.value = detalle.value.eval_logistica
      motivoLogistica.value = detalle.value.eval_logistica_motivo ?? ''
      // Precarga la previsualización del primer archivo para que el
      // evaluador no tenga que hacer clic al llegar al paso 3.
      if (detalle.value.archivos.length) previsualizar(detalle.value.archivos[0])
    } finally {
      cargando.value = false
    }
  },
)

// --- Paso 3 · Archivos con previsualización ---------------------------------
const { descargar, obtenerBlob } = useDescarga()
const archivoActivo = ref<ArchivoEvaluacion | null>(null)
const cargandoPreview = ref(false)
const blobUrlPreview = ref('')

function esPdf(nombre: string) {
  return nombre.toLowerCase().endsWith('.pdf')
}

function limpiarPreview() {
  if (blobUrlPreview.value) URL.revokeObjectURL(blobUrlPreview.value)
  blobUrlPreview.value = ''
  archivoActivo.value = null
}

async function previsualizar(archivo: ArchivoEvaluacion) {
  if (blobUrlPreview.value) URL.revokeObjectURL(blobUrlPreview.value)
  blobUrlPreview.value = ''
  archivoActivo.value = archivo
  if (!esPdf(archivo.nombre)) return
  cargandoPreview.value = true
  try {
    const blob = await obtenerBlob(archivo.descarga_url)
    if (blob) blobUrlPreview.value = URL.createObjectURL(blob)
  } finally {
    cargandoPreview.value = false
  }
}

onBeforeUnmount(limpiarPreview)

// --- Paso 4 · Evaluación -----------------------------------------------------
const puedeGuardar = computed(
  () =>
    (evalTecnica.value !== null || evalLogistica.value !== null) &&
    (evalTecnica.value !== 'DESAPROBADO' || !!motivoTecnica.value.trim()) &&
    (evalLogistica.value !== 'DESAPROBADO' || !!motivoLogistica.value.trim()),
)

const guardando = ref(false)
const errorGuardar = ref('')
async function guardar() {
  if (!props.ofertaId) return
  errorGuardar.value = ''
  guardando.value = true
  try {
    await evaluacionApi.evaluar(props.ofertaId, {
      ...(evalTecnica.value !== null && {
        eval_tecnica: evalTecnica.value,
        eval_tecnica_motivo: evalTecnica.value === 'DESAPROBADO' ? motivoTecnica.value : null,
      }),
      ...(evalLogistica.value !== null && {
        eval_logistica: evalLogistica.value,
        eval_logistica_motivo: evalLogistica.value === 'DESAPROBADO' ? motivoLogistica.value : null,
      }),
    })
    abierto.value = false
    emit('guardado')
  } catch (e: unknown) {
    const error = e as { response?: { data?: { mensaje?: string | null } } }
    errorGuardar.value = error.response?.data?.mensaje ?? 'No se pudo guardar la evaluación.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <v-dialog v-model="abierto" max-width="1100" scrollable>
    <v-card>
      <v-card-title class="text-titulo">
        Evaluar oferta
        <div v-if="detalle" class="text-body-2 text-grey font-weight-regular">
          {{ detalle.proveedor.numero_documento }} — {{ detalle.proveedor.razon_social }}
        </div>
      </v-card-title>

      <v-card-text style="min-height: 480px">
        <v-progress-circular v-if="cargando" indeterminate color="primary" />

        <BaseStepper v-else-if="detalle" v-model="paso" :pasos="pasos">
          <!-- Paso 1 · Ítems -->
          <v-stepper-window-item :value="1">
            <div class="pa-4">
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Descripción</th>
                    <th>Presentación</th>
                    <th>Marca/Modelo</th>
                    <th>P. Unitario</th>
                    <th>P. Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in detalle.items" :key="item.numero">
                    <td>{{ item.numero }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.presentacion ?? '—' }}</td>
                    <td>{{ item.marca_modelo }}</td>
                    <td>{{ item.precio_unitario }}</td>
                    <td>{{ item.precio_total }}</td>
                  </tr>
                </tbody>
              </v-table>
              <div class="d-flex justify-end mt-6">
                <v-btn color="primary" @click="paso = 2">Continuar</v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 2 · Condiciones -->
          <v-stepper-window-item :value="2">
            <div class="pa-4">
              <div class="text-subtitle-2 text-titulo mb-3">Condiciones ofertadas</div>
              <v-row dense>
                <v-col cols="6" sm="3">
                  <div class="text-body-2 text-grey">Validez de la oferta</div>
                  <div>{{ detalle.validez_dias }} días</div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-body-2 text-grey">Garantía</div>
                  <div>{{ detalle.plazo_garantia }}</div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-body-2 text-grey">Plazo de ejecución</div>
                  <div>{{ detalle.plazo_ejecucion.segun_tdr ? 'Según TDR' : `${detalle.plazo_ejecucion.dias} días` }}</div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-body-2 text-grey">Forma de pago</div>
                  <div>{{ detalle.forma_pago.segun_tdr ? 'Según TDR' : `${detalle.forma_pago.dias} días` }}</div>
                </v-col>
              </v-row>

              <v-divider class="my-5" />

              <div class="text-subtitle-2 text-titulo mb-3">Datos de contacto</div>
              <v-row dense>
                <v-col cols="12" sm="4" class="d-flex align-center ga-2">
                  <v-icon icon="mdi-account-outline" size="18" color="grey" />
                  <span>{{ detalle.contacto.nombre }}</span>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex align-center ga-2">
                  <v-icon icon="mdi-phone-outline" size="18" color="grey" />
                  <span>{{ detalle.contacto.telefono }}</span>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex align-center ga-2">
                  <v-icon icon="mdi-email-outline" size="18" color="grey" />
                  <span>{{ detalle.contacto.correo }}</span>
                </v-col>
              </v-row>

              <div class="d-flex justify-space-between mt-6">
                <v-btn variant="tonal" color="primary" @click="paso = 1">Atrás</v-btn>
                <v-btn color="primary" @click="paso = 3">Continuar</v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 3 · Archivos con previsualización -->
          <v-stepper-window-item :value="3">
            <div class="pa-4">
              <v-row>
                <v-col cols="12" sm="4">
                  <v-list density="compact">
                    <v-list-item
                      v-for="archivo in detalle.archivos"
                      :key="archivo.archivo_id"
                      :title="archivo.nombre"
                      :active="archivoActivo?.archivo_id === archivo.archivo_id"
                      prepend-icon="mdi-file-document-outline"
                      rounded="md"
                      @click="previsualizar(archivo)"
                    />
                  </v-list>
                  <div v-if="!detalle.archivos.length" class="text-body-2 text-grey">Sin archivos adjuntos.</div>
                </v-col>
                <v-col cols="12" sm="8">
                  <div v-if="!archivoActivo" class="d-flex align-center justify-center fill-height text-grey" style="min-height: 320px">
                    Selecciona un archivo para previsualizarlo.
                  </div>
                  <v-progress-circular v-else-if="cargandoPreview" indeterminate color="primary" />
                  <iframe
                    v-else-if="blobUrlPreview"
                    :src="blobUrlPreview"
                    style="width: 100%; height: 420px; border: 1px solid var(--v-border-color)"
                  />
                  <v-alert v-else type="info" density="compact">
                    No se puede previsualizar este tipo de archivo en el navegador. Descárgalo para revisarlo.
                    <div class="mt-2">
                      <v-btn size="small" @click="descargar(archivoActivo.descarga_url, archivoActivo.nombre)">
                        Descargar
                      </v-btn>
                    </div>
                  </v-alert>
                </v-col>
              </v-row>
              <div class="d-flex justify-space-between mt-6">
                <v-btn variant="tonal" color="primary" @click="paso = 2">Atrás</v-btn>
                <v-btn color="primary" @click="paso = 4">Continuar</v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 4 · Evaluación -->
          <v-stepper-window-item :value="4">
            <div class="pa-4">
              <v-alert v-if="errorGuardar" type="error" density="compact" class="mb-4">{{ errorGuardar }}</v-alert>

              <div class="text-subtitle-2 mb-1">Evaluación técnica</div>
              <v-radio-group v-model="evalTecnica" inline hide-details class="mb-2">
                <v-radio label="Aprobado" value="APROBADO" />
                <v-radio label="Desaprobado" value="DESAPROBADO" />
              </v-radio-group>
              <v-textarea
                v-if="evalTecnica === 'DESAPROBADO'"
                v-model="motivoTecnica"
                label="Motivo (obligatorio)"
                class="mb-4"
              />

              <div class="text-subtitle-2 mb-1">Evaluación logística</div>
              <v-radio-group v-model="evalLogistica" inline hide-details class="mb-2">
                <v-radio label="Aprobado" value="APROBADO" />
                <v-radio label="Desaprobado" value="DESAPROBADO" />
              </v-radio-group>
              <v-textarea
                v-if="evalLogistica === 'DESAPROBADO'"
                v-model="motivoLogistica"
                label="Motivo (obligatorio)"
                class="mb-4"
              />

              <div class="d-flex justify-space-between mt-2">
                <v-btn variant="tonal" color="primary" @click="paso = 3">Atrás</v-btn>
                <v-btn color="primary" :loading="guardando" :disabled="!puedeGuardar" @click="guardar">Guardar evaluación</v-btn>
              </div>
            </div>
          </v-stepper-window-item>
        </BaseStepper>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="abierto = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
