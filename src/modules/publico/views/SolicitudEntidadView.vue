<script setup lang="ts">
// B4 — Solicitud pública de alta de entidad (queda SOLICITADA hasta que un
// administrador la revise; Fase 10 construye esa bandeja).
import { reactive, ref } from 'vue'

import { publicoApi } from '@/api/publico.api'
import BaseCaptcha from '@/components/base/BaseCaptcha.vue'
import { useCaptcha } from '@/composables/useCaptcha'

const captcha = useCaptcha()

const form = reactive({
  numero_documento: '',
  razon_social: '',
  sigla: '',
  correo: '',
  telefono: '',
  direccion: '',
  persona_contacto: '',
})
const enviando = ref(false)
const enviado = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})

async function enviar() {
  errorGeneral.value = ''
  erroresCampo.value = {}
  enviando.value = true
  try {
    await publicoApi.solicitudEntidad({ ...form, captcha: captcha.valor.value })
    enviado.value = true
  } catch (e: unknown) {
    const error = e as { response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } } }
    const status = error.response?.status
    if (status === 409 || status === 422) {
      errorGeneral.value = error.response?.data?.mensaje ?? ''
      erroresCampo.value = error.response?.data?.errores ?? {}
    }
    await captcha.recargar()
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <v-container class="py-8" max-width="640">
    <v-card class="mx-auto" max-width="560">
      <v-card-title class="text-titulo">Solicitar alta de entidad</v-card-title>
      <v-card-text>
        <v-alert v-if="enviado" type="success" density="compact">
          Solicitud registrada. Un administrador la revisará pronto.
        </v-alert>

        <v-form v-else @submit.prevent="enviar">
          <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>

          <v-text-field
            v-model="form.numero_documento"
            label="RUC"
            :error-messages="erroresCampo.numero_documento"
            maxlength="11"
            inputmode="numeric"
            class="mb-2"
          />
          <v-text-field
            v-model="form.razon_social"
            label="Razón social"
            :error-messages="erroresCampo.razon_social"
            class="mb-2"
          />
          <v-text-field
            v-model="form.sigla"
            label="Sigla"
            :error-messages="erroresCampo.sigla"
            class="mb-2"
          />
          <v-text-field
            v-model="form.correo"
            label="Correo electrónico"
            type="email"
            :error-messages="erroresCampo.correo"
            class="mb-2"
          />
          <v-text-field
            v-model="form.telefono"
            label="Teléfono"
            :error-messages="erroresCampo.telefono"
            class="mb-2"
          />
          <v-text-field
            v-model="form.direccion"
            label="Dirección"
            :error-messages="erroresCampo.direccion"
            class="mb-2"
          />
          <v-text-field
            v-model="form.persona_contacto"
            label="Persona de contacto"
            :error-messages="erroresCampo.persona_contacto"
            class="mb-4"
          />

          <BaseCaptcha
            v-model:respuesta="captcha.respuesta.value"
            :imagen="captcha.imagen.value"
            :cargando="captcha.cargando.value"
            :error-messages="erroresCampo.captcha"
            class="mb-4"
            @recargar="captcha.recargar"
          />

          <v-btn type="submit" block :loading="enviando">Enviar solicitud</v-btn>
        </v-form>

        <div class="text-center mt-4 text-body-2">
          <router-link to="/">Volver al portal</router-link>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>
