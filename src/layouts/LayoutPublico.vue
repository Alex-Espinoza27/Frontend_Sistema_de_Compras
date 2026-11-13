<script setup lang="ts">
// Portal ciudadano (sin sesión). Contenido real: Fase 2 (05C).
// Este layout es el único dueño de la cabecera, los accesos y el pie del
// portal público: las vistas hijas (Home, etc.) no deben repetirlos.
import { computed } from 'vue'

import BaseSnackbar from '@/components/base/BaseSnackbar.vue'
import logoLaPerla from '@/assets/logo-la-perla.png'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const auth = useAuthStore()
const nombreInstitucion = import.meta.env.VITE_APP_NOMBRE || 'Compras La Perla'

const esClaro = computed(() => ui.tema === 'claro')
const anio = new Date().getFullYear()

// Accesos del portal. Un solo arreglo alimenta el menú de escritorio, el
// menú móvil y el pie.
const enlaces = [
  { texto: 'Datos abiertos', to: '/datos-abiertos', icono: 'mdi-database-outline' },
  { texto: 'Soy proveedor', to: '/registro', icono: 'mdi-account-plus-outline' },
  //{ texto: 'Solicitar alta de entidad', to: '/solicitud-entidad', icono: 'mdi-domain-plus' },
]
</script>

<template>
  <v-app>
    <v-app-bar
      flat
      height="68"
      class="barra"
      :class="esClaro ? 'barra--claro' : 'barra--oscuro'"
      :color="esClaro ? 'secondary' : 'surface'"
    >
      <v-container class="barra__interna">
        <!-- Marca -->
        <router-link to="/" class="marca" aria-label="Ir al inicio">
          <span class="marca__logo">
            <img :src="logoLaPerla" alt="" class="marca__img" />
          </span>
          <span class="marca__texto">
            <span class="marca__linea">Municipalidad Distrital de</span>
            <span class="marca__nombre">La Perla</span>
          </span>
          <span class="marca__sep d-none d-lg-block" aria-hidden="true" />
          <span class="marca__plataforma d-none d-lg-inline">{{ nombreInstitucion }}</span>
        </router-link>

        <v-spacer />

        <!-- Accesos (escritorio) -->
        <nav class="d-none d-md-flex align-center ga-1" aria-label="Principal">
          <v-btn
            v-for="e in enlaces"
            :key="e.to"
            :to="e.to"
            variant="text"
            size="small"
            class="barra__link"
          >
            {{ e.texto }}
          </v-btn>
        </nav>

        <v-divider vertical class="barra__div d-none d-md-block mx-3" />

        <!-- Tema -->
        <v-btn
          :icon="esClaro ? 'mdi-weather-night' : 'mdi-weather-sunny'"
          variant="text"
          size="small"
          class="barra__icono"
          :title="esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
          :aria-label="esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
          @click="ui.alternarTema()"
        />

        <!-- Sesión (escritorio) -->
        <div class="d-none d-md-flex align-center ga-2 ml-2">
          <template v-if="!auth.autenticado">
            <v-btn to="/login" variant="outlined" size="small" class="btn-borde text-none">
              Iniciar sesión
            </v-btn>
            <v-btn to="/registro" variant="flat" size="small" class="btn-acento text-none">
              Registrarse
            </v-btn>
          </template>
          <v-btn
            v-else
            to="/app"
            variant="flat"
            size="small"
            class="btn-acento text-none"
            prepend-icon="mdi-view-dashboard-outline"
          >
            Ir a mi panel
          </v-btn>
        </div>

        <!-- Menú móvil -->
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-menu"
              variant="text"
              class="d-md-none barra__icono"
              aria-label="Abrir menú"
            />
          </template>
          <v-list min-width="260" density="comfortable" class="py-2">
            <v-list-item
              v-for="e in enlaces"
              :key="e.to"
              :to="e.to"
              :prepend-icon="e.icono"
              :title="e.texto"
            />
            <v-divider class="my-2" />
            <template v-if="!auth.autenticado">
              <v-list-item to="/login" prepend-icon="mdi-login" title="Iniciar sesión" />
              <v-list-item
                to="/registro"
                prepend-icon="mdi-account-plus"
                title="Registrarse como proveedor"
                class="font-weight-bold"
              />
            </template>
            <v-list-item
              v-else
              to="/app"
              prepend-icon="mdi-view-dashboard-outline"
              title="Ir a mi panel"
              class="font-weight-bold"
            />
          </v-list>
        </v-menu>
      </v-container>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <!-- Pie institucional -->
    <v-footer class="pie">
      <v-container class="pie__interna">
        <div class="pie__marca">
          <span class="marca__logo marca__logo--pie">
            <img :src="logoLaPerla" alt="" class="marca__img" />
          </span>
          <div>
            <div class="pie__nombre">Municipalidad Distrital de La Perla</div>
            <div class="pie__sub">{{ nombreInstitucion }} · Callao, Perú</div>
          </div>
        </div>

        <nav class="pie__enlaces" aria-label="Enlaces del pie">
          <router-link v-for="e in enlaces" :key="e.to" :to="e.to" class="pie__link">
            {{ e.texto }}
          </router-link>
        </nav>

        <div class="pie__copy">© {{ anio }} Municipalidad Distrital de La Perla</div>
      </v-container>
    </v-footer>

    <BaseSnackbar />
  </v-app>
</template>

<style scoped>
/*
  El color base de la barra sale del tema (secondary en claro, surface en
  oscuro). El dorado institucional no está en el tema: si lo agrega como
  color "acento" en createVuetify, reemplace --lp-dorado por
  rgb(var(--v-theme-acento)). Valor aproximado: ajustar con el del escudo.
*/
.barra {
  --lp-dorado: #e3a928;
  --lp-azul-900: #0a2c52;

  border-bottom: 3px solid var(--lp-dorado);
}
.barra__interna {
  display: flex;
  align-items: center;
  height: 100%;
  padding-block: 0;
}

/* ---------- Marca ---------- */
.marca {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  text-decoration: none;
}
.marca__logo {
  display: grid;
  place-items: center;
  padding: 4px 7px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}
.marca:hover .marca__logo {
  transform: scale(1.05);
}
.marca__img {
  display: block;
  height: 38px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}
.marca__texto {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.marca__linea {
  font-size: 0.7rem;
  opacity: 0.8;
}
.marca__nombre {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.marca__sep {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.3);
}
.marca__plataforma {
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0.95;
}

/* ---------- Accesos ---------- */
.barra__link,
.barra__icono {
  color: #fff !important;
  text-transform: none;
  letter-spacing: 0;
}
.barra__link {
  position: relative;
}
.barra__link:hover {
  background: rgba(255, 255, 255, 0.1);
}
/* Enlace de la ruta activa: subrayado dorado */
.barra__link.v-btn--active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--lp-dorado);
}
.barra__link.v-btn--active :deep(.v-btn__overlay) {
  opacity: 0;
}
.barra__div {
  opacity: 0.3;
  height: 28px;
  align-self: center;
}
.btn-borde {
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.55);
  font-weight: 600;
  letter-spacing: 0;
}
.btn-borde:hover {
  background: rgba(255, 255, 255, 0.1);
}
.btn-acento {
  background: var(--lp-dorado) !important;
  color: var(--lp-azul-900) !important;
  font-weight: 700;
  letter-spacing: 0;
}
.btn-acento:hover {
  filter: brightness(1.06);
}

/* Modo oscuro: barra superficie, con filo sutil */
.barra--oscuro .marca__logo {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* ---------- Pie ---------- */
.pie {
  background: rgb(var(--v-theme-secondary)) !important;
  color: rgba(255, 255, 255, 0.8) !important;
  padding: 0;
  border-top: 3px solid #e3a928;
}
.pie__interna {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px 32px;
  padding-block: 24px;
}
.pie__marca {
  display: flex;
  align-items: center;
  gap: 14px;
}
.marca__logo--pie .marca__img {
  height: 34px;
}
.pie__nombre {
  color: #fff;
  font-weight: 700;
}
.pie__sub {
  font-size: 0.85rem;
  opacity: 0.8;
}
.pie__enlaces {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  justify-content: flex-end;
}
.pie__link {
  color: #fff;
  font-size: 0.9rem;
  text-decoration: none;
}
.pie__link:hover {
  text-decoration: underline;
  text-decoration-color: #e3a928;
}
.pie__copy {
  grid-column: 1 / -1;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.8rem;
  opacity: 0.7;
}

@media (max-width: 959px) {
  .pie__interna {
    grid-template-columns: 1fr;
  }
  .pie__enlaces {
    justify-content: flex-start;
  }
}
@media (max-width: 400px) {
  .marca__linea {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .marca__logo {
    transition: none;
  }
}
</style>