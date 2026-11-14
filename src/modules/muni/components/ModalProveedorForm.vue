<script setup lang="ts">
// Mantenimiento de Proveedores (05C hardening) — modal crear/editar. Mismos
// campos y reglas que el registro público (`RegistroView.vue` paso 3 para
// rubros), menos password/captcha: el admin crea la cuenta directamente
// (contraseña aleatoria + enlace de restablecimiento, igual que un usuario
// interno).
import { computed, reactive, ref, watch } from 'vue'

import { adminApi } from '@/api/admin.api'
import { publicoApi } from '@/api/publico.api'
import type { ProveedorAdminInput, TipoDocumentoProveedor, TipoPersona } from '@/modules/muni/muni.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

const props = defineProps<{ proveedorId: number | null }>()
const abierto = defineModel<boolean>('abierto', { default: false })
const emit = defineEmits<{ guardado: [] }>()

const ui = useUiStore()

const opcionesTipoDocumento: { title: string; value: TipoDocumentoProveedor }[] = [
  { title: 'RUC', value: 'RUC' },
  { title: 'DNI', value: 'DNI' },
  { title: 'CE', value: 'CE' },
]
const opcionesTipoPersona: { title: string; value: TipoPersona }[] = [
  { title: 'Jurídica', value: 'JURIDICA' },
  { title: 'Natural', value: 'NATURAL' },
]

const rubros = ref<RubroPublico[]>([])
const rubrosServicios = computed(() => rubros.value.filter((r) => r.tipo === 'SERVICIO'))
const rubrosBienes = computed(() => rubros.value.filter((r) => r.tipo === 'BIEN'))
publicoApi.rubros().then((data) => (rubros.value = data.items))

const form = reactive<ProveedorAdminInput>({
  numero_documento: '',
  tipo_documento: 'RUC',
  razon_social: '',
  tipo_persona: 'JURIDICA',
  correo: '',
  telefono: '',
  persona_contacto: '',
  rubros_servicios: [],
  rubros_bienes: [],
})

const cargando = ref(false)
// `erroresCampo` se declara antes del watch (y no después, como estaba):
// el watch es `immediate: true` y la referencia a una const declarada más
// abajo en el código fuente — aunque en `npm run dev` nunca falla porque Vue
// agenda el callback para después de que termine todo el setup(), el build
// de produccion (bundlers/orden de inicializacion de modulos) sí lo ejecutaba
// antes de que `erroresCampo` existiera, con `ReferenceError: Cannot access
// 'X' before initialization` — y esa excepcion sin capturar dejaba la cola
// de reactividad de Vue en mal estado para el resto de la sesion, rompiendo
// el posicionamiento de CUALQUIER v-select/v-menu en cualquier otro módulo
// hasta recargar la página (el bug reportado: "en todos los modales, el
// select aparece muy abajo, fuera del modal").
const erroresCampo = ref<Record<string, string[]>>({})
watch(
  () => props.proveedorId,
  async (id) => {
    Object.assign(form, {
      numero_documento: '',
      tipo_documento: 'RUC',
      razon_social: '',
      tipo_persona: 'JURIDICA',
      correo: '',
      telefono: '',
      persona_contacto: '',
      rubros_servicios: [],
      rubros_bienes: [],
    })
    erroresCampo.value = {}
    if (!id) return
    cargando.value = true
    try {
      const detalle = await adminApi.proveedorDetalle(id)
      form.numero_documento = detalle.numero_documento
      form.tipo_documento = detalle.tipo_documento
      form.razon_social = detalle.razon_social
      form.tipo_persona = detalle.tipo_persona
      form.correo = detalle.correo
      form.telefono = detalle.telefono
      form.persona_contacto = detalle.persona_contacto
      form.rubros_servicios = detalle.rubros_servicios.map((r) => r.rubro_id)
      form.rubros_bienes = detalle.rubros_bienes.map((r) => r.rubro_id)
    } finally {
      cargando.value = false
    }
  },
  { immediate: true },
)

const formValido = ref(false)
const guardando = ref(false)

async function guardar() {
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (props.proveedorId) {
      await adminApi.actualizarProveedor(props.proveedorId, { ...form })
      ui.mostrarSnackbar('Proveedor actualizado.', 'success')
    } else {
      await adminApi.crearProveedor({ ...form })
      ui.mostrarSnackbar('Proveedor creado. Se envió un correo para que configure su contraseña.', 'success')
    }
    abierto.value = false
    emit('guardado')
  } catch (e: unknown) {
    const error = e as { response?: { data?: { errores?: Record<string, string[]> } } }
    erroresCampo.value = error.response?.data?.errores ?? {}
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <v-dialog v-model="abierto" max-width="700" scrollable persistent>
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
        <span>{{ proveedorId ? 'Editar proveedor' : 'Nuevo proveedor' }}</span>
        <v-btn icon="mdi-close" variant="text" density="compact" @click="abierto = false" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <v-progress-circular v-if="cargando" indeterminate color="primary" />
        <v-form v-else v-model="formValido">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.tipo_documento"
                :items="opcionesTipoDocumento"
                label="Tipo de documento *"
                :rules="[requerido()]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.numero_documento"
                label="Número de documento *"
                :rules="[requerido()]"
                :error-messages="erroresCampo.numero_documento"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.tipo_persona"
                :items="opcionesTipoPersona"
                label="Tipo de persona *"
                :rules="[requerido()]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.razon_social"
                label="Razón social *"
                :rules="[requerido()]"
                :error-messages="erroresCampo.razon_social"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.correo"
                label="Correo *"
                :rules="[requerido()]"
                :error-messages="erroresCampo.correo"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.telefono"
                label="Teléfono *"
                :rules="[requerido()]"
                :error-messages="erroresCampo.telefono"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.persona_contacto"
                label="Persona de contacto *"
                :rules="[requerido()]"
                :error-messages="erroresCampo.persona_contacto"
              />
            </v-col>
            <v-col cols="12">
              <v-autocomplete
                v-model="form.rubros_servicios"
                :items="rubrosServicios.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
                label="Rubros — Servicios"
                multiple
                chips
                closable-chips
                :chip-props="{ color: 'primary', variant: 'tonal' }"
                class="mb-2"
              />
              <v-autocomplete
                v-model="form.rubros_bienes"
                :items="rubrosBienes.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
                label="Rubros — Bienes"
                multiple
                chips
                closable-chips
                :chip-props="{ color: 'primary', variant: 'tonal' }"
                :error-messages="erroresCampo.rubros_servicios"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
        <v-btn variant="outlined" color="secondary" class="px-5" @click="abierto = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" elevation="2" class="px-6" :loading="guardando" @click="guardar">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
