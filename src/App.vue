<script setup lang="ts">
import { watch } from 'vue'
import { useTheme } from 'vuetify'
import { publicoApi } from '@/api/publico.api'
import { useColorMarca } from '@/composables/useColorMarca'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const theme = useTheme()

// El store es la fuente de verdad (persistida en localStorage); aquí se
// aplica al tema real de Vuetify (05A §7 / 05D §5).
watch(
  () => ui.tema,
  (tema) => {
    theme.change(tema)
  },
  { immediate: true },
)

// Color de marca configurable (05C hardening, pedido explícitamente por el
// usuario): se pide una sola vez al arrancar la app (público, no necesita
// sesión) y se aplica en caliente al header y a los botones primarios de
// toda la plataforma. Si falla (red, etc.) se queda el azul estático de
// vuetify.ts — nunca bloquea el arranque de la app.
const { aplicar: aplicarColorMarca } = useColorMarca()
publicoApi.tema().then((data) => aplicarColorMarca(data.color_primario)).catch(() => {})
</script>

<template>
  <router-view />
</template>
