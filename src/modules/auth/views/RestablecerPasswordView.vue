<script setup lang="ts">
// B3 — Restablecer contraseña desde el enlace del correo (?token=&email=).
// Antes de mostrar el formulario se consulta al backend si el enlace sigue
// vigente y cuántos segundos le quedan: muestra una cuenta regresiva y, al
// llegar a cero (o si el enlace venció / ya se usó), deja de mostrar el
// formulario. El token en la URL es aleatorio y de un solo uso; el backend lo
// guarda cifrado y lo hace vencer (10 min en "Olvidé mi contraseña").
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { authApi } from '@/api/auth.api'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout.vue'
import { useCuentaRegresiva } from '@/composables/useCuentaRegresiva'
import { minLongitud, requerido } from '@/utils/validaciones'

type Estado = 'verificando' | 'valido' | 'invalido' | 'exito'

// Mismo mínimo que exige el backend (RestablecerPasswordRequest).
const MIN_PASSWORD = 8
const reglasPassword = [
  requerido('Ingrese una contraseña.'),
  minLongitud(MIN_PASSWORD, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`),
]

const route = useRoute()
const cuenta = useCuentaRegresiva()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''

const beneficios = [
  { icono: 'mdi-link-lock', texto: 'Enlace de un solo uso' },
  { icono: 'mdi-timer-sand', texto: 'Cuenta regresiva visible' },
  { icono: 'mdi-lock-check-outline', texto: 'Contraseña cifrada' },
  { icono: 'mdi-account-lock-open-outline', texto: 'Acceso inmediato' },
]

const estado = ref<Estado>('verificando')
const vigenciaSegundos = ref(600)
const form = reactive({ password: '', password_confirmation: '' })
const mostrarPassword = ref(false)
const enviando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})

const passwordsCoinciden = computed(
  () => !form.password_confirmation || form.password === form.password_confirmation,
)
const passwordValida = computed(() => form.password.length >= MIN_PASSWORD)
const progreso = computed(() => (vigenciaSegundos.value ? (cuenta.restantes.value / vigenciaSegundos.value) * 100 : 0))
const casiVencido = computed(() => cuenta.restantes.value > 0 && cuenta.restantes.value <= 60)

onMounted(async () => {
  if (!token || !email) {
    estado.value = 'invalido'
    return
  }
  try {
    const r = await authApi.validarEnlaceRestablecer(token, email)
    if (r.valido && r.expira_en_segundos) {
      vigenciaSegundos.value = r.expira_en_segundos
      cuenta.iniciar(r.expira_en_segundos)
      estado.value = 'valido'
    } else {
      estado.value = 'invalido'
    }
  } catch {
    estado.value = 'invalido'
  }
})

// La cuenta llegó a cero con el formulario abierto: el enlace ya no sirve.
watch(cuenta.vencida, (vencida) => {
  if (vencida && estado.value === 'valido') estado.value = 'invalido'
})

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
    cuenta.detener()
    estado.value = 'exito'
  } catch (e: unknown) {
    const error = e as { response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } } }
    if (error.response?.status === 422) {
      erroresCampo.value = error.response.data?.errores ?? {}
      // 422 sin errores por campo = el enlace dejó de ser válido (venció o ya se usó).
      if (!Object.keys(erroresCampo.value).length) {
        cuenta.detener()
        estado.value = 'invalido'
      }
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <AuthSplitLayout
    titulo="Crea una contraseña nueva"
    texto="Elige una contraseña segura que no uses en otros sitios. Por tu seguridad el enlace es de un solo uso y vence en pocos minutos."
    :beneficios="beneficios"
    tarjeta-titulo="Restablecer contraseña"
    :tarjeta-subtitulo="estado === 'valido' ? 'Ingrese su nueva contraseña.' : undefined"
  >
    <div v-if="estado === 'verificando'" class="text-center py-6">
      <v-progress-circular indeterminate color="primary" />
      <p class="text-body-2 mt-3">Verificando el enlace…</p>
    </div>

    <!-- Enlace vencido, usado o inexistente -->
    <div v-else-if="estado === 'invalido'" class="text-center">
      <v-avatar color="warning" variant="tonal" size="64" class="mb-4">
        <v-icon icon="mdi-timer-off-outline" size="32" />
      </v-avatar>
      <h2 class="text-h6 font-weight-bold mb-2">Este enlace ya no es válido</h2>
      <p class="text-body-2 mb-5">
        Venció o ya fue utilizado. Por seguridad cada enlace funciona una sola vez y por pocos minutos. Solicite uno
        nuevo para continuar.
      </p>
      <v-btn to="/recuperar-password" block size="large" class="btn-principal">Solicitar un nuevo enlace</v-btn>
    </div>

    <div v-else-if="estado === 'exito'" class="text-center">
      <v-avatar color="success" variant="tonal" size="64" class="mb-4">
        <v-icon icon="mdi-check-circle-outline" size="32" />
      </v-avatar>
      <h2 class="text-h6 font-weight-bold mb-2">Contraseña restablecida</h2>
      <p class="text-body-2 mb-5">Ya puede iniciar sesión con su nueva contraseña.</p>
      <v-btn to="/login" block size="large" class="btn-principal">Iniciar sesión</v-btn>
    </div>

    <!-- Formulario con cuenta regresiva -->
    <v-form v-else @submit.prevent="enviar">
      <div class="vigencia mb-5" :class="{ 'vigencia--alerta': casiVencido }" aria-live="polite">
        <div class="d-flex align-center justify-space-between">
          <span class="text-body-2">
            <v-icon icon="mdi-timer-sand" size="18" class="mr-1" />El enlace vence en
          </span>
          <strong class="vigencia__tiempo">{{ cuenta.formato.value }}</strong>
        </div>
        <v-progress-linear :model-value="progreso" :color="casiVencido ? 'warning' : 'primary'" height="5" rounded class="mt-2" />
      </div>

      <v-alert v-if="errorGeneral" type="error" variant="tonal" density="comfortable" class="mb-4" :text="errorGeneral" />

      <v-text-field
        v-model="form.password"
        :type="mostrarPassword ? 'text' : 'password'"
        label="Nueva contraseña"
        :maxlength="70"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="mostrarPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
        :rules="reglasPassword"
        :error-messages="erroresCampo.password"
        hint="Mínimo 8 caracteres"
        persistent-hint
        class="mb-2"
        autofocus
        @click:append-inner="mostrarPassword = !mostrarPassword"
      />
      <v-text-field
        v-model="form.password_confirmation"
        :type="mostrarPassword ? 'text' : 'password'"
        label="Confirmar contraseña"
        :maxlength="70"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-check-outline"
        :error-messages="passwordsCoinciden ? [] : ['Las contraseñas no coinciden']"
        class="mb-4"
      />

      <v-btn
        type="submit"
        block
        size="large"
        class="btn-principal"
        :loading="enviando"
        :disabled="!passwordValida || !form.password_confirmation || !passwordsCoinciden || cuenta.vencida.value"
      >
        Restablecer
      </v-btn>
    </v-form>
  </AuthSplitLayout>
</template>

<style scoped>
.vigencia {
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef4fb;
  border: 1px solid #dbe3ee;
  color: #14233a;
}
.vigencia--alerta {
  background: #fff7e6;
  border-color: #f0d9a8;
}
.vigencia__tiempo {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
</style>
