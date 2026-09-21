import cliente from './cliente'
import type {
  CuadroComparativoRespuesta,
  EvaluarOfertaInput,
  OfertaEvaluacionDetalle,
  OfertaEvaluacionItem,
} from '@/modules/entidad/entidad.types'
import type { ListadoParams, Paginado } from '@/types/api'

export const evaluacionApi = {
  // Paginado (05C hardening, pedido explícitamente por el usuario): una
  // convocatoria puede recibir más de 100 ofertas.
  ofertas: (convocatoriaId: number, params: ListadoParams = {}) =>
    cliente.get<never, Paginado<OfertaEvaluacionItem>>(`/convocatorias/${convocatoriaId}/ofertas`, { params }),

  cuadroComparativo: (convocatoriaId: number) =>
    cliente.get<never, CuadroComparativoRespuesta>(`/convocatorias/${convocatoriaId}/cuadro-comparativo`),

  detalle: (ofertaId: number) => cliente.get<never, OfertaEvaluacionDetalle>(`/ofertas/${ofertaId}/evaluacion`),

  evaluar: (ofertaId: number, body: EvaluarOfertaInput) =>
    cliente.post<never, null>(`/ofertas/${ofertaId}/evaluar`, body),
}
