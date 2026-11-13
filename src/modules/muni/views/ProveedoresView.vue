<script setup lang="ts">
// Mantenimiento de Proveedores (05C hardening) — módulo propio, separado de
// Administración. Antes solo se podía listar/reactivar (`TabProveedores.vue`,
// retirado); ahora admite crear y editar el proveedor completo.
import { ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import ModalProveedorForm from '@/modules/muni/components/ModalProveedorForm.vue'
import type { ProveedorAdminItem } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

const { items, paginacion, cargando, params, recargar } = useListado<ProveedorAdminItem>(adminApi.proveedores, {})

const cabeceras = [
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Estado', key: 'estado', sortable: false },
  { title: 'RUC/DNI', key: 'numero_documento', sortable: false },
  { title: 'Tipo', key: 'tipo_persona', sortable: false },
  { title: 'Razón social', key: 'razon_social' },
  { title: 'Correo', key: 'correo', sortable: false },
  { title: 'Teléfono', key: 'telefono', sortable: false },
  { title: 'Contacto', key: 'persona_contacto', sortable: false },
]

const coloresTipoPersona: Record<string, string> = {
  JURIDICA: 'secondary',
  NATURAL: 'info',
}

const modalAbierto = ref(false)
const proveedorSeleccionado = ref<number | null>(null)
function abrirNuevo() {
  proveedorSeleccionado.value = null
  modalAbierto.value = true
}
function abrirEditar(id: number) {
  proveedorSeleccionado.value = id
  modalAbierto.value = true
}

const confirmarAbierto = ref(false)
const confirmarId = ref<number | null>(null)
const confirmarAccion = ref<'suspender' | 'reactivar'>('suspender')
const confirmando = ref(false)
function pedirCambioEstado(id: number, accion: 'suspender' | 'reactivar') {
  confirmarId.value = id
  confirmarAccion.value = accion
  confirmarAbierto.value = true
}
async function confirmarCambioEstado() {
  if (!confirmarId.value) return
  confirmando.value = true
  try {
    if (confirmarAccion.value === 'suspender') {
      await adminApi.suspenderProveedor(confirmarId.value)
      ui.mostrarSnackbar('Proveedor suspendido.', 'success')
    } else {
      await adminApi.reactivarProveedor(confirmarId.value)
      ui.mostrarSnackbar('Proveedor reactivado.', 'success')
    }
    confirmarAbierto.value = false
    recargar()
  } finally {
    confirmando.value = false
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Proveedores</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="outlined" :loading="cargando" @click="recargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn color="primary" variant="flat" elevation="2" class="font-weight-medium px-5" @click="abrirNuevo">
          Nuevo proveedor
        </v-btn>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por razón social o RUC/DNI"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 320px"
        clearable
      />
      <v-select
        v-model="params.estado"
        :items="[
          { title: 'Activo', value: 'ACTIVO' },
          { title: 'Suspendido', value: 'SUSPENDIDO' },
        ]"
        label="Estado"
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
      mensaje-vacio="No hay proveedores registrados."
    >
      <template #item.acciones="{ item }">
        <div class="d-flex align-center ga-1">
          <v-btn icon variant="text" size="small" color="primary" @click="abrirEditar(item.proveedor_id)">
            <v-icon icon="mdi-pencil-outline" />
            <v-tooltip activator="parent" location="top">Editar proveedor</v-tooltip>
          </v-btn>
          <v-btn
            v-if="item.estado.codigo === 'ACTIVO'"
            icon
            variant="text"
            size="small"
            color="error"
            @click="pedirCambioEstado(item.proveedor_id, 'suspender')"
          >
            <v-icon icon="mdi-account-off-outline" />
            <v-tooltip activator="parent" location="top">Suspender proveedor</v-tooltip>
          </v-btn>
          <v-btn
            v-else
            icon
            variant="text"
            size="small"
            color="success"
            @click="pedirCambioEstado(item.proveedor_id, 'reactivar')"
          >
            <v-icon icon="mdi-account-check-outline" />
            <v-tooltip activator="parent" location="top">Reactivar proveedor</v-tooltip>
          </v-btn>
        </div>
      </template>
      <template #item.estado="{ item }"><BaseChipEstado :estado="item.estado" /></template>
      <template #item.numero_documento="{ item }">
        <div class="d-flex align-center ga-2">
          <v-chip size="x-small" variant="outlined" rounded="pill" color="grey">{{ item.tipo_documento }}</v-chip>
          <span class="text-datos">{{ item.numero_documento }}</span>
        </div>
      </template>
      <template #item.tipo_persona="{ item }">
        <v-chip size="small" variant="tonal" rounded="pill" :color="coloresTipoPersona[item.tipo_persona] ?? 'grey'">
          {{ item.tipo_persona === 'JURIDICA' ? 'Jurídica' : 'Natural' }}
        </v-chip>
      </template>
      <template #item.telefono="{ item }">{{ item.telefono ?? '—' }}</template>
      <template #item.persona_contacto="{ item }">{{ item.persona_contacto ?? '—' }}</template>
    </BaseTablaServidor>

    <ModalProveedorForm v-model:abierto="modalAbierto" :proveedor-id="proveedorSeleccionado" @guardado="recargar" />

    <BaseConfirmacion
      v-model:abierto="confirmarAbierto"
      :titulo="confirmarAccion === 'suspender' ? 'Suspender proveedor' : 'Reactivar proveedor'"
      :mensaje="
        confirmarAccion === 'suspender'
          ? 'El proveedor no podrá iniciar sesión ni postular hasta que se reactive.'
          : 'El proveedor podrá volver a iniciar sesión y postular normalmente.'
      "
      :texto-confirmar="confirmarAccion === 'suspender' ? 'Suspender' : 'Reactivar'"
      :cargando="confirmando"
      @confirmar="confirmarCambioEstado"
    />
  </v-container>
</template>
