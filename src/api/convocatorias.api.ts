import cliente from './cliente'
import type {
  AdjudicarRespuesta,
  ConvocatoriaDetalle,
  ConvocatoriaListaItem,
  ConvocatoriaPublicarRespuesta,
  ConvocatoriaStoreInput,
  ConvocatoriaUpdateInput,
  ResultadosConvocatoria,
} from '@/modules/entidad/entidad.types'
import type { PostulacionDatos } from '@/modules/proveedor/proveedor.types'
import type { ListadoParams, Paginado } from '@/types/api'

function construirFormData(
  body: ConvocatoriaStoreInput | ConvocatoriaUpdateInput,
  archivoPlantillaDj: File | null,
): FormData {
  const fd = new FormData()
  if ('requerimiento_id' in body) fd.append('requerimiento_id', String(body.requerimiento_id))
  fd.append('nombre_servicio', body.nombre_servicio)
  fd.append('fecha_inicio', body.fecha_inicio)
  fd.append('fecha_fin', body.fecha_fin)
  if (archivoPlantillaDj) fd.append('archivo_plantilla_dj', archivoPlantillaDj)
  return fd
}

export const convocatoriasApi = {
  postulacion: (id: number) => cliente.get<never, PostulacionDatos>(`/convocatorias/${id}/postulacion`),

  index: (params: ListadoParams) =>
    cliente.get<never, Paginado<ConvocatoriaListaItem>>('/convocatorias', { params }),

  show: (id: number) => cliente.get<never, ConvocatoriaDetalle>(`/convocatorias/${id}`),

  store: (body: ConvocatoriaStoreInput, archivoPlantillaDj: File | null) =>
    cliente.post<never, { convocatoria_id: number }>('/convocatorias', construirFormData(body, archivoPlantillaDj)),

  update: (id: number, body: ConvocatoriaUpdateInput, archivoPlantillaDj: File | null) => {
    const fd = construirFormData(body, archivoPlantillaDj)
    fd.append('_method', 'PUT')
    return cliente.post<never, null>(`/convocatorias/${id}`, fd)
  },

  eliminarPlantillaDj: (id: number, archivoId: number) =>
    cliente.delete<never, null>(`/convocatorias/${id}/plantilla-dj/${archivoId}`),

  publicar: (id: number) => cliente.post<never, ConvocatoriaPublicarRespuesta>(`/convocatorias/${id}/publicar`),

  cancelar: (id: number, motivo: string) => cliente.post<never, null>(`/convocatorias/${id}/cancelar`, { motivo }),

  ampliarFechaFin: (id: number, fechaFin: string) =>
    cliente.post<never, { fecha_fin: string; fecha_fin_anterior: string | null }>(`/convocatorias/${id}/ampliar-fecha-fin`, {
      fecha_fin: fechaFin,
    }),

  adjudicar: (id: number, ofertaId: number | null) =>
    cliente.post<never, AdjudicarRespuesta>(`/convocatorias/${id}/adjudicar`, { oferta_id: ofertaId }),

  desierta: (id: number, motivo: string) => cliente.post<never, null>(`/convocatorias/${id}/desierta`, { motivo }),

  resultados: (id: number) => cliente.get<never, ResultadosConvocatoria>(`/convocatorias/${id}/resultados`),

  plantillaDjDefecto: () =>
    cliente.get<never, { existe: boolean; archivo: { archivo_id: number; nombre: string } | null }>(
      '/convocatorias/plantilla-dj-defecto',
    ),
}
