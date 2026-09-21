<script setup lang="ts">
// Módulo de Configuración General: Parámetros del sistema, prueba SMTP y UIT por año.
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

const PLACEHOLDER_SECRETO = '••••••••'

const guardandoConfig = ref(false)
async function guardarConfiguracion() {
  guardandoConfig.value = true
  try {
    const paraEnviar = configuraciones.value.filter((c) => !(c.tipo === 'SECRETO' && c.valor === PLACEHOLDER_SECRETO))
    if (paraEnviar.length) {
      await adminApi.actualizarConfiguracion(paraEnviar.map((c) => ({ clave: c.clave, valor: c.valor })))
    }
    ui.mostrarSnackbar('Configuración actualizada.', 'success')
    await cargarConfiguracion()
  } finally {
    guardandoConfig.value = false
  }
}

// --- Probar envío de correo --------------------------------------------------
const correoPrueba = ref('')
const enviandoPrueba = ref(false)
async function enviarCorreoPrueba() {
  if (!correoPrueba.value) return
  enviandoPrueba.value = true
  try {
    await adminApi.probarCorreo(correoPrueba.value)
    ui.mostrarSnackbar('Correo de prueba enviado. Revisa la bandeja del destinatario.', 'success')
  } finally {
    enviandoPrueba.value = false
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
  <v-container class="py-8" fluid>
    <div class="text-h5 text-titulo mb-6">Configuración</div>

    <v-card class="pa-4 mb-6">
      <div class="text-subtitle-1 text-titulo mb-4">Configuración general</div>
      <v-progress-circular v-if="cargandoConfig" indeterminate color="primary" />
      <template v-else>
        <v-row dense>
          <v-col v-for="c in configuraciones" :key="c.clave" cols="12" sm="6">
            <v-text-field
              v-model="c.valor"
              :label="c.descripcion ?? c.clave"
              :type="c.tipo === 'ENTERO' ? 'number' : c.tipo === 'SECRETO' ? 'password' : 'text'"
              :placeholder="c.tipo === 'SECRETO' ? 'Dejar vacío para no cambiar' : undefined"
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

    <v-card class="pa-4 mb-6">
      <div class="text-subtitle-1 text-titulo mb-2">Probar envío de correo</div>
      <div class="text-body-2 text-grey mb-4">
        Envía un correo de prueba con las credenciales SMTP guardadas arriba, para confirmar que funcionan.
      </div>
      <div class="d-flex flex-wrap ga-4 align-center">
        <v-text-field
          v-model="correoPrueba"
          label="Correo de destino"
          type="email"
          style="max-width: 320px"
          hide-details
        />
        <v-btn :loading="enviandoPrueba" :disabled="!correoPrueba" @click="enviarCorreoPrueba">
          Probar envío
        </v-btn>
      </div>
    </v-card>

    <v-card class="pa-4">
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <div class="text-subtitle-1 text-titulo">Unidad Impositiva Tributaria (UIT)</div>
          <div class="text-body-2 text-grey">Valor anual de la UIT usado para calcular límites normativos.</div>
        </div>
        <v-btn prepend-icon="mdi-plus" size="small" @click="abrirNuevoUit">Agregar año</v-btn>
      </div>

      <v-progress-circular v-if="cargandoUit" indeterminate color="primary" />
      <v-table v-else density="comfortable">
        <thead>
          <tr>
            <th>Año</th>
            <th>Valor (S/)</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in uits" :key="u.uit_id">
            <td>{{ u.anio }}</td>
            <td>S/ {{ Number(u.valor).toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</td>
            <td>
              <v-chip :color="u.vigente ? 'success' : 'grey'">
                {{ u.vigente ? 'Vigente' : 'Inactivo' }}
              </v-chip>
            </td>
            <td class="text-end">
              <v-btn variant="text" size="small" @click="abrirEditarUit(u)">Editar</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="uitAbierto" max-width="400">
      <v-card>
        <v-card-title class="text-titulo">{{ uitEditando ? 'Editar UIT' : 'Nuevo valor de UIT' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="uitForm.anio"
            label="Año"
            type="number"
            :disabled="!!uitEditando"
            :error-messages="erroresUit.anio"
            class="mb-2"
          />
          <v-text-field
            v-model.number="uitForm.valor"
            label="Valor (S/)"
            type="number"
            step="50"
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
  </v-container>
</template>
