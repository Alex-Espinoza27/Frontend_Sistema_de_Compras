import cliente from './cliente'
import type {
  OfertaDetalle,
  OfertaListaItem,
  OfertaResumenEntidad,
  OfertaStoreInput,
  OfertaStoreRespuesta,
} from '@/modules/proveedor/proveedor.types'
import type { ListadoParams, Paginado } from '@/types/api'

function construirFormData(datos: OfertaStoreInput): FormData {
  const fd = new FormData()
  fd.append('convocatoria_id', String(datos.convocatoria_id))
  if (datos.tipo_comprobante_id != null) fd.append('tipo_comprobante_id', String(datos.tipo_comprobante_id))
  datos.items.forEach((item, i) => {
    fd.append(`items[${i}][requerimiento_item_id]`, String(item.requerimiento_item_id))
    fd.append(`items[${i}][marca_modelo]`, item.marca_modelo)
    fd.append(`items[${i}][precio_unitario]`, String(item.precio_unitario))
  })
  fd.append('validez_dias', String(datos.validez_dias))
  fd.append('plazo_ejecucion_segun_tdr', String(datos.plazo_ejecucion_segun_tdr))
  if (datos.plazo_ejecucion_dias != null) fd.append('plazo_ejecucion_dias', String(datos.plazo_ejecucion_dias))
  fd.append('forma_pago_segun_tdr', String(datos.forma_pago_segun_tdr))
  if (datos.forma_pago_dias != null) fd.append('forma_pago_dias', String(datos.forma_pago_dias))
  fd.append('plazo_garantia', datos.plazo_garantia)
  fd.append('contacto_nombre', datos.contacto_nombre)
  fd.append('contacto_telefono', datos.contacto_telefono)
  fd.append('contacto_correo', datos.contacto_correo)
  fd.append('declaracion_jurada', datos.declaracion_jurada)
  fd.append('sustento', datos.sustento)
  return fd
}

export const ofertasApi = {
  store: (datos: OfertaStoreInput) =>
    cliente.post<never, OfertaStoreRespuesta>('/ofertas', construirFormData(datos)),

  resumen: () => cliente.get<never, OfertaResumenEntidad[]>('/ofertas/resumen'),

  index: (params: ListadoParams) => cliente.get<never, Paginado<OfertaListaItem>>('/ofertas', { params }),

  show: (id: number) => cliente.get<never, OfertaDetalle>(`/ofertas/${id}`),

  destroy: (id: number) => cliente.delete<never, null>(`/ofertas/${id}`),
}
