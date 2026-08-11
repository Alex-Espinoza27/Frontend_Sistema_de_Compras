<script setup lang="ts">
// B3 — Recuperación de contraseña. El backend siempre responde igual exista
// o no el correo (Password::sendResetLink no filtra existencia).
import { ref } from 'vue'

import { authApi } from '@/api/auth.api'

const email = ref('')
const enviando = ref(false)
const enviado = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

async function enviar() {
  enviando.value = true
  erroresCampo.value = {}
  try {
    await authApi.recuperarPassword({ email: email.value })
    enviado.value = true
  } catch (e: unknown) {
    const error = e as { response?: { status?: number; data?: { errores?: Record<string, string[]> } } }
    if (error.response?.status === 422) {
      erroresCampo.value = error.response.data?.errores ?? {}
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" max-width="480">
    <v-card class="mx-auto" width="100%" max-width="420">
      <v-card-title class="text-titulo">Recuperar contraseña</v-card-title>
      <v-card-text>
        <v-alert v-if="enviado" type="success" density="compact">
          Si el correo existe, se envió un enlace de recuperación.
        </v-alert>

        <v-form v-else @submit.prevent="enviar">
          <p class="text-body-2 text-grey mb-4">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <v-text-field
            v-model="email"
            label="Correo electrónico"
            type="email"
            :error-messages="erroresCampo.email"
            autocomplete="username"
            class="mb-4"
          />
          <v-btn type="submit" block :loading="enviando">Enviar enlace</v-btn>
        </v-form>

        <div class="text-center mt-4 text-body-2">
          <router-link to="/login">Volver a iniciar sesión</router-link>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>
