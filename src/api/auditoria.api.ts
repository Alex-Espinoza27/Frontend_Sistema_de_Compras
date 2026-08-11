import cliente from './cliente'
import type { AuditoriaDetalle, AuditoriaListaItem } from '@/modules/transversales/transversales.types'
import type { ListadoParams, Paginado } from '@/types/api'

function construirQuery(params: ListadoParams): string {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') qs.set(clave, String(valor))
  })
  return qs.toString()
}

export const auditoriaApi = {
  index: (params: ListadoParams) => cliente.get<never, Paginado<AuditoriaListaItem>>('/auditoria', { params }),

  show: (id: number) => cliente.get<never, AuditoriaDetalle>(`/auditoria/${id}`),

  exportarXlsxUrl: (params: ListadoParams) => `/auditoria/exportar.xlsx?${construirQuery(params)}`,
}
