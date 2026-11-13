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

// --- Paso 1 · Ítems: total general (no viene en el detalle, se suma de los
// ítems) -----------------------------------------------------------------
const totalGeneral = computed(() => detalle.value?.items.reduce((acc, item) => acc + Number(item.precio_total), 0) ?? 0)

function formatearMoneda(valor: number | string): string {
  return 'S/ ' + Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// --- Paso 4 · Evaluación -----------------------------------------------------
// Máximo de caracteres del motivo (05C hardening, pedido explícitamente por
// el usuario): validado contra `EvaluarOfertaRequest` (`max:1000`) — el
// backend ya lo exige, pero antes el textarea no avisaba hasta guardar.
const MAX_MOTIVO = 1000

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

        <BaseStepper v-else-if="detalle" v-model="paso" :pasos="pasos" usar-cinta>
          <!-- Paso 1 · Ítems -->
          <v-stepper-window-item :value="1">
            <div class="pa-4">
              <v-table density="comfortable" class="tabla-items">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Descripción</th>
                    <th>Presentación</th>
                    <th>Marca/Modelo</th>
                    <th class="text-right">P. Unitario</th>
                    <th class="text-right">P. Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in detalle.items" :key="item.numero">
                    <td>{{ item.numero }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.presentacion ?? '—' }}</td>
                    <td>{{ item.marca_modelo }}</td>
                    <td class="text-right font-datos">{{ formatearMoneda(item.precio_unitario) }}</td>
                    <td class="text-right font-datos">{{ formatearMoneda(item.precio_total) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" class="text-right font-weight-bold">Total general</td>
                    <td class="text-right font-weight-bold font-datos text-primary">{{ formatearMoneda(totalGeneral) }}</td>
                  </tr>
                </tfoot>
              </v-table>
              <div class="d-flex justify-end mt-6">
                <v-btn color="primary" elevation="2" append-icon="mdi-arrow-right" @click="paso = 2">Continuar</v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 2 · Condiciones -->
          <v-stepper-window-item :value="2">
            <div class="pa-4">
              <div class="text-subtitle-2 text-titulo mb-3">Condiciones ofertadas</div>
              <v-row dense>
                <v-col cols="6" sm="3">
                  <div class="condicion-card pa-3 rounded-lg h-100">
                    <div class="d-flex align-center ga-1 mb-1 text-grey">
                      <v-icon icon="mdi-calendar-clock-outline" size="16" />
                      <span class="text-caption font-weight-bold text-uppercase">Validez</span>
                    </div>
                    <div class="text-body-1 font-weight-medium">{{ detalle.validez_dias }} días</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="condicion-card pa-3 rounded-lg h-100">
                    <div class="d-flex align-center ga-1 mb-1 text-grey">
                      <v-icon icon="mdi-shield-check-outline" size="16" />
                      <span class="text-caption font-weight-bold text-uppercase">Garantía</span>
                    </div>
                    <div class="text-body-1 font-weight-medium">{{ detalle.plazo_garantia }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="condicion-card pa-3 rounded-lg h-100">
                    <div class="d-flex align-center ga-1 mb-1 text-grey">
                      <v-icon icon="mdi-truck-fast-outline" size="16" />
                      <span class="text-caption font-weight-bold text-uppercase">Plazo de ejecución</span>
                    </div>
                    <div class="text-body-1 font-weight-medium">
                      {{ detalle.plazo_ejecucion.segun_tdr ? 'Según TDR' : `${detalle.plazo_ejecucion.dias} días` }}
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="condicion-card pa-3 rounded-lg h-100">
                    <div class="d-flex align-center ga-1 mb-1 text-grey">
                      <v-icon icon="mdi-cash-multiple" size="16" />
                      <span class="text-caption font-weight-bold text-uppercase">Forma de pago</span>
                    </div>
                    <div class="text-body-1 font-weight-medium">
                      {{ detalle.forma_pago.segun_tdr ? 'Según TDR' : `${detalle.forma_pago.dias} días` }}
                    </div>
                  </div>
                </v-col>
              </v-row>

              <div class="text-subtitle-2 text-titulo mb-3 mt-5">Datos de contacto</div>
              <v-row dense>
                <v-col cols="12" sm="4">
                  <div class="condicion-card pa-3 rounded-lg d-flex align-center ga-2">
                    <v-icon icon="mdi-account-outline" size="18" color="primary" />
                    <span>{{ detalle.contacto.nombre }}</span>
                  </div>
                </v-col>
                <v-col cols="12" sm="4">
                  <div class="condicion-card pa-3 rounded-lg d-flex align-center ga-2">
                    <v-icon icon="mdi-phone-outline" size="18" color="primary" />
                    <span>{{ detalle.contacto.telefono }}</span>
                  </div>
                </v-col>
                <v-col cols="12" sm="4">
                  <div class="condicion-card pa-3 rounded-lg d-flex align-center ga-2">
                    <v-icon icon="mdi-email-outline" size="18" color="primary" />
                    <span>{{ detalle.contacto.correo }}</span>
                  </div>
                </v-col>
              </v-row>

              <div class="d-flex justify-space-between mt-6">
                <v-btn variant="tonal" color="secondary" prepend-icon="mdi-arrow-left" @click="paso = 1">Atrás</v-btn>
                <v-btn color="primary" elevation="2" append-icon="mdi-arrow-right" @click="paso = 3">Continuar</v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 3 · Archivos con previsualización -->
          <v-stepper-window-item :value="3">
            <div class="pa-4">
              <v-row>
                <v-col cols="12" sm="4">
                  <v-list density="comfortable" class="lista-archivos pa-1 rounded-lg">
                    <v-list-item
                      v-for="archivo in detalle.archivos"
                      :key="archivo.archivo_id"
                      :active="archivoActivo?.archivo_id === archivo.archivo_id"
                      rounded="lg"
                      class="mb-1"
                      @click="previsualizar(archivo)"
                    >
                      <template #prepend>
                        <v-avatar :color="esPdf(archivo.nombre) ? 'error' : 'primary'" variant="tonal" size="34" rounded="lg">
                          <v-icon :icon="esPdf(archivo.nombre) ? 'mdi-file-pdf-box' : 'mdi-file-word-box'" size="18" />
                        </v-avatar>
                      </template>
                      <v-list-item-title class="text-body-2 font-weight-medium">{{ archivo.nombre }}</v-list-item-title>
                      <v-list-item-subtitle>{{ archivo.contexto === 'OFERTA_DJ' ? 'Declaración jurada' : 'Documento de sustento' }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                  <div v-if="!detalle.archivos.length" class="text-body-2 text-grey">Sin archivos adjuntos.</div>
                </v-col>
                <v-col cols="12" sm="8">
                  <div v-if="!archivoActivo" class="d-flex align-center justify-center fill-height text-grey panel-preview rounded-lg" style="min-height: 320px">
                    Selecciona un archivo para previsualizarlo.
                  </div>
                  <div v-else-if="cargandoPreview" class="d-flex align-center justify-center panel-preview rounded-lg" style="min-height: 320px">
                    <v-progress-circular indeterminate color="primary" />
                  </div>
                  <iframe
                    v-else-if="blobUrlPreview"
                    :src="blobUrlPreview"
                    class="rounded-lg"
                    style="width: 100%; height: 420px; border: 1px solid rgba(var(--v-border-color), 0.8)"
                  />
                  <v-alert v-else type="info" variant="tonal" density="comfortable" class="rounded-lg">
                    No se puede previsualizar este tipo de archivo en el navegador (ej. .doc/.docx). Descárgalo para revisarlo.
                    <div class="mt-3">
                      <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-download" @click="descargar(archivoActivo.descarga_url, archivoActivo.nombre)">
                        Descargar
                      </v-btn>
                    </div>
                  </v-alert>
                </v-col>
              </v-row>
              <div class="d-flex justify-space-between mt-6">
                <v-btn variant="tonal" color="secondary" prepend-icon="mdi-arrow-left" @click="paso = 2">Atrás</v-btn>
                <v-btn color="primary" elevation="2" append-icon="mdi-arrow-right" @click="paso = 4">Continuar</v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 4 · Evaluación -->
          <v-stepper-window-item :value="4">
            <div class="pa-4">
              <v-alert v-if="errorGuardar" type="error" density="compact" class="mb-4">{{ errorGuardar }}</v-alert>

              <v-card class="pa-4 mb-4 rounded-lg" variant="flat" border>
                <div class="d-flex align-center ga-2 mb-3">
                  <v-icon icon="mdi-wrench-outline" color="primary" />
                  <span class="text-subtitle-1 font-weight-bold">Evaluación técnica</span>
                </div>
                <v-btn-toggle v-model="evalTecnica" divided density="comfortable" class="mb-3">
                  <v-btn
                    value="APROBADO"
                    :color="evalTecnica === 'APROBADO' ? 'success' : undefined"
                    :variant="evalTecnica === 'APROBADO' ? 'flat' : 'outlined'"
                    prepend-icon="mdi-check-circle-outline"
                  >
                    Aprobado
                  </v-btn>
                  <v-btn
                    value="DESAPROBADO"
                    :color="evalTecnica === 'DESAPROBADO' ? 'error' : undefined"
                    :variant="evalTecnica === 'DESAPROBADO' ? 'flat' : 'outlined'"
                    prepend-icon="mdi-close-circle-outline"
                  >
                    Desaprobado
                  </v-btn>
                </v-btn-toggle>
                <v-textarea
                  v-if="evalTecnica === 'DESAPROBADO'"
                  v-model="motivoTecnica"
                  label="Motivo (obligatorio)"
                  :maxlength="MAX_MOTIVO"
                  :counter="MAX_MOTIVO"
                  rows="3"
                  hide-details="auto"
                />
              </v-card>

              <v-card class="pa-4 mb-4 rounded-lg" variant="flat" border>
                <div class="d-flex align-center ga-2 mb-3">
                  <v-icon icon="mdi-truck-fast-outline" color="primary" />
                  <span class="text-subtitle-1 font-weight-bold">Evaluación logística</span>
                </div>
                <v-btn-toggle v-model="evalLogistica" divided density="comfortable" class="mb-3">
                  <v-btn
                    value="APROBADO"
                    :color="evalLogistica === 'APROBADO' ? 'success' : undefined"
                    :variant="evalLogistica === 'APROBADO' ? 'flat' : 'outlined'"
                    prepend-icon="mdi-check-circle-outline"
                  >
                    Aprobado
                  </v-btn>
                  <v-btn
                    value="DESAPROBADO"
                    :color="evalLogistica === 'DESAPROBADO' ? 'error' : undefined"
                    :variant="evalLogistica === 'DESAPROBADO' ? 'flat' : 'outlined'"
                    prepend-icon="mdi-close-circle-outline"
                  >
                    Desaprobado
                  </v-btn>
                </v-btn-toggle>
                <v-textarea
                  v-if="evalLogistica === 'DESAPROBADO'"
                  v-model="motivoLogistica"
                  label="Motivo (obligatorio)"
                  :maxlength="MAX_MOTIVO"
                  :counter="MAX_MOTIVO"
                  rows="3"
                  hide-details="auto"
                />
              </v-card>

              <div class="d-flex justify-space-between mt-2">
                <v-btn variant="tonal" color="secondary" prepend-icon="mdi-arrow-left" @click="paso = 3">Atrás</v-btn>
                <v-btn
                  color="primary"
                  elevation="2"
                  prepend-icon="mdi-content-save-check-outline"
                  :loading="guardando"
                  :disabled="!puedeGuardar"
                  @click="guardar"
                >
                  Guardar evaluación
                </v-btn>
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

<style scoped>
.condicion-card {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.6);
}

.tabla-items :deep(tfoot td) {
  border-top: 2px solid rgba(var(--v-border-color), 0.8);
}

.lista-archivos {
  background: rgba(var(--v-theme-surface-variant), 0.4);
  border: 1px solid rgba(var(--v-border-color), 0.6);
}

.panel-preview {
  background: rgba(var(--v-theme-surface-variant), 0.4);
  border: 1px solid rgba(var(--v-border-color), 0.6);
}
</style>
