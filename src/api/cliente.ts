import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import router from '@/router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { Envelope } from '@/types/api'

/**
 * Instancia única de axios para toda la app (05A §3). Ningún componente
 * llama a axios directo: pasa siempre por un `<modulo>.api.ts`.
 */
const cliente = axios.create({
  // Todo /api/v1 (03 §0: "Base URL: /api/v1"). El único endpoint fuera de ese
  // prefijo es /sanctum/csrf-cookie (asegurarCsrf, más abajo).
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  withCredentials: true,
  withXSRFToken: true,
  // Cookie propia del backend (ValidarCsrfCompras). `XSRF-TOKEN` la comparten
  // todas las apps Laravel de este servidor (el navegador ignora el puerto) y
  // se pisan entre sí: los POST empezaban a fallar con 419.
  xsrfCookieName: 'XSRF-TOKEN-COMPRAS',
  headers: { Accept: 'application/json' },
})

/** Petición ya reintentada tras renovar el token CSRF (solo se reintenta una vez). */
type ConfigReintentable = InternalAxiosRequestConfig & { _reintentoCsrf?: boolean }

/** Llama `GET /sanctum/csrf-cookie` antes del primer POST de un flujo de auth
 * (login, registro...). Se llama siempre (no se cachea "para siempre"): el
 * backend regenera la sesión en cada login, así que una cookie vieja de un
 * login anterior en la misma pestaña ya no sirve para el siguiente. */
export async function asegurarCsrf(): Promise<void> {
  await axios.get(`${import.meta.env.VITE_API_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
  })
}

cliente.interceptors.response.use(
  // Éxito: desempaqueta el envelope { ok, data, mensaje } y expone solo `data`.
  // Excepción: una descarga (responseType 'blob') expone la response completa,
  // porque ahí `data` es el propio archivo, no un envelope JSON.
  (response) => {
    if (response.config.responseType === 'blob') return response
    return response.data?.data
  },

  // Error: traduce el código HTTP según la tabla de 05A §3.
  async (error: AxiosError<Envelope<unknown>>) => {
    // Una descarga fallida (409/404/...) también llega como Blob aunque el
    // backend haya respondido JSON; hay que releerlo para exponer `mensaje`.
    if (error.response?.data instanceof Blob && error.response.data.type.includes('json')) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        // No era JSON parseable: se deja el Blob tal cual.
      }
    }

    // 419 = el token CSRF no coincide (cookie renovada por otra pestaña, token
    // viejo...). Si la sesión sigue viva, basta pedir un token nuevo y repetir la
    // petición UNA vez; solo si vuelve a fallar se trata como sesión vencida.
    const configuracion = error.config as ConfigReintentable | undefined
    if (error.response?.status === 419 && configuracion && !configuracion._reintentoCsrf) {
      configuracion._reintentoCsrf = true
      let tokenRenovado = false
      try {
        await asegurarCsrf()
        tokenRenovado = true
      } catch {
        // No se pudo renovar el token: sigue el tratamiento normal del 419.
      }
      // Si el reintento también falla, vuelve a pasar por este interceptor ya
      // marcado como reintentado y recibe el tratamiento normal (401/419).
      if (tokenRenovado) return cliente.request(configuracion)
    }

    const ui = useUiStore()
    const status = error.response?.status
    const mensaje = error.response?.data?.mensaje

    switch (status) {
      case 401:
      case 419: {
        // 419 = CSRF/sesión vencida (Laravel/Sanctum, no está en la tabla de
        // 03/05A porque es de framework, no de negocio) — se trata como 401.
        const auth = useAuthStore()
        const estabaAutenticado = auth.autenticado
        // Logout voluntario en curso: su propio 401 no es una caducidad.
        if (auth.cerrandoSesion) break
        // Solo avisa dentro del área protegida; un 401 anónimo (bootstrap,
        // login fallido) no debe interrumpir la navegación. El aviso
        // (ModalSesionCaducada) limpia la sesión y redirige al login al terminar.
        if (estabaAutenticado && router.currentRoute.value.path.startsWith('/app')) {
          auth.marcarCaducada()
        } else {
          auth.limpiarSesion()
        }
        break
      }
      case 403:
        ui.mostrarSnackbar('No tienes permiso para esta acción', 'error')
        break
      case 409:
        ui.mostrarSnackbar(mensaje ?? 'La acción no es válida en el estado actual', 'warning')
        break
      case 422:
        // El mapa `errores` (campo → mensajes) se propaga tal cual en
        // error.response.data.errores para que el formulario lo pinte.
        break
      case 423:
        ui.mostrarSnackbar('Tu cuenta está suspendida', 'error')
        // El cierre de sesión real se conecta en la Fase 1.
        break
      case 429:
        ui.mostrarSnackbar('Demasiados intentos, espera un momento', 'warning')
        break
      default:
        if (status && status >= 500) {
          ui.mostrarSnackbar('Error del servidor, intenta más tarde', 'error')
        }
    }

    return Promise.reject(error)
  },
)

export default cliente
