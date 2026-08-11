<script setup lang="ts">
// E2 — Crear/Editar requerimiento (05B). Sub-tabla de ítems + TDR. Guardar
// crea/actualiza y sube el TDR en un solo POST/PUT multipart; en edición, si
// no se elige un archivo nuevo, el existente no se toca. El número lo asigna
// el backend (NumeracionService), no se digita.
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { areasApi } from '@/api/areas.api'
import { entidadesApi } from '@/api/entidades.api'
import { publicoApi } from '@/api/publico.api'
import { requerimientosApi } from '@/api/requerimientos.api'
import BaseArchivoUpload from '@/components/base/BaseArchivoUpload.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import type {
  AreaItem,
  TipoRequerimiento,
  UnidadMedidaCombo,
} from '@/modules/entidad/entidad.types'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { max, min, requerido } from '@/utils/validaciones'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

interface ItemForm {
  descripcion: string
  unidad_medida_id: number | null
  cantidad: number | null
  presentacion: string
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

const formValido = ref(false)
const guardando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})
const archivoTdrNuevo = ref<File[]>([])

async function guardar() {
  if (!formValido.value) return
  errorGeneral.value = ''
  erroresCampo.value = {}
  guardando.value = true
  try {
    const cuerpo = {
      ...form,
      items: items.map((it, i) => ({
        numero: i + 1,
        descripcion: it.descripcion,
        unidad_medida_id: it.unidad_medida_id as number,
        cantidad: it.cantidad as number,
        presentacion: it.presentacion.trim() || null,
      })),
    }
    const nuevoArchivo = archivoTdrNuevo.value[0] ?? null
    if (id) {
      await requerimientosApi.update(id, cuerpo, nuevoArchivo)
      ui.mostrarSnackbar('Requerimiento actualizado.', 'success')
      router.push('/app/requerimientos')
    } else {
      const { requerimiento_id, numero } = await requerimientosApi.store(cuerpo, nuevoArchivo)
      ui.mostrarSnackbar(`Requerimiento ${numero} creado.`, 'success')
      router.push(`/app/requerimientos/${requerimiento_id}`)
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

async function eliminarTdr() {
  if (!id || !archivoTdr.value) return
  await requerimientosApi.eliminarTdr(id, archivoTdr.value.archivo_id)
  archivoTdr.value = null
  ui.mostrarSnackbar('TDR eliminado.', 'success')
}
</script>

<template>
  <v-container class="py-8" max-width="900">
    <BaseVolver to="/app/requerimientos" texto="Volver a requerimientos" />
    <div class="d-flex align-center ga-3 mb-6">
      <div class="text-h5 text-titulo">{{ esEdicion ? 'Editar requerimiento' : 'Nuevo requerimiento' }}</div>
      <v-chip v-if="numeroGenerado" color="primary" variant="tonal">{{ numeroGenerado }}</v-chip>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-form v-else v-model="formValido" @submit.prevent="guardar">
      <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>
      <v-alert v-if="!esEdicion" type="info" density="compact" class="mb-4">
        El número de requerimiento se asignará automáticamente al guardar.
      </v-alert>

      <v-card class="pa-4 mb-4">
        <v-row dense>
          <v-col v-if="!esEntidad" cols="12">
            <v-select
              v-model="form.entidad_id"
              :items="entidadesAprobadas.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
              label="Entidad *"
              :disabled="esEdicion"
              :rules="[requerido()]"
              :error-messages="erroresCampo.entidad_id"
              hint="Requerimiento creado en nombre de esta entidad."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.tipo"
              :items="[
                { title: 'Bien', value: 'BIEN' },
                { title: 'Servicio', value: 'SERVICIO' },
              ]"
              label="Tipo *"
              :rules="[requerido()]"
              :error-messages="erroresCampo.tipo"
              @update:model-value="alCambiarTipo"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-autocomplete
              v-model="form.rubro_ids"
              :items="rubrosFiltrados.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
              label="Rubros"
              multiple
              chips
              closable-chips
              :chip-props="{ color: 'primary', variant: 'tonal' }"
              :error-messages="erroresCampo.rubro_ids"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.objeto"
              label="Objeto *"
              :rules="[requerido()]"
              :error-messages="erroresCampo.objeto"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="form.descripcion"
              label="Descripción *"
              :rules="[requerido()]"
              :error-messages="erroresCampo.descripcion"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-autocomplete
              v-model="form.area_id"
              :items="areas.map((a) => ({ title: a.nombre, value: a.area_id }))"
              label="Área usuaria *"
              :disabled="!esEntidad && !form.entidad_id"
              :rules="[requerido()]"
              :error-messages="erroresCampo.area_id"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="d-flex justify-space-between align-center mb-3">
          <div class="text-subtitle-1 text-titulo">Ítems</div>
          <v-btn variant="text" prepend-icon="mdi-plus" @click="agregarItem">Agregar ítem</v-btn>
        </div>
        <v-alert v-if="erroresCampo.items" type="error" density="compact" class="mb-4">
          {{ erroresCampo.items[0] }}
        </v-alert>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th style="width: 48px">#</th>
              <th>Descripción *</th>
              <th style="width: 200px">Unidad de medida *</th>
              <th style="width: 120px">Cantidad *</th>
              <th style="width: 180px">Presentación</th>
              <th style="width: 48px" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in items" :key="i">
              <td>{{ i + 1 }}</td>
              <td>
                <v-text-field v-model="item.descripcion" density="compact" hide-details="auto" :rules="[requerido()]" />
              </td>
              <td>
                <v-select
                  v-model="item.unidad_medida_id"
                  :items="unidades.map((u) => ({ title: u.nombre, value: u.unidad_medida_id }))"
                  placeholder="Seleccione"
                  density="compact"
                  hide-details="auto"
                  :rules="[requerido()]"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="item.cantidad"
                  type="number"
                  min="1"
                  max="10000000"
                  density="compact"
                  hide-details="auto"
                  :rules="[requerido(), min(1), max(10000000)]"
                />
              </td>
              <td>
                <v-text-field
                  v-model="item.presentacion"
                  placeholder="Ej: 500 ml, paquete x12..."
                  density="compact"
                  hide-details="auto"
                />
              </td>
              <td>
                <v-btn icon="mdi-close" variant="text" size="small" :disabled="items.length === 1" @click="quitarItem(i)" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Archivo TDR / EETT</div>
        <div v-if="archivoTdr" class="d-flex align-center ga-2 mb-4">
          <v-icon icon="mdi-file-document-outline" />
          <span>{{ archivoTdr.nombre }}</span>
          <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="eliminarTdr" />
        </div>
        <BaseArchivoUpload
          v-model="archivoTdrNuevo"
          :label="archivoTdr ? 'Reemplazar TDR / EETT' : 'Subir TDR / EETT'"
          :hint="archivoTdr ? 'Solo se reemplaza si eliges un archivo nuevo aquí; se guarda junto con el resto al hacer clic en Guardar.' : undefined"
        />
      </v-card>

      <div class="d-flex justify-end ga-2">
        <v-btn variant="text" to="/app/requerimientos">Cancelar</v-btn>
        <v-btn type="submit" :loading="guardando" :disabled="!formValido">Guardar</v-btn>
      </div>
    </v-form>
  </v-container>
</template>
