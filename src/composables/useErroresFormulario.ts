import { computed, nextTick, ref } from 'vue'

/** Errores de validación por campo, con la forma del backend (422): la clave
 * es el nombre del campo (`contacto_correo`) o su ruta con punto para listas
 * (`items.0.precio_unitario`) y el valor la lista de mensajes. */
export type MapaErrores = Record<string, string[]>

/** `id` del input de un campo: el formulario se lo pone al componente para que
 * `enfocarCampo` lo encuentre. */
export function idCampo(campo: string): string {
  return `campo-${campo.replace(/[^A-Za-z0-9_-]/g, '-')}`
}

/** Lleva la vista al campo y le da el foco. Espera a que exista en el DOM: los
 * pasos de un stepper recién se montan al abrirlos. */
export async function enfocarCampo(campo: string): Promise<void> {
  const id = idCampo(campo)
  for (let intento = 0; intento < 20; intento++) {
    await nextTick()
    const elemento = document.getElementById(id)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
      elemento.focus({ preventScroll: true })
      return
    }
    await new Promise((resolver) => setTimeout(resolver, 50))
  }
}

export function useErroresFormulario() {
  const errores = ref<MapaErrores>({})

  function establecer(mapa?: MapaErrores | null) {
    errores.value = mapa ?? {}
  }

  /** Sin argumento limpia todo; con un campo, solo ese (al empezar a corregirlo). */
  function limpiar(campo?: string) {
    if (!campo) {
      errores.value = {}
      return
    }
    if (!(campo in errores.value)) return
    const copia = { ...errores.value }
    delete copia[campo]
    errores.value = copia
  }

  function de(campo: string): string[] {
    return errores.value[campo] ?? []
  }

  /** Lista plana `{ campo, mensaje }`, en el orden en que llegaron. */
  const lista = computed(() =>
    Object.entries(errores.value).flatMap(([campo, mensajes]) => mensajes.map((mensaje) => ({ campo, mensaje }))),
  )
  const hayErrores = computed(() => lista.value.length > 0)

  return { errores, establecer, limpiar, de, lista, hayErrores }
}
