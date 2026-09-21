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
              hint="El campo fecha de fin debe ser una fecha posterior a fecha de inicio."
              persistent-hint
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card v-if="esBorrador" v-can="esEdicion ? 'convocatorias.editar' : 'convocatorias.crear'" class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Plantilla de declaración jurada</div>
        <div v-if="detalle?.archivos.plantilla_dj" class="d-flex align-center ga-2 mb-4">
          <v-icon icon="mdi-file-document-outline" />
          <span>{{ detalle.archivos.plantilla_dj.nombre }}</span>
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
          <span v-if="detalle.archivos.plantilla_dj">Plantilla DJ: {{ detalle.archivos.plantilla_dj.nombre }}</span>
          <span v-if="detalle.motivo_cierre" class="d-block mt-1">Motivo de cierre: {{ detalle.motivo_cierre }}</span>
        </div>
      </v-card>

      <div class="d-flex justify-end ga-2">
        <v-btn variant="text" to="/app/convocatorias">Volver</v-btn>
        <v-btn v-if="puedeCancelar" v-can="'convocatorias.cancelar'" color="error" variant="tonal" @click="cancelarAbierto = true">
          Cancelar convocatoria
        </v-btn>
        <v-btn
          v-if="esBorrador"
          v-can="esEdicion ? 'convocatorias.editar' : 'convocatorias.crear'"
          type="submit"
          :loading="guardando"
          :disabled="!formValido"
        >
          Guardar
        </v-btn>
        <v-btn v-if="esEdicion && esBorrador" v-can="'convocatorias.publicar'" color="primary" @click="publicarAbierto = true">
          Publicar
        </v-btn>
      </div>
    </v-form>

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
  </v-container>
</template>
