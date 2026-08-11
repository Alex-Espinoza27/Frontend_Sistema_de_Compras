import cliente from './cliente'
import type {
  CuadroComparativoRespuesta,
  EvaluarOfertaInput,
  OfertaEvaluacionDetalle,
  OfertaEvaluacionItem,
} from '@/modules/entidad/entidad.types'

export const evaluacionApi = {
  ofertas: (convocatoriaId: number) =>
    cliente.get<never, { items: OfertaEvaluacionItem[] }>(`/convocatorias/${convocatoriaId}/ofertas`),

  cuadroComparativo: (convocatoriaId: number) =>
    cliente.get<never, CuadroComparativoRespuesta>(`/convocatorias/${convocatoriaId}/cuadro-comparativo`),

  detalle: (ofertaId: number) => cliente.get<never, OfertaEvaluacionDetalle>(`/ofertas/${ofertaId}/evaluacion`),

  evaluar: (ofertaId: number, body: EvaluarOfertaInput) =>
    cliente.post<never, null>(`/ofertas/${ofertaId}/evaluar`, body),
}
