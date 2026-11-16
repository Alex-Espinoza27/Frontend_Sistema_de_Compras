<script setup lang="ts">
// D2 — Postulación (05B, pantalla estrella). Datos base: GET
// /convocatorias/{id}/postulacion. Envío atómico: POST /ofertas (multipart).
//
// Errores de validación (pedido explícito del usuario: antes solo salía "Los
// datos enviados no son válidos."): "Continuar" y "Enviar" validan en el
// navegador con las mismas reglas del backend (`OfertaStoreRequest`) y, si el
// backend igual responde 422, se pintan sus errores con la misma mecánica: un
// resumen arriba, el mensaje debajo de cada campo, el paso correcto abierto y
// el foco en el primer campo con error. Los límites (largos, peso, formatos)
// vienen del backend en `limites`.
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { convocatoriasApi } from '@/api/convocatorias.api'
import { ofertasApi } from '@/api/ofertas.api'
import BaseArchivoUpload from '@/components/base/BaseArchivoUpload.vue'
import BaseResumenErrores from '@/components/base/BaseResumenErrores.vue'
import BaseStepper from '@/components/base/BaseStepper.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useDescarga } from '@/composables/useDescarga'
import { enfocarCampo, idCampo, useErroresFormulario, type MapaErrores } from '@/composables/useErroresFormulario'
import type { LimitesPostulacion, OfertaStoreRespuesta, PostulacionDatos } from '@/modules/proveedor/proveedor.types'
import { useUiStore } from '@/stores/ui.store'
import { email } from '@/utils/validaciones'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const route = useRoute()
const ui = useUiStore()
const convocatoriaId = Number(route.params.convocatoriaId)

const cargando = ref(true)
const errorCarga = ref('')
const datos = ref<PostulacionDatos | null>(null)

// Si el backend no envía `limites` (versión anterior) se usan los mismos valores.
const LIMITES_POR_DEFECTO: LimitesPostulacion = {
  marca_modelo: 150,
  plazo_garantia: 120,
  contacto_nombre: 120,
  contacto_telefono: 20,
  contacto_correo: 120,
  archivo_max_mb: 10,
  archivo_formatos: ['pdf', 'doc', 'docx'],
}
const limites = computed<LimitesPostulacion>(() => ({ ...LIMITES_POR_DEFECTO, ...datos.value?.limites }))
const formatosTexto = computed(() => {
  const lista = limites.value.archivo_formatos.map((f) => f.toUpperCase())
  return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} o ${lista[lista.length - 1]}` : (lista[0] ?? '')
})
const acceptArchivos = computed(() => limites.value.archivo_formatos.map((f) => `.${f}`).join(','))

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
  itemsForm.reduce((acc, item) => acc + (Number(item.precio_unitario) || 0) * item.cantidad, 0),
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

// --- Errores ----------------------------------------------------------------
const { de: erroresDe, limpiar: limpiarError, establecer: establecerErrores, lista: listaErrores, hayErrores } =
  useErroresFormulario()
const errorGeneral = ref('')

/** Paso donde vive cada campo (las claves son las del backend). */
function pasoDe(campo: string): number {
  if (campo === 'declaracion_jurada') return 2
  if (campo === 'items' || campo.startsWith('items.') || campo === 'tipo_comprobante_id') return 3
  return 4
}

const erroresOrdenados = computed(() =>
  [...listaErrores.value].sort((a, b) => pasoDe(a.campo) - pasoDe(b.campo)),
)
const resumenErrores = computed(() =>
  erroresOrdenados.value.map((e) => ({
    ...e,
    etiqueta: e.campo === 'convocatoria_id' ? undefined : `Paso ${pasoDe(e.campo)}`,
  })),
)

async function irACampo(campo: string) {
  if (campo !== 'convocatoria_id') paso.value = pasoDe(campo)
  await enfocarCampo(campo)
}

async function mostrarErrores(mapa: MapaErrores) {
  establecerErrores(mapa)
  const total = erroresOrdenados.value.length
  ui.mostrarSnackbar(total === 1 ? 'Hay 1 dato por corregir.' : `Hay ${total} datos por corregir.`, 'warning')
  const primero = erroresOrdenados.value[0]
  if (primero) await irACampo(primero.campo)
}

function mensajeArchivo(archivo: File | undefined, nombre: string, falta: string): string | null {
  if (!archivo) return falta
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? ''
  if (!limites.value.archivo_formatos.includes(extension)) return `${nombre} debe ser un archivo ${formatosTexto.value}.`
  if (archivo.size > limites.value.archivo_max_mb * 1024 * 1024) {
    return `${nombre} no puede pesar más de ${limites.value.archivo_max_mb} MB.`
  }
  return null
}

const vacio = (valor: unknown) => valor === null || valor === undefined || String(valor).trim() === ''

/** Mismas reglas que `OfertaStoreRequest`, con las mismas claves que devuelve
 * el backend, para que los errores locales y los del servidor se traten igual. */
function validarPaso(numero: number): MapaErrores {
  const mapa: MapaErrores = {}

  if (numero === 2) {
    const msg = mensajeArchivo(archivoDj.value[0], 'La declaración jurada', 'Adjunte la declaración jurada firmada.')
    if (msg) mapa.declaracion_jurada = [msg]
  }

  if (numero === 3) {
    itemsForm.forEach((item, i) => {
      if (vacio(item.marca_modelo)) {
        mapa[`items.${i}.marca_modelo`] = [`Indique la marca/modelo del ítem ${item.numero}.`]
      } else if (item.marca_modelo.length > limites.value.marca_modelo) {
        mapa[`items.${i}.marca_modelo`] = [
          `La marca/modelo del ítem ${item.numero} no puede superar ${limites.value.marca_modelo} caracteres.`,
        ]
      }
      if (vacio(item.precio_unitario)) {
        mapa[`items.${i}.precio_unitario`] = [`Indique el precio unitario del ítem ${item.numero}.`]
      } else if (Number.isNaN(Number(item.precio_unitario))) {
        mapa[`items.${i}.precio_unitario`] = [`El precio unitario del ítem ${item.numero} debe ser un número.`]
      } else if (Number(item.precio_unitario) < 0) {
        mapa[`items.${i}.precio_unitario`] = [`El precio unitario del ítem ${item.numero} no puede ser negativo.`]
      }
    })
    if (requiereComprobante.value && tipoComprobanteId.value == null) {
      mapa.tipo_comprobante_id = ['Seleccione el comprobante de pago.']
    }
  }

  if (numero === 4) {
    if (validezDias.value == null) mapa.validez_dias = ['Seleccione la validez de la oferta (15 o 30 días).']

    const dias = (valor: number | null, nombre: string): string[] | null => {
      if (vacio(valor)) return [`Indique ${nombre} en días.`]
      if (!Number.isInteger(Number(valor))) return [`${nombre[0]?.toUpperCase()}${nombre.slice(1)} debe ser un número entero de días.`]
      if (Number(valor) < 1) return [`${nombre[0]?.toUpperCase()}${nombre.slice(1)} debe ser de al menos 1 día.`]
      return null
    }
    if (!plazoEjecucionSegunTdr.value) {
      const e = dias(plazoEjecucionDias.value, 'el plazo de ejecución')
      if (e) mapa.plazo_ejecucion_dias = e
    }
    if (!formaPagoSegunTdr.value) {
      const e = dias(formaPagoDias.value, 'la forma de pago')
      if (e) mapa.forma_pago_dias = e
    }

    const texto = (valor: string, campo: string, nombre: string, max: number, articulo = 'el') => {
      if (vacio(valor)) mapa[campo] = [`Indique ${articulo} ${nombre}.`]
      else if (valor.length > max) mapa[campo] = [`${articulo === 'el' ? 'El' : 'La'} ${nombre} no puede superar ${max} caracteres.`]
    }
    texto(plazoGarantia.value, 'plazo_garantia', 'plazo de garantía', limites.value.plazo_garantia)
    texto(contactoNombre.value, 'contacto_nombre', 'nombre de contacto', limites.value.contacto_nombre)
    texto(contactoTelefono.value, 'contacto_telefono', 'teléfono de contacto', limites.value.contacto_telefono)

    if (vacio(contactoCorreo.value)) {
      mapa.contacto_correo = ['Indique el correo de contacto.']
    } else if (contactoCorreo.value.length > limites.value.contacto_correo) {
      mapa.contacto_correo = [`El correo de contacto no puede superar ${limites.value.contacto_correo} caracteres.`]
    } else if (email()(contactoCorreo.value) !== true) {
      mapa.contacto_correo = [
        'Escriba un correo válido, por ejemplo nombre@dominio.com (sin espacios ni un punto justo antes de la @).',
      ]
    }

    const msg = mensajeArchivo(sustento.value[0], 'El sustento', 'Adjunte el archivo de sustento.')
    if (msg) mapa.sustento = [msg]
  }

  return mapa
}

async function continuar(desde: number) {
  const mapa = validarPaso(desde)
  if (Object.keys(mapa).length) {
    await mostrarErrores(mapa)
    return
  }
  establecerErrores(null)
  paso.value = desde + 1
}

const enviando = ref(false)
const constancia = ref<OfertaStoreRespuesta | null>(null)

async function enviar() {
  errorGeneral.value = ''
  const mapa = { ...validarPaso(2), ...validarPaso(3), ...validarPaso(4) }
  if (Object.keys(mapa).length) {
    await mostrarErrores(mapa)
    return
  }
  establecerErrores(null)
  enviando.value = true
  try {
    constancia.value = await ofertasApi.store({
      convocatoria_id: convocatoriaId,
      tipo_comprobante_id: tipoComprobanteId.value,
      items: itemsForm.map((item) => ({
        requerimiento_item_id: item.requerimiento_item_id,
        marca_modelo: item.marca_modelo,
        precio_unitario: Number(item.precio_unitario),
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
      declaracion_jurada: archivoDj.value[0] as File,
      sustento: sustento.value[0] as File,
    })
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 409 || status === 422) {
      const delServidor = error.response?.data?.errores ?? {}
      if (Object.keys(delServidor).length) {
        await mostrarErrores(delServidor)
      } else {
        errorGeneral.value = error.response?.data?.mensaje ?? 'No se pudo enviar la postulación.'
      }
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
        <v-btn color="primary" prepend-icon="mdi-download" @click="descargarConstancia">Descargar constancia</v-btn>
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

      <v-alert v-if="errorGeneral" type="error" density="comfortable" class="mb-4">{{ errorGeneral }}</v-alert>
      <BaseResumenErrores
        v-if="hayErrores"
        :errores="resumenErrores"
        titulo="No se pudo continuar. Corrija lo siguiente:"
        class="mb-4"
        @ir="irACampo"
      />

      <BaseStepper v-model="paso" :pasos="pasos" usar-cinta>
        <!-- Paso 1 -->
        <v-stepper-window-item :value="1">
          <div class="pa-4">
            <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
              <strong>PASO 1:</strong> Descargue la Declaración Jurada del Proveedor haciendo clic en el botón de
              abajo. Complétela, fírmela y en el siguiente paso súbala en formato PDF.
            </v-alert>
            <v-btn v-if="datos.plantilla_dj" color="primary" prepend-icon="mdi-download" @click="descargarPlantilla">
              Descargar la última versión
            </v-btn>
            <v-alert v-else type="warning" density="compact">
              Esta convocatoria no tiene una plantilla configurada; usa tu propio formato de declaración jurada.
            </v-alert>
            <div class="d-flex justify-end mt-6">
              <v-btn color="primary" append-icon="mdi-arrow-right" @click="paso = 2">Continuar</v-btn>
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
            <BaseArchivoUpload
              :id="idCampo('declaracion_jurada')"
              v-model="archivoDj"
              label="Declaración jurada firmada *"
              :accept="acceptArchivos"
              :max-size-mb="limites.archivo_max_mb"
              :hint="`Un solo archivo · ${formatosTexto} · máximo ${limites.archivo_max_mb} MB.`"
              :error-messages="erroresDe('declaracion_jurada')"
              class="mb-4"
              @update:model-value="limpiarError('declaracion_jurada')"
            />
            <div class="d-flex justify-space-between">
              <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" @click="paso = 1">Atrás</v-btn>
              <v-btn color="primary" append-icon="mdi-arrow-right" @click="continuar(2)">Continuar</v-btn>
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

            <div class="tabla-items mb-4">
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Descripción</th>
                    <th>Unidad</th>
                    <th>Cant.</th>
                    <th>Presentación</th>
                    <th>
                      Marca/Modelo *
                      <div class="encabezado-limite">máx. {{ limites.marca_modelo }} caracteres</div>
                    </th>
                    <th>
                      P. Unitario S/ *
                      <div class="encabezado-limite">incluye IGV · mínimo 0</div>
                    </th>
                    <th>P. Total S/</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in itemsForm" :key="item.requerimiento_item_id">
                    <td>{{ item.numero }}</td>
                    <td>{{ item.descripcion }}</td>
                    <td>{{ item.unidad_medida }}</td>
                    <td>{{ item.cantidad }}</td>
                    <td>{{ item.presentacion ?? '—' }}</td>
                    <td class="celda-campo celda-campo--texto">
                      <v-text-field
                        :id="idCampo(`items.${i}.marca_modelo`)"
                        v-model="item.marca_modelo"
                        density="compact"
                        placeholder="Ej. Samsung A15"
                        :maxlength="limites.marca_modelo"
                        counter
                        :error-messages="erroresDe(`items.${i}.marca_modelo`)"
                        @update:model-value="limpiarError(`items.${i}.marca_modelo`)"
                      />
                    </td>
                    <td class="celda-campo celda-campo--precio">
                      <v-text-field
                        :id="idCampo(`items.${i}.precio_unitario`)"
                        v-model.number="item.precio_unitario"
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        density="compact"
                        prefix="S/"
                        placeholder="0.00"
                        :error-messages="erroresDe(`items.${i}.precio_unitario`)"
                        @update:model-value="limpiarError(`items.${i}.precio_unitario`)"
                      />
                    </td>
                    <td class="text-datos">{{ ((Number(item.precio_unitario) || 0) * item.cantidad).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <div class="d-flex justify-end text-h6 text-datos mb-4">TOTAL GENERAL: S/ {{ totalGeneral.toFixed(2) }}</div>

            <v-select
              v-if="requiereComprobante"
              :id="idCampo('tipo_comprobante_id')"
              v-model="tipoComprobanteId"
              :items="datos.tipos_comprobante.map((t) => ({ title: t.nombre, value: t.tipo_comprobante_id }))"
              label="Comprobante de pago *"
              :error-messages="erroresDe('tipo_comprobante_id')"
              class="mb-4"
              @update:model-value="limpiarError('tipo_comprobante_id')"
            />

            <div class="d-flex justify-space-between">
              <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" @click="paso = 2">Atrás</v-btn>
              <v-btn color="primary" append-icon="mdi-arrow-right" @click="continuar(3)">Continuar</v-btn>
            </div>
          </div>
        </v-stepper-window-item>

        <!-- Paso 4 -->
        <v-stepper-window-item :value="4">
          <div class="pa-4">
            <!-- Condiciones de la oferta -->
            <section class="seccion mb-4">
              <h3 class="seccion__titulo"><v-icon icon="mdi-clipboard-text-clock-outline" size="20" />Condiciones de la oferta</h3>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    :id="idCampo('validez_dias')"
                    v-model="validezDias"
                    :items="datos.opciones_validez.map((v) => ({ title: `${v} días`, value: v }))"
                    label="Validez de la oferta *"
                    prepend-inner-icon="mdi-calendar-clock-outline"
                    hint="Por cuántos días se mantiene vigente su oferta."
                    persistent-hint
                    :error-messages="erroresDe('validez_dias')"
                    @update:model-value="limpiarError('validez_dias')"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    :id="idCampo('plazo_garantia')"
                    v-model="plazoGarantia"
                    label="Plazo de garantía *"
                    prepend-inner-icon="mdi-shield-check-outline"
                    placeholder="Ej. 12 meses"
                    :maxlength="limites.plazo_garantia"
                    counter
                    persistent-counter
                    :error-messages="erroresDe('plazo_garantia')"
                    @update:model-value="limpiarError('plazo_garantia')"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="plazoEjecucionSegunTdr"
                    label="Plazo de ejecución según TDR"
                    color="primary"
                    base-color="grey-darken-2"
                    inset
                    hide-details
                    @update:model-value="limpiarError('plazo_ejecucion_dias')"
                  />
                  <v-text-field
                    v-if="!plazoEjecucionSegunTdr"
                    :id="idCampo('plazo_ejecucion_dias')"
                    v-model.number="plazoEjecucionDias"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    label="Plazo de ejecución *"
                    suffix="días"
                    hint="Número entero, mínimo 1."
                    persistent-hint
                    class="mt-2"
                    :error-messages="erroresDe('plazo_ejecucion_dias')"
                    @update:model-value="limpiarError('plazo_ejecucion_dias')"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="formaPagoSegunTdr"
                    label="Forma de pago según TDR"
                    color="primary"
                    base-color="grey-darken-2"
                    inset
                    hide-details
                    @update:model-value="limpiarError('forma_pago_dias')"
                  />
                  <v-text-field
                    v-if="!formaPagoSegunTdr"
                    :id="idCampo('forma_pago_dias')"
                    v-model.number="formaPagoDias"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    label="Forma de pago *"
                    suffix="días"
                    hint="Número entero, mínimo 1."
                    persistent-hint
                    class="mt-2"
                    :error-messages="erroresDe('forma_pago_dias')"
                    @update:model-value="limpiarError('forma_pago_dias')"
                  />
                </v-col>
              </v-row>
            </section>

            <!-- Datos de contacto -->
            <section class="seccion mb-4">
              <h3 class="seccion__titulo"><v-icon icon="mdi-account-box-outline" size="20" />Datos de contacto</h3>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-text-field
                    :id="idCampo('contacto_nombre')"
                    v-model="contactoNombre"
                    label="Nombre de contacto *"
                    prepend-inner-icon="mdi-account-outline"
                    :maxlength="limites.contacto_nombre"
                    counter
                    persistent-counter
                    :error-messages="erroresDe('contacto_nombre')"
                    @update:model-value="limpiarError('contacto_nombre')"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    :id="idCampo('contacto_telefono')"
                    v-model="contactoTelefono"
                    label="Teléfono de contacto *"
                    prepend-inner-icon="mdi-phone-outline"
                    inputmode="tel"
                    placeholder="Ej. 987654321"
                    :maxlength="limites.contacto_telefono"
                    counter
                    persistent-counter
                    :error-messages="erroresDe('contacto_telefono')"
                    @update:model-value="limpiarError('contacto_telefono')"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    :id="idCampo('contacto_correo')"
                    v-model="contactoCorreo"
                    label="Correo de contacto *"
                    type="email"
                    prepend-inner-icon="mdi-email-outline"
                    placeholder="nombre@dominio.com"
                    :maxlength="limites.contacto_correo"
                    counter
                    persistent-counter
                    :error-messages="erroresDe('contacto_correo')"
                    @update:model-value="limpiarError('contacto_correo')"
                  />
                </v-col>
              </v-row>
            </section>

            <!-- Sustento -->
            <section class="seccion mb-4">
              <h3 class="seccion__titulo"><v-icon icon="mdi-paperclip" size="20" />Sustento</h3>
              <v-alert type="warning" variant="tonal" density="comfortable" class="mb-3">
                NOTA: En este campo debe adjuntar OBLIGATORIAMENTE la documentación solicitada en los TDR/EETT
                (ejemplo: sustento de experiencia, ficha(s) técnica(s), etc.) y de forma opcional puede añadir otra
                documentación que considere apropiada para su postulación. Tener en cuenta que solo se acepta un
                único archivo ({{ formatosTexto }}) y con un peso no mayor a {{ limites.archivo_max_mb }} MB.
              </v-alert>
              <BaseArchivoUpload
                :id="idCampo('sustento')"
                v-model="sustento"
                label="Sustento *"
                :accept="acceptArchivos"
                :max-size-mb="limites.archivo_max_mb"
                :hint="`Un solo archivo · ${formatosTexto} · máximo ${limites.archivo_max_mb} MB.`"
                :error-messages="erroresDe('sustento')"
                @update:model-value="limpiarError('sustento')"
              />
            </section>

            <div class="d-flex justify-space-between">
              <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" @click="paso = 3">Atrás</v-btn>
              <v-btn color="primary" prepend-icon="mdi-send-outline" :loading="enviando" @click="enviar">
                Enviar postulación
              </v-btn>
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

/* Tabla de la propuesta: los campos necesitan ancho para que quepan el
   contador ("0 / 150") y los mensajes de error sin deformar la fila. */
.tabla-items {
  overflow-x: auto;
}
.celda-campo {
  vertical-align: top;
  padding-top: 10px !important;
  padding-bottom: 6px !important;
}
.celda-campo--texto {
  min-width: 220px;
}
.celda-campo--precio {
  min-width: 150px;
}
.encabezado-limite {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.7;
  white-space: nowrap;
}

/* Bloques del paso 4: sobre fondo blanco y con borde, igual que las tarjetas
   del resto del sistema, para que se distingan del fondo de la pantalla. */
.seccion {
  padding: 16px 18px 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.seccion__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgb(var(--v-theme-secondary));
}
</style>
