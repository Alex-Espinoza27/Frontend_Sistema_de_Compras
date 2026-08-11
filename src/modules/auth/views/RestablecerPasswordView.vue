<script setup lang="ts">
// B3 — Restablecer contraseña desde el enlace del correo (?token=&email=).
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { authApi } from '@/api/auth.api'

const route = useRoute()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''
const enlaceInvalido = !token || !email

const form = reactive({ password: '', password_confirmation: '' })
const enviando = ref(false)
const enviado = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})

const passwordsCoinciden = computed(
  () => !form.password_confirmation || form.password === form.password_confirmation,
)

async function enviar() {
  errorGeneral.value = ''
  erroresCampo.value = {}
  enviando.value = true
  try {
    await authApi.restablecerPassword({
      token,
      email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    enviado.value = true
  } catch (e: unknown) {
    const error = e as { response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } } }
    if (error.response?.status === 422) {
      erroresCampo.value = error.response.data?.errores ?? {}
      if (!Object.keys(erroresCampo.value).length) {
        errorGeneral.value = error.response.data?.mensaje ?? 'El enlace no es válido o expiró.'
      }
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" max-width="480">
    <v-card class="mx-auto" width="100%" max-width="420">
      <v-card-title class="text-titulo">Restablecer contraseña</v-card-title>
      <v-card-text>
        <v-alert v-if="enlaceInvalido" type="error" density="compact">
          El enlace no es válido: falta el token o el correo. Solicita uno nuevo.
        </v-alert>

        <template v-else>
          <v-alert v-if="enviado" type="success" density="compact">
            Contraseña restablecida. Ya puedes iniciar sesión.
          </v-alert>

          <v-form v-else @submit.prevent="enviar">
            <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>

            <v-text-field
              v-model="form.password"
              label="Nueva contraseña"
              type="password"
              :maxlength="70"
              :error-messages="erroresCampo.password"
              autocomplete="new-password"
              class="mb-2"
            />
            <v-text-field
              v-model="form.password_confirmation"
              label="Confirmar contraseña"
              type="password"
              :maxlength="70"
              :error-messages="passwordsCoinciden ? [] : ['Las contraseñas no coinciden']"
              autocomplete="new-password"
              class="mb-4"
            />
            <v-btn type="submit" block :loading="enviando">Restablecer</v-btn>
          </v-form>
        </template>

        <div class="text-center mt-4 text-body-2">
          <router-link to="/login">Volver a iniciar sesión</router-link>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>
