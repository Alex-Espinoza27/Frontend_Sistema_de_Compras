<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'

import { publicoApi } from '@/api/publico.api'
import ConvocatoriasEntidadView from '@/modules/publico/views/ConvocatoriasEntidadView.vue'
import TarjetaEntidad from '@/modules/publico/components/TarjetaEntidad.vue'
import type { EntidadPublica } from '@/modules/publico/publico.types'

const nombreInstitucion = import.meta.env.VITE_APP_NOMBRE || 'Compras La Perla'
const params = reactive({ buscar: '', soloConVigentes: false })
const entidades = ref<EntidadPublica[]>([])
const cargando = ref(false)

// Entidad única (05C hardening, pedido explícitamente por el usuario): antes
// se saltaba el paso de elegir entre tarjetas navegando a "/entidad/{id}"
// (redirect visible, y cualquiera podía después cambiar el id en la URL). En
// vez de eso, cuando la plataforma solo aloja una entidad, esta misma
// pantalla (la URL sigue siendo "/") incrusta directamente el componente de
// convocatorias de esa entidad. Si hay más de una, o el usuario está
// filtrando por texto, se muestra la grilla normal.
const entidadUnicaId = ref<number | null>(null)
// Hasta que se resuelve la primera consulta no se sabe si hay 1 o varias
// entidades — mientras tanto no se muestra ni el hero (se vería y
// desaparecería de inmediato si termina habiendo una sola) ni el listado.
const primeraCarga = ref(true)

async function cargar() {
  cargando.value = true
  try {
    const respuesta = await publicoApi.entidades({
      buscar: params.buscar || undefined,
      solo_con_vigentes: params.soloConVigentes || undefined,
    })
    entidades.value = respuesta.items
    entidadUnicaId.value = respuesta.items.length === 1 && !params.buscar ? respuesta.items[0].entidad_id : null
  } finally {
    cargando.value = false
    primeraCarga.value = false
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
  <!-- Plataforma con una sola entidad (05C hardening, pedido explícitamente
       por el usuario): "/" muestra directamente sus convocatorias, mismo
       componente que usa la ruta "/entidad/{id}", sin redirigir. -->
  <ConvocatoriasEntidadView v-if="entidadUnicaId" :entidad-id="entidadUnicaId" />

  <div v-else-if="primeraCarga" class="d-flex justify-center py-16">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <div v-else>
    <section class="hero py-12 px-4">
      <v-container>
        <div class="text-h4 text-titulo font-weight-bold mb-2">{{ nombreInstitucion }}</div>
        <div class="text-body-1 text-grey mb-8" style="max-width: 640px">
          Consulta las contrataciones de bienes y servicios (hasta 8 UIT) de la Municipalidad
          Distrital de La Perla y de las demás entidades públicas registradas en la plataforma.
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
