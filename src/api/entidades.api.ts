import cliente from './cliente'
import type {
  AltaDirectaInput,
  AprobarEntidadInput,
  EntidadDetalle,
  EntidadListaItem,
  UsuarioEntidad,
  UsuarioEntidadInput,
} from '@/modules/muni/muni.types'
import type { ListadoParams, Paginado } from '@/types/api'

export const entidadesApi = {
  index: (params: ListadoParams) => cliente.get<never, Paginado<EntidadListaItem>>('/entidades', { params }),

  show: (id: number) => cliente.get<never, EntidadDetalle>(`/entidades/${id}`),

  store: (body: AltaDirectaInput) => cliente.post<never, { entidad_id: number }>('/entidades', body),

  aprobar: (id: number, body: AprobarEntidadInput) => cliente.post<never, null>(`/entidades/${id}/aprobar`, body),

  observar: (id: number, motivo: string) => cliente.post<never, null>(`/entidades/${id}/observar`, { motivo }),

  rechazar: (id: number, motivo: string) => cliente.post<never, null>(`/entidades/${id}/rechazar`, { motivo }),

  suspender: (id: number, motivo: string) => cliente.post<never, null>(`/entidades/${id}/suspender`, { motivo }),

  reactivar: (id: number) => cliente.post<never, null>(`/entidades/${id}/reactivar`),

  usuarios: (id: number) => cliente.get<never, UsuarioEntidad[]>(`/entidades/${id}/usuarios`),

  crearUsuario: (id: number, body: UsuarioEntidadInput) =>
    cliente.post<never, { id: number }>(`/entidades/${id}/usuarios`, body),

  actualizarUsuario: (id: number, userId: number, body: UsuarioEntidadInput) =>
    cliente.put<never, null>(`/entidades/${id}/usuarios/${userId}`, body),

  eliminarUsuario: (id: number, userId: number) =>
    cliente.delete<never, null>(`/entidades/${id}/usuarios/${userId}`),
}
