<script setup lang="ts">
// B3 — Recuperación de contraseña. El backend responde igual exista o no el
// correo (no revela qué cuentas hay). Al enviar, muestra la cuenta regresiva
// de vigencia del enlace (10 min, la define el backend en `vigencia_minutos`).
// 05C hardening (pedido explícitamente por el usuario): captcha (mismo
// mecanismo que Registro) y diseño igual al de Login (AuthSplitLayout).
import { computed, ref } from 'vue'

import { authApi } from '@/api/auth.api'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout.vue'
import BaseCaptcha from '@/components/base/BaseCaptcha.vue'
import { useCaptcha } from '@/composables/useCaptcha'
import { useCuentaRegresiva } from '@/composables/useCuentaRegresiva'
import { email as reglaEmail, requerido } from '@/utils/validaciones'

const captcha = useCaptcha()
const cuenta = useCuentaRegresiva()

const beneficios = [
  { icono: 'mdi-email-fast-outline', texto: 'Enlace enviado al instante' },
  { icono: 'mdi-link-lock', texto: 'Enlace de un solo uso' },
  { icono: 'mdi-timer-sand', texto: 'Vigencia limitada' },
  { icono: 'mdi-shield-check-outline', texto: 'Protegido con captcha' },
]

const email = ref('')
const formValido = ref(false)
const enviando = ref(false)
const enviado = ref(false)
const vigenciaSegundos = ref(600)
const erroresCampo = ref<Record<string, string[]>>({})

const progreso = computed(() => (vigenciaSegundos.value ? (cuenta.restantes.value / vigenciaSegundos.value) * 100 : 0))

async function enviar() {
  if (!formValido.value) return
  enviando.value = true
  erroresCampo.value = {}
  try {
    const respuesta = await authApi.recuperarPassword({ email: email.value, captcha: captcha.valor.value })
    vigenciaSegundos.value = (respuesta?.vigencia_minutos ?? 10) * 60
    cuenta.iniciar(vigenciaSegundos.value)
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

async function solicitarOtro() {
  cuenta.detener()
  enviado.value = false
  await captcha.recargar()
}
</script>

<template>
  <AuthSplitLayout
    titulo="¿Perdiste el acceso a tu cuenta?"
    texto="No te preocupes: con tu correo registrado te enviamos un enlace seguro para elegir una contraseña nueva. El enlace es de un solo uso y vence pronto, así que ábrelo apenas lo recibas."
    :beneficios="beneficios"
    tarjeta-titulo="Recuperar contraseña"
    :tarjeta-subtitulo="enviado ? undefined : 'Ingrese su correo y le enviaremos un enlace para restablecerla.'"
  >
    <!-- Enlace enviado: cuenta regresiva de vigencia -->
    <div v-if="enviado" class="text-center">
      <v-avatar :color="cuenta.vencida.value ? 'warning' : 'success'" variant="tonal" size="64" class="mb-4">
        <v-icon :icon="cuenta.vencida.value ? 'mdi-timer-off-outline' : 'mdi-email-check-outline'" size="32" />
      </v-avatar>

      <template v-if="!cuenta.vencida.value">
        <h2 class="text-h6 font-weight-bold mb-2">Revise su correo</h2>
        <p class="text-body-2 mb-5">
          Si el correo está registrado, le enviamos un enlace para restablecer su contraseña. Revise también la
          carpeta de spam.
        </p>
        <div class="text-caption text-medium-emphasis">El enlace vence en</div>
        <div class="cuenta" aria-live="polite">{{ cuenta.formato.value }}</div>
        <v-progress-linear :model-value="progreso" color="primary" height="6" rounded class="mt-2" />
      </template>

      <template v-else>
        <h2 class="text-h6 font-weight-bold mb-2">El enlace venció</h2>
        <p class="text-body-2 mb-5">Por seguridad el enlace ya no es válido. Solicite uno nuevo para continuar.</p>
        <v-btn block size="large" class="btn-principal" @click="solicitarOtro">Solicitar un nuevo enlace</v-btn>
      </template>
    </div>

    <!-- Formulario -->
    <v-form v-else v-model="formValido" @submit.prevent="enviar">
      <v-text-field
        v-model="email"
        type="email"
        label="Correo electrónico"
        autocomplete="username"
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
        block
        size="large"
        class="btn-principal"
        :loading="enviando"
        :disabled="!formValido || !captcha.respuesta.value"
      >
        Enviar enlace
      </v-btn>
    </v-form>
  </AuthSplitLayout>
</template>

<style scoped>
.cuenta {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: #0a2c52;
}
</style>
