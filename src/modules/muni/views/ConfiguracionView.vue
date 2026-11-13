<script setup lang="ts">
// Módulo de Configuración General: Parámetros del sistema, prueba SMTP y UIT por año.
import { computed, reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseArchivoUpload from '@/components/base/BaseArchivoUpload.vue'
import { useColorMarca } from '@/composables/useColorMarca'
import { useDescarga } from '@/composables/useDescarga'
import type { ConfiguracionItem, UitItem } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'
import { colorHex, rucValido } from '@/utils/validaciones'

const ui = useUiStore()
const { aplicar: aplicarColorMarca } = useColorMarca()

const tabActivo = ref('institucional')

// --- Configuración general ---------------------------------------------------
const configuraciones = ref<ConfiguracionItem[]>([])
const configuracionesSnapshot = ref<string>('')
const cargandoConfig = ref(true)

async function cargarConfiguracion() {
  cargandoConfig.value = true
  try {
    const data = await adminApi.configuracion()
    configuraciones.value = data
    configuracionesSnapshot.value = JSON.stringify(data)
    aplicarColorMarca(findConfig('COLOR_PRIMARIO')?.valor || null)
  } finally {
    cargandoConfig.value = false
  }
}
cargarConfiguracion()

const PLACEHOLDER_SECRETO = '••••••••'
const mostrarPasswordSmtp = ref(false)

function findConfig(clave: string): ConfiguracionItem | undefined {
  return configuraciones.value.find((c) => c.clave === clave)
}

const hayCambiosConfig = computed(() => {
  if (!configuracionesSnapshot.value) return false
  return JSON.stringify(configuraciones.value) !== configuracionesSnapshot.value
})

function descartarCambiosConfig() {
  if (configuracionesSnapshot.value) {
    configuraciones.value = JSON.parse(configuracionesSnapshot.value)
    aplicarColorMarca(findConfig('COLOR_PRIMARIO')?.valor || null)
    ui.mostrarSnackbar('Cambios descartados.', 'info')
  }
}

// Vista previa en vivo (05C hardening, pedido explícitamente por el
// usuario): el color se aplica al tema apenas se edita el campo, antes de
// guardar — así el admin ve el header y los botones cambiar en el momento.
function alCambiarColorMarca(valor: string | null) {
  if (!valor || /^#[0-9A-Fa-f]{6}$/.test(valor)) aplicarColorMarca(valor || null)
}

const guardandoConfig = ref(false)
async function guardarConfiguracion() {
  guardandoConfig.value = true
  try {
    const paraEnviar = configuraciones.value.filter(
      (c) => c.clave !== 'PLANTILLA_DJ_DEFECTO' && !(c.tipo === 'SECRETO' && c.valor === PLACEHOLDER_SECRETO),
    )
    if (paraEnviar.length) {
      await adminApi.actualizarConfiguracion(paraEnviar.map((c) => ({ clave: c.clave, valor: c.valor })))
    }
    ui.mostrarSnackbar('Configuración actualizada con éxito.', 'success')
    await cargarConfiguracion()
  } finally {
    guardandoConfig.value = false
  }
}

// --- Plantilla DJ por defecto (05C hardening, pedido explícitamente por el
// usuario): antes era un campo de texto libre sin ninguna forma de subir el
// archivo real — ahora es un archivo, igual que la plantilla propia de cada
// convocatoria. `publicar()` y la descarga del proveedor ya exigían que
// fuera el ID de un `Archivo` real; esto permite configurarlo sin adivinar.
const plantillaDjDefecto = ref<{ archivo_id: number; nombre: string } | null>(null)
const cargandoPlantillaDefecto = ref(true)
const archivoPlantillaDefectoNuevo = ref<File[]>([])
const subiendoPlantillaDefecto = ref(false)
async function cargarPlantillaDjDefecto() {
  cargandoPlantillaDefecto.value = true
  try {
    const data = await convocatoriasApi.plantillaDjDefecto()
    plantillaDjDefecto.value = data.archivo
  } finally {
    cargandoPlantillaDefecto.value = false
  }
}
cargarPlantillaDjDefecto()

async function subirPlantillaDjDefecto() {
  const archivo = archivoPlantillaDefectoNuevo.value[0]
  if (!archivo) return
  subiendoPlantillaDefecto.value = true
  try {
    await adminApi.subirPlantillaDjDefecto(archivo)
    archivoPlantillaDefectoNuevo.value = []
    ui.mostrarSnackbar('Plantilla por defecto actualizada.', 'success')
    await cargarPlantillaDjDefecto()
  } finally {
    subiendoPlantillaDefecto.value = false
  }
}

async function eliminarPlantillaDjDefecto() {
  await adminApi.eliminarPlantillaDjDefecto()
  plantillaDjDefecto.value = null
  ui.mostrarSnackbar('Plantilla por defecto eliminada.', 'success')
}

const { descargar: descargarPlantillaDefecto, cargando: descargandoPlantillaDefecto } = useDescarga()
function alDescargarPlantillaDefecto() {
  if (!plantillaDjDefecto.value) return
  descargarPlantillaDefecto(`/archivos/${plantillaDjDefecto.value.archivo_id}/descargar`, plantillaDjDefecto.value.nombre)
}

// Parámetros conocidos para renderizar otros que pudieran existir
const clavesConocidas = new Set([
  'INSTITUCION_NOMBRE',
  'COLOR_PRIMARIO',
  'ENTIDAD_PRINCIPAL_RUC',
  'CORREO_REMITENTE_NOMBRE',
  'CORREO_REMITENTE',
  'PLANTILLA_DJ_DEFECTO',
  'UMBRAL_UIT',
  'DIAS_URGENCIA',
  'SMTP_HOST',
  'SMTP_PUERTO',
  'SMTP_CIFRADO',
  'SMTP_USUARIO',
  'SMTP_PASSWORD',
])

const otrasConfiguraciones = computed(() =>
  configuraciones.value.filter((c) => !clavesConocidas.has(c.clave))
)

// Opciones de cifrado SMTP
const opcionesCifradoSmtp = [
  { title: 'TLS (Recomendado - Puerto 587)', value: 'tls' },
  { title: 'SSL (Puerto 465)', value: 'ssl' },
  { title: 'Sin cifrado (Puerto 25)', value: '' },
]

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
  try {
    uits.value = await adminApi.uit()
  } finally {
    cargandoUit.value = false
  }
}
cargarUit()

const uitVigente = computed(() => uits.value.find((u) => u.vigente))

const umbralUitValor = computed(() => {
  const cfg = findConfig('UMBRAL_UIT')
  const num = cfg ? Number(cfg.valor) : 8
  return isNaN(num) || num <= 0 ? 8 : num
})

const montoMaximoMenorCuantia = computed(() => {
  if (!uitVigente.value) return 0
  return Number(uitVigente.value.valor) * umbralUitValor.value
})

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
    <!-- Encabezado de página -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <div class="text-h5 text-titulo font-weight-bold">Configuración del Sistema</div>
        <div class="text-body-2 text-medium-emphasis">
          Administre la identidad institucional, reglas normativas, correo SMTP y valores de la UIT.
        </div>
      </div>
      <v-btn
        icon
        color="primary"
        variant="outlined"
        :loading="cargandoConfig || cargandoUit"
        @click="cargarConfiguracion(); cargarUit()"
      >
        <v-icon icon="mdi-refresh" />
        <v-tooltip activator="parent" location="bottom">Refrescar datos</v-tooltip>
      </v-btn>
    </div>

    <!-- Pestañas de navegación -->
    <v-tabs v-model="tabActivo" color="primary" class="mb-6 border-b">
      <v-tab value="institucional" class="font-weight-medium">
        <v-icon icon="mdi-domain" class="mr-2" />
        Institución y Reglas
      </v-tab>
      <v-tab value="correo" class="font-weight-medium">
        <v-icon icon="mdi-email-cog-outline" class="mr-2" />
        Servicio de Correo (SMTP)
      </v-tab>
      <v-tab value="uit" class="font-weight-medium">
        <v-icon icon="mdi-currency-usd" class="mr-2" />
        Unidad Impositiva Tributaria (UIT)
      </v-tab>
    </v-tabs>

    <!-- Indicador de carga principal -->
    <div v-if="cargandoConfig && cargandoUit" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- PESTAÑA 1: Institución y Reglas -->
    <div v-else-if="tabActivo === 'institucional'">
      <v-row>
        <!-- Card: Identidad Institucional -->
        <v-col cols="12" md="7">
          <v-card class="pa-5 rounded-lg mb-6" elevation="1">
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar color="primary" variant="tonal" size="40" class="rounded-lg">
                <v-icon icon="mdi-office-building-marker-outline" />
              </v-avatar>
              <div>
                <div class="text-subtitle-1 text-titulo font-weight-bold">Identidad Institucional</div>
                <div class="text-caption text-medium-emphasis">Datos generales que identifican a la entidad ante proveedores y ciudadanos</div>
              </div>
            </div>
            <v-divider class="mb-5" />

            <v-row dense>
              <v-col v-if="findConfig('INSTITUCION_NOMBRE')" cols="12">
                <v-text-field
                  v-model="findConfig('INSTITUCION_NOMBRE')!.valor"
                  label="Nombre Oficial de la Institución"
                  prepend-inner-icon="mdi-domain"
                  hint="Se visualiza en la cabecera principal, reportes PDF y actas de adjudicación"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('COLOR_PRIMARIO')" cols="12">
                <label class="text-body-2 font-weight-medium mb-2 d-block">Color de Marca (encabezado y botones primarios)</label>
                <div class="d-flex align-center ga-3">
                  <v-menu :close-on-content-click="false" location="bottom start">
                    <template #activator="{ props: menuProps }">
                      <button
                        type="button"
                        class="muestra-color"
                        :style="{ backgroundColor: findConfig('COLOR_PRIMARIO')!.valor || '#0090D8' }"
                        v-bind="menuProps"
                      />
                    </template>
                    <v-card class="pa-2">
                      <v-color-picker
                        :model-value="findConfig('COLOR_PRIMARIO')!.valor || '#0090D8'"
                        mode="hex"
                        hide-inputs
                        @update:model-value="(v) => { findConfig('COLOR_PRIMARIO')!.valor = v; alCambiarColorMarca(v) }"
                      />
                    </v-card>
                  </v-menu>
                  <v-text-field
                    v-model="findConfig('COLOR_PRIMARIO')!.valor"
                    placeholder="#0090D8"
                    prepend-inner-icon="mdi-palette-outline"
                    :rules="[colorHex()]"
                    hint="Hexadecimal (ej. #0090D8). Vacío = usar el color por defecto del sistema."
                    persistent-hint
                    class="flex-grow-1"
                    @update:model-value="alCambiarColorMarca"
                  />
                </div>
              </v-col>

              <v-col v-if="findConfig('ENTIDAD_PRINCIPAL_RUC')" cols="12" sm="6">
                <v-text-field
                  v-model="findConfig('ENTIDAD_PRINCIPAL_RUC')!.valor"
                  label="RUC de la Entidad Principal"
                  prepend-inner-icon="mdi-domain"
                  :rules="[rucValido()]"
                  hint="Esa entidad se muestra directo en el portal público (/), aunque haya más de una aprobada. Vacío = mostrar el buscador cuando haya más de una."
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('CORREO_REMITENTE_NOMBRE')" cols="12" sm="6">
                <v-text-field
                  v-model="findConfig('CORREO_REMITENTE_NOMBRE')!.valor"
                  label="Nombre Remitente de Correo"
                  prepend-inner-icon="mdi-account-tie"
                  hint="Nombre que ven los usuarios al recibir notificaciones"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('CORREO_REMITENTE')" cols="12" sm="6">
                <v-text-field
                  v-model="findConfig('CORREO_REMITENTE')!.valor"
                  label="Correo Remitente Institucional"
                  prepend-inner-icon="mdi-at"
                  hint="Dirección remitente (no-reply@munilaperla.gob.pe)"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col cols="12">
                <div class="text-body-2 font-weight-medium mb-2">Plantilla de Declaración Jurada por Defecto</div>
                <v-progress-circular v-if="cargandoPlantillaDefecto" indeterminate color="primary" size="24" />
                <template v-else>
                  <div v-if="plantillaDjDefecto" class="d-flex align-center ga-2 mb-3">
                    <v-icon icon="mdi-file-document-outline" />
                    <span>{{ plantillaDjDefecto.nombre }}</span>
                    <v-btn
                      icon="mdi-download"
                      variant="text"
                      size="small"
                      color="primary"
                      :loading="descargandoPlantillaDefecto"
                      @click="alDescargarPlantillaDefecto"
                    />
                    <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="eliminarPlantillaDjDefecto" />
                  </div>
                  <v-alert v-else type="warning" density="compact" variant="tonal" class="mb-3">
                    No hay plantilla por defecto configurada. Las convocatorias sin plantilla propia no podrán publicarse.
                  </v-alert>
                  <div class="d-flex align-center ga-2">
                    <BaseArchivoUpload
                      v-model="archivoPlantillaDefectoNuevo"
                      :label="plantillaDjDefecto ? 'Reemplazar plantilla' : 'Subir plantilla'"
                      class="flex-grow-1"
                    />
                    <v-btn
                      color="primary"
                      variant="flat"
                      :disabled="!archivoPlantillaDefectoNuevo.length"
                      :loading="subiendoPlantillaDefecto"
                      @click="subirPlantillaDjDefecto"
                    >
                      Subir
                    </v-btn>
                  </div>
                </template>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <!-- Card: Reglas Normativas -->
        <v-col cols="12" md="5">
          <v-card class="pa-5 rounded-lg mb-6" elevation="1">
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar color="primary" variant="tonal" size="40" class="rounded-lg">
                <v-icon icon="mdi-scale-balance" />
              </v-avatar>
              <div>
                <div class="text-subtitle-1 text-titulo font-weight-bold">Reglas de Contratación</div>
                <div class="text-caption text-medium-emphasis">Límites normativos y alertas de urgencia</div>
              </div>
            </div>
            <v-divider class="mb-5" />

            <v-row dense>
              <v-col v-if="findConfig('UMBRAL_UIT')" cols="12">
                <v-text-field
                  v-model="findConfig('UMBRAL_UIT')!.valor"
                  label="Umbral Normativo"
                  type="number"
                  prepend-inner-icon="mdi-scale-balance"
                  suffix="UIT"
                  hint="Límite legal para adquisiciones directas de menor cuantía (Ley OSCE: 8 UIT)"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('DIAS_URGENCIA')" cols="12">
                <v-text-field
                  v-model="findConfig('DIAS_URGENCIA')!.valor"
                  label="Alerta de Urgencia"
                  type="number"
                  prepend-inner-icon="mdi-clock-alert-outline"
                  suffix="días"
                  hint="Días restantes antes del cierre para destacar la convocatoria como urgente"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>
            </v-row>
          </v-card>

          <!-- Otros parámetros (si existieran en la BD) -->
          <v-card v-if="otrasConfiguraciones.length" class="pa-5 rounded-lg mb-6" elevation="1">
            <div class="text-subtitle-1 text-titulo font-weight-bold mb-3">Parámetros Adicionales</div>
            <v-row dense>
              <v-col v-for="c in otrasConfiguraciones" :key="c.clave" cols="12">
                <v-text-field
                  v-model="c.valor"
                  :label="c.descripcion ?? c.clave"
                  :hint="c.clave"
                  persistent-hint
                  class="mb-2"
                />
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>

      <!-- Barra de acciones inferior -->
      <v-card class="pa-4 rounded-lg d-flex justify-space-between align-center flex-wrap ga-3" elevation="1">
        <div class="d-flex align-center ga-2 text-body-2">
          <v-icon
            :icon="hayCambiosConfig ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'"
            :color="hayCambiosConfig ? 'warning' : 'success'"
          />
          <span :class="hayCambiosConfig ? 'text-warning font-weight-medium' : 'text-medium-emphasis'">
            {{ hayCambiosConfig ? 'Tiene cambios sin guardar en los parámetros' : 'Todos los parámetros están actualizados' }}
          </span>
        </div>
        <div class="d-flex ga-2">
          <v-btn
            variant="outlined"
            color="secondary"
            class="px-5"
            :disabled="!hayCambiosConfig || guardandoConfig"
            @click="descartarCambiosConfig"
          >
            Descartar cambios
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            elevation="2"
            class="px-6 font-weight-medium"
            :loading="guardandoConfig"
            :disabled="!hayCambiosConfig"
            @click="guardarConfiguracion"
          >
            Guardar cambios
          </v-btn>
        </div>
      </v-card>
    </div>

    <!-- PESTAÑA 2: Servicio de Correo (SMTP) -->
    <div v-else-if="tabActivo === 'correo'">
      <v-row>
        <!-- Servidor SMTP -->
        <v-col cols="12" md="7">
          <v-card class="pa-5 rounded-lg mb-6" elevation="1">
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar color="primary" variant="tonal" size="40" class="rounded-lg">
                <v-icon icon="mdi-server" />
              </v-avatar>
              <div>
                <div class="text-subtitle-1 text-titulo font-weight-bold">Servidor de Correo Saliente (SMTP)</div>
                <div class="text-caption text-medium-emphasis">Credenciales de conexión para el envío de notificaciones por email</div>
              </div>
            </div>
            <v-divider class="mb-5" />

            <v-alert
              v-if="!findConfig('SMTP_HOST')?.valor"
              type="info"
              variant="tonal"
              density="comfortable"
              class="mb-5 rounded-lg text-body-2"
              icon="mdi-information-outline"
            >
              <strong>Modo por defecto del servidor:</strong> Actualmente el host SMTP está vacío, por lo que el sistema utilizará la configuración definida en el entorno (.env). Complete los campos a continuación únicamente si desea conectar un servidor SMTP propio.
            </v-alert>

            <v-row dense>
              <v-col v-if="findConfig('SMTP_HOST')" cols="12" sm="8">
                <v-text-field
                  v-model="findConfig('SMTP_HOST')!.valor"
                  label="Servidor SMTP (Host)"
                  prepend-inner-icon="mdi-server-network"
                  placeholder="ej. smtp.office365.com o mail.munilaperla.gob.pe"
                  hint="Dirección del servidor de correo saliente"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('SMTP_PUERTO')" cols="12" sm="4">
                <v-text-field
                  v-model="findConfig('SMTP_PUERTO')!.valor"
                  label="Puerto"
                  type="number"
                  prepend-inner-icon="mdi-lan-connect"
                  placeholder="587"
                  hint="Habitual: 587 o 465"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('SMTP_CIFRADO')" cols="12">
                <v-select
                  v-model="findConfig('SMTP_CIFRADO')!.valor"
                  label="Protocolo de Cifrado"
                  :items="opcionesCifradoSmtp"
                  prepend-inner-icon="mdi-shield-lock-outline"
                  hint="Seleccione el protocolo de seguridad correspondiente a su puerto"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('SMTP_USUARIO')" cols="12" sm="6">
                <v-text-field
                  v-model="findConfig('SMTP_USUARIO')!.valor"
                  label="Usuario / Cuenta SMTP"
                  prepend-inner-icon="mdi-account"
                  hint="Usuario para autenticarse en el servidor"
                  persistent-hint
                  class="mb-3"
                />
              </v-col>

              <v-col v-if="findConfig('SMTP_PASSWORD')" cols="12" sm="6">
                <v-text-field
                  v-model="findConfig('SMTP_PASSWORD')!.valor"
                  label="Contraseña SMTP"
                  :type="mostrarPasswordSmtp ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="mostrarPasswordSmtp ? 'mdi-eye-off' : 'mdi-eye'"
                  :placeholder="findConfig('SMTP_PASSWORD')!.valor === PLACEHOLDER_SECRETO ? '••••••••' : 'Ingrese contraseña'"
                  hint="Se guarda cifrada. Dejar •••••••• para no cambiar"
                  persistent-hint
                  class="mb-3"
                  @click:append-inner="mostrarPasswordSmtp = !mostrarPasswordSmtp"
                />
              </v-col>
            </v-row>

            <div class="d-flex justify-end ga-2 mt-2">
              <v-btn
                variant="outlined"
                color="secondary"
                class="px-5"
                :disabled="!hayCambiosConfig || guardandoConfig"
                @click="descartarCambiosConfig"
              >
                Descartar
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                elevation="2"
                class="px-6 font-weight-medium"
                :loading="guardandoConfig"
                :disabled="!hayCambiosConfig"
                @click="guardarConfiguracion"
              >
                Guardar credenciales
              </v-btn>
            </div>
          </v-card>
        </v-col>

        <!-- Prueba de Envío de Correo Consolidada -->
        <v-col cols="12" md="5">
          <v-card class="pa-5 rounded-lg mb-6" elevation="1">
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar color="primary" variant="tonal" size="40" class="rounded-lg">
                <v-icon icon="mdi-email-check-outline" />
              </v-avatar>
              <div>
                <div class="text-subtitle-1 text-titulo font-weight-bold">Diagnóstico y Prueba de Envío</div>
                <div class="text-caption text-medium-emphasis">Verifique la conectividad y funcionamiento del correo</div>
              </div>
            </div>
            <v-divider class="mb-5" />

            <p class="text-body-2 text-medium-emphasis mb-4">
              Envía un correo de prueba a la casilla especificada utilizando los parámetros SMTP configurados, verificando la conexión y entrega inmediata.
            </p>

            <v-text-field
              v-model="correoPrueba"
              label="Correo de destino de prueba"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              placeholder="admin@munilaperla.gob.pe"
              hint="Ingrese el correo donde desea recibir el mensaje de comprobación"
              persistent-hint
              class="mb-4"
            />

            <v-btn
              color="primary"
              variant="flat"
              elevation="2"
              block
              class="font-weight-medium py-3"
              prepend-icon="mdi-send-outline"
              :loading="enviandoPrueba"
              :disabled="!correoPrueba"
              @click="enviarCorreoPrueba"
            >
              Enviar correo de prueba
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- PESTAÑA 3: Unidad Impositiva Tributaria (UIT) -->
    <div v-else-if="tabActivo === 'uit'">
      <!-- Banner Resumen de UIT Vigente -->
      <v-card class="pa-5 mb-6 rounded-lg border" elevation="1">
        <v-row align="center">
          <v-col cols="12" md="4">
            <div class="d-flex align-center ga-3">
              <v-avatar color="primary" variant="tonal" size="48" class="rounded-lg">
                <v-icon icon="mdi-shield-check" size="26" />
              </v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Año UIT Vigente</div>
                <div class="text-h5 text-titulo font-weight-bold">
                  {{ uitVigente ? `Año ${uitVigente.anio}` : 'Sin definir' }}
                </div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Valor Oficial de la UIT</div>
            <div class="text-h6 text-primary font-weight-bold" style="font-family: var(--font-datos)">
              {{ uitVigente ? `S/ ${Number(uitVigente.valor).toLocaleString('es-PE', { minimumFractionDigits: 2 }) }` : '—' }}
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
              Tope Menor Cuantía ({{ umbralUitValor }} UIT)
            </div>
            <div class="text-h6 text-success font-weight-bold" style="font-family: var(--font-datos)">
              {{ uitVigente ? `S/ ${montoMaximoMenorCuantia.toLocaleString('es-PE', { minimumFractionDigits: 2 }) }` : '—' }}
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Tabla de Valores Históricos y Gestión -->
      <v-card class="pa-5 rounded-lg" elevation="1">
        <div class="d-flex justify-space-between align-center mb-4 flex-wrap ga-3">
          <div>
            <div class="text-subtitle-1 text-titulo font-weight-bold">Historial de Valores de UIT</div>
            <div class="text-caption text-medium-emphasis">Registro anual de la UIT utilizado para cálculos normativos y contrataciones menores</div>
          </div>
          <v-btn color="primary" variant="flat" elevation="2" class="font-weight-medium px-5" prepend-icon="mdi-plus" @click="abrirNuevoUit">
            Registrar año
          </v-btn>
        </div>

        <v-progress-circular v-if="cargandoUit" indeterminate color="primary" class="my-6" />
        <v-table v-else density="comfortable">
          <thead>
            <tr>
              <th style="width: 100px">Acciones</th>
              <th>Año</th>
              <th>Valor UIT (S/)</th>
              <th>Tope Menor Cuantía ({{ umbralUitValor }} UIT)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in uits" :key="u.uit_id">
              <td>
                <div class="d-flex align-center ga-1">
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    color="primary"
                    @click="abrirEditarUit(u)"
                  >
                    <v-icon icon="mdi-pencil-outline" />
                    <v-tooltip activator="parent" location="top">Editar valor</v-tooltip>
                  </v-btn>
                </div>
              </td>
              <td class="font-weight-bold">{{ u.anio }}</td>
              <td style="font-family: var(--font-datos)">
                S/ {{ Number(u.valor).toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}
              </td>
              <td style="font-family: var(--font-datos)" class="text-medium-emphasis">
                S/ {{ (Number(u.valor) * umbralUitValor).toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}
              </td>
              <td>
                <v-chip
                  :color="u.vigente ? 'success' : 'grey'"
                  variant="tonal"
                  size="small"
                  :prepend-icon="u.vigente ? 'mdi-check-circle' : undefined"
                  class="font-weight-medium"
                >
                  {{ u.vigente ? 'Vigente' : 'Inactivo' }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- Diálogo Modal para Crear / Editar UIT -->
    <v-dialog v-model="uitAbierto" max-width="420">
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
          <span>{{ uitEditando ? 'Editar Valor de UIT' : 'Nuevo Valor de UIT' }}</span>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="uitAbierto = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-text-field
            v-model.number="uitForm.anio"
            label="Año"
            type="number"
            prepend-inner-icon="mdi-calendar"
            :disabled="!!uitEditando"
            :error-messages="erroresUit.anio"
            class="mb-3"
          />
          <v-text-field
            v-model.number="uitForm.valor"
            label="Valor oficial (S/)"
            type="number"
            step="50"
            prefix="S/"
            prepend-inner-icon="mdi-cash"
            :error-messages="erroresUit.valor"
            class="mb-3"
          />
          <v-switch
            v-model="uitForm.vigente"
            label="Establecer como UIT Vigente"
            color="primary"
            hide-details
            class="mb-2"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
          <v-btn variant="outlined" color="secondary" class="px-5" @click="uitAbierto = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" elevation="2" class="px-6" :loading="guardandoUit" @click="guardarUit">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.muestra-color {
  width: 42px;
  height: 42px;
  border-radius: var(--v-rounded-md, 8px);
  border: 2px solid rgba(var(--v-border-color), 0.8);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}
.muestra-color:hover {
  transform: scale(1.05);
}
</style>
