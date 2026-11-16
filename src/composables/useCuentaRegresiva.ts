import { computed, onBeforeUnmount, ref } from 'vue'

/** Cuenta regresiva basada en una hora límite (no en restar 1 por segundo):
 * sigue exacta aunque la pestaña pase a segundo plano o el equipo se suspenda. */
export function useCuentaRegresiva() {
  const restantes = ref(0)
  const iniciada = ref(false)
  let limite = 0
  let intervalo: ReturnType<typeof setInterval> | undefined

  function detener() {
    if (intervalo) clearInterval(intervalo)
    intervalo = undefined
  }

  function actualizar() {
    restantes.value = Math.max(0, Math.ceil((limite - Date.now()) / 1000))
    if (restantes.value <= 0) detener()
  }

  function iniciar(segundos: number) {
    detener()
    limite = Date.now() + segundos * 1000
    iniciada.value = true
    actualizar()
    if (restantes.value > 0) intervalo = setInterval(actualizar, 1000)
  }

  /** `mm:ss` */
  const formato = computed(() => {
    const minutos = Math.floor(restantes.value / 60)
    const segundos = restantes.value % 60
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  })

  /** Llegó a cero (solo después de haberla iniciado). */
  const vencida = computed(() => iniciada.value && restantes.value <= 0)

  onBeforeUnmount(detener)

  return { restantes, formato, vencida, iniciar, detener }
}
