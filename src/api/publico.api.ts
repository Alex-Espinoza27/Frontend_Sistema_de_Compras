import cliente from './cliente'
import type {
  ConvocatoriaPublicaDetalle,
  ConvocatoriaPublicaItem,
  EntidadPublica,
  RubroPublico,
  SolicitudEntidadInput,
} from '@/modules/publico/publico.types'
import type { ListadoParams, Paginado } from '@/types/api'

export interface ParamsEntidadesPublicas {
  buscar?: string
  solo_con_vigentes?: boolean
}

export const publicoApi = {
  // Color de marca (05C hardening, pedido explícitamente por el usuario):
  // público porque `App.vue` lo aplica al cargar, antes de cualquier login.
  tema: () => cliente.get<never, { color_primario: string | null }>('/publico/configuracion/tema'),

  entidades: (params: ParamsEntidadesPublicas = {}) =>
    cliente.get<never, { items: EntidadPublica[] }>('/publico/entidades', { params }),

  // Firma genérica (ListadoParams) para encajar con useListado; el llamador
  // siempre incluye estado_grupo (obligatorio en el backend) en paramsIniciales.
  convocatorias: (params: ListadoParams) =>
    cliente.get<never, Paginado<ConvocatoriaPublicaItem>>('/publico/convocatorias', { params }),

  convocatoria: (id: number) =>
    cliente.get<never, ConvocatoriaPublicaDetalle>(`/publico/convocatorias/${id}`),

  resultadosPdfUrl: (id: number) => `/publico/convocatorias/${id}/resultados.pdf`,

  tdrUrl: (id: number) => `/publico/convocatorias/${id}/tdr`,

  rubros: () => cliente.get<never, { items: RubroPublico[] }>('/publico/rubros'),

  solicitudEntidad: (body: SolicitudEntidadInput) =>
    cliente.post<never, { entidad_id: number }>('/publico/entidades/solicitud', body),
}
