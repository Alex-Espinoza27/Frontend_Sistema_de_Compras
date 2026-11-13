<script setup lang="ts">
// B3 — Recuperación de contraseña. El backend siempre responde igual exista
// o no el correo (Password::sendResetLink no filtra existencia).
// 05C hardening (pedido explícitamente por el usuario): se agregó captcha
// (mismo mecanismo que Registro) — antes este endpoint público solo tenía
// `throttle:auth` como freno, sin nada que impida automatizarlo.
import { ref } from 'vue'

import { authApi } from '@/api/auth.api'
import BaseCaptcha from '@/components/base/BaseCaptcha.vue'
import { useCaptcha } from '@/composables/useCaptcha'
import { email as reglaEmail, requerido } from '@/utils/validaciones'

const nombreApp = import.meta.env.VITE_APP_NOMBRE
const captcha = useCaptcha()

const email = ref('')
const formValido = ref(false)
const enviando = ref(false)
const enviado = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

async function enviar() {
  if (!formValido.value) return
  enviando.value = true
  erroresCampo.value = {}
  try {
    await authApi.recuperarPassword({ email: email.value, captcha: captcha.valor.value })
    enviado.value = true
  } catch (e: unknown) {
    const error = e as { response?: { status?: number; data?: { errores?: Record<string, string[]> } } }
    if (error.response?.status === 422) {
      erroresCampo.value = error.response.data?.errores ?? {}
    }
    await captcha.recargar()
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <v-row no-gutters class="recuperar-wrap">
    <v-col cols="12" md="5" lg="4">
      <v-theme-provider theme="oscuro" with-background class="fill-height">
        <div class="panel-form d-flex flex-column align-center">
          <div class="bloque d-flex align-center ga-3">
            <v-avatar color="primary" size="40" rounded="lg">
              <v-icon icon="mdi-file-document-check-outline" size="24" />
            </v-avatar>
            <span class="text-subtitle-1 font-weight-bold text-titulo">{{ nombreApp }}</span>
          </div>

          <div class="bloque flex-grow-1 d-flex flex-column justify-center py-8">
            <h1 class="text-h4 text-titulo font-weight-bold mb-1">Recuperar contraseña</h1>
            <p class="text-body-2 mb-6" style="opacity: 0.7">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>

            <v-alert v-if="enviado" type="success" variant="tonal" density="comfortable" class="mb-4">
              Si el correo existe, se envió un enlace de recuperación. Revisa también tu carpeta de spam.
            </v-alert>

            <v-form v-else v-model="formValido" @submit.prevent="enviar">
              <label class="etiqueta">Correo electrónico *</label>
              <v-text-field
                v-model="email"
                type="email"
                autocomplete="username"
                placeholder="usuario@correo.com"
                prepend-inner-icon="mdi-email-outline"
                :rules="[requerido(), reglaEmail()]"
                :error-messages="erroresCampo.email"
                class="mb-2"
                autofocus
              />

              <BaseCaptcha
                v-model:respuesta="captcha.respuesta.value"
                :imagen="captcha.imagen.value"
                :cargando="captcha.cargando.value"
                :error-messages="erroresCampo.captcha"
                class="mb-4"
                @recargar="captcha.recargar"
              />

              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="enviando"
                :disabled="!formValido || !captcha.respuesta.value"
              >
                Enviar enlace
              </v-btn>
            </v-form>

            <div class="text-center mt-6">
              <v-btn variant="tonal" color="primary" rounded="pill" to="/login" class="px-6">
                Volver a iniciar sesión
              </v-btn>
            </div>
          </div>
        </div>
      </v-theme-provider>
    </v-col>

    <v-col cols="12" md="7" lg="8" class="d-none d-md-flex panel-info">
      <div class="info-contenido text-center">
        <v-avatar color="primary" size="88" rounded="lg" class="mb-6">
          <v-icon icon="mdi-lock-reset" size="44" />
        </v-avatar>
        <h2 class="text-h5 text-titulo font-weight-bold mb-2">¿Perdiste el acceso a tu cuenta?</h2>
        <p class="text-body-1 text-medium-emphasis mx-auto mb-8" style="max-width: 460px">
          No te preocupes — con tu correo registrado te enviamos un enlace seguro para elegir una
          contraseña nueva. El enlace expira por tu seguridad, así que ábrelo apenas lo recibas.
        </p>

        <v-row class="mx-auto" style="max-width: 480px">
          <v-col
            v-for="item in [
              { icono: 'mdi-email-fast-outline', texto: 'Enlace enviado al instante' },
              { icono: 'mdi-shield-check-outline', texto: 'Protegido con captcha' },
              { icono: 'mdi-timer-sand', texto: 'Expira por tu seguridad' },
              { icono: 'mdi-account-lock-open-outline', texto: 'Acceso recuperado en minutos' },
            ]"
            :key="item.texto"
            cols="6"
          >
            <v-card class="pa-4 text-left" variant="tonal" color="primary">
              <v-icon :icon="item.icono" color="primary" size="26" class="mb-2" />
              <div class="text-body-2 font-weight-medium">{{ item.texto }}</div>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-col>
  </v-row>
</template>

<style scoped>
.recuperar-wrap {
  min-height: 100vh;
}
.panel-form {
  min-height: 100vh;
  padding: 40px;
}
.bloque {
  width: 100%;
  max-width: 380px;
}
.etiqueta {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.85;
}
.panel-info {
  align-items: center;
  justify-content: center;
  padding: 48px;
  background:
    radial-gradient(70% 60% at 50% 0%, rgb(var(--v-theme-primary), 0.08), transparent 70%),
    rgb(var(--v-theme-surface-variant));
}
.info-contenido {
  max-width: 560px;
}
</style>
