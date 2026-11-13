<script setup lang="ts">
// Usuarios (05C hardening) — módulo propio, unifica lo que antes eran dos
// pantallas separadas: "Usuarios internos" (`TabUsuariosInternos.vue`,
// retirado, solo ADMINISTRADOR/AUDITOR) y los usuarios de cada Entidad (antes
// solo visibles entrando al detalle de esa entidad, uno por uno). El rol es
// dinámico (cualquiera excepto PROVEEDOR, incluye roles custom nuevos de
// Roles y Permisos); si el rol elegido es ENTIDAD, aparece el select de
// entidad (obligatorio).
import { computed, reactive, ref, watch } from 'vue'

import { adminApi } from '@/api/admin.api'
import { entidadesApi } from '@/api/entidades.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { EntidadListaItem, TipoDocumentoUsuario } from '@/modules/muni/muni.types'
import type { UsuarioPlataformaItem } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const ui = useUiStore()

const { items, paginacion, cargando, params, recargar } = useListado<UsuarioPlataformaItem>(
  adminApi.usuarios,
  {
    ordenar_por: 'nombre',
  },
  'filtros_usuarios',
)

// Solo roles activos (05C hardening, pedido explícitamente por el usuario):
// un rol desactivado deja de ofrecerse para asignaciones nuevas.
const roles = ref<string[]>([])
adminApi.roles().then((data) => (roles.value = data.filter((r) => r.activo && r.rol !== 'PROVEEDOR').map((r) => r.rol)))

const entidadesAprobadas = ref<EntidadListaItem[]>([])
entidadesApi.index({ estado: 'APROBADA', ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidadesAprobadas.value = data.items))

// Tipos de documento para personas (DNI/CE/PASAPORTE): excluye RUC, ese es
// para personas jurídicas (05C hardening, pedido explícitamente por el
// usuario). Solo tipos activos, mismo patrón que `roles` arriba.
const opcionesTipoDocumento = ref<{ title: string; value: TipoDocumentoUsuario }[]>([])
adminApi.tiposDocumento().then((data) => {
  opcionesTipoDocumento.value = data
    .filter((t) => t.activo && t.codigo !== 'RUC')
    .map((t) => ({ title: `${t.codigo} — ${t.nombre}`, value: t.codigo as TipoDocumentoUsuario }))
})

const cabeceras = [
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Estado', key: 'activo', sortable: false },
  { title: 'Documento', key: 'dni', sortable: false },
  { title: 'Nombres y Apellidos', key: 'nombre' },
  { title: 'Correo', key: 'correo', sortable: false },
  { title: 'Sexo', key: 'sexo', sortable: false },
  { title: 'Celular', key: 'celular', sortable: false },
  { title: 'F. Nacimiento', key: 'fecha_nacimiento', sortable: false },
  { title: 'Rol', key: 'rol', sortable: false },
  { title: 'Entidad', key: 'entidad', sortable: false },
]

const opcionesSexo = [
  { title: 'Masculino', value: 'M' },
  { title: 'Femenino', value: 'F' },
]

const coloresRol: Record<string, string> = {
  ADMINISTRADOR: 'secondary',
  AUDITOR: 'info',
  ENTIDAD: 'primary',
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

const abierto = ref(false)
const editando = ref<UsuarioPlataformaItem | null>(null)
const form = reactive({
  dni: '',
  tipo_documento: 'DNI' as TipoDocumentoUsuario,
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  correo: '',
  sexo: 'M',
  celular: '',
  fecha_nacimiento: '',
  rol: '',
  entidad_id: null as number | null,
})
const guardando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})
const esEntidad = computed(() => form.rol === 'ENTIDAD')

watch(
  () => form.rol,
  (rol) => {
    if (rol !== 'ENTIDAD') form.entidad_id = null
  },
)

function abrirNuevo() {
  editando.value = null
  form.dni = ''
  form.tipo_documento = 'DNI'
  form.nombres = ''
  form.apellido_paterno = ''
  form.apellido_materno = ''
  form.correo = ''
  form.sexo = 'M'
  form.celular = ''
  form.fecha_nacimiento = ''
  form.rol = 'AUDITOR'
  form.entidad_id = null
  errorGeneral.value = ''
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(usuario: UsuarioPlataformaItem) {
  editando.value = usuario
  form.dni = usuario.dni ?? ''
  form.tipo_documento = usuario.tipo_documento?.codigo ?? 'DNI'
  form.nombres = usuario.nombres ?? ''
  form.apellido_paterno = usuario.apellido_paterno ?? ''
  form.apellido_materno = usuario.apellido_materno ?? ''
  form.correo = usuario.correo
  form.sexo = usuario.sexo ?? 'M'
  form.celular = usuario.celular ?? ''
  form.fecha_nacimiento = usuario.fecha_nacimiento ?? ''
  form.rol = usuario.rol
  form.entidad_id = usuario.entidad?.entidad_id ?? null
  errorGeneral.value = ''
  erroresCampo.value = {}
  abierto.value = true
}
async function guardar() {
  guardando.value = true
  errorGeneral.value = ''
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarUsuario(editando.value.id, { ...form })
      ui.mostrarSnackbar('Usuario actualizado.', 'success')
    } else {
      await adminApi.crearUsuario({ ...form })
      ui.mostrarSnackbar('Usuario creado. Se enviaron las credenciales por correo.', 'success')
    }
    abierto.value = false
    recargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorGeneral.value = error.response?.data?.mensaje ?? ''
    erroresCampo.value = error.response?.data?.errores ?? {}
  } finally {
    guardando.value = false
  }
}

// Desactivar en vez de eliminar (05C hardening, pedido explícitamente por el
// usuario, mismo patrón que Proveedores/Catálogos/Roles): no se borra ningún
// registro, el usuario queda listado con su estado en "Inactivo".
const cambiarEstadoAbierto = ref(false)
const usuarioParaCambiarEstado = ref<UsuarioPlataformaItem | null>(null)
const cambiandoEstado = ref(false)
const errorCambiarEstado = ref('')
function pedirCambioEstado(usuario: UsuarioPlataformaItem) {
  usuarioParaCambiarEstado.value = usuario
  errorCambiarEstado.value = ''
  cambiarEstadoAbierto.value = true
}
async function confirmarCambioEstado() {
  if (!usuarioParaCambiarEstado.value) return
  cambiandoEstado.value = true
  try {
    if (usuarioParaCambiarEstado.value.activo) {
      await adminApi.desactivarUsuario(usuarioParaCambiarEstado.value.id)
      ui.mostrarSnackbar('Usuario desactivado.', 'success')
    } else {
      await adminApi.activarUsuario(usuarioParaCambiarEstado.value.id)
      ui.mostrarSnackbar('Usuario activado.', 'success')
    }
    cambiarEstadoAbierto.value = false
    recargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorCambiarEstado.value = error.response?.data?.mensaje ?? 'No se pudo cambiar el estado.'
  } finally {
    cambiandoEstado.value = false
  }
}

// --- Restablecer contraseña ---
const resetAbierto = ref(false)
const usuarioParaReset = ref<UsuarioPlataformaItem | null>(null)
const modoReset = ref<'enlace' | 'manual'>('enlace')
const passwordManual = ref('')
const mostrarPasswordManual = ref(false)
const reseteando = ref(false)
const errorReset = ref('')

function abrirRestablecerPassword(usuario: UsuarioPlataformaItem) {
  usuarioParaReset.value = usuario
  modoReset.value = 'enlace'
  passwordManual.value = ''
  mostrarPasswordManual.value = false
  errorReset.value = ''
  resetAbierto.value = true
}

function generarPasswordAleatoria() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  passwordManual.value = pass
  mostrarPasswordManual.value = true
}

async function confirmarRestablecerPassword() {
  if (!usuarioParaReset.value) return
  if (modoReset.value === 'manual' && passwordManual.value.length < 8) {
    errorReset.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  reseteando.value = true
  errorReset.value = ''
  try {
    const body = modoReset.value === 'manual' ? { password: passwordManual.value } : undefined
    await adminApi.restablecerPasswordUsuario(usuarioParaReset.value.id, body)
    ui.mostrarSnackbar(
      modoReset.value === 'manual'
        ? `Contraseña actualizada para ${usuarioParaReset.value.nombre}.`
        : `Enlace de restablecimiento enviado a ${usuarioParaReset.value.correo}.`,
      'success',
    )
    resetAbierto.value = false
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorReset.value = error.response?.data?.mensaje ?? 'No se pudo restablecer la contraseña.'
  } finally {
    reseteando.value = false
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Usuarios</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="outlined" :loading="cargando" @click="recargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn color="primary" variant="flat" elevation="2" class="font-weight-medium px-5" @click="abrirNuevo">
          Nuevo usuario
        </v-btn>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por DNI, nombre o correo"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 320px"
        clearable
      />
      <v-select
        v-model="params.rol as string"
        :items="roles"
        label="Rol"
        clearable
        style="max-width: 200px"
        @update:model-value="recargar()"
      />
    </div>

    <BaseTablaServidor
      v-model:page="params.pagina"
      v-model:items-per-page="params.por_pagina"
      v-model:ordenar-por="params.ordenar_por"
      v-model:direccion="params.direccion"
      :headers="cabeceras"
      :items="items"
      :items-length="paginacion.total"
      :loading="cargando"
      mensaje-vacio="No hay usuarios registrados."
    >
      <template #item.acciones="{ item }">
        <div class="d-flex align-center ga-1">
          <v-btn
            icon
            variant="text"
            size="small"
            color="primary"
            @click="abrirEditar(item)"
          >
            <v-icon icon="mdi-pencil-outline" />
            <v-tooltip activator="parent" location="top">Editar usuario</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            color="secondary"
            @click="abrirRestablecerPassword(item)"
          >
            <v-icon icon="mdi-lock-reset" />
            <v-tooltip activator="parent" location="top">Restablecer contraseña</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            :color="item.activo ? 'error' : 'success'"
            @click="pedirCambioEstado(item)"
          >
            <v-icon :icon="item.activo ? 'mdi-account-off-outline' : 'mdi-account-check-outline'" />
            <v-tooltip activator="parent" location="top">{{ item.activo ? 'Desactivar usuario' : 'Activar usuario' }}</v-tooltip>
          </v-btn>
        </div>
      </template>
      <template #item.activo="{ item }">
        <v-chip size="small" variant="tonal" rounded="pill" :color="item.activo ? 'success' : 'grey'">
          {{ item.activo ? 'Activo' : 'Inactivo' }}
        </v-chip>
      </template>
      <template #item.dni="{ item }">
        <div class="d-flex align-center ga-2">
          <v-chip size="x-small" variant="outlined" rounded="pill" color="grey">{{ item.tipo_documento?.codigo ?? 'DNI' }}</v-chip>
          <span class="text-datos">{{ item.dni ?? '—' }}</span>
        </div>
      </template>
      <template #item.sexo="{ item }">
        <v-chip v-if="item.sexo" size="small" variant="tonal" rounded="pill" :color="item.sexo === 'M' ? 'primary' : 'info'">
          {{ item.sexo === 'M' ? 'Masculino' : 'Femenino' }}
        </v-chip>
        <span v-else>—</span>
      </template>
      <template #item.celular="{ item }">
        <span v-if="item.celular" class="text-datos">{{ item.celular }}</span>
        <span v-else>—</span>
      </template>
      <template #item.fecha_nacimiento="{ item }">{{ formatearFecha(item.fecha_nacimiento) }}</template>
      <template #item.rol="{ item }">
        <v-chip size="small" variant="tonal" rounded="pill" :color="coloresRol[item.rol] ?? 'grey'">{{ item.rol }}</v-chip>
      </template>
      <template #item.entidad="{ item }">{{ item.entidad?.razon_social ?? '—' }}</template>
    </BaseTablaServidor>

    <v-dialog v-model="abierto" max-width="680" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
          <span>{{ editando ? 'Editar usuario' : 'Nuevo usuario' }}</span>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="abierto = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>

          <v-row density="compact">
            <v-col cols="12" sm="4">
              <v-select
                v-model="form.tipo_documento"
                :items="opcionesTipoDocumento"
                label="Tipo de documento"
                :error-messages="erroresCampo.tipo_documento"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.dni"
                label="N° de documento"
                maxlength="12"
                :error-messages="erroresCampo.dni"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="form.sexo"
                :items="opcionesSexo"
                label="Sexo"
                :error-messages="erroresCampo.sexo"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="form.nombres"
                label="Nombres"
                :error-messages="erroresCampo.nombres"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.apellido_paterno"
                label="Apellido Paterno"
                :error-messages="erroresCampo.apellido_paterno"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.apellido_materno"
                label="Apellido Materno"
                :error-messages="erroresCampo.apellido_materno"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.correo"
                label="Correo electrónico"
                type="email"
                :error-messages="erroresCampo.correo"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.rol"
                :items="roles"
                label="Rol"
                :error-messages="erroresCampo.rol"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.celular"
                label="Celular (opcional)"
                maxlength="9"
                prepend-inner-icon="mdi-cellphone"
                :error-messages="erroresCampo.celular"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <BaseDatePicker
                v-model="form.fecha_nacimiento"
                label="Fecha de nacimiento (opcional)"
                clearable
                :error-messages="erroresCampo.fecha_nacimiento"
              />
            </v-col>

            <v-col v-if="esEntidad" cols="12">
              <v-select
                v-model="form.entidad_id"
                :items="entidadesAprobadas.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
                label="Entidad"
                :error-messages="erroresCampo.entidad_id"
              />
            </v-col>
          </v-row>

          <v-alert
            v-if="!editando"
            type="info"
            density="compact"
            variant="tonal"
            class="mt-2"
          >
            Al guardar, se enviará un correo a la dirección registrada con las instrucciones para configurar la contraseña de acceso.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
          <v-btn variant="outlined" color="secondary" class="px-5" @click="abierto = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" elevation="2" class="px-6" :loading="guardando" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseConfirmacion
      v-model:abierto="cambiarEstadoAbierto"
      :titulo="usuarioParaCambiarEstado?.activo ? 'Desactivar usuario' : 'Activar usuario'"
      :mensaje="
        (usuarioParaCambiarEstado?.activo
          ? 'El usuario no podrá iniciar sesión hasta que se reactive.'
          : 'El usuario podrá volver a iniciar sesión normalmente.') + ' ' + errorCambiarEstado
      "
      :texto-confirmar="usuarioParaCambiarEstado?.activo ? 'Desactivar' : 'Activar'"
      :color="usuarioParaCambiarEstado?.activo ? 'error' : 'primary'"
      :cargando="cambiandoEstado"
      @confirmar="confirmarCambioEstado"
    />

    <!-- Modal Restablecer Contraseña -->
    <v-dialog v-model="resetAbierto" max-width="500" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-lock-reset" color="primary" />
            <span>Restablecer contraseña</span>
          </div>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="resetAbierto = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-alert v-if="errorReset" type="error" density="compact" class="mb-4">
            {{ errorReset }}
          </v-alert>

          <p class="text-body-2 mb-3">
            Usuario: <strong>{{ usuarioParaReset?.nombre }} {{ usuarioParaReset?.apellido_paterno }}</strong><br />
            Correo: <strong>{{ usuarioParaReset?.correo }}</strong>
          </p>

          <v-radio-group v-model="modoReset" density="compact" class="mb-2">
            <v-radio
              label="Enviar enlace de restablecimiento por correo"
              value="enlace"
            />
            <v-radio
              label="Asignar nueva contraseña manualmente"
              value="manual"
            />
          </v-radio-group>

          <template v-if="modoReset === 'manual'">
            <div class="d-flex align-center ga-2 mt-2">
              <v-text-field
                v-model="passwordManual"
                :type="mostrarPasswordManual ? 'text' : 'password'"
                label="Nueva contraseña temporal"
                hint="Mínimo 8 caracteres"
                persistent-hint
                :append-inner-icon="mostrarPasswordManual ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="mostrarPasswordManual = !mostrarPasswordManual"
              />
              <v-btn
                variant="tonal"
                color="secondary"
                class="mb-4"
                title="Generar contraseña aleatoria"
                @click="generarPasswordAleatoria"
              >
                <v-icon icon="mdi-dice-5-outline" class="mr-1" />
                Generar
              </v-btn>
            </div>
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
          <v-btn variant="outlined" color="secondary" class="px-5" @click="resetAbierto = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            elevation="2"
            class="px-6"
            :loading="reseteando"
            @click="confirmarRestablecerPassword"
          >
            {{ modoReset === 'manual' ? 'Guardar contraseña' : 'Enviar enlace' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
