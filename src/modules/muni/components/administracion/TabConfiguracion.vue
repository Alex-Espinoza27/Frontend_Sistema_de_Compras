<script setup lang="ts">
// I4 — Configuración y UIT (05B). Configuración es clave/valor genérico
// (CONF_TIPO solo indica cómo interpretarlo: TEXTO/ENTERO); marcar un año de
// UIT como vigente desmarca los demás — esa regla la aplica el backend.
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import type { ConfiguracionItem, UitItem } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

// --- Configuración general ---------------------------------------------------
const configuraciones = ref<ConfiguracionItem[]>([])
const cargandoConfig = ref(true)
async function cargarConfiguracion() {
  cargandoConfig.value = true
  configuraciones.value = await adminApi.configuracion()
  cargandoConfig.value = false
}
cargarConfiguracion()

const guardandoConfig = ref(false)
async function guardarConfiguracion() {
  guardandoConfig.value = true
  try {
    // El backend exige `valor` como required (no acepta string vacío) — una
    // clave que sigue vacía (ej. PLANTILLA_DJ_DEFECTO recién sembrada) no se
    // puede "guardar en blanco" vía este endpoint, así que se omite del envío
    // en vez de romper la actualización de todas las demás con un 422.
    const paraEnviar = configuraciones.value.filter((c) => c.valor !== '')
    if (paraEnviar.length) {
      await adminApi.actualizarConfiguracion(paraEnviar.map((c) => ({ clave: c.clave, valor: c.valor })))
    }
    ui.mostrarSnackbar('Configuración actualizada.', 'success')
  } finally {
    guardandoConfig.value = false
  }
}

// --- UIT por año ---------------------------------------------------------------
const uits = ref<UitItem[]>([])
const cargandoUit = ref(true)
async function cargarUit() {
  cargandoUit.value = true
  uits.value = await adminApi.uit()
  cargandoUit.value = false
}
cargarUit()

const uitAbierto = ref(false)
const uitEditando = ref<UitItem | null>(null)
const uitForm = reactive({ anio: new Date().getFullYear(), valor: 0, vigente: false })
const guardandoUit = ref(false)
const erroresUit = ref<Record<string, string[]>>({})

function abrirNuevoUit() {
  uitEditando.value = null
  uitForm.anio = new Date().getFullYear()
  uitForm.valor = 0
  uitForm.vigente = false
  erroresUit.value = {}
  uitAbierto.value = true
}
function abrirEditarUit(uit: UitItem) {
  uitEditando.value = uit
  uitForm.anio = uit.anio
  uitForm.valor = Number(uit.valor)
  uitForm.vigente = uit.vigente
  erroresUit.value = {}
  uitAbierto.value = true
}
async function guardarUit() {
  guardandoUit.value = true
  erroresUit.value = {}
  try {
    if (uitEditando.value) {
      await adminApi.actualizarUit(uitEditando.value.uit_id, { ...uitForm })
      ui.mostrarSnackbar('Valor de UIT actualizado.', 'success')
    } else {
      await adminApi.crearUit({ ...uitForm })
      ui.mostrarSnackbar('Valor de UIT creado.', 'success')
    }
    uitAbierto.value = false
    await cargarUit()
  } catch (e: unknown) {
    const error = e as { response?: { data?: { errores?: Record<string, string[]> } } }
    erroresUit.value = error.response?.data?.errores ?? {}
  } finally {
    guardandoUit.value = false
  }
}
</script>

<template>
  <div>
    <v-card class="pa-4 mb-6">
      <div class="text-subtitle-1 text-titulo mb-4">Configuración general</div>
      <v-progress-circular v-if="cargandoConfig" indeterminate color="primary" />
      <template v-else>
        <v-row dense>
          <v-col v-for="c in configuraciones" :key="c.clave" cols="12" sm="6">
            <v-text-field
              v-model="c.valor"
              :label="c.descripcion ?? c.clave"
              :type="c.tipo === 'ENTERO' ? 'number' : 'text'"
              :hint="c.clave"
              persistent-hint
            />
          </v-col>
        </v-row>
        <div class="d-flex justify-end mt-4">
          <v-btn :loading="guardandoConfig" @click="guardarConfiguracion">Guardar cambios</v-btn>
        </div>
      </template>
    </v-card>

    <v-card class="pa-4">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-subtitle-1 text-titulo">UIT por año</div>
        <v-btn variant="text" prepend-icon="mdi-plus" @click="abrirNuevoUit">Nuevo</v-btn>
      </div>
      <v-progress-circular v-if="cargandoUit" indeterminate color="primary" />
      <v-table v-else density="comfortable">
        <thead>
          <tr>
            <th>Año</th>
            <th>Valor S/</th>
            <th>Vigente</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in uits" :key="u.uit_id">
            <td>{{ u.anio }}</td>
            <td>{{ u.valor }}</td>
            <td><v-icon v-if="u.vigente" icon="mdi-check-circle" color="success" /></td>
            <td><v-btn variant="text" size="small" @click="abrirEditarUit(u)">Editar</v-btn></td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="uitAbierto" max-width="420">
      <v-card>
        <v-card-title class="text-titulo">{{ uitEditando ? 'Editar UIT' : 'Nuevo valor de UIT' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="uitForm.anio"
            label="Año"
            type="number"
            :error-messages="erroresUit.anio"
            class="mb-2"
          />
          <v-text-field
            v-model.number="uitForm.valor"
            label="Valor S/"
            type="number"
            :error-messages="erroresUit.valor"
            class="mb-2"
          />
          <v-switch v-model="uitForm.vigente" label="Vigente" hide-details />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="uitAbierto = false">Cancelar</v-btn>
          <v-btn :loading="guardandoUit" @click="guardarUit">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
