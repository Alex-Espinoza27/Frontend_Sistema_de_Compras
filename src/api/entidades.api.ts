import cliente from './cliente'
import type {
  AltaDirectaInput,
  AprobarEntidadInput,
  EntidadCombo,
  EntidadDetalle,
  EntidadListaItem,
  UsuarioEntidad,
  UsuarioEntidadInput,
} from '@/modules/muni/muni.types'
import type { ListadoParams, Paginado } from '@/types/api'

/**
 * Entidad que los selectores preseleccionan: la primera aprobada del combo (o
 * la primera, si ninguna lo está). Todas las pantallas con selector de entidad
 * arrancan con ella y consultan de inmediato.
 */
export function entidadPorDefecto(lista: EntidadCombo[]): number | null {
  return (lista.find((e) => e.estado === 'APROBADA') ?? lista[0])?.entidad_id ?? null
}

export const entidadesApi = {
  /** Selectores de entidad. Quien está limitado a su entidad recibe solo la suya. */
  combo: (params: { estado?: string } = {}) => cliente.get<never, EntidadCombo[]>('/entidades/combo', { params }),

  index: (params: ListadoParams) => cliente.get<never, Paginado<EntidadListaItem>>('/entidades', { params }),

  show: (id: number) => cliente.get<never, EntidadDetalle>(`/entidades/${id}`),

  // `correo_enviado: false`: el alta se guardó pero el correo con el enlace falló.
  store: (body: AltaDirectaInput) =>
    cliente.post<never, { entidad_id: number; correo_enviado: boolean }>('/entidades', body),

  aprobar: (id: number, body: AprobarEntidadInput) =>
    cliente.post<never, { correo_enviado: boolean }>(`/entidades/${id}/aprobar`, body),

  observar: (id: number, motivo: string) => cliente.post<never, null>(`/entidades/${id}/observar`, { motivo }),

  rechazar: (id: number, motivo: string) => cliente.post<never, null>(`/entidades/${id}/rechazar`, { motivo }),

  suspender: (id: number, motivo: string) => cliente.post<never, null>(`/entidades/${id}/suspender`, { motivo }),

  reactivar: (id: number) => cliente.post<never, null>(`/entidades/${id}/reactivar`),

  usuarios: (id: number) => cliente.get<never, UsuarioEntidad[]>(`/entidades/${id}/usuarios`),

  crearUsuario: (id: number, body: UsuarioEntidadInput) =>
    cliente.post<never, { id: number; correo_enviado: boolean }>(`/entidades/${id}/usuarios`, body),

  actualizarUsuario: (id: number, userId: number, body: UsuarioEntidadInput) =>
    cliente.put<never, null>(`/entidades/${id}/usuarios/${userId}`, body),

  eliminarUsuario: (id: number, userId: number) =>
    cliente.delete<never, null>(`/entidades/${id}/usuarios/${userId}`),
}
