import { reactive, ref, watch } from 'vue'

import type { ListadoParams, Paginado } from '@/types/api'

type FnListar<T> = (params: ListadoParams) => Promise<Paginado<T>>

const DEBOUNCE_BUSCAR_MS = 400

/**
 * Listados paginados server-side (03 §1): sincroniza pagina/por_pagina/
 * ordenar_por/direccion/buscar con `fnListar` (05A §9). `buscar` recarga con
 * debounce; los demás recargan de inmediato. Cualquier otro filtro ad-hoc
 * (ej. `estado_grupo`) se muta en `params` y se recarga llamando `recargar()`.
 */
export function useListado<T>(
  fnListar: FnListar<T>,
  paramsIniciales: ListadoParams = {},
  clavePersistencia?: string,
) {
  const items = ref<T[]>([])
  const paginacion = ref({
    pagina: 1,
    por_pagina: paramsIniciales.por_pagina ?? 15,
    total: 0,
    ultima_pagina: 1,
  })
  const cargando = ref(false)

  let paramsFinales: ListadoParams = { ...paramsIniciales }
  if (clavePersistencia) {
    try {
      const guardados = sessionStorage.getItem(clavePersistencia)
      if (guardados) {
        const parsiados = JSON.parse(guardados)
        paramsFinales = { ...paramsIniciales, ...parsiados }
      }
    } catch {
      // Si falla la lectura, se usan paramsIniciales
    }
  }

  const params = reactive<ListadoParams>({
    pagina: 1,
    por_pagina: 15,
    ordenar_por: undefined,
    direccion: undefined,
    buscar: undefined,
    ...paramsFinales,
  })

  function guardarEnStorage() {
    if (!clavePersistencia) return
    try {
      sessionStorage.setItem(clavePersistencia, JSON.stringify(params))
    } catch {
      // Ignorar errores de storage
    }
  }

  async function recargar() {
    cargando.value = true
    guardarEnStorage()
    try {
      const respuesta = await fnListar({ ...params })
      items.value = respuesta.items
      paginacion.value = respuesta.paginacion
    } finally {
      cargando.value = false
    }
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined
  watch(
    () => params.buscar,
    () => {
      clearTimeout(temporizador)
      temporizador = setTimeout(() => {
        params.pagina = 1
        recargar()
      }, DEBOUNCE_BUSCAR_MS)
    },
  )

  watch(
    () => [params.ordenar_por, params.direccion],
    () => {
      params.pagina = 1
      recargar()
    },
  )
  watch(
    () => [params.pagina, params.por_pagina],
    () => recargar(),
  )

  recargar()

  return { items, paginacion, cargando, params, recargar }
}
