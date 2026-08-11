<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { publicoApi } from '@/api/publico.api'
import TarjetaEntidad from '@/modules/publico/components/TarjetaEntidad.vue'
import type { EntidadPublica } from '@/modules/publico/publico.types'

const router = useRouter()
const params = reactive({ buscar: '', soloConVigentes: false })
const entidades = ref<EntidadPublica[]>([])
const cargando = ref(false)

async function cargar() {
  cargando.value = true
  try {
    const respuesta = await publicoApi.entidades({
      buscar: params.buscar || undefined,
      solo_con_vigentes: params.soloConVigentes || undefined,
    })
    entidades.value = respuesta.items
    // Entidad preseleccionada cuando la plataforma solo aloja una (05C
    // hardening, pedido explícitamente por el usuario): se salta el paso de
    // elegir entre tarjetas y va directo a sus convocatorias. Si hay más de
    // una, o el usuario está filtrando por texto, se muestra la grilla normal.
    if (respuesta.items.length === 1 && !params.buscar) {
      router.replace(`/entidad/${respuesta.items[0].entidad_id}`)
    }
  } finally {
    cargando.value = false
  }
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
onUnmounted(() => document.removeEventListener('visibilitychange', alReenfocar))
</script>

<template>
  <div>
    <section class="hero py-12 px-4">
      <v-container>
        <div class="text-h4 text-titulo mb-2">Compras La Perla</div>
        <div class="text-body-1 text-grey mb-8" style="max-width: 640px">
          Consulta las contrataciones de bienes y servicios (hasta 8 UIT) de la Municipalidad
          Distrital de La Perla y de las demás entidades públicas y privadas registradas en la plataforma.
        </div>

        <div class="d-flex flex-wrap ga-4 mb-2">
          <v-text-field
            v-model="params.buscar"
            label="Buscar entidad por razón social o sigla"
            prepend-inner-icon="mdi-magnify"
            style="max-width: 420px"
            clearable
          />
          <v-switch v-model="params.soloConVigentes" label="Solo con convocatorias vigentes" hide-details />
        </div>

        <div class="d-flex flex-wrap ga-4 mt-2">
          <router-link to="/datos-abiertos" class="text-body-2">Datos abiertos</router-link>
          <router-link to="/registro" class="text-body-2">Registrarme como proveedor</router-link>
          <router-link to="/solicitud-entidad" class="text-body-2">Solicitar alta de entidad</router-link>
          <router-link to="/login" class="text-body-2">Iniciar sesión</router-link>
        </div>
      </v-container>
    </section>

    <v-container class="py-8">
      <v-row v-if="entidades.length">
        <v-col v-for="entidad in entidades" :key="entidad.entidad_id" cols="12" sm="6" md="4">
          <TarjetaEntidad :entidad="entidad" />
        </v-col>
      </v-row>
      <div v-else-if="!cargando" class="text-center py-12 text-grey">
        No se encontraron entidades con ese criterio.
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  background: rgb(var(--v-theme-background));
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -120px;
  right: -120px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  opacity: 0.06;
  pointer-events: none;
}
</style>
