<script setup lang="ts">
// E4 — Crear/Editar/Ver convocatoria (05B). Solo es editable en BORRADOR
// (el backend bloquea con 409 cualquier otro estado); fuera de BORRADOR esta
// misma vista se vuelve de solo lectura y solo ofrece Cancelar. La plantilla
// DJ se sube en el mismo POST/PUT de Guardar (no en un botón aparte); en
// edición, si no se elige un archivo nuevo, la existente no se toca.
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { convocatoriasApi } from '@/api/convocatorias.api'
import { requerimientosApi } from '@/api/requerimientos.api'
import BaseArchivoUpload from '@/components/base/BaseArchivoUpload.vue'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseDateTimePicker from '@/components/base/BaseDateTimePicker.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useDescarga } from '@/composables/useDescarga'
import type { ConvocatoriaDetalle, RequerimientoCombo } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const id = route.params.id ? Number(route.params.id) : null
const esEdicion = id !== null

const cargando = ref(true)
const detalle = ref<ConvocatoriaDetalle | null>(null)
const esBorrador = computed(() => !esEdicion || detalle.value?.estado.codigo === 'BORRADOR')

// 05C hardening (pedido explícitamente por el usuario): antes de esto, la
// única forma de enterarse de que no hay plantilla DJ (propia ni por
// defecto) era que `publicar()` fallara con 409 — después de llenar todo lo
// demás. Ahora se avisa desde que se abre el formulario.
const plantillaDjDefectoExiste = ref(true)
convocatoriasApi.plantillaDjDefecto().then((data) => (plantillaDjDefectoExiste.value = data.existe))
const faltaPlantillaDj = computed(
  () => esBorrador.value && !detalle.value?.archivos.plantilla_dj && archivoPlantilla.value.length === 0 && !plantillaDjDefectoExiste.value,
)

// --- Solo modo creación: elegir requerimiento -------------------------------
const requerimientosDisponibles = ref<RequerimientoCombo[]>([])

const form = reactive({
  requerimiento_id: null as number | null,
  nombre_servicio: '',
  fecha_inicio: '',
  fecha_fin: '',
})

function alSeleccionarRequerimiento(reqId: unknown) {
  limpiarErrores('requerimiento_id')
  if (!reqId) return
  const req = requerimientosDisponibles.value.find((r) => r.requerimiento_id === Number(reqId))
  if (req && req.objeto) {
    form.nombre_servicio = req.objeto
    limpiarErrores('nombre_servicio')
  }
}

// --- Cambios sin guardar (05C hardening, pedido explícitamente por el
// usuario): Publicar debe avisar primero si hay cambios en nombre/fechas/
// plantilla que todavía no se guardaron, en vez de publicar información
// desactualizada o fallar más adelante sin explicación clara.
const snapshotGuardado = ref('')
function tomarSnapshotFormulario(): string {
  return JSON.stringify({ nombre_servicio: form.nombre_servicio, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin })
}
const haySinGuardar = computed(
  () => archivoPlantilla.value.length > 0 || tomarSnapshotFormulario() !== snapshotGuardado.value,
)

async function cargar() {
  cargando.value = true
  if (!esEdicion) {
    requerimientosDisponibles.value = await requerimientosApi.combo()
  } else if (id) {
    detalle.value = await convocatoriasApi.show(id)
    form.nombre_servicio = detalle.value.nombre_servicio
    // Las fechas se guardan en UTC; se reconvierten a fecha+hora de Lima
    // (America/Lima, 05C hardening — antes solo fecha) al editar.
    form.fecha_inicio = dayjs(detalle.value.fecha_inicio).tz().format('YYYY-MM-DDTHH:mm')
    form.fecha_fin = dayjs(detalle.value.fecha_fin).tz().format('YYYY-MM-DDTHH:mm')
  }
  snapshotGuardado.value = tomarSnapshotFormulario()
  cargando.value = false
}
cargar()

const formValido = ref(false)
const guardando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})
const archivoPlantilla = ref<File[]>([])

function limpiarErrores(campo?: string) {
  if (campo) {
    delete erroresCampo.value[campo]
  } else {
    erroresCampo.value = {}
  }
  errorGeneral.value = ''
}

watch(
  () => form.fecha_inicio,
  () => {
    limpiarErrores('fecha_inicio')
    limpiarErrores('fecha_fin')
  },
)

watch(
  () => form.fecha_fin,
  () => {
    limpiarErrores('fecha_fin')
  },
)

const reglasFechaFin = computed(() => {
  if (!esBorrador.value) return []
  return [
    requerido(),
    () => {
      if (!form.fecha_inicio || !form.fecha_fin) return true
      const inicio = dayjs(form.fecha_inicio)
      const fin = dayjs(form.fecha_fin)
      return fin.isAfter(inicio) || 'El campo fecha de fin debe ser una fecha posterior a fecha de inicio.'
    },
  ]
})

async function guardar() {
  if (!formValido.value) return
  errorGeneral.value = ''
  erroresCampo.value = {}
  guardando.value = true
  try {
    const nuevoArchivo = archivoPlantilla.value[0] ?? null
    if (esEdicion && id) {
      await convocatoriasApi.update(
        id,
        {
          nombre_servicio: form.nombre_servicio,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
        },
        nuevoArchivo,
      )
      archivoPlantilla.value = []
      ui.mostrarSnackbar('Convocatoria actualizada.', 'success')
      await cargar()
    } else {
      const { convocatoria_id } = await convocatoriasApi.store(
        {
          requerimiento_id: form.requerimiento_id as number,
          nombre_servicio: form.nombre_servicio,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
        },
        nuevoArchivo,
      )
      ui.mostrarSnackbar('Convocatoria creada en borrador. Ya puedes publicarla.', 'success')
      router.push(`/app/convocatorias/${convocatoria_id}`)
    }
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 409 || status === 422 || status === 403) {
      errorGeneral.value = error.response?.data?.mensaje ?? ''
      erroresCampo.value = error.response?.data?.errores ?? {}
    }
  } finally {
    guardando.value = false
  }
}

// --- Plantilla DJ ------------------------------------------------------------
const { descargar: descargarPlantilla, cargando: descargandoPlantilla } = useDescarga()
function alDescargarPlantilla() {
  if (!detalle.value?.archivos.plantilla_dj) return
  descargarPlantilla(`/archivos/${detalle.value.archivos.plantilla_dj.archivo_id}/descargar`, detalle.value.archivos.plantilla_dj.nombre)
}

async function eliminarPlantilla() {
  if (!id || !detalle.value?.archivos.plantilla_dj) return
  await convocatoriasApi.eliminarPlantillaDj(id, detalle.value.archivos.plantilla_dj.archivo_id)
  detalle.value.archivos.plantilla_dj = null
  ui.mostrarSnackbar('Plantilla eliminada.', 'success')
}

// --- Publicar ----------------------------------------------------------------
const publicarAbierto = ref(false)
const publicando = ref(false)
const errorPublicar = ref('')
const avisoGuardarAbierto = ref(false)

function alHacerClicPublicar() {
  if (haySinGuardar.value) {
    avisoGuardarAbierto.value = true
    return
  }
  publicarAbierto.value = true
}

async function guardarYPublicar() {
  await guardar()
  avisoGuardarAbierto.value = false
  if (!errorGeneral.value && !Object.keys(erroresCampo.value).length) {
    publicarAbierto.value = true
  }
}

async function confirmarPublicar() {
  if (!id) return
  publicando.value = true
  errorPublicar.value = ''
  try {
    const { numero } = await convocatoriasApi.publicar(id)
    publicarAbierto.value = false
    ui.mostrarSnackbar(`Convocatoria publicada: ${numero}.`, 'success')
    await cargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorPublicar.value = error.response?.data?.mensaje ?? 'No se pudo publicar.'
  } finally {
    publicando.value = false
  }
}

// --- Cancelar ------------------------------------------------------------------
const cancelarAbierto = ref(false)
const cancelando = ref(false)
async function confirmarCancelar(motivo: string | undefined) {
  if (!id || !motivo) return
  cancelando.value = true
  try {
    await convocatoriasApi.cancelar(id, motivo)
    cancelarAbierto.value = false
    ui.mostrarSnackbar('Convocatoria cancelada.', 'success')
    await cargar()
  } finally {
    cancelando.value = false
  }
}

const puedeCancelar = computed(() =>
  esEdicion && detalle.value ? ['BORRADOR', 'PUBLICADA', 'EN_EVALUACION'].includes(detalle.value.estado.codigo) : false,
)

// --- Ampliar fecha fin (05C hardening, pedido explícitamente por el
// usuario): solo mientras sigue PUBLICADA — el backend bloquea con 409 en
// cualquier otro estado (ver ConvocatoriaService::ampliarFechaFin()). El
// valor anterior (`fecha_fin_anterior`) es solo para control interno de la
// entidad, nunca se muestra en el portal público.
const puedeAmpliar = computed(() => esEdicion && detalle.value?.estado.codigo === 'PUBLICADA')
const ampliarAbierto = ref(false)
const ampliando = ref(false)
const errorAmpliar = ref('')
const nuevaFechaFin = ref('')

function abrirAmpliar() {
  nuevaFechaFin.value = form.fecha_fin
  errorAmpliar.value = ''
  ampliarAbierto.value = true
}

const reglasNuevaFechaFin = computed(() => [
  requerido(),
  () => {
    if (!nuevaFechaFin.value || !detalle.value) return true
    return (
      dayjs(nuevaFechaFin.value).isAfter(dayjs(detalle.value.fecha_fin).tz()) ||
      'La nueva fecha debe ser posterior a la fecha de fin actual.'
    )
  },
])

async function confirmarAmpliar() {
  if (!id) return
  ampliando.value = true
  errorAmpliar.value = ''
  try {
    await convocatoriasApi.ampliarFechaFin(id, nuevaFechaFin.value)
    ampliarAbierto.value = false
    ui.mostrarSnackbar('Plazo de postulación ampliado.', 'success')
    await cargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorAmpliar.value = error.response?.data?.mensaje ?? 'No se pudo ampliar el plazo.'
  } finally {
    ampliando.value = false
  }
}
</script>

<template>
  <v-container class="py-8" max-width="1200">
    <BaseVolver to="/app/convocatorias" texto="Volver a convocatorias" />
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">
        {{ !esEdicion ? 'Nueva convocatoria' : detalle?.numero ?? 'Convocatoria en borrador' }}
      </div>
      <BaseChipEstado v-if="detalle" :estado="detalle.estado" />
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-form v-else v-model="formValido" @submit.prevent="guardar">
      <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>

      <v-card class="pa-4 mb-4">
        <v-row dense>
          <v-col v-if="!esEdicion" cols="12">
            <v-autocomplete
              v-model="form.requerimiento_id"
              :items="requerimientosDisponibles.map((r) => ({ title: `${r.numero} — ${r.objeto}`, value: r.requerimiento_id }))"
              label="Requerimiento (sin convocatoria previa) *"
              :rules="[requerido()]"
              :error-messages="erroresCampo.requerimiento_id"
              clearable
              @update:model-value="alSeleccionarRequerimiento"
            />
          </v-col>
          <v-col v-else cols="12">
            <div class="text-body-2 text-grey">Requerimiento</div>
            <div>{{ detalle?.requerimiento.numero }} — {{ detalle?.requerimiento.objeto }}</div>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.nombre_servicio"
              label="Nombre del servicio *"
              :disabled="!esBorrador"
              :rules="esBorrador ? [requerido()] : []"
              :error-messages="erroresCampo.nombre_servicio"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <BaseDateTimePicker
              v-model="form.fecha_inicio"
              label="Fecha y hora de inicio *"
              :disabled="!esBorrador"
              :rules="esBorrador ? [requerido()] : []"
              :error-messages="erroresCampo.fecha_inicio"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <BaseDateTimePicker
              v-model="form.fecha_fin"
              label="Fecha y hora de fin *"
              :disabled="!esBorrador"
              :rules="reglasFechaFin"
              :error-messages="erroresCampo.fecha_fin"
              :min-fecha="form.fecha_inicio ? form.fecha_inicio.split('T')[0] : undefined"
              hint="El campo fecha de fin debe ser una fecha posterior a fecha de inicio."
              persistent-hint
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card v-if="esBorrador" v-can="esEdicion ? 'convocatorias.editar' : 'convocatorias.crear'" class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Plantilla de declaración jurada</div>
        <v-alert v-if="faltaPlantillaDj" type="warning" density="compact" variant="tonal" class="mb-4">
          No hay plantilla propia ni plantilla por defecto configurada. No podrás publicar esta convocatoria hasta subir una aquí
          (o que se configure una por defecto en Configuración).
        </v-alert>
        <div v-if="detalle?.archivos.plantilla_dj" class="d-flex align-center ga-2 mb-4">
          <v-icon icon="mdi-file-document-outline" />
          <span>{{ detalle.archivos.plantilla_dj.nombre }}</span>
          <v-btn
            icon="mdi-download"
            variant="text"
            size="small"
            color="primary"
            :loading="descargandoPlantilla"
            @click="alDescargarPlantilla"
          />
          <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="eliminarPlantilla" />
        </div>
        <BaseArchivoUpload
          v-model="archivoPlantilla"
          :label="detalle?.archivos.plantilla_dj ? 'Reemplazar plantilla' : 'Subir plantilla'"
          :hint="
            detalle?.archivos.plantilla_dj
              ? 'Solo se reemplaza si eliges un archivo nuevo aquí; se guarda junto con el resto al hacer clic en Guardar.'
              : 'Se guarda junto con el resto al hacer clic en Guardar. Si no subes una propia, se usará la plantilla por defecto de la plataforma (si existe).'
          "
        />
      </v-card>

      <v-card v-if="esEdicion && !esBorrador && detalle" class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Ítems del requerimiento</div>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Presentación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in detalle.requerimiento.items" :key="item.requerimiento_item_id">
              <td>{{ item.numero }}</td>
              <td>{{ item.descripcion }}</td>
              <td>{{ item.unidad_medida.nombre }}</td>
              <td>{{ item.cantidad }}</td>
              <td>{{ item.presentacion ?? '—' }}</td>
            </tr>
          </tbody>
        </v-table>
        <div class="mt-3 text-body-2">
          <div v-if="detalle.archivos.plantilla_dj" class="d-flex align-center ga-2">
            <span>Plantilla DJ: {{ detalle.archivos.plantilla_dj.nombre }}</span>
            <v-btn
              icon="mdi-download"
              variant="text"
              size="small"
              color="primary"
              :loading="descargandoPlantilla"
              @click="alDescargarPlantilla"
            />
          </div>
          <span v-if="detalle.motivo_cierre" class="d-block mt-1">Motivo de cierre: {{ detalle.motivo_cierre }}</span>
          <div v-if="detalle.fecha_fin_anterior" class="d-flex align-center ga-1 mt-1 text-grey">
            <v-icon icon="mdi-clock-plus-outline" size="16" />
            <span>
              Plazo ampliado — fecha de cierre anterior:
              {{ dayjs(detalle.fecha_fin_anterior).tz().format('DD/MM/YYYY HH:mm') }}h
              <span class="text-caption">(solo visible para la entidad)</span>
            </span>
          </div>
        </div>
      </v-card>

      <div class="d-flex justify-end ga-2">
        <v-btn variant="outlined" color="secondary" class="px-5" to="/app/convocatorias">Volver</v-btn>
        <v-btn
          v-if="puedeCancelar"
          v-can="'convocatorias.cancelar'"
          color="error"
          variant="tonal"
          class="px-5"
          @click="cancelarAbierto = true"
        >
          Cancelar convocatoria
        </v-btn>
        <v-btn
          v-if="puedeAmpliar"
          v-can="'convocatorias.ampliar'"
          color="secondary"
          variant="tonal"
          class="px-5"
          prepend-icon="mdi-clock-plus-outline"
          @click="abrirAmpliar"
        >
          Ampliar fecha fin
        </v-btn>
        <v-btn
          v-if="esBorrador"
          v-can="esEdicion ? 'convocatorias.editar' : 'convocatorias.crear'"
          type="submit"
          color="primary"
          variant="flat"
          elevation="2"
          class="px-6"
          :loading="guardando"
          :disabled="!formValido"
        >
          Guardar
        </v-btn>
        <v-btn
          v-if="esEdicion && esBorrador"
          v-can="'convocatorias.publicar'"
          color="primary"
          variant="flat"
          elevation="2"
          class="px-6"
          @click="alHacerClicPublicar"
        >
          Publicar
        </v-btn>
      </div>
    </v-form>

    <BaseConfirmacion
      v-model:abierto="avisoGuardarAbierto"
      titulo="Guarda los cambios primero"
      mensaje="Tienes cambios en nombre, fechas o plantilla que todavía no se guardaron. Guárdalos antes de publicar, así la convocatoria se publica con la información correcta."
      texto-confirmar="Guardar y continuar"
      :cargando="guardando"
      @confirmar="guardarYPublicar"
    />

    <BaseConfirmacion
      v-model:abierto="publicarAbierto"
      titulo="Publicar convocatoria"
      :mensaje="`Al publicar se generará el número oficial (formato CM-00X-AÑO-SIGLA) y la convocatoria quedará visible en el portal público de inmediato. ${errorPublicar}`"
      texto-confirmar="Publicar"
      fuerte
      :cargando="publicando"
      @confirmar="confirmarPublicar"
    />

    <BaseConfirmacion
      v-model:abierto="cancelarAbierto"
      titulo="Cancelar convocatoria"
      mensaje="Esta acción cierra la convocatoria de forma definitiva y notifica a los postores. Indica el motivo."
      texto-confirmar="Cancelar convocatoria"
      pedir-motivo
      :cargando="cancelando"
      @confirmar="confirmarCancelar"
    />

    <v-dialog v-model="ampliarAbierto" max-width="480" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
          <span>Ampliar fecha fin</span>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="ampliarAbierto = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <p class="text-body-2 mb-4">
            Define la nueva fecha y hora de cierre. Los proveedores verán el plazo actualizado de inmediato; la fecha de
            cierre anterior queda guardada solo para control interno, no se muestra en el portal público.
          </p>
          <v-alert v-if="errorAmpliar" type="error" density="compact" class="mb-4">{{ errorAmpliar }}</v-alert>
          <BaseDateTimePicker
            v-model="nuevaFechaFin"
            label="Nueva fecha y hora de fin *"
            :rules="reglasNuevaFechaFin"
            :min-fecha="detalle ? dayjs(detalle.fecha_fin).tz().format('YYYY-MM-DD') : undefined"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
          <v-btn variant="outlined" color="secondary" class="px-5" @click="ampliarAbierto = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" elevation="2" class="px-6" :loading="ampliando" @click="confirmarAmpliar">
            Ampliar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
