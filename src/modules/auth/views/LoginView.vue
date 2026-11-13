<script setup lang="ts">
// B1 — Login (05B). Panel institucional a la izquierda (oculto en mobile,
// donde se reemplaza por un encabezado) + formulario a la derecha.
// "Recordar usuario" guarda el correo en localStorage. 401/422 se muestran en
// el formulario; 423/429 ya los informa el snackbar global (api/cliente.ts).
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'

import { useAuthStore } from '@/stores/auth.store'
import { email as reglaEmail, requerido } from '@/utils/validaciones'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const nombreApp = import.meta.env.VITE_APP_NOMBRE || 'Compras La Perla'
const CLAVE_RECORDAR = 'compras.usuario_recordado'

const form = reactive({ email: '', password: '' })
const formValido = ref(false)
const mostrarPassword = ref(false)
const recordar = ref(false)
const enviando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})

const beneficios = [
  { icono: 'mdi-bullhorn-outline', texto: 'Publicación de convocatorias' },
  { icono: 'mdi-file-send-outline', texto: 'Postulación en línea' },
  { icono: 'mdi-clipboard-check-outline', texto: 'Evaluación transparente' },
  { icono: 'mdi-chart-box-outline', texto: 'Datos abiertos y reportes' },
]

onMounted(() => {
  const guardado = localStorage.getItem(CLAVE_RECORDAR)
  if (guardado) {
    form.email = guardado
    recordar.value = true
  }
})

// Diseño fijo en modo claro (fondos/texto en hex, no en tokens de tema): en
// modo oscuro el v-card del formulario pasa a fondo oscuro con el mismo
// texto hex claro, ilegible. Se fuerza el tema global a "claro" mientras se
// está aquí (pedido explícitamente por el usuario) y se restaura el que
// había al salir — igual que en RegistroView.vue.
const theme = useTheme()
const temaAnterior = theme.global.name.value
theme.global.name.value = 'claro'
onUnmounted(() => {
  theme.global.name.value = temaAnterior
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
  <div class="login">
    <!-- Panel institucional (escritorio) -->
    <aside class="lateral d-none d-md-flex">
      <div class="lateral__interno">
        <router-link to="/" class="marca" aria-label="Ir al inicio">
          <!--<img src="/escudo.png" alt="" class="marca__escudo" />-->
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad Distrital de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
        </router-link>

        <div class="lateral__centro">
          <div class="lateral__plataforma">{{ nombreApp }}</div>
          <h2 class="lateral__titulo">Transparencia y eficiencia en cada contratación</h2>
          <p class="lateral__texto">
            Plataforma de contrataciones públicas para entidades, proveedores y ciudadanía, con
            seguimiento en línea de todo el proceso.
          </p>

          <ul class="beneficios">
            <li v-for="b in beneficios" :key="b.texto" class="beneficio">
              <span class="beneficio__icono"><v-icon :icon="b.icono" size="20" /></span>
              {{ b.texto }}
            </li>
          </ul>
        </div>

        <div class="lateral__pie">© {{ new Date().getFullYear() }} Municipalidad Distrital de La Perla · Callao</div>
      </div>
    </aside>

    <!-- Formulario -->
    <main class="contenido">
      <header class="movil d-md-none">
        <router-link to="/" class="marca" aria-label="Ir al inicio">
          <!--<img src="/escudo.png" alt="" class="marca__escudo" />-->
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad Distrital de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
        </router-link>
      </header>

      <div class="contenido__centro">
        <v-card class="formulario" rounded="xl" elevation="2">
          <div class="formulario__cabecera">
            <h1 class="formulario__titulo">Bienvenido</h1>
            <p class="formulario__sub">Ingrese con su cuenta para continuar.</p>
          </div>

          <v-form v-model="formValido" class="formulario__cuerpo" @submit.prevent="enviar">
            <v-alert
              v-if="errorGeneral"
              type="error"
              variant="tonal"
              density="comfortable"
              class="mb-4"
              :text="errorGeneral"
            />

            <v-text-field
              v-model="form.email"
              type="email"
              label="Correo electrónico"
              autocomplete="username"
              prepend-inner-icon="mdi-email-outline"
              :rules="[requerido(), reglaEmail()]"
              :error-messages="erroresCampo.email"
              class="mb-2"
              autofocus
            />

            <v-text-field
              v-model="form.password"
              :type="mostrarPassword ? 'text' : 'password'"
              label="Contraseña"
              autocomplete="current-password"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="mostrarPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :rules="[requerido()]"
              :error-messages="erroresCampo.password"
              @click:append-inner="mostrarPassword = !mostrarPassword"
            />

            <div class="opciones">
              <v-checkbox
                v-model="recordar"
                label="Recordar usuario"
                color="primary"
                density="compact"
                hide-details
              />
              <router-link to="/recuperar-password" class="enlace">¿Olvidó su contraseña?</router-link>
            </div>

            <v-btn type="submit" block size="large" class="btn-principal" :loading="enviando" :disabled="!formValido">
              Iniciar sesión
            </v-btn>
          </v-form>

          <div class="formulario__pie">
            <div class="formulario__pie-texto">¿Es proveedor y aún no tiene cuenta?</div>
            <v-btn to="/registro" variant="outlined" class="btn-registro" prepend-icon="mdi-account-plus-outline">
              Registrarme como proveedor
            </v-btn>
          </div>
        </v-card>

        <router-link to="/" class="volver">
          <v-icon icon="mdi-arrow-left" size="16" />
          Volver a las convocatorias
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
/*
  Paleta institucional aproximada (ajustar con los valores exactos del
  escudo). Conviene moverla al tema de Vuetify para no repetirla.
*/
.login {
  --lp-azul-900: #0a2c52;
  --lp-azul-700: #0f3d6b;
  --lp-azul-500: #1f6fb2;
  --lp-dorado: #e3a928;
  --lp-fondo: #f4f7fb;
  --lp-tinta: #14233a;
  --lp-tinta-suave: #5a6b82;
  --lp-borde: #dbe3ee;

  /* Mismo split que RegistroView.vue (05C hardening, pedido explícitamente
     por el usuario: antes la línea que divide el panel institucional del
     formulario quedaba en una posición distinta en cada pantalla). */
  display: grid;
  grid-template-columns: minmax(340px, 5fr) 7fr;
  min-height: 100vh;
  background: var(--lp-fondo);
  color: var(--lp-tinta);
}

/* ---------- Marca ---------- */
.marca {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  text-decoration: none;
}
.marca__escudo {
  height: 48px;
  width: auto;
}
.marca__texto {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.marca__linea {
  font-size: 0.72rem;
  opacity: 0.8;
}
.marca__nombre {
  font-size: 1.35rem;
  font-weight: 700;
}

/* ---------- Panel lateral ---------- */
.lateral {
  position: sticky;
  top: 0;
  height: 100vh;
  background:
    radial-gradient(560px 360px at 100% 0%, rgba(31, 111, 178, 0.5), transparent 70%),
    linear-gradient(180deg, var(--lp-azul-700) 0%, var(--lp-azul-900) 100%);
  color: #fff;
  border-right: 4px solid var(--lp-dorado);
}
.lateral__interno {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  margin-inline: auto;
  padding: 40px 32px;
}
.lateral__centro {
  margin-block: auto;
  padding-block: 32px;
}
.lateral__plataforma {
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--lp-azul-900);
  background: var(--lp-dorado);
}
.lateral__titulo {
  margin: 0 0 16px;
  font-size: clamp(1.7rem, 2.6vw, 2.2rem);
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.lateral__texto {
  margin: 0 0 32px;
  max-width: 44ch;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}
.beneficios {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.beneficio {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.beneficio__icono {
  flex: 0 0 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--lp-dorado);
  background: rgba(255, 255, 255, 0.1);
}
.lateral__pie {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
}

/* ---------- Encabezado móvil ---------- */
.movil {
  padding: 14px 16px;
  background: var(--lp-azul-900);
  border-bottom: 3px solid var(--lp-dorado);
}
.movil .marca__escudo {
  height: 38px;
}

/* ---------- Formulario ---------- */
.contenido {
  min-width: 0;
}
.contenido__centro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
}
.formulario {
  width: 100%;
  max-width: 440px;
  border: 1px solid var(--lp-borde);
  overflow: hidden;
}
.formulario__cabecera {
  padding: 32px 32px 4px;
}
.formulario__titulo {
  margin: 0 0 4px;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--lp-azul-900);
}
.formulario__sub {
  margin: 0;
  color: var(--lp-tinta-suave);
}
.formulario__cuerpo {
  padding: 24px 32px 28px;
}
.opciones {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 4px 0 20px;
}
.enlace {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--lp-azul-500);
  text-decoration: none;
}
.enlace:hover {
  text-decoration: underline;
}
.btn-principal {
  background: var(--lp-azul-700) !important;
  color: #fff !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}
.btn-principal:hover {
  background: var(--lp-azul-500) !important;
}
.btn-principal.v-btn--disabled {
  opacity: 0.45;
}

.formulario__pie {
  padding: 20px 32px 24px;
  text-align: center;
  background: var(--lp-fondo);
  border-top: 1px solid var(--lp-borde);
}
.formulario__pie-texto {
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: var(--lp-tinta-suave);
}
.btn-registro {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  color: var(--lp-azul-700);
  border-color: var(--lp-azul-700);
}
.btn-registro:hover {
  background: rgba(15, 61, 107, 0.06);
}

.volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: 0.9rem;
  color: var(--lp-tinta-suave);
  text-decoration: none;
}
.volver:hover {
  color: var(--lp-azul-500);
}

/* ---------- Responsive ---------- */
@media (max-width: 959px) {
  .login {
    display: block;
  }
  .contenido__centro {
    min-height: calc(100vh - 68px);
    justify-content: flex-start;
    padding: 24px 12px 32px;
  }
  .formulario__cabecera {
    padding: 24px 20px 4px;
  }
  .formulario__cuerpo {
    padding: 20px 20px 24px;
  }
  .formulario__pie {
    padding-inline: 20px;
  }
}
@media (max-width: 1280px) {
  .beneficios {
    grid-template-columns: 1fr;
  }
}
</style>