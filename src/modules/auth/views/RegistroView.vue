<script setup lang="ts">
// B2 — Registro de proveedor (05B). 4 pasos.
//
// DESVIACIÓN DOCUMENTADA (05C §"FASE 3"): no existía ningún endpoint público
// para listar rubros (solo `GET /admin/rubros`, protegido por
// `administracion.catalogos`), lo que bloqueaba por completo el registro. Se
// agregó `GET /publico/rubros` (`PublicoController::rubros`, solo lectura,
// mismo shape que el admin) con autorización explícita del usuario — única
// modificación al backend en todo el proyecto frontend.
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'

import { authApi } from '@/api/auth.api'
import { publicoApi } from '@/api/publico.api'
import BaseCaptcha from '@/components/base/BaseCaptcha.vue'
import { useCaptcha } from '@/composables/useCaptcha'
import type { OrigenDatos, TipoDocumentoCodigo, TipoPersona } from '@/modules/auth/auth.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import { useAuthStore } from '@/stores/auth.store'
import { email as reglaEmail, maxLongitud, requerido } from '@/utils/validaciones'

// Estructura de pasos: una sola fuente para el menú lateral, el encabezado
// móvil, el título del formulario y el panel de ayuda.
const pasos = [
  {
    n: 1,
    titulo: 'Identificación',
    descripcion: 'Verifique su RUC para empezar.',
    icono: 'mdi-card-account-details-outline',
    ayuda: [
      'Por ahora el registro es solo con RUC (persona jurídica o natural con negocio).',
      'Si SUNAT no responde, puede completar los datos manualmente.',
      'El captcha evita registros automatizados; se renueva si falla.',
    ],
  },
  {
    n: 2,
    titulo: 'Contacto',
    descripcion: 'Indique cómo comunicarnos con usted.',
    icono: 'mdi-email-outline',
    ayuda: [
      'Use un correo que revise seguido: ahí llegan las notificaciones de sus postulaciones.',
      'La persona de contacto es quien la entidad puede llamar por el proceso.',
    ],
  },
  {
    n: 3,
    titulo: 'Rubros',
    descripcion: 'Elija en qué puede ofertar.',
    icono: 'mdi-tag-multiple-outline',
    ayuda: [
      'Elija todos los rubros en los que realmente puede ofertar.',
      'Solo verá convocatorias de los rubros que seleccione; podrá editarlos después desde «Mis datos».',
    ],
  },
  {
    n: 4,
    titulo: 'Seguridad',
    descripcion: 'Cree su contraseña y envíe el registro.',
    icono: 'mdi-shield-lock-outline',
    ayuda: [
      'Use una contraseña de al menos 8 caracteres, combinando mayúsculas, números y símbolos.',
      'Al enviar, su cuenta queda activa de inmediato; no necesita confirmar por correo.',
    ],
  },
]

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const router = useRouter()
const auth = useAuthStore()

const nombreApp = import.meta.env.VITE_APP_NOMBRE || 'Compras La Perla'
const paso = ref(1)
const pasoActual = computed(() => pasos[paso.value - 1])

// Solo se puede volver a pasos ya completados.
function irAPaso(n: number) {
  if (n < paso.value) paso.value = n
}

// --- Paso 1 · Identificación ---------------------------------------------
const captchaRuc = useCaptcha()
const longitudPorTipo: Record<TipoDocumentoCodigo, number> = { RUC: 11, DNI: 8, CE: 9 }
// Solo RUC está habilitado por ahora (05C hardening, pedido explícito): DNI/CE
// quedan visibles mostrando el alcance del catálogo pero deshabilitados.
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
const itemsServicios = computed(() => rubrosServicios.value.map((r) => ({ title: r.nombre, value: r.rubro_id })))
const itemsBienes = computed(() => rubrosBienes.value.map((r) => ({ title: r.nombre, value: r.rubro_id })))
const totalRubros = computed(() => rubrosServiciosSel.value.length + rubrosBienesSel.value.length)
const paso3Valido = computed(() => totalRubros.value > 0)

onMounted(async () => {
  cargandoRubros.value = true
  try {
    const data = await publicoApi.rubros()
    rubros.value = data.items
  } finally {
    cargandoRubros.value = false
  }
})

// Esta pantalla tiene un diseño fijo en modo claro (fondos/texto en hex, no
// en tokens de tema): en modo oscuro el v-card del formulario pasa a fondo
// oscuro pero el texto se queda con los mismos hex claros, ilegible. Se
// fuerza el tema global a "claro" mientras se está aquí (pedido explícitamente
// por el usuario) y se restaura el que había al salir — igual que en LoginView.vue.
const theme = useTheme()
const temaAnterior = theme.global.name.value
theme.global.name.value = 'claro'
onUnmounted(() => {
  theme.global.name.value = temaAnterior
})

// --- Paso 4 · Seguridad ------------------------------------------------------
const captchaRegistro = useCaptcha()
const seguridad = reactive({ password: '', password_confirmation: '' })
const verPassword = ref(false)
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
const paso4Valido = computed(
  () =>
    !!seguridad.password &&
    seguridad.password.length >= 8 &&
    !!seguridad.password_confirmation &&
    passwordsCoinciden.value &&
    !!captchaRegistro.respuesta.value,
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
  <div class="registro">
    <!-- Panel lateral (escritorio): marca, pasos y ayuda del paso actual -->
    <aside class="lateral d-none d-md-flex">
      <div class="lateral__interno">
        <router-link to="/" class="marca" aria-label="Volver al inicio">
          <!--<img src="/escudo.png" alt="" class="marca__escudo" />-->
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
        </router-link>

        <div class="lateral__plataforma">{{ nombreApp }}</div>

        <ol class="lista-pasos" aria-label="Progreso del registro">
          <li v-for="p in pasos" :key="p.n">
            <button
              type="button"
              class="item-paso"
              :class="{
                'item-paso--activo': p.n === paso,
                'item-paso--hecho': p.n < paso,
              }"
              :disabled="p.n >= paso"
              :aria-current="p.n === paso ? 'step' : undefined"
              @click="irAPaso(p.n)"
            >
              <span class="item-paso__marca">
                <v-icon v-if="p.n < paso" icon="mdi-check" size="16" />
                <template v-else>{{ p.n }}</template>
              </span>
              <span class="item-paso__textos">
                <span class="item-paso__titulo">{{ p.titulo }}</span>
                <span class="item-paso__desc">{{ p.descripcion }}</span>
              </span>
            </button>
          </li>
        </ol>

        <div class="ayuda">
          <div class="ayuda__titulo">
            <v-icon icon="mdi-lightbulb-on-outline" size="18" />
            Para este paso
          </div>
          <ul class="ayuda__lista">
            <li v-for="punto in pasoActual.ayuda" :key="punto">{{ punto }}</li>
          </ul>
        </div>
      </div>
    </aside>

    <!-- Contenido -->
    <main class="contenido">
      <!-- Encabezado móvil -->
      <header class="movil d-md-none">
        <router-link to="/" class="marca" aria-label="Volver al inicio">
          <!--<img src="/escudo.png" alt="" class="marca__escudo" />-->
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
        </router-link>
        <div class="movil__progreso">
          <span>Paso {{ paso }} de {{ pasos.length }} · {{ pasoActual.titulo }}</span>
          <v-progress-linear
            :model-value="(paso / pasos.length) * 100"
            color="#e3a928"
            bg-color="white"
            bg-opacity="0.25"
            height="4"
            rounded
          />
        </div>
      </header>

      <div class="contenido__centro">
        <v-card class="formulario" rounded="xl" elevation="2">
          <div class="formulario__cabecera">
            <div class="formulario__etiqueta">Registro de proveedor</div>
            <h1 class="formulario__titulo">{{ pasoActual.titulo }}</h1>
            <p class="formulario__sub">{{ pasoActual.descripcion }}</p>
          </div>

          <v-window v-model="paso" :touch="false" class="formulario__cuerpo">
            <!-- Paso 1 -->
            <v-window-item :value="1">
              <v-alert v-if="errorPaso1" type="error" density="compact" variant="tonal" class="mb-4">
                {{ errorPaso1 }}
              </v-alert>

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
                  class="mb-2"
                  @recargar="captchaRuc.recargar"
                />
                <div class="acciones acciones--fin">
                  <v-btn
                    class="btn-principal"
                    :loading="consultando"
                    :disabled="!paso1Valido"
                    append-icon="mdi-magnify"
                    @click="consultarRuc"
                  >
                    Consultar RUC
                  </v-btn>
                </div>
              </template>

              <template v-else>
                <v-alert
                  :type="datosPrecargados.origen === 'SUNAT' ? 'success' : 'info'"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  {{
                    datosPrecargados.origen === 'SUNAT'
                      ? 'Datos obtenidos de SUNAT. Revíselos antes de continuar.'
                      : 'SUNAT no está disponible. Complete los datos manualmente.'
                  }}
                </v-alert>
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
                />
                <div class="acciones">
                  <v-btn class="btn-secundario" variant="text" prepend-icon="mdi-arrow-left" @click="cambiarDocumento">
                    Cambiar documento
                  </v-btn>
                  <v-btn
                    class="btn-principal"
                    :disabled="!datosPrecargados.razon_social"
                    append-icon="mdi-arrow-right"
                    @click="paso = 2"
                  >
                    Continuar
                  </v-btn>
                </div>
              </template>
            </v-window-item>

            <!-- Paso 2 -->
            <v-window-item :value="2">
              <v-text-field
                v-model="datos.correo"
                label="Correo electrónico"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                :maxlength="120"
                :rules="[requerido(), reglaEmail()]"
                class="mb-2"
              />
              <v-text-field
                v-model="datos.telefono"
                label="Teléfono"
                prepend-inner-icon="mdi-phone-outline"
                :maxlength="9"
                counter="9"
                inputmode="numeric"
                :rules="[requerido(), reglaTelefono]"
                class="mb-2"
              />
              <v-text-field
                v-model="datos.persona_contacto"
                label="Persona de contacto"
                prepend-inner-icon="mdi-account-outline"
                :maxlength="100"
                counter="100"
                :rules="[requerido(), maxLongitud(100)]"
              />
              <div class="acciones">
                <v-btn class="btn-secundario" variant="text" prepend-icon="mdi-arrow-left" @click="paso = 1">Atrás</v-btn>
                <v-btn class="btn-principal" :disabled="!paso2Valido" append-icon="mdi-arrow-right" @click="paso = 3">
                  Continuar
                </v-btn>
              </div>
            </v-window-item>

            <!-- Paso 3 -->
            <v-window-item :value="3">
              <v-progress-linear v-if="cargandoRubros" indeterminate color="primary" class="mb-4" />
              <template v-else>
                <v-autocomplete
                  v-model="rubrosServiciosSel"
                  :items="itemsServicios"
                  label="Servicios"
                  multiple
                  chips
                  closable-chips
                  :chip-props="{ color: 'primary', variant: 'tonal' }"
                  class="mb-2"
                />
                <v-autocomplete
                  v-model="rubrosBienesSel"
                  :items="itemsBienes"
                  label="Bienes"
                  multiple
                  chips
                  closable-chips
                  :chip-props="{ color: 'primary', variant: 'tonal' }"
                  hint="Puede elegir varios en cada lista."
                  persistent-hint
                />
              </template>
              <div class="resumen-rubros" :class="{ 'resumen-rubros--vacio': !totalRubros }">
                <v-icon :icon="totalRubros ? 'mdi-check-circle-outline' : 'mdi-information-outline'" size="18" />
                {{
                  totalRubros
                    ? `${totalRubros} ${totalRubros === 1 ? 'rubro seleccionado' : 'rubros seleccionados'}`
                    : 'Seleccione al menos un rubro (servicio o bien) para continuar.'
                }}
              </div>
              <div class="acciones">
                <v-btn class="btn-secundario" variant="text" prepend-icon="mdi-arrow-left" @click="paso = 2">Atrás</v-btn>
                <v-btn class="btn-principal" :disabled="!paso3Valido" append-icon="mdi-arrow-right" @click="paso = 4">
                  Continuar
                </v-btn>
              </div>
            </v-window-item>

            <!-- Paso 4 -->
            <v-window-item :value="4">
              <v-alert v-if="errorGeneral" type="error" density="compact" variant="tonal" class="mb-4">
                {{ errorGeneral }}
              </v-alert>

              <v-text-field
                v-model="seguridad.password"
                label="Contraseña"
                :type="verPassword ? 'text' : 'password'"
                :append-inner-icon="verPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :maxlength="70"
                :rules="[requerido(), (v: string) => v.length >= 8 || 'Mínimo 8 caracteres.']"
                :error-messages="erroresPaso4.password"
                autocomplete="new-password"
                class="mb-1"
                @click:append-inner="verPassword = !verPassword"
              />
              <div v-if="seguridad.password" class="fortaleza mb-3">
                <v-progress-linear
                  :model-value="(fortaleza / 5) * 100"
                  :color="fortalezaColores[fortaleza]"
                  height="4"
                  rounded
                />
                <span class="fortaleza__texto">Seguridad: {{ fortalezaTextos[fortaleza] }}</span>
              </div>
              <v-text-field
                v-model="seguridad.password_confirmation"
                label="Confirmar contraseña"
                :type="verPassword ? 'text' : 'password'"
                :maxlength="70"
                :rules="[requerido()]"
                :error-messages="passwordsCoinciden ? [] : ['Las contraseñas no coinciden']"
                autocomplete="new-password"
                class="mb-2"
              />

              <BaseCaptcha
                v-model:respuesta="captchaRegistro.respuesta.value"
                :imagen="captchaRegistro.imagen.value"
                :cargando="captchaRegistro.cargando.value"
                :error-messages="erroresPaso4.captcha"
                @recargar="captchaRegistro.recargar"
              />

              <div class="acciones">
                <v-btn class="btn-secundario" variant="text" prepend-icon="mdi-arrow-left" @click="paso = 3">Atrás</v-btn>
                <v-btn
                  class="btn-principal"
                  :loading="enviando"
                  :disabled="!paso4Valido"
                  append-icon="mdi-check"
                  @click="enviar"
                >
                  Crear mi cuenta
                </v-btn>
              </div>
            </v-window-item>
          </v-window>

          <div class="formulario__pie">
            ¿Ya tiene cuenta?
            <router-link to="/login" class="enlace">Iniciar sesión</router-link>
          </div>
        </v-card>

        <router-link to="/" class="volver">
          <v-icon icon="mdi-arrow-left" size="16" />
          Volver a las convocatorias
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
/*
  Paleta institucional aproximada (ajustar con los valores exactos del
  escudo). Conviene moverla al tema de Vuetify para no repetirla.
*/
.registro {
  --lp-azul-900: #0a2c52;
  --lp-azul-700: #0f3d6b;
  --lp-azul-500: #1f6fb2;
  --lp-dorado: #e3a928;
  --lp-fondo: #f4f7fb;
  --lp-tinta: #14233a;
  --lp-tinta-suave: #5a6b82;
  --lp-borde: #dbe3ee;

  display: grid;
  grid-template-columns: minmax(340px, 5fr) 7fr;
  min-height: 100vh;
  background: var(--lp-fondo);
  color: var(--lp-tinta);
}

/* ---------- Marca ---------- */
.marca {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  text-decoration: none;
}
.marca__escudo {
  height: 44px;
  width: auto;
}
.marca__texto {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.marca__linea {
  font-size: 0.72rem;
  opacity: 0.8;
}
.marca__nombre {
  font-size: 1.3rem;
  font-weight: 700;
}

/* ---------- Panel lateral ---------- */
.lateral {
  position: sticky;
  top: 0;
  height: 100vh;
  align-items: stretch;
  background:
    radial-gradient(520px 320px at 100% 0%, rgba(31, 111, 178, 0.5), transparent 70%),
    linear-gradient(180deg, var(--lp-azul-700) 0%, var(--lp-azul-900) 100%);
  color: #fff;
  border-right: 4px solid var(--lp-dorado);
}
.lateral__interno {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  margin-inline: auto;
  padding: 40px 32px;
  overflow-y: auto;
}
.lateral__plataforma {
  margin-top: 16px;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
}

.lista-pasos {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  position: relative;
}
.lista-pasos li {
  position: relative;
}
/* línea vertical que une los pasos */
.lista-pasos li:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 15px;
  top: 40px;
  bottom: -4px;
  width: 2px;
  background: rgba(255, 255, 255, 0.2);
}
.item-paso {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 6px 0 20px;
  background: none;
  border: 0;
  text-align: left;
  color: rgba(255, 255, 255, 0.6);
  cursor: default;
  font: inherit;
}
.item-paso--hecho {
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}
.item-paso--hecho:hover .item-paso__titulo {
  text-decoration: underline;
}
.item-paso--activo {
  color: #fff;
}
.item-paso:focus-visible {
  outline: 2px solid var(--lp-dorado);
  outline-offset: 2px;
  border-radius: 8px;
}
.item-paso__marca {
  flex: 0 0 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--lp-azul-900);
  position: relative;
  z-index: 1;
}
.item-paso--hecho .item-paso__marca {
  background: rgba(255, 255, 255, 0.16);
  border-color: transparent;
}
.item-paso--activo .item-paso__marca {
  background: var(--lp-dorado);
  border-color: var(--lp-dorado);
  color: var(--lp-azul-900);
}
.item-paso__textos {
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}
.item-paso__titulo {
  font-weight: 600;
  font-size: 1rem;
}
.item-paso__desc {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-top: 2px;
}

.ayuda {
  margin-top: auto;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.ayuda__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 8px;
  color: var(--lp-dorado);
}
.ayuda__lista {
  margin: 0;
  padding-left: 18px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}
.ayuda__lista li + li {
  margin-top: 6px;
}

/* ---------- Encabezado móvil ---------- */
.movil {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 16px 14px;
  background: var(--lp-azul-900);
  border-bottom: 3px solid var(--lp-dorado);
  color: #fff;
}
.movil .marca__escudo {
  height: 34px;
}
.movil__progreso {
  margin-top: 10px;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ---------- Formulario ---------- */
.contenido {
  min-width: 0;
}
.contenido__centro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
}
.formulario {
  width: 100%;
  max-width: 560px;
  border: 1px solid var(--lp-borde);
  overflow: hidden;
}
.formulario__cabecera {
  padding: 28px 32px 8px;
}
.formulario__etiqueta {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--lp-azul-500);
}
.formulario__titulo {
  margin: 4px 0 4px;
  font-size: 1.6rem;
  line-height: 1.2;
  font-weight: 700;
  color: var(--lp-azul-900);
}
.formulario__sub {
  margin: 0;
  color: var(--lp-tinta-suave);
}
.formulario__cuerpo {
  padding: 20px 32px 8px;
}
.formulario__pie {
  padding: 16px 32px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--lp-tinta-suave);
  background: var(--lp-fondo);
  border-top: 1px solid var(--lp-borde);
}
.enlace {
  color: var(--lp-azul-500);
  font-weight: 600;
}

.volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: 0.9rem;
  color: var(--lp-tinta-suave);
  text-decoration: none;
}
.volver:hover {
  color: var(--lp-azul-500);
}

/* ---------- Acciones ---------- */
.acciones {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-bottom: 12px;
}
.acciones--fin {
  justify-content: flex-end;
}
.btn-principal {
  background: var(--lp-azul-700) !important;
  color: #fff !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  padding-inline: 24px;
}
.btn-principal.v-btn--disabled {
  opacity: 0.45;
}
.btn-principal:hover {
  background: var(--lp-azul-500) !important;
}
.btn-secundario {
  text-transform: none;
  letter-spacing: 0;
  color: var(--lp-tinta-suave);
}

/* ---------- Detalles de pasos ---------- */
.resumen-rubros {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  background: #e8f1fa;
  color: var(--lp-azul-700);
}
.resumen-rubros--vacio {
  background: #fff6e0;
  color: #7a5a00;
}
.fortaleza__texto {
  font-size: 0.8rem;
  color: var(--lp-tinta-suave);
}

/* ---------- Responsive ---------- */
@media (max-width: 959px) {
  .registro {
    display: block;
  }
  .contenido__centro {
    min-height: calc(100vh - 100px);
    justify-content: flex-start;
    padding: 20px 12px 32px;
  }
  .formulario__cabecera {
    padding: 24px 20px 4px;
  }
  .formulario__cuerpo {
    padding: 16px 20px 4px;
  }
  .formulario__pie {
    padding-inline: 20px;
  }
}
@media (max-width: 400px) {
  .acciones {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>