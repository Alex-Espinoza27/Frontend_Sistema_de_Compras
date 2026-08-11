<script setup lang="ts">
// D5 — Mis datos (05B). Editar contacto + rubros (mismo catálogo público de
// la Fase 3, GET /publico/rubros — no hay gap nuevo). Suspender cuenta.
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { publicoApi } from '@/api/publico.api'
import { proveedoresApi } from '@/api/proveedores.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import type { MisDatosProveedor } from '@/modules/proveedor/proveedor.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import { useAuthStore } from '@/stores/auth.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const router = useRouter()
const auth = useAuthStore()

const misDatos = ref<MisDatosProveedor | null>(null)
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  misDatos.value = await proveedoresApi.misDatos()
  iniciarFormContacto()
  iniciarFormRubros()
  cargando.value = false
}

// --- Contacto ----------------------------------------------------------------
const contacto = reactive({ correo: '', telefono: '', persona_contacto: '' })
const erroresContacto = ref<Record<string, string[]>>({})
const guardandoContacto = ref(false)
const contactoGuardado = ref(false)

function iniciarFormContacto() {
  if (!misDatos.value) return
  contacto.correo = misDatos.value.correo
  contacto.telefono = misDatos.value.telefono
  contacto.persona_contacto = misDatos.value.persona_contacto
}

async function guardarContacto() {
  erroresContacto.value = {}
  contactoGuardado.value = false
  guardandoContacto.value = true
  try {
    misDatos.value = await proveedoresApi.actualizarMisDatos({ ...contacto })
    contactoGuardado.value = true
  } catch (e: unknown) {
    const error = e as ErrorApi
    erroresContacto.value = error.response?.data?.errores ?? {}
  } finally {
    guardandoContacto.value = false
  }
}

// --- Rubros --------------------------------------------------------------------
const catalogoRubros = ref<RubroPublico[]>([])
publicoApi.rubros().then((data) => (catalogoRubros.value = data.items))

const rubrosServiciosSel = ref<number[]>([])
const rubrosBienesSel = ref<number[]>([])
const guardandoRubros = ref(false)
const rubrosGuardado = ref(false)
const errorRubros = ref('')

function iniciarFormRubros() {
  if (!misDatos.value) return
  rubrosServiciosSel.value = misDatos.value.rubros_servicios.map((r) => r.rubro_id)
  rubrosBienesSel.value = misDatos.value.rubros_bienes.map((r) => r.rubro_id)
}

const rubrosServicios = computed(() => catalogoRubros.value.filter((r) => r.tipo === 'SERVICIO'))
const rubrosBienes = computed(() => catalogoRubros.value.filter((r) => r.tipo === 'BIEN'))

async function guardarRubros() {
  errorRubros.value = ''
  rubrosGuardado.value = false
  guardandoRubros.value = true
  try {
    misDatos.value = await proveedoresApi.actualizarMisRubros({
      rubros_servicios: rubrosServiciosSel.value,
      rubros_bienes: rubrosBienesSel.value,
    })
    rubrosGuardado.value = true
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorRubros.value = error.response?.data?.errores?.rubros_servicios?.[0] ?? error.response?.data?.mensaje ?? ''
  } finally {
    guardandoRubros.value = false
  }
}

// --- Suspender cuenta ------------------------------------------------------------
const suspenderAbierto = ref(false)
const suspendiendo = ref(false)
async function confirmarSuspension(motivo: string | undefined) {
  suspendiendo.value = true
  try {
    await proveedoresApi.suspender({ confirmacion: true, motivo: motivo || undefined })
    auth.limpiarSesion()
    router.push('/login')
  } finally {
    suspendiendo.value = false
  }
}

cargar()
</script>

<template>
  <v-container class="py-8" max-width="720">
    <div class="text-h5 text-titulo mb-6">Mis datos</div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <template v-else-if="misDatos">
      <v-card class="pa-4 mb-4">
        <div class="text-body-2 text-grey mb-1">{{ misDatos.numero_documento }}</div>
        <div class="text-h6 text-titulo mb-4">{{ misDatos.razon_social }}</div>

        <v-alert v-if="contactoGuardado" type="success" density="compact" class="mb-4">Datos actualizados.</v-alert>

        <v-text-field
          v-model="contacto.correo"
          label="Correo electrónico"
          type="email"
          :maxlength="120"
          :error-messages="erroresContacto.correo"
          class="mb-2"
        />
        <v-text-field
          v-model="contacto.telefono"
          label="Teléfono"
          :maxlength="20"
          :error-messages="erroresContacto.telefono"
          class="mb-2"
        />
        <v-text-field
          v-model="contacto.persona_contacto"
          label="Persona de contacto"
          :maxlength="100"
          :error-messages="erroresContacto.persona_contacto"
          class="mb-4"
        />
        <v-btn :loading="guardandoContacto" @click="guardarContacto">Guardar datos</v-btn>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="text-h6 text-titulo mb-4">Rubros</div>
        <v-alert v-if="rubrosGuardado" type="success" density="compact" class="mb-4">Rubros actualizados.</v-alert>
        <v-alert v-if="errorRubros" type="error" density="compact" class="mb-4">{{ errorRubros }}</v-alert>

        <div class="text-subtitle-2 mb-1">Servicios</div>
        <v-checkbox
          v-for="r in rubrosServicios"
          :key="r.rubro_id"
          v-model="rubrosServiciosSel"
          :label="r.nombre"
          :value="r.rubro_id"
          density="compact"
          hide-details
        />
        <div class="text-subtitle-2 mt-3 mb-1">Bienes</div>
        <v-checkbox
          v-for="r in rubrosBienes"
          :key="r.rubro_id"
          v-model="rubrosBienesSel"
          :label="r.nombre"
          :value="r.rubro_id"
          density="compact"
          hide-details
        />

        <v-btn class="mt-4" :loading="guardandoRubros" @click="guardarRubros">Guardar rubros</v-btn>
      </v-card>

      <v-card class="pa-4">
        <div class="text-h6 text-titulo mb-2">Suspender cuenta</div>
        <p class="text-body-2 text-grey mb-4">
          Al suspender tu cuenta cerrarás sesión y no podrás volver a ingresar hasta que el administrador de la
          plataforma la reactive.
        </p>
        <v-btn color="error" @click="suspenderAbierto = true">Suspender mi cuenta</v-btn>
      </v-card>
    </template>

    <BaseConfirmacion
      v-model:abierto="suspenderAbierto"
      titulo="Suspender cuenta"
      mensaje="Esta acción cerrará tu sesión de inmediato. Solo el administrador de la plataforma puede reactivar tu cuenta."
      texto-confirmar="Suspender"
      fuerte
      pedir-motivo
      :motivo-requerido="false"
      :cargando="suspendiendo"
      @confirmar="confirmarSuspension"
    />
  </v-container>
</template>
