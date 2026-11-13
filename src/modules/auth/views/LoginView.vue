<script setup lang="ts">
// B1 — Login (05B). Panel oscuro con el formulario a la izquierda + panel
// informativo a la derecha (oculto en mobile). "Recordar usuario" guarda el
// correo en localStorage. 401/422 se muestran en el formulario; 423/429 ya
// los informa el snackbar global (api/cliente.ts).
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { email as reglaEmail, requerido } from '@/utils/validaciones'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const nombreApp = import.meta.env.VITE_APP_NOMBRE
const CLAVE_RECORDAR = 'compras.usuario_recordado'

const form = reactive({ email: '', password: '' })
const formValido = ref(false)
const mostrarPassword = ref(false)
const recordar = ref(false)
const enviando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})

onMounted(() => {
  const guardado = localStorage.getItem(CLAVE_RECORDAR)
  if (guardado) {
    form.email = guardado
    recordar.value = true
  }
})

async function enviar() {
  if (!formValido.value) return
  enviando.value = true
  errorGeneral.value = ''
  erroresCampo.value = {}
  try {
    await auth.login({ email: form.email, password: form.password })
    if (recordar.value) localStorage.setItem(CLAVE_RECORDAR, form.email)
    else localStorage.removeItem(CLAVE_RECORDAR)
    // Proveedor → D1 (Ver convocatorias); resto → Dashboard (J1, Fase 11).
    const destinoPorDefecto = auth.usuario?.rol === 'PROVEEDOR' ? '/app/convocatorias-abiertas' : '/app/dashboard'
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : destinoPorDefecto
    router.push(redirect)
  } catch (e: unknown) {
    const error = e as { response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } } }
    const status = error.response?.status
    if (status === 401) {
      errorGeneral.value = error.response?.data?.mensaje ?? 'Las credenciales no son válidas.'
    } else if (status === 422) {
      erroresCampo.value = error.response?.data?.errores ?? {}
    }
    // 423 y 429: el snackbar global ya informa.
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <v-row no-gutters class="login-wrap">
    <!-- Panel del formulario (siempre oscuro, aunque el sitio esté en claro) -->
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
            <h1 class="text-h4 text-titulo font-weight-bold mb-1">Bienvenido</h1>
            <p class="text-body-2 mb-6" style="opacity: 0.7">
              Ingrese con su cuenta para continuar.
            </p>

            <v-form v-model="formValido" @submit.prevent="enviar">
              <v-alert
                v-if="errorGeneral"
                type="error"
                variant="tonal"
                density="comfortable"
                class="mb-4"
                :text="errorGeneral"
              />

              <label class="etiqueta">Correo electrónico *</label>
              <v-text-field
                v-model="form.email"
                type="email"
                autocomplete="username"
                placeholder="usuario@correo.com"
                prepend-inner-icon="mdi-email-outline"
                :rules="[requerido(), reglaEmail()]"
                :error-messages="erroresCampo.email"
                class="mb-2"
                autofocus
              />

              <label class="etiqueta">Contraseña *</label>
              <v-text-field
                v-model="form.password"
                :type="mostrarPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="mostrarPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="[requerido()]"
                :error-messages="erroresCampo.password"
                @click:append-inner="mostrarPassword = !mostrarPassword"
              />

              <div class="d-flex align-center justify-space-between mb-2 mt-1">
                <v-checkbox
                  v-model="recordar"
                  label="Recordar usuario"
                  color="primary"
                  density="compact"
                  hide-details
                />
                <v-btn variant="text" color="primary" size="small" density="compact" to="/recuperar-password">
                  ¿Olvidó su contraseña?
                </v-btn>
              </div>

              <v-btn type="submit" color="primary" block size="large" :loading="enviando" :disabled="!formValido">
                Iniciar sesión
              </v-btn>
            </v-form>

            <div class="text-center mt-6">
              <p class="text-body-2 mb-2" style="opacity: 0.8">¿Es proveedor y no tiene cuenta?</p>
              <v-btn variant="tonal" color="primary" rounded="pill" to="/registro" class="px-6">
                Registrarse aquí
              </v-btn>
            </div>
          </div>
        </div>
      </v-theme-provider>
    </v-col>

    <!-- Panel informativo -->
    <v-col cols="12" md="7" lg="8" class="d-none d-md-flex panel-info">
      <div class="info-contenido text-center">
        <v-avatar color="primary" size="88" rounded="lg" class="mb-6">
          <v-icon icon="mdi-file-document-check-outline" size="44" />
        </v-avatar>
        <h2 class="text-h5 text-titulo font-weight-bold mb-2">
          Transparencia y eficiencia en cada contratación
        </h2>
        <p class="text-body-1 text-medium-emphasis mx-auto mb-8" style="max-width: 460px">
          Plataforma de contrataciones públicas para entidades, proveedores y ciudadanía, con
          seguimiento en línea de todo el proceso.
        </p>

        <v-row class="mx-auto" style="max-width: 480px">
          <v-col
            v-for="item in [
              { icono: 'mdi-bullhorn-outline', texto: 'Publicación de convocatorias' },
              { icono: 'mdi-file-send-outline', texto: 'Postulación en línea' },
              { icono: 'mdi-clipboard-check-outline', texto: 'Evaluación transparente' },
              { icono: 'mdi-chart-box-outline', texto: 'Datos abiertos y reportes' },
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
.login-wrap {
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
