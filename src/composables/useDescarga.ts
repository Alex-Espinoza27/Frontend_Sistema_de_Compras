import { ref } from 'vue'

import cliente from '@/api/cliente'

const BLOQUEO_429_MS = 5000

/** Algunos endpoints (ArchivoController, OfertaService) devuelven
 * `descarga_url`/`constancia_url` como ruta absoluta ya con el prefijo
 * `/api/v1` incluido. `cliente` ya antepone `${VITE_API_URL}/api/v1` a toda
 * URL relativa, así que hay que quitar ese prefijo antes de pasarla — si no,
 * termina pidiendo `/api/v1/api/v1/...` (404). */
function quitarPrefijoApi(url: string): string {
  return url.startsWith('/api/v1/') ? url.slice('/api/v1'.length) : url
}

/** Descarga/apertura de blobs (PDF/CSV/XLSX) vía GET (05A §10). El snackbar de
 * 429 ya lo muestra el interceptor global; aquí solo se deshabilita el botón
 * unos segundos para no insistir sobre el mismo límite. */
export function useDescarga() {
  const cargando = ref(false)
  const bloqueado = ref(false)

  async function obtenerBlob(urlOriginal: string): Promise<Blob | null> {
    const url = quitarPrefijoApi(urlOriginal)
    cargando.value = true
    try {
      const respuesta = await cliente.get(url, { responseType: 'blob' })
      return respuesta.data as Blob
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        bloqueado.value = true
        setTimeout(() => (bloqueado.value = false), BLOQUEO_429_MS)
      }
      return null
    } finally {
      cargando.value = false
    }
  }

  async function descargar(url: string, nombreArchivo: string) {
    const blob = await obtenerBlob(url)
    if (!blob) return
    const blobUrl = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = blobUrl
    enlace.download = nombreArchivo
    enlace.click()
    URL.revokeObjectURL(blobUrl)
  }

  async function abrirEnNuevaPestana(url: string) {
    const blob = await obtenerBlob(url)
    if (!blob) return
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  }

  return { cargando, bloqueado, descargar, abrirEnNuevaPestana, obtenerBlob }
}
