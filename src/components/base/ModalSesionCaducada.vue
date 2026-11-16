<script setup lang="ts">
// Aviso de sesión caducada. Se monta dentro de LayoutApp (área protegida).
// Detecta el vencimiento de tres formas, porque una pestaña olvidada no hace
// peticiones por sí sola:
//  1. El tope absoluto que entrega el backend (`sesion.expira_en_segundos`),
//     revisado cada pocos segundos contra el reloj del navegador.
//  2. Al volver a la pestaña (visibilitychange): consulta /auth/me, que cubre
//     también el vencimiento por inactividad del servidor.
//  3. Cualquier 401/419 de la API (lo marca el interceptor de cliente.ts).
// En los tres casos muestra el aviso, cuenta unos segundos y redirige al login.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'

const SEGUNDOS_AVISO = 10
const REVISION_MS = 10_000
const MIN_ENTRE_VERIFICACIONES_MS = 60_000

const auth = useAuthStore()
const router = useRouter()

const abierto = computed(() => auth.sesionCaducada)
const restantes = ref(SEGUNDOS_AVISO)
let cuenta: ReturnType<typeof setInterval> | undefined
let revision: ReturnType<typeof setInterval> | undefined
let ultimaVerificacion = Date.now()
let redirigiendo = false

function revisarVencimiento() {
  if (auth.autenticado && !auth.sesionCaducada && auth.expiraEn !== null && Date.now() >= auth.expiraEn) {
    auth.marcarCaducada()
  }
}

async function verificarAlVolver() {
  if (document.visibilityState !== 'visible') return
  revisarVencimiento()
  if (!auth.autenticado || auth.sesionCaducada) return
  if (Date.now() - ultimaVerificacion < MIN_ENTRE_VERIFICACIONES_MS) return
  ultimaVerificacion = Date.now()
  try {
    auth.aplicarSesion(await authApi.me())
  } catch {
    // Un 401/419 ya lo marca el interceptor; otros errores no cierran sesión.
  }
}

async function irAlLogin() {
  if (redirigiendo) return
  redirigiendo = true
  detenerCuenta()
  const destino = router.currentRoute.value.fullPath
  try {
    await auth.logout()
  } catch {
    // La sesión ya no es válida en el servidor: basta con limpiar el estado local.
  }
  auth.sesionCaducada = false
  redirigiendo = false
  await router.push({ path: '/login', query: { redirect: destino } })
}

function detenerCuenta() {
  if (cuenta) clearInterval(cuenta)
  cuenta = undefined
}

watch(abierto, (visible) => {
  detenerCuenta()
  if (!visible) return
  restantes.value = SEGUNDOS_AVISO
  cuenta = setInterval(() => {
    restantes.value -= 1
    if (restantes.value <= 0) irAlLogin()
  }, 1000)
}, { immediate: true })

onMounted(() => {
  revision = setInterval(revisarVencimiento, REVISION_MS)
  document.addEventListener('visibilitychange', verificarAlVolver)
  revisarVencimiento()
})

onBeforeUnmount(() => {
  detenerCuenta()
  if (revision) clearInterval(revision)
  document.removeEventListener('visibilitychange', verificarAlVolver)
})
</script>

<template>
  <v-dialog :model-value="abierto" persistent max-width="440">
    <v-card class="rounded-lg text-center pa-4">
      <v-card-text>
        <v-icon icon="mdi-clock-alert-outline" color="warning" size="56" class="mb-3" />
        <div class="text-h6 text-titulo mb-2">Tu sesión ha caducado</div>
        <p class="text-body-2">
          Por seguridad debes iniciar sesión nuevamente. Serás redirigido en
          {{ restantes }} {{ restantes === 1 ? 'segundo' : 'segundos' }}.
        </p>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" variant="flat" class="px-6" @click="irAlLogin">Ir al inicio de sesión</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
