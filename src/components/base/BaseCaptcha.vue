<script setup lang="ts">
// Recibe la instancia de `useCaptcha` del formulario dueño (cada envío usa su
// propia instancia: el reto se consume al verificar, acierte o no). 05C
// hardening: antes era una pregunta aritmética en el label; ahora es una
// imagen con texto distorsionado (`CaptchaInternoService`, GD).
defineProps<{
  imagen: string
  cargando: boolean
  errorMessages?: string[]
}>()

const respuesta = defineModel<string>('respuesta', { required: true })

const emit = defineEmits<{ recargar: [] }>()
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-2">
      <div class="captcha-imagen d-flex align-center justify-center">
        <v-progress-circular v-if="cargando || !imagen" indeterminate color="primary" size="24" />
        <img v-else :src="imagen" alt="Código de verificación" />
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        density="comfortable"
        :loading="cargando"
        title="Cambiar imagen"
        @click="emit('recargar')"
      />
    </div>
    <v-text-field
      v-model="respuesta"
      label="Escribe el código de la imagen"
      :maxlength="10"
      :disabled="cargando || !imagen"
      :error-messages="errorMessages"
    />
  </div>
</template>

<style scoped>
.captcha-imagen {
  min-width: 180px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface-variant));
  border: 1px solid rgb(var(--v-theme-border-color));
}
.captcha-imagen img {
  height: 100%;
  width: 100%;
  object-fit: contain;
}
</style>
