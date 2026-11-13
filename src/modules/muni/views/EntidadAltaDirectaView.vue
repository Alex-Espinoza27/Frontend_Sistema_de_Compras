<script setup lang="ts">
// H1 — Alta directa: la muni registra una entidad ya aprobada + usuario inicial.
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { entidadesApi } from '@/api/entidades.api'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const router = useRouter()
const ui = useUiStore()

const form = reactive({
  numero_documento: '',
  razon_social: '',
  sigla: '',
  correo: '',
  telefono: '',
  direccion: '',
  persona_contacto: '',
  usuario_nombre: '',
  usuario_correo: '',
})

const guardando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})

async function guardar() {
  errorGeneral.value = ''
  erroresCampo.value = {}
  guardando.value = true
  try {
    const { entidad_id } = await entidadesApi.store({
      numero_documento: form.numero_documento,
      razon_social: form.razon_social,
      sigla: form.sigla,
      correo: form.correo,
      telefono: form.telefono,
      direccion: form.direccion,
      persona_contacto: form.persona_contacto,
      usuario_inicial: { nombre: form.usuario_nombre, correo: form.usuario_correo },
    })
    ui.mostrarSnackbar('Entidad registrada y aprobada. Se enviaron las credenciales por correo.', 'success')
    router.push(`/app/entidades/${entidad_id}`)
  } catch (e: unknown) {
    const error = e as ErrorApi
    const status = error.response?.status
    if (status === 422) {
      errorGeneral.value = error.response?.data?.mensaje ?? ''
      erroresCampo.value = error.response?.data?.errores ?? {}
    }
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <v-container class="py-8" max-width="720">
    <BaseVolver to="/app/entidades" texto="Volver a entidades" />
    <div class="text-h5 text-titulo mb-6">Registrar nueva entidad</div>

    <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.numero_documento"
            label="RUC"
            maxlength="11"
            :error-messages="erroresCampo.numero_documento"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.sigla" label="Sigla" :error-messages="erroresCampo.sigla" />
        </v-col>
        <v-col cols="12">
          <v-text-field v-model="form.razon_social" label="Razón social" :error-messages="erroresCampo.razon_social" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.correo" label="Correo" type="email" :error-messages="erroresCampo.correo" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.telefono" label="Teléfono" :error-messages="erroresCampo.telefono" />
        </v-col>
        <v-col cols="12">
          <v-text-field v-model="form.direccion" label="Dirección" :error-messages="erroresCampo.direccion" />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="form.persona_contacto"
            label="Persona de contacto"
            :error-messages="erroresCampo.persona_contacto"
          />
        </v-col>
      </v-row>
    </v-card>

    <v-card class="pa-4 mb-4">
      <div class="text-subtitle-1 text-titulo mb-3">Usuario inicial</div>
      <p class="text-body-2 text-grey mb-4">Se le enviarán las credenciales de acceso por correo.</p>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.usuario_nombre"
            label="Nombre"
            :error-messages="erroresCampo['usuario_inicial.nombre']"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.usuario_correo"
            label="Correo"
            type="email"
            :error-messages="erroresCampo['usuario_inicial.correo']"
          />
        </v-col>
      </v-row>
    </v-card>

    <div class="d-flex justify-end ga-2">
      <v-btn variant="outlined" color="secondary" class="px-5" to="/app/entidades">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" elevation="2" class="px-6" :loading="guardando" @click="guardar">Registrar</v-btn>
    </div>
  </v-container>
</template>
