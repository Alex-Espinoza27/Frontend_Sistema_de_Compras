<script setup lang="ts">
// Estructura de las pantallas de acceso (recuperar / restablecer contraseña):
// mismo panel institucional azul, mismo fondo, misma tarjeta y mismos tamaños
// que LoginView.vue, para que las tres pantallas se vean como una sola.
// Diseño fijo en modo claro (igual que Login/Registro): se fuerza el tema
// global a "claro" mientras está montado y se restaura al salir.
import { onUnmounted } from 'vue'
import { useTheme } from 'vuetify'

import logoLaPerla from '@/assets/logo_compras.jpg'

defineProps<{
  /** Título grande del panel institucional. */
  titulo: string
  texto: string
  beneficios: { icono: string; texto: string }[]
  /** Encabezado de la tarjeta del formulario. */
  tarjetaTitulo: string
  tarjetaSubtitulo?: string
}>()

const nombreApp = import.meta.env.VITE_APP_NOMBRE || 'Compras La Perla'

const theme = useTheme()
const temaAnterior = theme.global.name.value
theme.global.name.value = 'claro'
onUnmounted(() => {
  theme.global.name.value = temaAnterior
})
</script>

<template>
  <div class="auth-split">
    <aside class="lateral d-none d-md-flex">
      <div class="lateral__interno">
        <router-link to="/" class="marca" aria-label="Ir al inicio">
          <v-img :src="logoLaPerla" width="100px" rounded="xl" />
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad Distrital de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
        </router-link>

        <div class="lateral__centro">
          <div class="lateral__plataforma">{{ nombreApp }}</div>
          <h2 class="lateral__titulo">{{ titulo }}</h2>
          <p class="lateral__texto">{{ texto }}</p>

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

    <main class="contenido">
      <header class="movil d-md-none">
        <router-link to="/" class="marca" aria-label="Ir al inicio">
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad Distrital de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
        </router-link>
      </header>

      <div class="contenido__centro">
        <v-card class="formulario" rounded="xl" elevation="2">
          <div class="formulario__cabecera">
            <h1 class="formulario__titulo">{{ tarjetaTitulo }}</h1>
            <p v-if="tarjetaSubtitulo" class="formulario__sub">{{ tarjetaSubtitulo }}</p>
          </div>

          <div class="formulario__cuerpo">
            <slot />
          </div>

          <div v-if="$slots.pie" class="formulario__pie">
            <slot name="pie" />
          </div>
        </v-card>

        <router-link to="/login" class="volver">
          <v-icon icon="mdi-arrow-left" size="16" />
          Volver a iniciar sesión
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-split {
  --lp-azul-900: #0a2c52;
  --lp-azul-700: #0f3d6b;
  --lp-azul-500: #1f6fb2;
  --lp-dorado: #e3a928;
  --lp-fondo: #f4f7fb;
  --lp-tinta: #14233a;
  --lp-tinta-suave: #5a6b82;
  --lp-borde: #dbe3ee;

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

/* ---------- Tarjeta ---------- */
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
.formulario__pie {
  padding: 20px 32px 24px;
  text-align: center;
  background: var(--lp-fondo);
  border-top: 1px solid var(--lp-borde);
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

/* Estilos que usa el contenido de cada pantalla (van en el slot, por eso :deep). */
.auth-split :deep(.btn-principal) {
  background: var(--lp-azul-700) !important;
  color: #fff !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}
.auth-split :deep(.btn-principal:hover) {
  background: var(--lp-azul-500) !important;
}
.auth-split :deep(.btn-principal.v-btn--disabled) {
  opacity: 0.45;
}
.auth-split :deep(.btn-secundario) {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  color: var(--lp-azul-700);
  border-color: var(--lp-azul-700);
}
.auth-split :deep(.enlace) {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--lp-azul-500);
  text-decoration: none;
}
.auth-split :deep(.enlace:hover) {
  text-decoration: underline;
}

/* ---------- Responsive ---------- */
@media (max-width: 959px) {
  .auth-split {
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
