import { globalIgnores } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import prettierConfig from 'eslint-config-prettier'

export default defineConfigWithVueTs(
  globalIgnores(['dist/**', 'node_modules/**']),
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    // Vuetify nombra sus slots dinámicos con puntos (`item.<col>` en
    // v-data-table-server, `item.<n>` en v-stepper) — eslint-plugin-vue
    // interpreta la parte después del punto como un modificador inválido de
    // v-slot, aunque el propio compilador de Vue lo acepta sin problema. Ver
    // 05C — Fase 3 (stepper) y Fase 5 (tablas): esto se repite en cada
    // pantalla con tabla o stepper, así que se desactiva a nivel de proyecto.
    rules: { 'vue/valid-v-slot': 'off' },
  },
  prettierConfig,
)
