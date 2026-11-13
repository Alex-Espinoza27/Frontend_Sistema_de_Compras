<script setup lang="ts">
import { computed, ref } from 'vue'

import { datosAbiertosApi } from '@/api/datosAbiertos.api'
import { useDescarga } from '@/composables/useDescarga'
import type { EstadisticasPublicas } from '@/modules/publico/publico.types'

const estadisticas = ref<EstadisticasPublicas | null>(null)
datosAbiertosApi.estadisticas().then((data) => (estadisticas.value = data))

const { cargando: descargando, bloqueado, descargar } = useDescarga()
const descargasAbierto = ref(true)

// Mismas 4 categorías y el mismo diseño de tarjeta que `ConvocatoriasEntidadView.vue`
// (05C hardening, pedido explícitamente por el usuario: "reutiliza el diseño de
// los card de indicadores de la página base") — aquí sin interacción (no son
// clicables, no hay pestañas que filtrar) y sin acotar por entidad, porque esta
// pantalla es el total de toda la plataforma.
const listaTarjetas = computed(() => {
  const getCount = (codes: string[]) => {
    if (!estadisticas.value) return 0
    return estadisticas.value.convocatorias_por_estado
      .filter((e) => codes.includes(e.codigo))
      .reduce((acc, curr) => acc + curr.total, 0)
  }

  return [
    { id: 'vigentes', label: 'Vigentes', total: getCount(['PUBLICADA', 'VIGENTE']), color: 'primary', icon: 'mdi-bullhorn-outline' },
    { id: 'en_evaluacion', label: 'En evaluación', total: getCount(['EN_EVALUACION']), color: 'info', icon: 'mdi-clipboard-text-search-outline' },
    { id: 'adjudicadas', label: 'Adjudicadas', total: getCount(['ADJUDICADA']), color: 'success', icon: 'mdi-check-decagram-outline' },
    { id: 'desiertas', label: 'Desiertas', total: getCount(['DESIERTA']), color: 'warning', icon: 'mdi-file-remove-outline' },
    { id: 'proveedores', label: 'Proveedores participantes', total: estadisticas.value?.proveedores_participantes ?? 0, color: 'secondary', icon: 'mdi-account-group-outline' },
  ]
})
</script>

<template>
  <v-container class="py-8 portal-publico-container">
    <v-card class="pa-6 mb-6 rounded-lg hero-banner" elevation="0">
      <div class="d-flex align-center ga-2 mb-2">
        <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
          <v-icon icon="mdi-shield-check" size="14" class="mr-1" />
          Transparencia y datos abiertos
        </v-chip>
      </div>
      <h1 class="text-h4 text-titulo font-weight-bold mb-2">Datos abiertos</h1>
      <p class="text-body-1 text-grey-darken-1 mb-0" style="max-width: 800px">
        Información pública de todas las entidades registradas en la plataforma, actualizada al momento.
      </p>
    </v-card>

    <template v-if="estadisticas">
      <div class="mb-2 d-flex align-center ga-1">
        <v-icon icon="mdi-chart-timeline-variant" size="16" class="text-grey" />
        <span class="text-subtitle-2 text-uppercase text-grey font-weight-bold">
          Resumen de procesos y participación
        </span>
      </div>

      <!-- Grid propio (no v-row/v-col): con 5 tarjetas, el grid de 12 columnas
           de Vuetify no las reparte exacto (12 / 5 no es entero) y la última
           quedaba sola en una fila completa. `repeat(5, 1fr)` las reparte
           siempre en una sola línea en escritorio. -->
      <div class="indicadores-grid mb-5">
        <v-card
          v-for="card in listaTarjetas"
          :key="card.id"
          class="pa-3 metrica-card rounded-lg d-flex flex-column justify-space-between"
          style="cursor: default"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <v-avatar :color="card.color" size="32" variant="tonal" rounded="md">
              <v-icon :icon="card.icon" size="18" />
            </v-avatar>
          </div>
          <div>
            <div class="text-h5 font-weight-bold font-datos mb-0 lh-tight" :class="`text-${card.color}`">
              {{ card.total }}
            </div>
            <div class="text-caption font-weight-bold text-truncate text-grey-darken-1">
              {{ card.label }}
            </div>
          </div>
        </v-card>
      </div>

      <!-- Centro de Descargas y Datos Abiertos — mismo diseño que la página inicial -->
      <v-card class="mb-8 rounded-lg descargas-container border" elevation="0">
        <div
          class="pa-4 d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center ga-3 cursor-pointer"
          @click="descargasAbierto = !descargasAbierto"
        >
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" variant="tonal" size="40" rounded="lg">
              <v-icon icon="mdi-tray-arrow-down" size="22" />
            </v-avatar>
            <div>
              <div class="text-subtitle-1 text-titulo font-weight-bold">
                Descarga de Datos Abiertos y Transparencia
              </div>
              <div class="text-caption text-grey">
                Formatos estándar (.xlsx y .csv) de convocatorias y adjudicaciones públicas.
              </div>
            </div>
          </div>

          <v-btn
            variant="tonal"
            size="small"
            color="primary"
            class="text-none font-weight-medium flex-shrink-0"
            :append-icon="descargasAbierto ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            @click.stop="descargasAbierto = !descargasAbierto"
          >
            {{ descargasAbierto ? 'Ocultar descargas' : 'Ver descargas' }}
          </v-btn>
        </div>

        <v-expand-transition>
          <div v-show="descargasAbierto" class="px-5 pb-5 pt-1 border-t">
            <v-row density="comfortable" class="mt-1">
              <v-col cols="12" md="6">
                <div class="descarga-grupo-card pa-4 rounded-lg h-100 border">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-icon icon="mdi-file-document-multiple-outline" color="primary" size="20" />
                    <span class="text-subtitle-2 font-weight-bold">Procesos de Convocatoria</span>
                  </div>
                  <p class="text-caption text-grey mb-3">
                    Listado de bases, requerimientos, fechas límites de postulación y estado actual de cada proceso.
                  </p>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn
                      variant="tonal"
                      color="success"
                      size="small"
                      prepend-icon="mdi-file-excel-box"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.convocatoriasXlsxUrl(), 'convocatorias.xlsx')"
                    >
                      Excel (.xlsx)
                    </v-btn>
                    <v-btn
                      variant="tonal"
                      color="primary"
                      size="small"
                      prepend-icon="mdi-file-delimited"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.convocatoriasCsvUrl(), 'convocatorias.csv')"
                    >
                      CSV (.csv)
                    </v-btn>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <div class="descarga-grupo-card pa-4 rounded-lg h-100 border">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-icon icon="mdi-trophy-outline" color="warning" size="20" />
                    <span class="text-subtitle-2 font-weight-bold">Adjudicaciones y Resultados</span>
                  </div>
                  <p class="text-caption text-grey mb-3">
                    Resultados definitivos, proveedores ganadores, actas y montos contratados por la entidad.
                  </p>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn
                      variant="tonal"
                      color="success"
                      size="small"
                      prepend-icon="mdi-file-excel-box"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.adjudicacionesXlsxUrl(), 'adjudicaciones.xlsx')"
                    >
                      Excel (.xlsx)
                    </v-btn>
                    <v-btn
                      variant="tonal"
                      color="primary"
                      size="small"
                      prepend-icon="mdi-file-delimited"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.adjudicacionesCsvUrl(), 'adjudicaciones.csv')"
                    >
                      CSV (.csv)
                    </v-btn>
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>
      </v-card>
    </template>
  </v-container>
</template>

<style scoped>
.indicadores-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
@media (max-width: 959px) {
  .indicadores-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 599px) {
  .indicadores-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.hero-banner {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-secondary), 0.03) 100%);
  border: 1px solid rgba(var(--v-border-color), 0.8);
}

.cursor-pointer {
  cursor: pointer;
}

.metrica-card {
  border: 1px solid rgba(var(--v-border-color), 0.8);
  background: rgb(var(--v-theme-surface));
}

.descargas-container {
  background: rgb(var(--v-theme-surface));
}

.descarga-grupo-card {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-color: rgba(var(--v-border-color), 0.6) !important;
}
</style>
