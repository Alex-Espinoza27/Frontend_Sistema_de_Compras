import cliente from './cliente'
import type { EstadisticasPublicas } from '@/modules/publico/publico.types'

// 05C hardening: `entidad_id` opcional en todo — permite reusar estos mismos
// datos acotados a una sola entidad en el portal libre por entidad
// (`/entidad/{id}`, pedido explícitamente por el usuario, mismos cards y
// descargas que `/datos-abiertos`).
function conEntidad(url: string, entidadId?: number): string {
  return entidadId ? `${url}?entidad_id=${entidadId}` : url
}

export const datosAbiertosApi = {
  estadisticas: (entidadId?: number) =>
    cliente.get<never, EstadisticasPublicas>('/datos-abiertos/estadisticas', { params: entidadId ? { entidad_id: entidadId } : {} }),
  convocatoriasCsvUrl: (entidadId?: number) => conEntidad('/datos-abiertos/convocatorias.csv', entidadId),
  convocatoriasXlsxUrl: (entidadId?: number) => conEntidad('/datos-abiertos/convocatorias.xlsx', entidadId),
  adjudicacionesCsvUrl: (entidadId?: number) => conEntidad('/datos-abiertos/adjudicaciones.csv', entidadId),
  adjudicacionesXlsxUrl: (entidadId?: number) => conEntidad('/datos-abiertos/adjudicaciones.xlsx', entidadId),
}
