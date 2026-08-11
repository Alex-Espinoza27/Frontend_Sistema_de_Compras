<script setup lang="ts">
// H2 — Detalle de entidad + H3 (aprobar) + H4 (usuarios) integradas (05B).
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { entidadesApi } from '@/api/entidades.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import type { EntidadDetalle, UsuarioEntidad } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const route = useRoute()
const ui = useUiStore()
const entidadId = Number(route.params.id)

const cargando = ref(true)
const detalle = ref<EntidadDetalle | null>(null)
async function cargar() {
  cargando.value = true
  detalle.value = await entidadesApi.show(entidadId)
  cargando.value = false
}
cargar()

const puedeAprobar = computed(() => detalle.value && ['SOLICITADA', 'OBSERVADA'].includes(detalle.value.estado.codigo))
const puedeSuspender = computed(() => detalle.value?.estado.codigo === 'APROBADA')
const puedeReactivar = computed(() => detalle.value?.estado.codigo === 'SUSPENDIDA')

// --- Aprobar (H3) --------------------------------------------------------------
const aprobarAbierto = ref(false)
const aprobarForm = reactive({ nombre: '', correo: '' })
const aprobando = ref(false)
const erroresAprobar = ref<Record<string, string[]>>({})
async function confirmarAprobar() {
  aprobando.value = true
  erroresAprobar.value = {}
  try {
    await entidadesApi.aprobar(entidadId, {
      usuario_inicial:
        detalle.value?.usuarios.length === 0 ? { nombre: aprobarForm.nombre, correo: aprobarForm.correo } : undefined,
    })
    aprobarAbierto.value = false
    ui.mostrarSnackbar('Entidad aprobada. Se enviaron las credenciales por correo.', 'success')
    await cargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    erroresAprobar.value = error.response?.data?.errores ?? {}
  } finally {
    aprobando.value = false
  }
}

// --- Observar / Rechazar / Suspender (motivo) -------------------------------
const motivoAbierto = ref(false)
const motivoAccion = ref<'observar' | 'rechazar' | 'suspender'>('observar')
const motivoCargando = ref(false)
function pedirMotivo(accion: typeof motivoAccion.value) {
  motivoAccion.value = accion
  motivoAbierto.value = true
}
const titulosMotivo: Record<typeof motivoAccion.value, string> = {
  observar: 'Observar entidad',
  rechazar: 'Rechazar solicitud',
  suspender: 'Suspender entidad',
}
async function confirmarMotivo(motivo: string | undefined) {
  if (!motivo) return
  motivoCargando.value = true
  try {
    await entidadesApi[motivoAccion.value](entidadId, motivo)
    motivoAbierto.value = false
    ui.mostrarSnackbar('Acción registrada.', 'success')
    await cargar()
  } finally {
    motivoCargando.value = false
  }
}

async function reactivar() {
  await entidadesApi.reactivar(entidadId)
  ui.mostrarSnackbar('Entidad reactivada.', 'success')
  await cargar()
}

// --- Usuarios de la entidad (H4) ---------------------------------------------
const usuarioAbierto = ref(false)
const usuarioEditando = ref<UsuarioEntidad | null>(null)
const usuarioForm = reactive({ nombre: '', correo: '' })
const guardandoUsuario = ref(false)
const erroresUsuario = ref<Record<string, string[]>>({})

function abrirNuevoUsuario() {
  usuarioEditando.value = null
  usuarioForm.nombre = ''
  usuarioForm.correo = ''
  erroresUsuario.value = {}
  usuarioAbierto.value = true
}
function abrirEditarUsuario(usuario: UsuarioEntidad) {
  usuarioEditando.value = usuario
  usuarioForm.nombre = usuario.nombre
  usuarioForm.correo = usuario.correo
  erroresUsuario.value = {}
  usuarioAbierto.value = true
}
async function guardarUsuario() {
  guardandoUsuario.value = true
  erroresUsuario.value = {}
  try {
    if (usuarioEditando.value) {
      await entidadesApi.actualizarUsuario(entidadId, usuarioEditando.value.id, { ...usuarioForm })
      ui.mostrarSnackbar('Usuario actualizado.', 'success')
    } else {
      await entidadesApi.crearUsuario(entidadId, { ...usuarioForm })
      ui.mostrarSnackbar('Usuario creado. Se enviaron las credenciales por correo.', 'success')
    }
    usuarioAbierto.value = false
    await cargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    erroresUsuario.value = error.response?.data?.errores ?? {}
  } finally {
    guardandoUsuario.value = false
  }
}

const eliminarUsuarioAbierto = ref(false)
const eliminarUsuarioId = ref<number | null>(null)
const eliminandoUsuario = ref(false)
function pedirEliminarUsuario(id: number) {
  eliminarUsuarioId.value = id
  eliminarUsuarioAbierto.value = true
}
async function confirmarEliminarUsuario() {
  if (!eliminarUsuarioId.value) return
  eliminandoUsuario.value = true
  try {
    await entidadesApi.eliminarUsuario(entidadId, eliminarUsuarioId.value)
    eliminarUsuarioAbierto.value = false
    ui.mostrarSnackbar('Usuario eliminado.', 'success')
    await cargar()
  } finally {
    eliminandoUsuario.value = false
  }
}
</script>

<template>
  <v-container class="py-8" max-width="900">
    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <template v-else-if="detalle">
      <BaseVolver to="/app/entidades" texto="Volver a entidades" />
      <div class="d-flex justify-space-between align-start ga-4 mb-6">
        <div>
          <div class="text-h5 text-titulo">{{ detalle.razon_social }}</div>
          <div class="text-body-2 text-grey">{{ detalle.numero_documento }} · {{ detalle.sigla }}</div>
        </div>
        <BaseChipEstado :estado="detalle.estado" />
      </div>

      <v-alert v-if="detalle.motivo_observacion" type="warning" density="compact" class="mb-4">
        Motivo: {{ detalle.motivo_observacion }}
      </v-alert>

      <v-card class="pa-4 mb-4">
        <v-row dense class="text-body-2">
          <v-col cols="12" sm="6">Correo: {{ detalle.correo }}</v-col>
          <v-col cols="12" sm="6">Teléfono: {{ detalle.telefono }}</v-col>
          <v-col cols="12" sm="6">Dirección: {{ detalle.direccion }}</v-col>
          <v-col cols="12" sm="6">Contacto: {{ detalle.persona_contacto }}</v-col>
          <v-col cols="12" sm="6">Fecha de solicitud: {{ detalle.fecha_solicitud }}</v-col>
          <v-col v-if="detalle.fecha_resolucion" cols="12" sm="6">
            Resuelta: {{ detalle.fecha_resolucion }} — {{ detalle.resuelta_por?.nombre }}
          </v-col>
        </v-row>

        <div class="d-flex ga-2 mt-4">
          <v-btn v-if="puedeAprobar" v-can="'entidades.aprobar'" color="primary" @click="aprobarAbierto = true">
            Aprobar
          </v-btn>
          <v-btn
            v-if="puedeAprobar && detalle.estado.codigo === 'SOLICITADA'"
            v-can="'entidades.aprobar'"
            variant="tonal"
            @click="pedirMotivo('observar')"
          >
            Observar
          </v-btn>
          <v-btn v-if="puedeAprobar" v-can="'entidades.aprobar'" variant="tonal" color="error" @click="pedirMotivo('rechazar')">
            Rechazar
          </v-btn>
          <v-btn v-if="puedeSuspender" v-can="'entidades.gestionar'" variant="tonal" color="error" @click="pedirMotivo('suspender')">
            Suspender
          </v-btn>
          <v-btn v-if="puedeReactivar" v-can="'entidades.gestionar'" variant="tonal" @click="reactivar">Reactivar</v-btn>
        </div>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="d-flex justify-space-between align-center mb-3">
          <div class="text-subtitle-1 text-titulo">Usuarios de la entidad</div>
          <v-btn v-can="'entidades.gestionar'" variant="text" prepend-icon="mdi-plus" @click="abrirNuevoUsuario">
            Agregar
          </v-btn>
        </div>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in detalle.usuarios" :key="usuario.id">
              <td>{{ usuario.nombre }}</td>
              <td>{{ usuario.correo }}</td>
              <td>
                <v-btn v-can="'entidades.gestionar'" variant="text" size="small" @click="abrirEditarUsuario(usuario)">
                  Editar
                </v-btn>
                <v-btn
                  v-can="'entidades.gestionar'"
                  variant="text"
                  size="small"
                  color="error"
                  @click="pedirEliminarUsuario(usuario.id)"
                >
                  Dar de baja
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <div v-if="!detalle.usuarios.length" class="text-body-2 text-grey">Sin usuarios registrados.</div>
      </v-card>

      <v-card class="pa-4">
        <div class="text-subtitle-1 text-titulo mb-3">Histórico</div>
        <v-timeline density="compact" side="end">
          <v-timeline-item v-for="(item, i) in detalle.historico" :key="i" size="small" dot-color="primary">
            <div class="text-body-2">
              <strong>{{ item.accion }}</strong> — {{ item.usuario ?? 'Sistema' }}
            </div>
            <div class="text-caption text-grey">{{ item.fecha }}</div>
          </v-timeline-item>
        </v-timeline>
        <div v-if="!detalle.historico.length" class="text-body-2 text-grey">Sin movimientos registrados.</div>
      </v-card>
    </template>

    <!-- Aprobar -->
    <v-dialog v-model="aprobarAbierto" max-width="480">
      <v-card>
        <v-card-title class="text-titulo">Aprobar entidad</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            Se enviarán las credenciales de acceso por correo (enlace de restablecer contraseña).
          </p>
          <template v-if="detalle?.usuarios.length === 0">
            <v-text-field
              v-model="aprobarForm.nombre"
              label="Nombre del usuario inicial"
              :error-messages="erroresAprobar['usuario_inicial.nombre']"
              class="mb-2"
            />
            <v-text-field
              v-model="aprobarForm.correo"
              label="Correo del usuario inicial"
              type="email"
              :error-messages="erroresAprobar['usuario_inicial.correo']"
            />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="aprobarAbierto = false">Cancelar</v-btn>
          <v-btn :loading="aprobando" @click="confirmarAprobar">Aprobar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseConfirmacion
      v-model:abierto="motivoAbierto"
      :titulo="titulosMotivo[motivoAccion]"
      mensaje="Esta acción notifica a la entidad por correo con el motivo indicado."
      :texto-confirmar="titulosMotivo[motivoAccion]"
      pedir-motivo
      :cargando="motivoCargando"
      @confirmar="confirmarMotivo"
    />

    <!-- Usuario (crear/editar) -->
    <v-dialog v-model="usuarioAbierto" max-width="480">
      <v-card>
        <v-card-title class="text-titulo">{{ usuarioEditando ? 'Editar usuario' : 'Agregar usuario' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="usuarioForm.nombre"
            label="Nombre"
            :error-messages="erroresUsuario.nombre"
            class="mb-2"
          />
          <v-text-field
            v-model="usuarioForm.correo"
            label="Correo"
            type="email"
            :error-messages="erroresUsuario.correo"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="usuarioAbierto = false">Cancelar</v-btn>
          <v-btn :loading="guardandoUsuario" @click="guardarUsuario">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseConfirmacion
      v-model:abierto="eliminarUsuarioAbierto"
      titulo="Dar de baja usuario"
      mensaje="Esta acción elimina el acceso del usuario de forma permanente."
      texto-confirmar="Dar de baja"
      :cargando="eliminandoUsuario"
      @confirmar="confirmarEliminarUsuario"
    />
  </v-container>
</template>
