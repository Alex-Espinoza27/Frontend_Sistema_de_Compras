import cliente from './cliente'
import type { AreaInput, AreaItem } from '@/modules/entidad/entidad.types'
import type { ListadoParams, Paginado } from '@/types/api'

export const areasApi = {
  index: (params: ListadoParams) => cliente.get<never, Paginado<AreaItem>>('/areas', { params }),

  store: (body: AreaInput) => cliente.post<never, { area_id: number }>('/areas', body),

  update: (id: number, body: AreaInput) => cliente.put<never, null>(`/areas/${id}`, body),
}
