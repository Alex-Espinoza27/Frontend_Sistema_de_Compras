import cliente from './cliente'
import type { OfertaEvaluacionDetalle, PresentacionOfertaItem } from '@/modules/entidad/entidad.types'
import type { ListadoParams, Paginado } from '@/types/api'

export const presentacionOfertasApi = {
  index: (params: ListadoParams) =>
    cliente.get<never, Paginado<PresentacionOfertaItem>>('/presentacion-ofertas', { params }),

  show: (id: number) => cliente.get<never, OfertaEvaluacionDetalle>(`/presentacion-ofertas/${id}`),
}
