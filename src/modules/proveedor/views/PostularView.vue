<script setup lang="ts">
// D2 — Postulación (05B, pantalla estrella). Datos base: GET
// /convocatorias/{id}/postulacion. Envío atómico: POST /ofertas (multipart).
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { convocatoriasApi } from '@/api/convocatorias.api'
import { ofertasApi } from '@/api/ofertas.api'
import BaseArchivoUpload from '@/components/base/BaseArchivoUpload.vue'
import BaseStepper from '@/components/base/BaseStepper.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useDescarga } from '@/composables/useDescarga'
import type { OfertaStoreRespuesta, PostulacionDatos } from '@/modules/proveedor/proveedor.types'
import { email, requerido } from '@/utils/validaciones'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const route = useRoute()
const convocatoriaId = Number(route.params.convocatoriaId)

const cargando = ref(true)
const errorCarga = ref('')
const datos = ref<PostulacionDatos | null>(null)

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    datos.value = await convocatoriasApi.postulacion(convocatoriaId)
    itemsForm.splice(
      0,
      itemsForm.length,
      ...datos.value.items.map((item) => ({ ...item, marca_modelo: '', precio_unitario: null as number | null })),
    )
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorCarga.value = error.response?.data?.mensaje ?? 'No se pudo cargar la convocatoria.'
  } finally {
    cargando.value = false
  }
}

const paso = ref(1)
const pasos = ['Declaración jurada', 'Subir DJ', 'Propuesta económica', 'Condiciones']

// --- Paso 2 · Subir DJ -------------------------------------------------------
const { descargar, abrirEnNuevaPestana } = useDescarga()
const archivoDj = ref<File[]>([])

function descargarPlantilla() {
  if (datos.value?.plantilla_dj) abrirEnNuevaPestana(datos.value.plantilla_dj.descarga_url)
}

// --- Paso 3 · Propuesta económica -------------------------------------------
interface ItemForm {
  requerimiento_item_id: number
  numero: number
  descripcion: string
  unidad_medida: string
  cantidad: number
  presentacion: string | null
  marca_modelo: string
  precio_unitario: number | null
}
const itemsForm = reactive<ItemForm[]>([])
const tipoComprobanteId = ref<number | null>(null)

// Comprobante de pago: solo se pide para convocatorias de tipo SERVICIO (05C
// hardening, decisión explícita del usuario — desviación consciente de
// `00_CONTEXTO_TDR.md` §6, que lo pide siempre; ver `05C_FRONTEND_FASES.md`).
const requiereComprobante = computed(() => datos.value?.convocatoria.tipo === 'SERVICIO')

const totalGeneral = computed(() =>
  itemsForm.reduce((acc, item) => acc + (item.precio_unitario ?? 0) * item.cantidad, 0),
)
const todosCotizados = computed(
  () => itemsForm.length > 0 && itemsForm.every((item) => !!item.marca_modelo && item.precio_unitario != null && item.precio_unitario >= 0),
)
const paso3Valido = computed(
  () => todosCotizados.value && (!requiereComprobante.value || tipoComprobanteId.value != null),
)

// --- Paso 4 · Condiciones ----------------------------------------------------
const validezDias = ref<number | null>(null)
const plazoEjecucionSegunTdr = ref(true)
const plazoEjecucionDias = ref<number | null>(null)
const formaPagoSegunTdr = ref(true)
const formaPagoDias = ref<number | null>(null)
const plazoGarantia = ref('')
const contactoNombre = ref('')
const contactoTelefono = ref('')
const contactoCorreo = ref('')
const sustento = ref<File[]>([])

const paso4Valido = computed(
  () =>
    validezDias.value != null &&
    (plazoEjecucionSegunTdr.value || (plazoEjecucionDias.value ?? 0) > 0) &&
    (formaPagoSegunTdr.value || (formaPagoDias.value ?? 0) > 0) &&
    !!plazoGarantia.value &&
    !!contactoNombre.value &&
    !!contactoTelefono.value &&
    !!contactoCorreo.value &&
    sustento.value.length > 0,
)

const enviando = ref(false)
const errorEnvio = ref('')
const erroresEnvio = ref<Record<string, string[]>>({})
const constancia = ref<OfertaStoreRespuesta | null>(null)

async function enviar() {
  errorEnvio.value = ''
  erroresEnvio.value = {}
  enviando.value = true
  try {
    constancia.value = await ofertasApi.store({
      convocatoria_id: convocatoriaId,
      tipo_comprobante_id: tipoComprobanteId.value,
      items: itemsForm.map((item) => ({
        requerimiento_item_id: item.requerimiento_item_id,
        marca_modelo: item.marca_modelo,
        precio_unitario: item.precio_unitario as number,
      })),
      validez_dias: validezDias.value as number,
      plazo_ejecucion_segun_tdr: plazoEjecucionSegunTdr.value,
      plazo_ejecucion_dias: plazoEjecucionSegunTdr.value ? null : plazoEjecucionDias.value,
      forma_pago_segun_tdr: formaPagoSegunTdr.value,
      forma_pago_dias: formaPagoSegunTdr.value ? null : formaPagoDias.value,
      plazo_garantia: plazoGarantia.value,
      contacto_nombre: contactoNombre.value,
      contacto_telefono: contactoTelefono.value,
      contacto_correo: contactoCorreo.value,
      declaracion_jurada: archivoDj.value[0],
      sustento: sustento.value[0],
    })
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 409 || status === 422) {
      errorEnvio.value = error.response?.data?.mensaje ?? ''
      erroresEnvio.value = error.response?.data?.errores ?? {}
    }
  } finally {
    enviando.value = false
  }
}

function descargarConstancia() {
  if (constancia.value) descargar(constancia.value.constancia_url, `constancia-${constancia.value.constancia_codigo}.pdf`)
}

cargar()
</script>

<template>
  <v-container class="py-8" max-width="1200">
    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-alert v-else-if="errorCarga" type="error" density="compact">
      {{ errorCarga }}
      <div class="mt-2">
        <router-link to="/app/convocatorias-abiertas">Volver a convocatorias</router-link>
      </div>
    </v-alert>

    <!-- Éxito: tarjeta de constancia -->
    <v-card v-else-if="constancia" class="mx-auto constancia-card" max-width="560">
      <div class="constancia-card__cinta" />
      <v-card-text class="text-center py-8">
        <v-icon icon="mdi-check-circle" color="success" size="48" class="mb-4" />
        <div class="text-h6 text-titulo mb-2">Postulación enviada</div>
        <div class="text-body-2 text-grey mb-4">{{ datos?.convocatoria.nombre_servicio }}</div>
        <div class="text-datos text-h6 mb-1">{{ constancia.constancia_codigo }}</div>
        <div class="text-body-2 text-grey mb-6">Total ofertado: S/ {{ constancia.total_general }}</div>
        <v-btn @click="descargarConstancia">Descargar constancia</v-btn>
        <div class="mt-4">
          <router-link to="/app/mis-postulaciones">Ver mis postulaciones</router-link>
        </div>
      </v-card-text>
    </v-card>

    <template v-else-if="datos">
      <BaseVolver to="/app/convocatorias-abiertas" texto="Volver a convocatorias" />
      <div class="d-flex align-center ga-3 mb-1">
        <div class="text-h5 text-titulo">Postular</div>
        <v-chip :color="datos.convocatoria.tipo === 'BIEN' ? 'accent' : 'primary'" variant="flat" size="large">
          {{ datos.convocatoria.tipo === 'BIEN' ? 'BIEN' : 'SERVICIO' }}
        </v-chip>
      </div>
      <div class="text-body-2 text-grey mb-6">{{ datos.convocatoria.numero ?? '—' }} · {{ datos.convocatoria.nombre_servicio }}</div>

      <BaseStepper v-model="paso" :pasos="pasos" usar-cinta>
        <!-- Paso 1 -->
        <v-stepper-window-item :value="1">
          <div class="pa-4">
            <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
              <strong>PASO 1:</strong> Descargue la Declaración Jurada del Proveedor haciendo clic en el botón de
              abajo. Complétela, fírmela y en el siguiente paso súbala en formato PDF.
            </v-alert>
            <v-btn v-if="datos.plantilla_dj" prepend-icon="mdi-download" @click="descargarPlantilla">
              Descargar la última versión
            </v-btn>
            <v-alert v-else type="warning" density="compact">
              Esta convocatoria no tiene una plantilla configurada; usa tu propio formato de declaración jurada.
            </v-alert>
            <div class="d-flex justify-end mt-6">
              <v-btn @click="paso = 2">Continuar</v-btn>
            </div>
          </div>
        </v-stepper-window-item>

        <!-- Paso 2 -->
        <v-stepper-window-item :value="2">
          <div class="pa-4">
            <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
              <strong>PASO 2:</strong> Lea detenidamente la Declaración Jurada del Proveedor, complete la información
              solicitada correctamente, firme el documento y súbalo en formato PDF.
              <div class="mt-2">
                <strong>NOTA:</strong> En este campo debe adjuntar ÚNICAMENTE la Declaración Jurada del Proveedor; si
                se añade otra documentación, esta no será considerada para efectos de la evaluación de la postulación.
              </div>
            </v-alert>
            <BaseArchivoUpload v-model="archivoDj" label="Declaración jurada firmada *" class="mb-4" />
            <div class="d-flex justify-space-between">
              <v-btn variant="text" @click="paso = 1">Atrás</v-btn>
              <v-btn :disabled="archivoDj.length === 0" @click="paso = 3">Continuar</v-btn>
            </div>
          </div>
        </v-stepper-window-item>

        <!-- Paso 3 -->
        <v-stepper-window-item :value="3">
          <div class="pa-4">
            <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
              <strong>PASO 3:</strong> Ingrese el precio unitario en soles, incluido el IGV, de cada bien o servicio
              indicado a continuación (tenga en cuenta que, si no oferta algún bien o servicio del listado, no podrá
              realizar la postulación a esta convocatoria).
              <div class="mt-2">
                <strong>NOTA:</strong> Los montos ingresados deben incluir IGV (excepto para bienes o servicios
                exonerados de este impuesto), todos los tributos, seguros, transporte, inspecciones, pruebas y, de
                ser el caso, los costos laborales respectivos conforme a la legislación vigente, así como cualquier
                otro concepto que le sea aplicable y que pueda incidir sobre el valor del bien y/o servicio.
              </div>
            </v-alert>
            <v-table density="comfortable" class="mb-4">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th>Cant.</th>
                  <th>Presentación</th>
                  <th>Marca/Modelo</th>
                  <th>P. Unitario S/</th>
                  <th>P. Total S/</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in itemsForm" :key="item.requerimiento_item_id">
                  <td>{{ item.numero }}</td>
                  <td>{{ item.descripcion }}</td>
                  <td>{{ item.unidad_medida }}</td>
                  <td>{{ item.cantidad }}</td>
                  <td>{{ item.presentacion ?? '—' }}</td>
                  <td style="min-width: 160px">
                    <v-text-field v-model="item.marca_modelo" density="compact" hide-details="auto" :rules="[requerido()]" />
                  </td>
                  <td style="min-width: 120px">
                    <v-text-field
                      v-model.number="item.precio_unitario"
                      type="number"
                      min="0"
                      density="compact"
                      hide-details="auto"
                      :rules="[requerido()]"
                    />
                  </td>
                  <td class="text-datos">{{ ((item.precio_unitario ?? 0) * item.cantidad).toFixed(2) }}</td>
                </tr>
              </tbody>
            </v-table>
            <div class="d-flex justify-end text-h6 text-datos mb-4">TOTAL GENERAL: S/ {{ totalGeneral.toFixed(2) }}</div>

            <v-select
              v-if="requiereComprobante"
              v-model="tipoComprobanteId"
              :items="datos.tipos_comprobante.map((t) => ({ title: t.nombre, value: t.tipo_comprobante_id }))"
              label="Comprobante de pago *"
              :rules="[requerido()]"
              class="mb-4"
            />

            <v-alert v-if="!todosCotizados" type="warning" density="compact" class="mb-4">
              Debes cotizar todos los ítems (marca/modelo y precio) para continuar.
            </v-alert>

            <div class="d-flex justify-space-between">
              <v-btn variant="text" @click="paso = 2">Atrás</v-btn>
              <v-btn :disabled="!paso3Valido" @click="paso = 4">Continuar</v-btn>
            </div>
          </div>
        </v-stepper-window-item>

        <!-- Paso 4 -->
        <v-stepper-window-item :value="4">
          <div class="pa-4">
            <v-alert v-if="errorEnvio" type="error" density="compact" class="mb-4">{{ errorEnvio }}</v-alert>
            <v-alert v-if="erroresEnvio.items" type="error" density="compact" class="mb-4">
              {{ erroresEnvio.items[0] }}
            </v-alert>

            <v-select
              v-model="validezDias"
              :items="datos.opciones_validez.map((v) => ({ title: `${v} días`, value: v }))"
              label="Validez de la oferta *"
              :rules="[requerido()]"
              class="mb-4"
            />

            <v-switch
              v-model="plazoEjecucionSegunTdr"
              label="Plazo de ejecución según TDR"
              color="primary"
              base-color="grey-darken-2"
              inset
              class="mb-2"
            />
            <v-text-field
              v-if="!plazoEjecucionSegunTdr"
              v-model.number="plazoEjecucionDias"
              type="number"
              min="1"
              label="Plazo de ejecución (días) *"
              :rules="[requerido()]"
              class="mb-4"
            />

            <v-switch
              v-model="formaPagoSegunTdr"
              label="Forma de pago según TDR"
              color="primary"
              base-color="grey-darken-2"
              inset
              class="mb-2"
            />
            <v-text-field
              v-if="!formaPagoSegunTdr"
              v-model.number="formaPagoDias"
              type="number"
              min="1"
              label="Forma de pago (días) *"
              :rules="[requerido()]"
              class="mb-4"
            />

            <v-text-field v-model="plazoGarantia" label="Plazo de garantía *" :rules="[requerido()]" class="mb-2" />
            <v-text-field v-model="contactoNombre" label="Nombre de contacto *" :rules="[requerido()]" class="mb-2" />
            <v-text-field v-model="contactoTelefono" label="Teléfono de contacto *" :rules="[requerido()]" class="mb-2" />
            <v-text-field
              v-model="contactoCorreo"
              label="Correo de contacto *"
              type="email"
              :rules="[requerido(), email()]"
              class="mb-4"
            />

            <v-alert type="warning" variant="tonal" density="comfortable" class="mb-3">
              NOTA: En este campo debe adjuntar OBLIGATORIAMENTE la documentación solicitada en los TDR/EETT (ejemplo:
              sustento de experiencia, ficha(s) técnica(s), etc.) y de forma opcional puede añadir otra documentación
              que considere apropiada para su postulación. Tener en cuenta que solo se acepta un único archivo en
              formato PDF y con un peso no mayor a 10 MB.
            </v-alert>
            <BaseArchivoUpload
              v-model="sustento"
              label="Sustento *"
              hint="Un solo archivo PDF, máximo 10 MB."
              class="mb-4"
            />

            <div class="d-flex justify-space-between">
              <v-btn variant="text" @click="paso = 3">Atrás</v-btn>
              <v-btn :loading="enviando" :disabled="!paso4Valido" @click="enviar">Enviar postulación</v-btn>
            </div>
          </div>
        </v-stepper-window-item>
      </BaseStepper>
    </template>
  </v-container>
</template>

<style scoped>
.constancia-card {
  overflow: hidden;
}
.constancia-card__cinta {
  height: 6px;
  background: var(--grad-institucional);
}
</style>
