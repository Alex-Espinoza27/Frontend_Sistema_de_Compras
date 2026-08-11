<script setup lang="ts">
import { watch } from 'vue'
import { useTheme } from 'vuetify'
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
</script>

<template>
  <router-view />
</template>
