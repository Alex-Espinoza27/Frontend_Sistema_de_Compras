<script setup lang="ts">
// E2 — Crear/Editar requerimiento (05B). Sub-tabla de ítems + TDR. Guardar
// crea/actualiza y sube el TDR en un solo POST/PUT multipart; en edición, si
// no se elige un archivo nuevo, el existente no se toca. El número lo asigna
// el backend (NumeracionService), no se digita.
//
// Errores (mismo criterio que PostularView): "Guardar" valida en el navegador
// con las reglas del backend (`RequerimientoStoreRequest`) y, si igual
// responde 422, pinta sus errores: resumen arriba, mensaje bajo cada campo y
// foco en el primero. Los límites de largo se muestran en cada campo.
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { areasApi } from '@/api/areas.api'
import { entidadesApi } from '@/api/entidades.api'
import { publicoApi } from '@/api/publico.api'
import { requerimientosApi } from '@/api/requerimientos.api'
import BaseArchivoUpload from '@/components/base/BaseArchivoUpload.vue'
import BaseResumenErrores from '@/components/base/BaseResumenErrores.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { enfocarCampo, idCampo, useErroresFormulario, type MapaErrores } from '@/composables/useErroresFormulario'
import type {
  AreaItem,
  TipoRequerimiento,
  UnidadMedidaCombo,
} from '@/modules/entidad/entidad.types'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

interface ItemForm {
  descripcion: string
  unidad_medida_id: number | null
  cantidad: number | null
  presentacion: string
}

// Mismos límites que `ReglasRequerimiento` en el backend.
const LIMITES = {
  objeto: 250,
  descripcion: 2000,
  itemDescripcion: 500,
  presentacion: 120,
  cantidadMax: 10_000_000,
  archivoMb: 10,
  formatosArchivo: ['pdf', 'doc', 'docx'],
}

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()
const id = route.params.id ? Number(route.params.id) : null
const esEdicion = id !== null
// 05C hardening: ADMINISTRADOR no tiene entidad propia — crea/ve
// requerimientos "en nombre de" la entidad que elija explícitamente.
const esEntidad = computed(() => auth.usuario?.rol === 'ENTIDAD')
const esAdmin = computed(() => auth.usuario?.rol === 'ADMINISTRADOR')

const cargando = ref(true)
const rubros = ref<RubroPublico[]>([])
const unidades = ref<UnidadMedidaCombo[]>([])
const areas = ref<AreaItem[]>([])
const entidadesAprobadas = ref<EntidadListaItem[]>([])
const numeroGenerado = ref('')
const archivoTdr = ref<{ archivo_id: number; nombre: string } | null>(null)

const form = reactive({
  objeto: '',
  descripcion: '',
  tipo: 'SERVICIO' as TipoRequerimiento,
  rubro_ids: [] as number[],
  area_id: null as number | null,
  entidad_id: null as number | null,
})
const items = reactive<ItemForm[]>([{ descripcion: '', unidad_medida_id: null, cantidad: 1, presentacion: '' }])

const rubrosFiltrados = computed(() => rubros.value.filter((r) => r.tipo === form.tipo))
function alCambiarTipo() {
  form.rubro_ids = []
}

function agregarItem() {
  items.push({ descripcion: '', unidad_medida_id: null, cantidad: 1, presentacion: '' })
}
function quitarItem(i: number) {
  if (items.length > 1) items.splice(i, 1)
}

async function cargarAreas() {
  if (!esEntidad.value && !form.entidad_id) {
    areas.value = []
    return
  }
  const params: Record<string, unknown> = { activo: 'true', por_pagina: 100 }
  if (!esEntidad.value) params.entidad_id = form.entidad_id
  const data = await areasApi.index(params)
  areas.value = data.items
}
// Solo en creación: al elegir la entidad (ADMINISTRADOR), recarga las áreas
// de esa entidad y limpia la elección previa (ya no sería válida).
watch(
  () => form.entidad_id,
  () => {
    if (!esEdicion) {
      form.area_id = null
      cargarAreas()
    }
  },
)

async function cargar() {
  cargando.value = true
  const [rubrosData, unidadesData] = await Promise.all([publicoApi.rubros(), requerimientosApi.unidadesMedida()])
  rubros.value = rubrosData.items
  unidades.value = unidadesData

  if (!esEntidad.value) {
    entidadesAprobadas.value = (await entidadesApi.index({ estado: 'APROBADA', ordenar_por: 'razon_social', por_pagina: 100 })).items
  }

  if (id) {
    const detalle = await requerimientosApi.show(id)
    numeroGenerado.value = detalle.numero
    form.objeto = detalle.objeto
    form.descripcion = detalle.descripcion
    form.tipo = detalle.tipo
    form.rubro_ids = detalle.rubros.map((r) => r.rubro_id)
    form.entidad_id = detalle.entidad.entidad_id
    await cargarAreas()
    form.area_id = detalle.area?.area_id ?? null
    // Si el área histórica ya fue desactivada, se agrega igual a las
    // opciones para no perder la selección al editar (05C hardening).
    if (detalle.area && !areas.value.some((a) => a.area_id === detalle.area?.area_id)) {
      areas.value.push({ area_id: detalle.area.area_id, nombre: detalle.area.nombre, sigla: null, activo: false })
    }
    items.splice(
      0,
      items.length,
      ...detalle.items.map((it) => ({
        descripcion: it.descripcion,
        unidad_medida_id: unidades.value.find((u) => u.codigo === it.unidad_medida.codigo)?.unidad_medida_id ?? null,
        cantidad: it.cantidad,
        presentacion: it.presentacion ?? '',
      })),
    )
    archivoTdr.value = detalle.archivo_tdr
  } else {
    await cargarAreas()
  }
  cargando.value = false
}
cargar()

// --- Errores ----------------------------------------------------------------
const { de: erroresDe, limpiar: limpiarError, establecer: establecerErrores, lista: listaErrores, hayErrores } =
  useErroresFormulario()
const errorGeneral = ref('')
const guardando = ref(false)
const archivoTdrNuevo = ref<File[]>([])

/** Un error de `rubro_ids.1` se muestra en el campo de rubros. */
const campoBase = (campo: string) => (campo.startsWith('rubro_ids.') ? 'rubro_ids' : campo)
const irACampo = (campo: string) => enfocarCampo(campoBase(campo))

async function mostrarErrores(mapa: MapaErrores) {
  establecerErrores(mapa)
  const total = listaErrores.value.length
  ui.mostrarSnackbar(total === 1 ? 'Hay 1 dato por corregir.' : `Hay ${total} datos por corregir.`, 'warning')
  const primero = listaErrores.value[0]
  if (primero) await irACampo(primero.campo)
}

const vacio = (valor: unknown) => valor === null || valor === undefined || String(valor).trim() === ''

/** Mismas reglas que el backend y mismas claves que sus errores (`items.0.cantidad`…). */
function validarLocal(): MapaErrores {
  const mapa: MapaErrores = {}

  if (esAdmin.value && !form.entidad_id) mapa.entidad_id = ['Seleccione la entidad.']

  if (vacio(form.objeto)) mapa.objeto = ['Indique el objeto del requerimiento.']
  else if (form.objeto.length > LIMITES.objeto) mapa.objeto = [`El objeto no puede superar ${LIMITES.objeto} caracteres.`]

  if (vacio(form.descripcion)) mapa.descripcion = ['Indique la descripción del requerimiento.']
  else if (form.descripcion.length > LIMITES.descripcion) {
    mapa.descripcion = [`La descripción no puede superar ${LIMITES.descripcion} caracteres.`]
  }

  if (!form.rubro_ids.length) mapa.rubro_ids = ['Seleccione al menos un rubro.']
  if (!form.area_id) mapa.area_id = ['Seleccione el área usuaria.']
  if (!items.length) mapa.items = ['Agregue al menos un ítem.']

  items.forEach((item, i) => {
    const n = i + 1
    if (vacio(item.descripcion)) mapa[`items.${i}.descripcion`] = [`Indique la descripción del ítem ${n}.`]
    else if (item.descripcion.length > LIMITES.itemDescripcion) {
      mapa[`items.${i}.descripcion`] = [`La descripción del ítem ${n} no puede superar ${LIMITES.itemDescripcion} caracteres.`]
    }
    if (!item.unidad_medida_id) mapa[`items.${i}.unidad_medida_id`] = [`Seleccione la unidad de medida del ítem ${n}.`]
    if (vacio(item.cantidad)) mapa[`items.${i}.cantidad`] = [`Indique la cantidad del ítem ${n}.`]
    else if (Number.isNaN(Number(item.cantidad))) mapa[`items.${i}.cantidad`] = [`La cantidad del ítem ${n} debe ser un número.`]
    else if (Number(item.cantidad) < 1) mapa[`items.${i}.cantidad`] = [`La cantidad del ítem ${n} debe ser al menos 1.`]
    else if (Number(item.cantidad) > LIMITES.cantidadMax) {
      mapa[`items.${i}.cantidad`] = [`La cantidad del ítem ${n} no puede superar 10.000.000.`]
    }
    if (item.presentacion.length > LIMITES.presentacion) {
      mapa[`items.${i}.presentacion`] = [`La presentación del ítem ${n} no puede superar ${LIMITES.presentacion} caracteres.`]
    }
  })

  const tdr = archivoTdrNuevo.value[0]
  if (tdr) {
    const extension = tdr.name.split('.').pop()?.toLowerCase() ?? ''
    if (!LIMITES.formatosArchivo.includes(extension)) mapa.archivo_tdr = ['El archivo TDR / EETT debe ser PDF, DOC o DOCX.']
    else if (tdr.size > LIMITES.archivoMb * 1024 * 1024) {
      mapa.archivo_tdr = [`El archivo TDR / EETT no puede pesar más de ${LIMITES.archivoMb} MB.`]
    }
  }

  return mapa
}

async function guardar() {
  errorGeneral.value = ''
  const mapa = validarLocal()
  if (Object.keys(mapa).length) {
    await mostrarErrores(mapa)
    return
  }
  establecerErrores(null)

  guardando.value = true
  try {
    const cuerpo = {
      ...form,
      items: items.map((it, i) => ({
        numero: i + 1,
        descripcion: it.descripcion,
        unidad_medida_id: it.unidad_medida_id as number,
        cantidad: Number(it.cantidad),
        presentacion: it.presentacion.trim() || null,
      })),
    }
    const nuevoArchivo = archivoTdrNuevo.value[0] ?? null
    if (id) {
      await requerimientosApi.update(id, cuerpo, nuevoArchivo)
      ui.mostrarSnackbar('Requerimiento actualizado.', 'success')
      router.push('/app/requerimientos')
    } else {
      const { numero } = await requerimientosApi.store(cuerpo, nuevoArchivo)
      ui.mostrarSnackbar(`Requerimiento ${numero} creado.`, 'success')
      router.push('/app/requerimientos')
    }
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 409 || status === 422 || status === 403) {
      const delServidor = error.response?.data?.errores ?? {}
      if (Object.keys(delServidor).length) await mostrarErrores(delServidor)
      else errorGeneral.value = error.response?.data?.mensaje ?? 'No se pudo guardar el requerimiento.'
    }
  } finally {
    guardando.value = false
  }
}

async function eliminarTdr() {
  if (!id || !archivoTdr.value) return
  await requerimientosApi.eliminarTdr(id, archivoTdr.value.archivo_id)
  archivoTdr.value = null
  ui.mostrarSnackbar('TDR eliminado.', 'success')
}
</script>

<template>
  <v-container class="py-8" max-width="1200">
    <BaseVolver to="/app/requerimientos" texto="Volver a requerimientos" />
    <div class="d-flex align-center ga-3 mb-6">
      <div class="text-h5 text-titulo">{{ esEdicion ? 'Editar requerimiento' : 'Nuevo requerimiento' }}</div>
      <v-chip v-if="numeroGenerado" color="primary" variant="tonal" size="large" class="font-weight-medium">
        {{ numeroGenerado }}
      </v-chip>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-form v-else @submit.prevent="guardar">
      <v-alert v-if="errorGeneral" type="error" density="comfortable" class="mb-4">{{ errorGeneral }}</v-alert>
      <BaseResumenErrores
        v-if="hayErrores"
        :errores="listaErrores"
        titulo="No se pudo guardar. Corrija lo siguiente:"
        class="mb-4"
        @ir="irACampo"
      />
      <v-alert v-if="!esEdicion" type="info" variant="tonal" density="comfortable" class="mb-4">
        El número de requerimiento se asignará automáticamente al guardar.
      </v-alert>

      <!-- Datos generales -->
      <v-card class="pa-4 pa-md-5 mb-4">
        <h2 class="seccion__titulo"><v-icon icon="mdi-clipboard-text-outline" size="20" />Datos del requerimiento</h2>
        <v-row dense>
          <v-col v-if="esAdmin" cols="12">
            <v-select
              :id="idCampo('entidad_id')"
              v-model="form.entidad_id"
              :items="entidadesAprobadas.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
              label="Entidad *"
              prepend-inner-icon="mdi-domain"
              :disabled="esEdicion"
              :error-messages="erroresDe('entidad_id')"
              hint="Requerimiento creado en nombre de esta entidad."
              persistent-hint
              @update:model-value="limpiarError('entidad_id')"
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="etiqueta-campo">Tipo de requerimiento *</div>
            <v-btn-toggle
              v-model="form.tipo"
              mandatory
              color="primary"
              variant="outlined"
              class="w-100 rounded-md"
              style="height: 49px"
              @update:model-value="alCambiarTipo"
            >
              <v-btn value="BIEN" class="flex-grow-1 text-none font-weight-medium" prepend-icon="mdi-package-variant-closed">
                Bien
              </v-btn>
              <v-btn value="SERVICIO" class="flex-grow-1 text-none font-weight-medium" prepend-icon="mdi-wrench-outline">
                Servicio
              </v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" md="6">
            <div class="etiqueta-campo etiqueta-campo--oculta-movil">&nbsp;</div>
            <v-autocomplete
              :id="idCampo('rubro_ids')"
              v-model="form.rubro_ids"
              :items="rubrosFiltrados.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
              label="Rubros *"
              prepend-inner-icon="mdi-tag-multiple-outline"
              multiple
              chips
              closable-chips
              :chip-props="{ color: 'primary', variant: 'tonal' }"
              :error-messages="erroresDe('rubro_ids')"
              hint="Solo se muestran los rubros del tipo elegido."
              persistent-hint
              @update:model-value="limpiarError('rubro_ids')"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              :id="idCampo('objeto')"
              v-model="form.objeto"
              label="Objeto *"
              prepend-inner-icon="mdi-bullseye-arrow"
              placeholder="Ej. Adquisición de equipos de cómputo"
              :counter="LIMITES.objeto"
              persistent-counter
              :maxlength="LIMITES.objeto"
              :error-messages="erroresDe('objeto')"
              @update:model-value="limpiarError('objeto')"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              :id="idCampo('descripcion')"
              v-model="form.descripcion"
              label="Descripción *"
              rows="3"
              auto-grow
              :counter="LIMITES.descripcion"
              persistent-counter
              :maxlength="LIMITES.descripcion"
              :error-messages="erroresDe('descripcion')"
              @update:model-value="limpiarError('descripcion')"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              :id="idCampo('area_id')"
              v-model="form.area_id"
              :items="areas.map((a) => ({ title: a.nombre, value: a.area_id }))"
              label="Área usuaria *"
              prepend-inner-icon="mdi-office-building-outline"
              :disabled="!esEntidad && !form.entidad_id"
              :error-messages="erroresDe('area_id')"
              :hint="!esEntidad && !form.entidad_id ? 'Primero elija la entidad.' : undefined"
              persistent-hint
              @update:model-value="limpiarError('area_id')"
            />
          </v-col>
        </v-row>
      </v-card>

      <!-- Ítems -->
      <v-card class="pa-4 pa-md-5 mb-4">
        <div class="d-flex flex-wrap justify-space-between align-center ga-2 mb-1">
          <h2 class="seccion__titulo mb-0"><v-icon icon="mdi-format-list-numbered" size="20" />Ítems del requerimiento</h2>
          <v-btn color="primary" variant="outlined" size="small" prepend-icon="mdi-plus" class="font-weight-medium" @click="agregarItem">
            Agregar ítem
          </v-btn>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-3">Cada ítem es un bien o servicio que los proveedores deberán cotizar.</p>
        <v-alert v-if="erroresDe('items').length" type="error" density="compact" class="mb-4">
          {{ erroresDe('items')[0] }}
        </v-alert>

        <div class="tabla-items">
          <v-table density="comfortable">
            <thead>
              <tr>
                <th style="width: 48px">#</th>
                <th>
                  Descripción *
                  <div class="encabezado-limite">máx. {{ LIMITES.itemDescripcion }} caracteres</div>
                </th>
                <th style="width: 210px">Unidad de medida *</th>
                <th style="width: 150px">
                  Cantidad *
                  <div class="encabezado-limite">de 1 a 10.000.000</div>
                </th>
                <th style="width: 200px">
                  Presentación
                  <div class="encabezado-limite">máx. {{ LIMITES.presentacion }} caracteres</div>
                </th>
                <th style="width: 56px" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="i">
                <td><div class="celda-fija text-medium-emphasis">{{ i + 1 }}</div></td>
                <td class="celda-campo celda-campo--descripcion">
                  <v-text-field
                    :id="idCampo(`items.${i}.descripcion`)"
                    v-model="item.descripcion"
                    density="compact"
                    placeholder="Ej. Laptop de 14 pulgadas, 16 GB de RAM"
                    :maxlength="LIMITES.itemDescripcion"
                    :counter="LIMITES.itemDescripcion"
                    :error-messages="erroresDe(`items.${i}.descripcion`)"
                    @update:model-value="limpiarError(`items.${i}.descripcion`)"
                  />
                </td>
                <td class="celda-campo">
                  <v-select
                    :id="idCampo(`items.${i}.unidad_medida_id`)"
                    v-model="item.unidad_medida_id"
                    :items="unidades.map((u) => ({ title: u.nombre, value: u.unidad_medida_id }))"
                    placeholder="Seleccione"
                    density="compact"
                    :error-messages="erroresDe(`items.${i}.unidad_medida_id`)"
                    @update:model-value="limpiarError(`items.${i}.unidad_medida_id`)"
                  />
                </td>
                <td class="celda-campo">
                  <v-text-field
                    :id="idCampo(`items.${i}.cantidad`)"
                    v-model.number="item.cantidad"
                    type="number"
                    min="1"
                    :max="LIMITES.cantidadMax"
                    inputmode="decimal"
                    density="compact"
                    :error-messages="erroresDe(`items.${i}.cantidad`)"
                    @update:model-value="limpiarError(`items.${i}.cantidad`)"
                  />
                </td>
                <td class="celda-campo">
                  <v-text-field
                    :id="idCampo(`items.${i}.presentacion`)"
                    v-model="item.presentacion"
                    placeholder="Ej. 500 ml, paquete x12"
                    :maxlength="LIMITES.presentacion"
                    :counter="LIMITES.presentacion"
                    density="compact"
                    :error-messages="erroresDe(`items.${i}.presentacion`)"
                    @update:model-value="limpiarError(`items.${i}.presentacion`)"
                  />
                </td>
                <td>
                  <div class="celda-fija">
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      color="error"
                      size="small"
                      :disabled="items.length === 1"
                      title="Quitar ítem"
                      @click="quitarItem(i)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- TDR -->
      <v-card class="pa-4 pa-md-5 mb-4">
        <h2 class="seccion__titulo"><v-icon icon="mdi-paperclip" size="20" />Archivo TDR / EETT</h2>
        <div v-if="archivoTdr" class="d-flex align-center ga-2 mb-4">
          <v-icon icon="mdi-file-document-outline" />
          <span>{{ archivoTdr.nombre }}</span>
          <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="eliminarTdr" />
        </div>
        <BaseArchivoUpload
          :id="idCampo('archivo_tdr')"
          v-model="archivoTdrNuevo"
          :label="archivoTdr ? 'Reemplazar TDR / EETT' : 'Subir TDR / EETT'"
          :max-size-mb="LIMITES.archivoMb"
          :hint="
            archivoTdr
              ? 'Solo se reemplaza si eliges un archivo nuevo aquí; se guarda junto con el resto al hacer clic en Guardar.'
              : `Un solo archivo · PDF, DOC o DOCX · máximo ${LIMITES.archivoMb} MB.`
          "
          :error-messages="erroresDe('archivo_tdr')"
          @update:model-value="limpiarError('archivo_tdr')"
        />
      </v-card>

      <div class="d-flex justify-end ga-3 mt-4">
        <v-btn variant="outlined" color="primary" to="/app/requerimientos" class="px-6">Cancelar</v-btn>
        <v-btn
          type="submit"
          color="primary"
          variant="flat"
          elevation="2"
          prepend-icon="mdi-content-save-outline"
          :loading="guardando"
          class="px-6"
        >
          Guardar
        </v-btn>
      </div>
    </v-form>
  </v-container>
</template>

<style scoped>
.seccion__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-secondary));
}
.etiqueta-campo {
  margin-bottom: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
@media (max-width: 959px) {
  .etiqueta-campo--oculta-movil {
    display: none;
  }
}

/* Tabla de ítems: TODAS las celdas arriba, con el mismo margen. Antes cada
   celda se centraba por su cuenta y, como el contador/mensaje de error hace
   más alto a unos campos que a otros, los inputs quedaban unos pegados arriba
   y otros abajo. Los textos fijos (#, borrar) se alinean con la línea del input
   (40 px de alto). */
.tabla-items {
  overflow-x: auto;
}
.tabla-items :deep(th) {
  vertical-align: top;
  padding-top: 10px !important;
  padding-bottom: 8px !important;
  line-height: 1.25;
}
.tabla-items :deep(td) {
  vertical-align: top;
  height: auto !important;
  padding-top: 12px !important;
  padding-bottom: 6px !important;
}
.celda-fija {
  display: flex;
  align-items: center;
  height: 40px;
}
.celda-campo--descripcion {
  min-width: 280px;
}
.encabezado-limite {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.7;
  white-space: nowrap;
}
</style>
