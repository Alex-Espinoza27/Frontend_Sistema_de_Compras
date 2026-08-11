import { computed, ref } from 'vue'

import cliente from '@/api/cliente'

interface RetoCaptcha {
  captcha_id: string
  imagen: string
}

/**
 * Reto de captcha interno (03 §2.1 / `CaptchaInternoService`): imagen con
 * texto distorsionado, de un solo uso — se consume al verificar (acierte o
 * no), así que cada envío necesita su propia instancia de este composable.
 * El valor esperado por el backend es el string "{captcha_id}:{respuesta}"
 * en el campo `captcha`.
 */
export function useCaptcha() {
  const captchaId = ref('')
  const imagen = ref('')
  const respuesta = ref('')
  const cargando = ref(false)

  async function cargar() {
    cargando.value = true
    try {
      const data = await cliente.get<never, RetoCaptcha>('/auth/captcha')
      captchaId.value = data.captcha_id
      imagen.value = data.imagen
      respuesta.value = ''
    } finally {
      cargando.value = false
    }
  }

  const valor = computed(() => `${captchaId.value}:${respuesta.value}`)

  cargar()

  return { imagen, respuesta, valor, cargando, recargar: cargar }
}
