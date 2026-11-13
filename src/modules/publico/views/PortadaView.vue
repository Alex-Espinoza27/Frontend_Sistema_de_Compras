<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

import { publicoApi } from '@/api/publico.api'
import ConvocatoriasEntidadView from '@/modules/publico/views/ConvocatoriasEntidadView.vue'
import TarjetaEntidad from '@/modules/publico/components/TarjetaEntidad.vue'
import type { EntidadPublica } from '@/modules/publico/publico.types'

const params = reactive({ buscar: '', soloConVigentes: false })
const entidades = ref<EntidadPublica[]>([])
const cargando = ref(false)

// Entidad principal (05C hardening, pedido explícitamente por el usuario):
// si el admin configuró una (Configuración → ENTIDAD_PRINCIPAL_RUC), "/"
// la muestra directo aunque haya más de una entidad aprobada — sin esto,
// apenas se aprobara una segunda entidad, "/" caía al buscador genérico en
// vez de seguir mostrando el diseño de convocatorias de La Perla. Se pide
// una sola vez (no depende de los filtros de búsqueda).
const entidadPrincipalId = ref<number | null>(null)
// Promesa cacheada (no depende de los filtros de búsqueda): `cargar()` la
// espera junto con `entidades()` para no evaluar `entidadUnicaId` antes de
// que esta resuelva (si no, la primera carga podía caer al buscador
// genérico y quedarse así, sin volver a evaluar cuando ya se tenía el dato).
// `.catch`: si falla, no debe tumbar `cargar()` (ver Promise.all abajo) —
// simplemente no hay entidad principal y se cae al criterio de "solo hay
// una", igual que antes de este cambio.
const temaPromise = publicoApi
  .tema()
  .then((data) => {
    entidadPrincipalId.value = data.entidad_principal_id
  })
  .catch(() => {})

// Entidad única: si la plataforma solo aloja una entidad (o no hay entidad
// principal configurada pero de todas formas solo hay una), "/" incrusta
// directamente sus convocatorias (sin redirect y sin exponer el id en la URL).
const entidadUnicaId = ref<number | null>(null)
// Hasta resolver la primera consulta no se sabe si hay 1 o varias entidades.
const primeraCarga = ref(true)

const hayFiltros = computed(() => !!params.buscar || params.soloConVigentes)

async function cargar() {
  cargando.value = true
  try {
    const [respuesta] = await Promise.all([
      publicoApi.entidades({
        buscar: params.buscar || undefined,
        solo_con_vigentes: params.soloConVigentes || undefined,
      }),
      temaPromise,
    ])
    entidades.value = respuesta.items

    const principalVisible =
      entidadPrincipalId.value !== null &&
      respuesta.items.some((item) => item.entidad_id === entidadPrincipalId.value)
        ? entidadPrincipalId.value
        : null

    entidadUnicaId.value = hayFiltros.value
      ? null
      : principalVisible ?? (respuesta.items.length === 1 ? respuesta.items[0].entidad_id : null)
  } finally {
    cargando.value = false
    primeraCarga.value = false
  }
}

function limpiarFiltros() {
  params.buscar = ''
  params.soloConVigentes = false
}

let temporizador: ReturnType<typeof setTimeout>
watch(
  () => [params.buscar, params.soloConVigentes],
  () => {
    clearTimeout(temporizador)
    temporizador = setTimeout(cargar, 400)
  },
)

cargar()

// Las convocatorias cambian solas (scheduler); se refresca al reenfocar (05A §11).
function alReenfocar() {
  if (document.visibilityState === 'visible') cargar()
}
onMounted(() => document.addEventListener('visibilitychange', alReenfocar))
onUnmounted(() => {
  document.removeEventListener('visibilitychange', alReenfocar)
  clearTimeout(temporizador)
})
</script>

<template>
  <div class="pagina">
    <!-- Plataforma con una sola entidad: "/" muestra sus convocatorias directamente -->
    <ConvocatoriasEntidadView v-if="entidadUnicaId" :entidad-id="entidadUnicaId" />

    <!-- Primera carga: skeleton en vez de pantalla vacía -->
    <v-container v-else-if="primeraCarga" class="py-10">
      <v-skeleton-loader type="heading, paragraph" class="mb-8" max-width="560" />
      <v-row>
        <v-col v-for="n in 3" :key="n" cols="12" sm="6" md="4">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>
    </v-container>

    <template v-else>
      <!-- Hero -->
      <section class="hero">
        <v-container class="hero__interna">
          <div class="hero__texto">
            <h1 class="hero__titulo">Contrataciones públicas, a la vista de todos</h1>
            <p class="hero__sub">
              Consulte las contrataciones de bienes y servicios hasta 8 UIT de la Municipalidad
              Distrital de La Perla y de las demás entidades públicas registradas.
            </p>
          </div>

          <!-- Buscador flotante -->
          <v-sheet class="buscador" rounded="xl" elevation="8">
            <v-text-field
              v-model="params.buscar"
              placeholder="Buscar entidad por razón social o sigla"
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              flat
              hide-details
              clearable
              density="comfortable"
              class="buscador__campo"
              aria-label="Buscar entidad"
            />
            <v-chip
              :color="params.soloConVigentes ? 'primary' : undefined"
              :variant="params.soloConVigentes ? 'flat' : 'outlined'"
              filter
              size="large"
              class="buscador__chip"
              @click="params.soloConVigentes = !params.soloConVigentes"
            >
              Con convocatorias vigentes
            </v-chip>
          </v-sheet>
        </v-container>
      </section>

      <!-- Resultados -->
      <v-container class="resultados">
        <div class="resultados__cabecera">
          <h2 class="resultados__titulo">Entidades</h2>
          <span v-if="!cargando" class="resultados__cuenta">
            {{ entidades.length }}
            {{ entidades.length === 1 ? 'entidad encontrada' : 'entidades encontradas' }}
          </span>
        </div>

        <v-row v-if="cargando && !entidades.length">
          <v-col v-for="n in 3" :key="n" cols="12" sm="6" md="4">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>

        <v-row v-else-if="entidades.length" :class="{ 'resultados--cargando': cargando }">
          <v-col v-for="entidad in entidades" :key="entidad.entidad_id" cols="12" sm="6" md="4">
            <TarjetaEntidad :entidad="entidad" />
          </v-col>
        </v-row>

        <!-- Vacío: explica y ofrece una acción -->
        <div v-else class="vacio">
          <v-icon icon="mdi-domain-off" size="48" class="mb-3" />
          <div class="vacio__titulo">No encontramos entidades con esos criterios</div>
          <div class="vacio__texto">Revise el nombre o la sigla, o quite los filtros activos.</div>
          <v-btn
            v-if="hayFiltros"
            color="primary"
            variant="tonal"
            class="mt-4 text-none"
            @click="limpiarFiltros"
          >
            Quitar filtros
          </v-btn>
        </div>
      </v-container>

      <!-- Accesos para proveedores y entidades -->
      <section class="accesos">
        <v-container>
          <v-row>
            <v-col cols="12" md="6">
              <router-link to="/registro" class="acceso">
                <v-icon icon="mdi-account-plus-outline" size="28" class="acceso__icono" />
                <div>
                  <div class="acceso__titulo">¿Es proveedor?</div>
                  <div class="acceso__texto">Regístrese para recibir y presentar cotizaciones.</div>
                </div>
                <v-icon icon="mdi-chevron-right" class="ml-auto" />
              </router-link>
            </v-col>
            <v-col cols="12" md="6">
              <router-link to="/solicitud-entidad" class="acceso">
                <v-icon icon="mdi-domain-plus" size="28" class="acceso__icono" />
                <div>
                  <div class="acceso__titulo">¿Representa a una entidad pública?</div>
                  <div class="acceso__texto">Solicite el alta de su entidad en la plataforma.</div>
                </div>
                <v-icon icon="mdi-chevron-right" class="ml-auto" />
              </router-link>
            </v-col>
          </v-row>
        </v-container>
      </section>
    </template>

  </div>
</template>

<style scoped>
/*
  El dorado/azul del hero es una franja institucional fija (igual en claro y
  oscuro, como la cabecera/pie de LayoutPublico.vue). El resto de la página
  (fondo, buscador, tarjetas "vacío"/"acceso") sí debe seguir el tema activo
  — por eso usa directamente los tokens de Vuetify (ver vuetify.ts) en vez
  de hex fijos: antes solo cambiaban las v-card (TarjetaEntidad) porque esas
  heredan el tema solas, pero el fondo y estas secciones tenían su propia
  paleta fija y se quedaban claras en modo oscuro.
*/
.pagina {
  --lp-azul-900: #0a2c52;
  --lp-azul-700: #0f3d6b;
  --lp-azul-500: #1f6fb2;
  --lp-dorado: #e3a928;
  --lp-borde: rgba(var(--v-theme-on-surface), 0.12);

  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  background:
    radial-gradient(900px 340px at 85% -10%, rgba(31, 111, 178, 0.55), transparent 70%),
    linear-gradient(180deg, var(--lp-azul-700) 0%, var(--lp-azul-900) 100%);
  color: #fff;
  padding-block: 56px 88px;
}
.hero__interna {
  position: relative;
}
.hero__texto {
  max-width: 720px;
}
.hero__titulo {
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 16px;
}
.hero__sub {
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 62ch;
  margin: 0;
  color: rgba(255, 255, 255, 0.86);
}

/* Buscador que "cuelga" entre hero y resultados */
.buscador {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -40px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface));
}
.buscador__campo {
  flex: 1 1 320px;
}
.buscador__campo :deep(.v-field) {
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}
.buscador__chip {
  flex: 0 0 auto;
}

/* ---------- Resultados ---------- */
.resultados {
  padding-top: 88px;
  padding-bottom: 32px;
}
.resultados__cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}
.resultados__titulo {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
}
.resultados__cuenta {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.resultados--cargando {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.vacio {
  text-align: center;
  padding: 56px 16px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  background: rgb(var(--v-theme-surface));
  border: 1px dashed var(--lp-borde);
  border-radius: 16px;
  margin-top: 16px;
}
.vacio__titulo {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.vacio__texto {
  margin-top: 4px;
}

/* ---------- Accesos ---------- */
.accesos {
  padding-block: 8px 48px;
}
.acceso {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--lp-borde);
  border-left: 4px solid var(--lp-dorado);
  border-radius: 12px;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.acceso:hover,
.acceso:focus-visible {
  border-color: var(--lp-azul-500);
  border-left-color: var(--lp-dorado);
  box-shadow: 0 6px 20px rgba(15, 61, 107, 0.12);
}
.acceso__icono {
  color: var(--lp-azul-500);
}
.acceso__titulo {
  font-weight: 600;
}
.acceso__texto {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

@media (max-width: 600px) {
  .hero {
    padding-block: 36px 112px;
  }
  .resultados {
    padding-top: 128px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .acceso,
  .resultados--cargando {
    transition: none;
  }
}
</style>