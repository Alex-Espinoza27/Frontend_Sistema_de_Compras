<script setup lang="ts">
import { reactive, ref } from 'vue'

import { authApi } from '@/api/auth.api'
import { useUiStore } from '@/stores/ui.store'

const abierto = defineModel<boolean>('abierto', { default: false })

const ui = useUiStore()
const form = reactive({ password_actual: '', password: '', password_confirmation: '' })
const enviando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

function limpiar() {
  form.password_actual = ''
  form.password = ''
  form.password_confirmation = ''
  erroresCampo.value = {}
}

async function enviar() {
  enviando.value = true
  erroresCampo.value = {}
  try {
    await authApi.cambiarPassword({ ...form })
    ui.mostrarSnackbar('Contraseña actualizada', 'success')
    abierto.value = false
    limpiar()
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
  <v-dialog v-model="abierto" max-width="480">
    <v-card>
      <v-card-title class="text-titulo">Cambiar contraseña</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="enviar">
          <v-text-field
            v-model="form.password_actual"
            label="Contraseña actual"
            type="password"
            :maxlength="70"
            :error-messages="erroresCampo.password_actual"
            class="mb-2"
          />
          <v-text-field
            v-model="form.password"
            label="Nueva contraseña"
            type="password"
            :maxlength="70"
            :error-messages="erroresCampo.password"
            class="mb-2"
          />
          <v-text-field
            v-model="form.password_confirmation"
            label="Confirmar nueva contraseña"
            type="password"
            :maxlength="70"
            class="mb-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="abierto = false">Cancelar</v-btn>
        <v-btn :loading="enviando" @click="enviar">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
