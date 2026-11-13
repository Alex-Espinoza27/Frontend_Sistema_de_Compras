import cliente from './cliente'
import type {
  RequerimientoCombo,
  RequerimientoDetalle,
  RequerimientoGuardarInput,
  RequerimientoListaItem,
  UnidadMedidaCombo,
} from '@/modules/entidad/entidad.types'
import type { ListadoParams, Paginado } from '@/types/api'

function construirFormData(body: RequerimientoGuardarInput, archivoTdr: File | null): FormData {
  const fd = new FormData()
  fd.append('objeto', body.objeto)
  fd.append('descripcion', body.descripcion)
  fd.append('tipo', body.tipo)
  body.rubro_ids.forEach((rubroId, i) => fd.append(`rubro_ids[${i}]`, String(rubroId)))
  if (body.area_id != null) fd.append('area_id', String(body.area_id))
  if (body.entidad_id != null) fd.append('entidad_id', String(body.entidad_id))
  body.items.forEach((item, i) => {
    fd.append(`items[${i}][numero]`, String(item.numero))
    fd.append(`items[${i}][descripcion]`, item.descripcion)
    fd.append(`items[${i}][unidad_medida_id]`, String(item.unidad_medida_id))
    fd.append(`items[${i}][cantidad]`, String(item.cantidad))
    if (item.presentacion) fd.append(`items[${i}][presentacion]`, item.presentacion)
  })
  if (archivoTdr) fd.append('archivo_tdr', archivoTdr)
  return fd
}

export const requerimientosApi = {
  index: (params: ListadoParams) =>
    cliente.get<never, Paginado<RequerimientoListaItem>>('/requerimientos', { params }),

  show: (id: number) => cliente.get<never, RequerimientoDetalle>(`/requerimientos/${id}`),

  store: (body: RequerimientoGuardarInput, archivoTdr: File | null) =>
    cliente.post<never, { requerimiento_id: number; numero: string }>(
      '/requerimientos',
      construirFormData(body, archivoTdr),
    ),

  update: (id: number, body: RequerimientoGuardarInput, archivoTdr: File | null) => {
    const fd = construirFormData(body, archivoTdr)
    fd.append('_method', 'PUT')
    return cliente.post<never, null>(`/requerimientos/${id}`, fd)
  },

  desactivar: (id: number) => cliente.post<never, null>(`/requerimientos/${id}/desactivar`),
  activar: (id: number) => cliente.post<never, null>(`/requerimientos/${id}/activar`),

  eliminarTdr: (id: number, archivoId: number) =>
    cliente.delete<never, null>(`/requerimientos/${id}/tdr/${archivoId}`),

  unidadesMedida: () => cliente.get<never, UnidadMedidaCombo[]>('/requerimientos/unidades-medida'),

  combo: () => cliente.get<never, RequerimientoCombo[]>('/requerimientos/combo'),
}
