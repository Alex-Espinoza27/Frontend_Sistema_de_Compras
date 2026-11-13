<script setup lang="ts">
// B2 — Registro de proveedor (05B). Stepper de 4 pasos.
//
// DESVIACIÓN DOCUMENTADA (05C §"FASE 3"): no existía ningún endpoint público
// para listar rubros (solo `GET /admin/rubros`, protegido por
// `administracion.catalogos`), lo que bloqueaba por completo el registro. Se
// agregó `GET /publico/rubros` (`PublicoController::rubros`, solo lectura,
// mismo shape que el admin) con autorización explícita del usuario — única
// modificación al backend en todo el proyecto frontend.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { authApi } from '@/api/auth.api'
import { publicoApi } from '@/api/publico.api'
import BaseCaptcha from '@/components/base/BaseCaptcha.vue'
import { useCaptcha } from '@/composables/useCaptcha'
import type { OrigenDatos, TipoDocumentoCodigo, TipoPersona } from '@/modules/auth/auth.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import { useAuthStore } from '@/stores/auth.store'
import { email as reglaEmail, maxLongitud, requerido } from '@/utils/validaciones'

// Panel de ayuda persistente (05C hardening, pedido explícitamente por el
// usuario): antes no había ninguna indicación lateral; al cambiar de paso el
// área de contenido reemplazaba todo. Esto vive FUERA del stepper, así que
// no desaparece entre pasos — solo cambia su contenido según `paso`.
const ayudaPorPaso: Record<number, { icono: string; titulo: string; puntos: string[] }> = {
  1: {
    icono: 'mdi-card-account-details-outline',
    titulo: 'Identifícate',
    puntos: [
      'Por ahora el registro es solo con RUC (persona jurídica o natural con negocio).',
      'Si SUNAT no responde, puedes completar los datos manualmente.',
      'El captcha evita registros automatizados — se renueva si falla.',
    ],
  },
  2: {
    icono: 'mdi-card-text-outline',
    titulo: 'Datos de contacto',
    puntos: [
      'Usa un correo que revises seguido: ahí llegan las notificaciones de tus postulaciones.',
      'La persona de contacto es quien la entidad puede contactar por el proceso.',
    ],
  },
  3: {
    icono: 'mdi-tag-multiple-outline',
    titulo: 'Rubros',
    puntos: [
      'Elige todos los rubros en los que realmente puedes ofertar.',
      'Solo verás convocatorias de los rubros que selecciones aquí — podrás editarlos después desde "Mis datos".',
    ],
  },
  4: {
    icono: 'mdi-shield-lock-outline',
    titulo: 'Seguridad',
    puntos: [
      'Usa una contraseña de al menos 8 caracteres, combinando mayúsculas, números y símbolos.',
      'Al enviar, tu cuenta queda activa de inmediato — no necesitas confirmar por correo.',
    ],
  },
}

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const router = useRouter()
const auth = useAuthStore()

const nombreApp = import.meta.env.VITE_APP_NOMBRE
const paso = ref(1)

// --- Paso 1 · Identificación ---------------------------------------------
const captchaRuc = useCaptcha()
const longitudPorTipo: Record<TipoDocumentoCodigo, number> = { RUC: 11, DNI: 8, CE: 9 }
// Solo RUC está habilitado por ahora (05C hardening, pedido explícito): el
// registro de proveedor es de personas jurídicas/RUC, DNI/CE quedan visibles
// mostrando el alcance del catálogo pero deshabilitados hasta que se habilite
// ese flujo.
const opcionesTipoDocumento = [
  { title: 'RUC (11 dígitos)', value: 'RUC' as TipoDocumentoCodigo },
  { title: 'DNI (8 dígitos) — próximamente', value: 'DNI' as TipoDocumentoCodigo, disabled: true },
  { title: 'Carné de extranjería (9 dígitos) — próximamente', value: 'CE' as TipoDocumentoCodigo, disabled: true },
]

const identificacion = reactive({
  tipo_documento: 'RUC' as TipoDocumentoCodigo,
  numero_documento: '',
})
const consultando = ref(false)
const errorPaso1 = ref('')
const erroresPaso1 = ref<Record<string, string[]>>({})
const yaConsultado = ref(false)

function reglaLongitudDocumento(valor: unknown) {
  const longitud = longitudPorTipo[identificacion.tipo_documento]
  if (!valor) return true
  return String(valor).length === longitud || `Debe tener ${longitud} dígitos.`
}
function reglaSoloDigitos(valor: unknown) {
  if (!valor) return true
  return /^\d+$/.test(String(valor)) || 'Solo se aceptan números.'
}
const paso1Valido = computed(() => {
  const numero = identificacion.numero_documento
  return !!numero && reglaSoloDigitos(numero) === true && reglaLongitudDocumento(numero) === true && !!captchaRuc.respuesta.value
})

const datosPrecargados = reactive({
  razon_social: '',
  tipo_persona: 'JURIDICA' as TipoPersona,
  estado_sunat: null as string | null,
  origen: 'MANUAL' as OrigenDatos,
})

async function consultarRuc() {
  errorPaso1.value = ''
  erroresPaso1.value = {}
  consultando.value = true
  try {
    const data = await authApi.consultarRuc({
      numero_documento: identificacion.numero_documento,
      captcha: captchaRuc.valor.value,
    })
    datosPrecargados.razon_social = data.razon_social
    datosPrecargados.tipo_persona = data.tipo_persona
    datosPrecargados.estado_sunat = data.estado_sunat
    datosPrecargados.origen = data.origen
    yaConsultado.value = true
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 409 || status === 422) {
      errorPaso1.value = error.response?.data?.mensaje ?? ''
      erroresPaso1.value = error.response?.data?.errores ?? {}
    }
    await captchaRuc.recargar()
  } finally {
    consultando.value = false
  }
}

function cambiarDocumento() {
  yaConsultado.value = false
}

// --- Paso 2 · Datos --------------------------------------------------------
const datos = reactive({ correo: '', telefono: '', persona_contacto: '' })
function reglaTelefono(valor: unknown) {
  if (!valor) return true
  return /^\d{6,9}$/.test(String(valor)) || 'Ingrese un teléfono válido (6 a 9 dígitos).'
}
const paso2Valido = computed(
  () =>
    !!datos.correo &&
    reglaEmail()(datos.correo) === true &&
    !!datos.telefono &&
    reglaTelefono(datos.telefono) === true &&
    !!datos.persona_contacto,
)

// --- Paso 3 · Rubros ---------------------------------------------------------
const rubros = ref<RubroPublico[]>([])
const cargandoRubros = ref(false)
const rubrosServiciosSel = ref<number[]>([])
const rubrosBienesSel = ref<number[]>([])
const rubrosServicios = computed(() => rubros.value.filter((r) => r.tipo === 'SERVICIO'))
const rubrosBienes = computed(() => rubros.value.filter((r) => r.tipo === 'BIEN'))
const paso3Valido = computed(() => rubrosServiciosSel.value.length > 0 || rubrosBienesSel.value.length > 0)

onMounted(async () => {
  cargandoRubros.value = true
  try {
    const data = await publicoApi.rubros()
    rubros.value = data.items
  } finally {
    cargandoRubros.value = false
  }
})

// --- Paso 4 · Seguridad ------------------------------------------------------
const captchaRegistro = useCaptcha()
const seguridad = reactive({ password: '', password_confirmation: '' })
const enviando = ref(false)
const errorGeneral = ref('')
const erroresPaso4 = ref<Record<string, string[]>>({})

const fortaleza = computed(() => {
  let puntos = 0
  if (seguridad.password.length >= 8) puntos++
  if (seguridad.password.length >= 12) puntos++
  if (/[a-z]/.test(seguridad.password) && /[A-Z]/.test(seguridad.password)) puntos++
  if (/[0-9]/.test(seguridad.password)) puntos++
  if (/[^A-Za-z0-9]/.test(seguridad.password)) puntos++
  return puntos
})
const fortalezaTextos = ['Muy débil', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte']
const fortalezaColores = ['error', 'error', 'warning', 'warning', 'success', 'success']
const passwordsCoinciden = computed(
  () => !seguridad.password_confirmation || seguridad.password === seguridad.password_confirmation,
)

async function enviar() {
  errorGeneral.value = ''
  erroresPaso4.value = {}
  enviando.value = true
  try {
    const data = await authApi.registro({
      numero_documento: identificacion.numero_documento,
      tipo_documento: identificacion.tipo_documento,
      razon_social: datosPrecargados.razon_social,
      tipo_persona: datosPrecargados.tipo_persona,
      correo: datos.correo,
      telefono: datos.telefono,
      persona_contacto: datos.persona_contacto,
      rubros_servicios: rubrosServiciosSel.value,
      rubros_bienes: rubrosBienesSel.value,
      password: seguridad.password,
      password_confirmation: seguridad.password_confirmation,
      captcha: captchaRegistro.valor.value,
      origen: datosPrecargados.origen,
    })
    auth.aplicarSesion(data)
    router.push('/app/convocatorias-abiertas')
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 409 || status === 422) {
      errorGeneral.value = error.response?.data?.mensaje ?? ''
      erroresPaso4.value = error.response?.data?.errores ?? {}
    }
    await captchaRegistro.recargar()
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <v-row no-gutters class="registro-wrap">
    <!-- Panel de ayuda — persistente, no vive dentro del stepper (05C hardening) -->
    <v-col cols="12" md="5" lg="4" class="d-none d-md-flex panel-ayuda">
      <div class="ayuda-contenido">
        <div class="d-flex align-center ga-3 mb-8">
          <v-avatar color="primary" size="40" rounded="lg">
            <v-icon icon="mdi-file-document-check-outline" size="24" />
          </v-avatar>
          <span class="text-subtitle-1 font-weight-bold text-titulo">{{ nombreApp }}</span>
        </div>

        <v-avatar color="primary" variant="tonal" size="56" rounded="lg" class="mb-4">
          <v-icon :icon="ayudaPorPaso[paso].icono" color="primary" size="28" />
        </v-avatar>
        <h2 class="text-h5 text-titulo font-weight-bold mb-4">{{ ayudaPorPaso[paso].titulo }}</h2>

        <v-card
          v-for="punto in ayudaPorPaso[paso].puntos"
          :key="punto"
          variant="tonal"
          color="primary"
          class="pa-3 mb-3 text-body-2"
        >
          {{ punto }}
        </v-card>

        <div class="d-flex ga-2 mt-8">
          <div
            v-for="n in 4"
            :key="n"
            class="paso-punto"
            :class="{ 'paso-punto--activo': n <= paso }"
          />
        </div>
      </div>
    </v-col>

    <!-- Formulario -->
    <v-col cols="12" md="7" lg="8" class="panel-form d-flex align-center justify-center">
      <v-card class="rounded-lg" width="100%" max-width="560" elevation="3">
        <v-card-title class="pa-5 text-h6 text-titulo font-weight-bold">Registro de proveedor</v-card-title>
        <v-divider />

        <v-stepper v-model="paso" flat>
          <v-stepper-header>
            <v-stepper-item title="Identificación" :value="1" :complete="paso > 1" />
            <v-divider />
            <v-stepper-item title="Datos" :value="2" :complete="paso > 2" />
            <v-divider />
            <v-stepper-item title="Rubros" :value="3" :complete="paso > 3" />
            <v-divider />
            <v-stepper-item title="Seguridad" :value="4" :complete="paso > 4" />
          </v-stepper-header>

          <v-stepper-window>
          <v-stepper-window-item :value="1">
            <div class="pa-5">
            <v-alert v-if="errorPaso1" type="error" density="compact" class="mb-4">{{ errorPaso1 }}</v-alert>

            <template v-if="!yaConsultado">
              <v-select
                v-model="identificacion.tipo_documento"
                :items="opcionesTipoDocumento"
                item-props
                label="Tipo de documento"
                class="mb-2"
              />
              <v-text-field
                v-model="identificacion.numero_documento"
                label="Número de documento"
                :maxlength="longitudPorTipo[identificacion.tipo_documento]"
                :counter="longitudPorTipo[identificacion.tipo_documento]"
                :rules="[requerido(), reglaSoloDigitos, reglaLongitudDocumento]"
                :error-messages="erroresPaso1.numero_documento"
                inputmode="numeric"
                class="mb-2"
              />
              <BaseCaptcha
                v-model:respuesta="captchaRuc.respuesta.value"
                :imagen="captchaRuc.imagen.value"
                :cargando="captchaRuc.cargando.value"
                :error-messages="erroresPaso1.captcha"
                class="mb-4"
                @recargar="captchaRuc.recargar"
              />
              <div class="d-flex justify-end">
                <v-btn
                  color="primary"
                  variant="flat"
                  elevation="2"
                  class="px-6"
                  :loading="consultando"
                  :disabled="!paso1Valido"
                  @click="consultarRuc"
                >
                  Consultar
                </v-btn>
              </div>
            </template>

            <template v-else>
              <v-chip
                :color="datosPrecargados.origen === 'SUNAT' ? 'success' : 'grey'"
                variant="tonal"
                size="small"
                class="mb-4"
              >
                {{ datosPrecargados.origen === 'SUNAT' ? 'Datos obtenidos de SUNAT' : 'SUNAT no disponible — ingreso manual' }}
              </v-chip>
              <v-text-field
                v-model="datosPrecargados.razon_social"
                label="Razón social / nombre"
                :maxlength="200"
                counter="200"
                :rules="[requerido()]"
                class="mb-2"
              />
              <v-select
                v-model="datosPrecargados.tipo_persona"
                :items="[
                  { title: 'Persona jurídica', value: 'JURIDICA' },
                  { title: 'Persona natural', value: 'NATURAL' },
                ]"
                label="Tipo de persona"
                :rules="[requerido()]"
                class="mb-4"
              />
              <div class="d-flex justify-space-between">
                <v-btn variant="outlined" color="secondary" class="px-5" @click="cambiarDocumento">Cambiar documento</v-btn>
                <v-btn
                  color="primary"
                  variant="flat"
                  elevation="2"
                  class="px-6"
                  :disabled="!datosPrecargados.razon_social"
                  @click="paso = 2"
                >
                  Continuar
                </v-btn>
              </div>
            </template>
            </div>
          </v-stepper-window-item>

          <!-- Paso 2 -->
          <v-stepper-window-item :value="2">
            <div class="pa-5">
            <v-text-field
              v-model="datos.correo"
              label="Correo electrónico"
              type="email"
              :maxlength="120"
              :rules="[requerido(), reglaEmail()]"
              class="mb-2"
            />
            <v-text-field
              v-model="datos.telefono"
              label="Teléfono"
              :maxlength="9"
              counter="9"
              inputmode="numeric"
              :rules="[requerido(), reglaTelefono]"
              class="mb-2"
            />
            <v-text-field
              v-model="datos.persona_contacto"
              label="Persona de contacto"
              :maxlength="100"
              counter="100"
              :rules="[requerido(), maxLongitud(100)]"
              class="mb-4"
            />
            <div class="d-flex justify-space-between">
              <v-btn variant="outlined" color="secondary" class="px-5" @click="paso = 1">Atrás</v-btn>
              <v-btn color="primary" variant="flat" elevation="2" class="px-6" :disabled="!paso2Valido" @click="paso = 3">
                Continuar
              </v-btn>
            </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 3 -->
          <v-stepper-window-item :value="3">
            <div class="pa-5">
            <p class="text-body-2 text-grey mb-4">
              Selecciona al menos un rubro (servicio o bien) en el que ofreces tus productos o servicios.
            </p>
            <v-progress-circular v-if="cargandoRubros" indeterminate color="primary" class="mb-4" />
            <template v-else>
              <v-autocomplete
                v-model="rubrosServiciosSel"
                :items="rubrosServicios.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
                label="Servicios"
                multiple
                chips
                closable-chips
                :chip-props="{ color: 'primary', variant: 'tonal' }"
                class="mb-2"
              />
              <v-autocomplete
                v-model="rubrosBienesSel"
                :items="rubrosBienes.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
                label="Bienes"
                multiple
                chips
                closable-chips
                :chip-props="{ color: 'primary', variant: 'tonal' }"
              />
            </template>
            <div class="d-flex justify-space-between mt-4">
              <v-btn variant="outlined" color="secondary" class="px-5" @click="paso = 2">Atrás</v-btn>
              <v-btn color="primary" variant="flat" elevation="2" class="px-6" :disabled="!paso3Valido" @click="paso = 4">
                Continuar
              </v-btn>
            </div>
            </div>
          </v-stepper-window-item>

          <!-- Paso 4 -->
          <v-stepper-window-item :value="4">
            <div class="pa-5">
            <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>

            <v-text-field
              v-model="seguridad.password"
              label="Contraseña"
              type="password"
              :maxlength="70"
              :rules="[requerido(), (v: string) => v.length >= 8 || 'Mínimo 8 caracteres.']"
              :error-messages="erroresPaso4.password"
              autocomplete="new-password"
              class="mb-1"
            />
            <div v-if="seguridad.password" class="mb-3">
              <v-progress-linear
                :model-value="(fortaleza / 5) * 100"
                :color="fortalezaColores[fortaleza]"
                height="4"
                rounded
              />
              <span class="text-caption text-grey">{{ fortalezaTextos[fortaleza] }}</span>
            </div>
            <v-text-field
              v-model="seguridad.password_confirmation"
              label="Confirmar contraseña"
              type="password"
              :maxlength="70"
              :rules="[requerido()]"
              :error-messages="passwordsCoinciden ? [] : ['Las contraseñas no coinciden']"
              autocomplete="new-password"
              class="mb-4"
            />

            <BaseCaptcha
              v-model:respuesta="captchaRegistro.respuesta.value"
              :imagen="captchaRegistro.imagen.value"
              :cargando="captchaRegistro.cargando.value"
              :error-messages="erroresPaso4.captcha"
              class="mb-4"
              @recargar="captchaRegistro.recargar"
            />

            <div class="d-flex justify-space-between">
              <v-btn variant="outlined" color="secondary" class="px-5" @click="paso = 3">Atrás</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                elevation="2"
                class="px-6"
                :loading="enviando"
                :disabled="
                  !seguridad.password ||
                  seguridad.password.length < 8 ||
                  !passwordsCoinciden ||
                  !captchaRegistro.respuesta.value
                "
                @click="enviar"
              >
                Enviar
              </v-btn>
            </div>
            </div>
          </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>

        <v-divider />
        <v-card-text class="text-center pa-4">
          <v-btn variant="tonal" color="primary" rounded="pill" to="/login" class="px-6">
            Ya tengo cuenta — Iniciar sesión
          </v-btn>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.registro-wrap {
  min-height: 100vh;
}
.panel-ayuda {
  align-items: center;
  justify-content: center;
  padding: 48px;
  background:
    radial-gradient(70% 60% at 50% 0%, rgb(var(--v-theme-primary), 0.08), transparent 70%),
    rgb(var(--v-theme-surface-variant));
}
.ayuda-contenido {
  width: 100%;
  max-width: 380px;
}
.panel-form {
  min-height: 100vh;
  padding: 32px;
  background: rgb(var(--v-theme-background));
}
.paso-punto {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary), 0.25);
  transition: background-color 0.2s;
}
.paso-punto--activo {
  background: rgb(var(--v-theme-primary));
}
</style>
